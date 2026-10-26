/*
 * routes/reservations.js
 * ======================
 * Reservation creation, lookup, and atomic room-locking.
 *
 * POST /api/reservations           - create a reservation (atomic)
 * GET  /api/reservations/lookup    - look up by reservation_id + roll_number
 * GET  /api/reservations/:id       - get reservation by ID (for confirmation page)
 */

const express  = require('express');
const router   = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDb }      = require('../database/init');
const { validateReservationRequest } = require('../validation/studentValidation');

/* -------------------------------------------------------------------------
 * POST /api/reservations
 * Atomic reservation flow:
 *   1. Validate input
 *   2. Check no existing active reservation for this roll number
 *   3. BEGIN TRANSACTION
 *   4. SELECT room FOR UPDATE (SQLite: inside transaction with check)
 *   5. If room not AVAILABLE → rollback → 409 Conflict
 *   6. INSERT student (or reuse if roll number exists with no reservation)
 *   7. INSERT reservation
 *   8. UPDATE room status → RESERVED
 *   9. COMMIT
 * ---------------------------------------------------------------------- */
router.post('/', (req, res) => {
    try {
        const db = getDb();
        const body = req.body;

        // 1. Validate
        const errors = validateReservationRequest(body);
        if (errors.length > 0) {
            return res.status(400).json({ error: 'Validation failed.', details: errors });
        }

        const roomId     = body.room_id.trim().toUpperCase().replace('NAC', 'NAC');
        // Fix: keep NAC as-is
        const fixedRoomId = body.room_id.trim();
        const rollNumber  = body.roll_number.trim().toUpperCase();

        // 2. Check no active reservation for this roll number (pre-check, not final authority)
        const existingStudent = db.prepare(
            "SELECT student_id FROM students WHERE roll_number=?"
        ).get(rollNumber);

        if (existingStudent) {
            const existingRes = db.prepare(`
                SELECT reservation_id FROM reservations
                WHERE student_id=? AND status='ACTIVE'
            `).get(existingStudent.student_id);
            if (existingRes) {
                return res.status(409).json({
                    error: 'You already have an active reservation.',
                    reservation_id: existingRes.reservation_id,
                });
            }
        }

        // 3-9. Atomic transaction
        const makeReservation = db.transaction(() => {
            // 4. Check room status inside transaction
            const room = db.prepare(
                "SELECT * FROM rooms WHERE room_id=?"
            ).get(fixedRoomId);

            if (!room) {
                throw { status: 404, message: 'Room not found.' };
            }
            if (room.status !== 'AVAILABLE') {
                throw {
                    status: 409,
                    message: 'This room has just been reserved by another student. Please select another available room.',
                };
            }

            // 5. Upsert student
            let studentId;
            if (existingStudent) {
                studentId = existingStudent.student_id;
                // Update details in case they changed
                db.prepare(`
                    UPDATE students SET full_name=?, email=?, mobile=?, department=?, academic_year=?
                    WHERE student_id=?
                `).run(
                    body.full_name.trim(),
                    body.email.trim().toLowerCase(),
                    body.mobile.trim(),
                    body.department.trim(),
                    body.academic_year.trim(),
                    studentId
                );
            } else {
                studentId = uuidv4();
                db.prepare(`
                    INSERT INTO students (student_id, full_name, roll_number, email, mobile, department, academic_year)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `).run(
                    studentId,
                    body.full_name.trim(),
                    rollNumber,
                    body.email.trim().toLowerCase(),
                    body.mobile.trim(),
                    body.department.trim(),
                    body.academic_year.trim()
                );
            }

            // 6. Insert reservation
            const reservationId = 'RES-' + uuidv4().replace(/-/g, '').slice(0, 12).toUpperCase();
            const reservedAt    = new Date().toISOString();

            db.prepare(`
                INSERT INTO reservations (reservation_id, student_id, room_id, reserved_at, status)
                VALUES (?, ?, ?, ?, 'ACTIVE')
            `).run(reservationId, studentId, fixedRoomId, reservedAt);

            // 7. Lock room
            db.prepare(
                "UPDATE rooms SET status='RESERVED' WHERE room_id=?"
            ).run(fixedRoomId);

            return { reservationId, studentId, reservedAt, room };
        });

        try {
            const { reservationId, studentId, reservedAt, room } = makeReservation();
            return res.status(201).json({
                success     : true,
                reservation_id: reservationId,
                room        : room,
                reserved_at : reservedAt,
                message     : 'Room reserved successfully.',
            });
        } catch (txErr) {
            if (txErr.status) {
                return res.status(txErr.status).json({ error: txErr.message });
            }
            // SQLite UNIQUE constraint violation (concurrent attempt)
            if (txErr.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
                (txErr.message && txErr.message.includes('UNIQUE'))) {
                return res.status(409).json({
                    error: 'This room has just been reserved by another student. Please select another available room.',
                });
            }
            throw txErr;
        }
    } catch (err) {
        console.error('[Reservation] Error:', err);
        res.status(500).json({ error: 'Reservation failed due to a server error. Please try again.' });
    }
});

/* -------------------------------------------------------------------------
 * GET /api/reservations/lookup?reservation_id=...&roll_number=...
 * ---------------------------------------------------------------------- */
router.get('/lookup', (req, res) => {
    try {
        const db = getDb();
        const { reservation_id, roll_number } = req.query;

        if (!reservation_id || !roll_number) {
            return res.status(400).json({ error: 'Both reservation_id and roll_number are required.' });
        }

        const record = db.prepare(`
            SELECT r.reservation_id, r.reserved_at, r.status as res_status,
                   s.full_name, s.roll_number, s.email, s.department, s.academic_year,
                   rm.room_id, rm.block, rm.floor, rm.room_type, rm.capacity
            FROM reservations r
            JOIN students s  ON r.student_id = s.student_id
            JOIN rooms rm    ON r.room_id    = rm.room_id
            WHERE r.reservation_id = ? AND s.roll_number = ?
        `).get(reservation_id.trim(), roll_number.trim().toUpperCase());

        if (!record) {
            return res.status(404).json({
                error: 'No reservation found for the provided reservation ID and roll number. Please check your details.',
            });
        }

        res.json(record);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to look up reservation.' });
    }
});

/* -------------------------------------------------------------------------
 * GET /api/reservations/:id
 * Returns reservation details for the confirmation page.
 * ---------------------------------------------------------------------- */
router.get('/:id', (req, res) => {
    try {
        const db = getDb();
        const record = db.prepare(`
            SELECT r.reservation_id, r.reserved_at, r.status as res_status,
                   s.full_name, s.roll_number, s.email, s.mobile, s.department, s.academic_year,
                   rm.room_id, rm.block, rm.floor, rm.room_type, rm.capacity
            FROM reservations r
            JOIN students s  ON r.student_id = s.student_id
            JOIN rooms rm    ON r.room_id    = rm.room_id
            WHERE r.reservation_id = ?
        `).get(req.params.id.trim());

        if (!record) {
            return res.status(404).json({ error: 'Reservation not found.' });
        }

        res.json(record);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch reservation.' });
    }
});

module.exports = router;
