/*
 * routes/recommendations.js
 * ==========================
 * Preference-based room recommendation via the C algorithm.
 *
 * POST /api/recommendations
 * Body: { preferred_block, preferred_room_type, preferred_floor,
 *         priority_block, priority_room_type, priority_floor }
 */

const express           = require('express');
const router            = express.Router();
const { getDb }         = require('../database/init');
const { runCRecommender } = require('../services/cRecommender');

router.post('/', async (req, res) => {
    try {
        const db = getDb();

        const {
            preferred_block     = '',
            preferred_room_type = '',
            preferred_floor     = 0,
            priority_block      = 2,
            priority_room_type  = 1,
            priority_floor      = 3,
        } = req.body;

        // Validate priorities
        const priorities = [priority_block, priority_room_type, priority_floor];
        for (const p of priorities) {
            const n = Number(p);
            if (!Number.isInteger(n) || n < 1 || n > 3) {
                return res.status(400).json({ error: 'Each priority must be 1, 2, or 3.' });
            }
        }

        // Fetch only AVAILABLE rooms from DB (authoritative source)
        const rooms = db.prepare(
            "SELECT * FROM rooms WHERE status='AVAILABLE' ORDER BY floor, room_id"
        ).all();

        if (rooms.length === 0) {
            return res.json({
                recommendations : [],
                message         : 'No rooms are currently available.',
                total_available : 0,
            });
        }

        const preferences = {
            preferred_block     : String(preferred_block).trim(),
            preferred_room_type : String(preferred_room_type).trim(),
            preferred_floor     : Number(preferred_floor) || 0,
            priority_block      : Number(priority_block),
            priority_room_type  : Number(priority_room_type),
            priority_floor      : Number(priority_floor),
        };

        // Run C recommender
        let recommendations;
        try {
            recommendations = await runCRecommender(rooms, preferences);
        } catch (cErr) {
            console.error('[Recommendations] C recommender failed:', cErr.message);
            // Graceful fallback: return available rooms sorted by room_id
            recommendations = rooms.slice(0, 20).map(r => ({
                ...r,
                score : 0,
                reason: 'C recommender unavailable — showing available rooms.',
            }));
        }

        // Double-check: filter out any RESERVED rooms the C module might have seen
        // (race condition guard — DB is the source of truth)
        const availableIds = new Set(rooms.map(r => r.room_id));
        const safeRecs = recommendations.filter(r => availableIds.has(r.room_id));

        res.json({
            recommendations : safeRecs,
            total_available : rooms.length,
            preferences_used: preferences,
        });
    } catch (err) {
        console.error('[Recommendations] Error:', err);
        res.status(500).json({ error: 'Failed to generate recommendations.' });
    }
});

module.exports = router;
