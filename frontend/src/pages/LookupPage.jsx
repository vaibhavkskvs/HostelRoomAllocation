/**
 * pages/LookupPage.jsx
 * ====================
 * Student reservation lookup by reservation ID + roll number.
 */

import { useState } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { lookupReservation } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function LookupPage() {
  const navigate = useNavigate();
  const [reservationId, setReservationId] = useState('');
  const [rollNumber,    setRollNumber]    = useState('');
  const [result,        setResult]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!reservationId.trim() || !rollNumber.trim()) {
      setError('Both reservation ID and roll number are required.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await lookupReservation(reservationId.trim(), rollNumber.trim());
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'No reservation found for the provided details.');
    } finally {
      setLoading(false);
    }
  };

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata',
    });
  }

  return (
    <div className="page-container max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-2">Look Up My Reservation</h1>
      <p className="text-slate-400 text-sm mb-8">
        Enter your reservation ID and college roll number to retrieve your booking details.
      </p>

      <form onSubmit={handleLookup} className="card p-6 space-y-4 mb-6">
        <div>
          <label className="label">Reservation ID</label>
          <input
            type="text"
            placeholder="e.g. RES-A1B2C3D4E5F6"
            value={reservationId}
            onChange={e => setReservationId(e.target.value)}
            className="input-field font-mono"
          />
        </div>
        <div>
          <label className="label">College Roll Number</label>
          <input
            type="text"
            placeholder="e.g. 21CS001"
            value={rollNumber}
            onChange={e => setRollNumber(e.target.value)}
            className="input-field"
          />
        </div>

        {error && (
          <div className="flex gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
          <Search size={16} />
          {loading ? 'Searching...' : 'Find Reservation'}
        </button>
      </form>

      {result && (
        <div className="card p-6 space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="font-semibold text-white">Reservation Found</h2>
          </div>

          {[
            ['Reservation ID',  result.reservation_id],
            ['Status',          result.res_status],
            ['Room ID',         result.room_id],
            ['Block',           result.block === 'AC' ? 'AC Block' : 'Non-AC Block'],
            ['Floor',           `Floor ${result.floor}`],
            ['Room Type',       result.room_type],
            ['Full Name',       result.full_name],
            ['Roll Number',     result.roll_number],
            ['Department',      result.department],
            ['Academic Year',   result.academic_year],
            ['Reserved On',     formatDate(result.reserved_at)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-slate-700/30 last:border-0">
              <span className="text-slate-400 text-sm">{k}</span>
              <span className="text-white text-sm font-medium text-right max-w-xs">{v}</span>
            </div>
          ))}

          <button
            onClick={() => navigate(`/confirmation/${result.reservation_id}`)}
            className="btn-outline w-full mt-2 text-sm"
          >
            View Full Confirmation →
          </button>
        </div>
      )}
    </div>
  );
}
