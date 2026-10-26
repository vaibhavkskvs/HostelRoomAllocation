/*
 * database/init.js
 * ================
 * SQLite schema creation and room inventory generation.
 *
 * On first run  : creates all tables and generates 192 rooms.
 * Subsequent run: schema is idempotent; existing rooms/reservations are kept.
 */

const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH = path.join(__dirname, '..', 'hostel.db');

let db;

function getDb() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

/* -------------------------------------------------------------------------
 * Schema
 * ---------------------------------------------------------------------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS rooms (
    room_id     TEXT    PRIMARY KEY,
    block       TEXT    NOT NULL CHECK(block IN ('AC','NAC')),
    floor       INTEGER NOT NULL CHECK(floor BETWEEN 1 AND 6),
    room_type   TEXT    NOT NULL CHECK(room_type IN ('2-Seater','3-Seater','4-Seater')),
    capacity    INTEGER NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'AVAILABLE'
                        CHECK(status IN ('AVAILABLE','RESERVED')),
    UNIQUE(room_id)
);

CREATE TABLE IF NOT EXISTS students (
    student_id   TEXT    PRIMARY KEY,
    full_name    TEXT    NOT NULL,
    roll_number  TEXT    NOT NULL UNIQUE,
    email        TEXT    NOT NULL,
    mobile       TEXT    NOT NULL,
    department   TEXT    NOT NULL,
    academic_year TEXT   NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
    reservation_id   TEXT    PRIMARY KEY,
    student_id       TEXT    NOT NULL REFERENCES students(student_id),
    room_id          TEXT    NOT NULL REFERENCES rooms(room_id),
    reserved_at      TEXT    NOT NULL,
    status           TEXT    NOT NULL DEFAULT 'ACTIVE'
                             CHECK(status IN ('ACTIVE','CANCELLED')),
    UNIQUE(room_id, status),       -- one active reservation per room
    UNIQUE(student_id, status)     -- one active reservation per student
);
`;

/* -------------------------------------------------------------------------
 * Room generation
 *
 * Inventory per residential floor:
 *   5 × 2-Seater  (rooms 01–05)
 *  10 × 3-Seater  (rooms 06–15)
 *   1 × 4-Seater  (room  16)
 *  Total: 16 rooms, 44 beds
 *
 * Blocks: AC, NAC
 * Floors: 1–6
 * Total : 2 × 6 × 16 = 192 rooms
 * ---------------------------------------------------------------------- */
function generateRooms() {
    const blocks = ['AC', 'NAC'];
    const floors  = [1, 2, 3, 4, 5, 6];
    const rooms   = [];

    for (const block of blocks) {
        const prefix = block === 'AC' ? 'AC' : 'NAC';
        for (const floor of floors) {
            let seq = 1;
            // 5 × 2-Seater
            for (let i = 0; i < 5; i++) {
                rooms.push({
                    room_id   : `${prefix}-${floor}${String(seq).padStart(2,'0')}`,
                    block,
                    floor,
                    room_type : '2-Seater',
                    capacity  : 2,
                    status    : 'AVAILABLE',
                });
                seq++;
            }
            // 10 × 3-Seater
            for (let i = 0; i < 10; i++) {
                rooms.push({
                    room_id   : `${prefix}-${floor}${String(seq).padStart(2,'0')}`,
                    block,
                    floor,
                    room_type : '3-Seater',
                    capacity  : 3,
                    status    : 'AVAILABLE',
                });
                seq++;
            }
            // 1 × 4-Seater
            rooms.push({
                room_id   : `${prefix}-${floor}${String(seq).padStart(2,'0')}`,
                block,
                floor,
                room_type : '4-Seater',
                capacity  : 4,
                status    : 'AVAILABLE',
            });
            seq++;
        }
    }

    return rooms;
}

/* -------------------------------------------------------------------------
 * Verify inventory totals (programmatic check)
 * ---------------------------------------------------------------------- */
function verifyInventory(db) {
    const total = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
    const perBlock = db.prepare(`SELECT block, COUNT(*) as c FROM rooms GROUP BY block`).all();
    const beds = db.prepare(`SELECT SUM(capacity) as s FROM rooms`).get().s;

    const errors = [];
    if (total !== 192)  errors.push(`Expected 192 rooms, found ${total}`);
    if (beds  !== 528)  errors.push(`Expected 528 beds, found ${beds}`);
    for (const row of perBlock) {
        if (row.c !== 96) errors.push(`Expected 96 rooms in ${row.block} block, found ${row.c}`);
    }
    // Check each floor
    const floorCounts = db.prepare(`
        SELECT block, floor, COUNT(*) as c FROM rooms GROUP BY block, floor
    `).all();
    for (const row of floorCounts) {
        if (row.c !== 16) errors.push(`Expected 16 rooms on ${row.block} Floor ${row.floor}, found ${row.c}`);
    }

    if (errors.length > 0) {
        console.error('[DB] Inventory verification FAILED:');
        errors.forEach(e => console.error('  ✗', e));
    } else {
        console.log('[DB] Inventory verified: 192 rooms, 528 beds ✓');
    }
    return errors.length === 0;
}

/* -------------------------------------------------------------------------
 * initializeDatabase()
 * ---------------------------------------------------------------------- */
function initializeDatabase() {
    const database = getDb();

    // Create schema (idempotent)
    database.exec(SCHEMA);

    // Insert rooms only if none exist yet
    const existingCount = database.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
    if (existingCount === 0) {
        console.log('[DB] First run — generating 192 rooms...');
        const insert = database.prepare(`
            INSERT OR IGNORE INTO rooms (room_id, block, floor, room_type, capacity, status)
            VALUES (@room_id, @block, @floor, @room_type, @capacity, @status)
        `);
        const insertMany = database.transaction((roomList) => {
            for (const room of roomList) insert.run(room);
        });
        const rooms = generateRooms();
        insertMany(rooms);
        console.log(`[DB] Inserted ${rooms.length} rooms.`);
    } else {
        console.log(`[DB] Database already contains ${existingCount} rooms — skipping generation.`);
    }

    verifyInventory(database);
    return database;
}

module.exports = { getDb, initializeDatabase };
