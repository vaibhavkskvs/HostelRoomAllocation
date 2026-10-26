/**
 * services/api.js
 * ===============
 * Centralised Axios API client for all backend calls.
 */

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/* ── Rooms ───────────────────────────────────────────────────────────── */
export const getRooms = (params = {}) =>
  api.get('/rooms', { params }).then(r => r.data);

export const getRoomStats = () =>
  api.get('/rooms/stats').then(r => r.data);

export const getBlockRooms = (block) =>
  api.get(`/rooms/block/${block}`).then(r => r.data);

export const getFloorRooms = (block, floor) =>
  api.get(`/rooms/floor/${block}/${floor}`).then(r => r.data);

export const getRoom = (roomId) =>
  api.get(`/rooms/${roomId}`).then(r => r.data);

/* ── Reservations ────────────────────────────────────────────────────── */
export const createReservation = (data) =>
  api.post('/reservations', data).then(r => r.data);

export const getReservation = (id) =>
  api.get(`/reservations/${id}`).then(r => r.data);

export const lookupReservation = (reservationId, rollNumber) =>
  api.get('/reservations/lookup', {
    params: { reservation_id: reservationId, roll_number: rollNumber },
  }).then(r => r.data);

/* ── Recommendations ─────────────────────────────────────────────────── */
export const getRecommendations = (preferences) =>
  api.post('/recommendations', preferences).then(r => r.data);

/* ── Health ──────────────────────────────────────────────────────────── */
export const checkHealth = () =>
  api.get('/health').then(r => r.data);

export default api;
