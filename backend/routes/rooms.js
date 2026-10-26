/*
 * routes/rooms.js
 * ===============
 * REST endpoints for room data.
 *
 * GET /api/rooms                  - all rooms with current status
 * GET /api/rooms/stats            - aggregate availability statistics
 * GET /api/rooms/block/:block     - rooms in a specific block
 * GET /api/rooms/floor/:block/:floor - rooms on a specific block+floor
 * GET /api/rooms/:roomId          - single room detail
 */

const express = require('express');
const router  = express.Router();
const { getDb } = require('../database/init');

/* Helper: normalize block parameter */
function normBlock(raw) {
    const b = (raw || '').toUpperCase();
    if (b === 'AC' || b === 'NAC') return b;
    return null;
}

/* GET /api/rooms/stats */
router.get('/stats', (req, res) => {
    try {
        const db = getDb();
        const total     = db.prepare('SELECT COUNT(*) as c FROM rooms').get().c;
        const available = db.prepare("SELECT COUNT(*) as c FROM rooms WHERE status='AVAILABLE'").get().c;
        const reserved  = db.prepare("SELECT COUNT(*) as c FROM rooms WHERE status='RESERVED'").get().c;
        const totalBeds = db.prepare('SELECT SUM(capacity) as s FROM rooms').get().s || 0;
        const availBeds = db.prepare("SELECT SUM(capacity) as s FROM rooms WHERE status='AVAILABLE'").get().s || 0;

        const byBlock = db.prepare(`
            SELECT block,
                   COUNT(*) as total,
                   SUM(CASE WHEN status='AVAILABLE' THEN 1 ELSE 0 END) as available,
                   SUM(CASE WHEN status='RESERVED'  THEN 1 ELSE 0 END) as reserved
            FROM rooms GROUP BY block
        `).all();

        const byFloor = db.prepare(`
            SELECT block, floor,
                   COUNT(*) as total,
                   SUM(CASE WHEN status='AVAILABLE' THEN 1 ELSE 0 END) as available
            FROM rooms GROUP BY block, floor ORDER BY block, floor
        `).all();

        res.json({ total, available, reserved, totalBeds, availBeds, byBlock, byFloor });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch statistics.' });
    }
});

/* GET /api/rooms */
router.get('/', (req, res) => {
    try {
        const db = getDb();
        const { block, floor, type, status } = req.query;

        let query = 'SELECT * FROM rooms WHERE 1=1';
        const params = [];

        if (block) {
            const b = normBlock(block);
            if (!b) return res.status(400).json({ error: 'Invalid block. Use AC or NAC.' });
            query += ' AND block = ?';
            params.push(b);
        }
        if (floor) {
            const f = parseInt(floor, 10);
            if (isNaN(f) || f < 1 || f > 6)
                return res.status(400).json({ error: 'Floor must be 1–6.' });
            query += ' AND floor = ?';
            params.push(f);
        }
        if (type) {
            const validTypes = ['2-Seater', '3-Seater', '4-Seater'];
            if (!validTypes.includes(type))
                return res.status(400).json({ error: 'Invalid room type.' });
            query += ' AND room_type = ?';
            params.push(type);
        }
        if (status) {
            const s = status.toUpperCase();
            if (s !== 'AVAILABLE' && s !== 'RESERVED')
                return res.status(400).json({ error: 'Status must be AVAILABLE or RESERVED.' });
            query += ' AND status = ?';
            params.push(s);
        }

        query += ' ORDER BY block, floor, room_id';
        const rooms = db.prepare(query).all(...params);
        res.json(rooms);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch rooms.' });
    }
});

/* GET /api/rooms/block/:block */
router.get('/block/:block', (req, res) => {
    try {
        const db = getDb();
        const block = normBlock(req.params.block);
        if (!block) return res.status(400).json({ error: 'Invalid block.' });

        const rooms = db.prepare(
            "SELECT * FROM rooms WHERE block=? ORDER BY floor, room_id"
        ).all(block);
        res.json(rooms);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch block rooms.' });
    }
});

/* GET /api/rooms/floor/:block/:floor */
router.get('/floor/:block/:floor', (req, res) => {
    try {
        const db = getDb();
        const block = normBlock(req.params.block);
        if (!block) return res.status(400).json({ error: 'Invalid block.' });

        const floor = parseInt(req.params.floor, 10);
        if (isNaN(floor) || floor < 1 || floor > 6)
            return res.status(400).json({ error: 'Floor must be 1–6.' });

        const rooms = db.prepare(
            "SELECT * FROM rooms WHERE block=? AND floor=? ORDER BY room_id"
        ).all(block, floor);

        const stats = {
            total    : rooms.length,
            available: rooms.filter(r => r.status === 'AVAILABLE').length,
            reserved : rooms.filter(r => r.status === 'RESERVED').length,
            by_type  : {},
        };
        for (const r of rooms) {
            if (!stats.by_type[r.room_type]) stats.by_type[r.room_type] = { total:0, available:0 };
            stats.by_type[r.room_type].total++;
            if (r.status === 'AVAILABLE') stats.by_type[r.room_type].available++;
        }

        res.json({ rooms, stats, block, floor });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch floor rooms.' });
    }
});

/* GET /api/rooms/:roomId */
router.get('/:roomId', (req, res) => {
    try {
        const db = getDb();
        const room = db.prepare('SELECT * FROM rooms WHERE room_id=?').get(req.params.roomId);
        if (!room) return res.status(404).json({ error: 'Room not found.' });
        res.json(room);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch room.' });
    }
});

module.exports = router;
