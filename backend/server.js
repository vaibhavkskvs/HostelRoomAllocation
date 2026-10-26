/*
 * server.js
 * =========
 * Express application entry point.
 */

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const path        = require('path');
const { initializeDatabase } = require('./database/init');

const roomsRouter           = require('./routes/rooms');
const reservationsRouter    = require('./routes/reservations');
const recommendationsRouter = require('./routes/recommendations');

const app  = express();
const PORT = process.env.PORT || 5000;

/* -------------------------------------------------------------------------
 * Middleware
 * ---------------------------------------------------------------------- */
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '10kb' }));

/* -------------------------------------------------------------------------
 * Routes
 * ---------------------------------------------------------------------- */
app.use('/api/rooms',           roomsRouter);
app.use('/api/reservations',    reservationsRouter);
app.use('/api/recommendations', recommendationsRouter);

/* Health check */
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* 404 for unknown API routes */
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
});

/* -------------------------------------------------------------------------
 * Start server
 * ---------------------------------------------------------------------- */
initializeDatabase();

app.listen(PORT, () => {
    console.log(`[Server] Hostel Room Allocation backend running on http://localhost:${PORT}`);
});

module.exports = app;
