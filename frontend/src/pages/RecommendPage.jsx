/**
 * pages/RecommendPage.jsx
 * =======================
 * Preference form → C algorithm → ranked room recommendations.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, AlertCircle } from 'lucide-react';
import { getRecommendations } from '../services/api';
import RoomCard from '../components/RoomCard';
import LoadingSpinner from '../components/LoadingSpinner';

const ROOM_TYPES = ['2-Seater', '3-Seater', '4-Seater'];

const defaultPrefs = {
  preferred_block    : '',
  preferred_room_type: '',
  preferred_floor    : 0,
  priority_block     : 2,
  priority_room_type : 1,
  priority_floor     : 3,
};

function PrioritySelect({ label, value, onChange, name }) {
  return (
    <div>
      <label className="label">{label} Priority</label>
      <select value={value} onChange={e => onChange(name, Number(e.target.value))} className="input-field">
        <option value={1}>1st (Highest)</option>
        <option value={2}>2nd</option>
        <option value={3}>3rd (Lowest)</option>
      </select>
    </div>
  );
}

export default function RecommendPage() {
  const navigate = useNavigate();
  const [prefs,   setPrefs]   = useState(defaultPrefs);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [meta,    setMeta]    = useState(null);

  const updatePref = (key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const data = await getRecommendations(prefs);
      setResults(data.recommendations);
      setMeta({ total: data.total_available, prefs: data.preferences_used });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get recommendations. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container max-w-6xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium mb-4">
          <Sparkles size={12} /> Powered by C Algorithm
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Room Recommendations</h1>
        <p className="text-slate-400">
          Tell us your preferences and our C-powered algorithm will rank the best available rooms for you.
        </p>
      </div>

      <div className="grid lg:grid-cols-[360px,1fr] gap-8">
        {/* Preference form */}
        <aside>
          <form onSubmit={handleSubmit} className="card p-6 space-y-5 sticky top-24">
            <h2 className="font-semibold text-white text-lg">Your Preferences</h2>

            {/* Block */}
            <div>
              <label className="label">Preferred Block</label>
              <select
                value={prefs.preferred_block}
                onChange={e => updatePref('preferred_block', e.target.value)}
                className="input-field"
              >
                <option value="">No Preference</option>
                <option value="AC">AC Block (Air Conditioned)</option>
                <option value="NAC">Non-AC Block</option>
              </select>
            </div>

            {/* Room type */}
            <div>
              <label className="label">Preferred Room Type</label>
              <select
                value={prefs.preferred_room_type}
                onChange={e => updatePref('preferred_room_type', e.target.value)}
                className="input-field"
              >
                <option value="">No Preference</option>
                {ROOM_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Floor */}
            <div>
              <label className="label">Preferred Floor</label>
              <select
                value={prefs.preferred_floor}
                onChange={e => updatePref('preferred_floor', Number(e.target.value))}
                className="input-field"
              >
                <option value={0}>No Preference</option>
                {[1,2,3,4,5,6].map(f => (
                  <option key={f} value={f}>Floor {f}</option>
                ))}
              </select>
            </div>

            <hr className="border-slate-700" />

            {/* Priority ordering */}
            <div>
              <p className="label mb-3">Preference Priorities</p>
              <p className="text-xs text-slate-500 mb-3">Assign each criterion a priority (1 = highest weight).</p>
              <div className="space-y-3">
                <PrioritySelect label="Block"      name="priority_block"      value={prefs.priority_block}      onChange={updatePref} />
                <PrioritySelect label="Room Type"  name="priority_room_type"  value={prefs.priority_room_type}  onChange={updatePref} />
                <PrioritySelect label="Floor"      name="priority_floor"      value={prefs.priority_floor}      onChange={updatePref} />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <Sparkles size={16} />
              {loading ? 'Running C Algorithm...' : 'Get Recommendations'}
            </button>

            {/* Algorithm note */}
            <div className="bg-slate-800/60 rounded-xl p-3 text-xs text-slate-400 border border-slate-700/50">
              <p className="font-medium text-slate-300 mb-1">🔬 Algorithm Info</p>
              <p>Rooms are fetched from SQLite, passed to a compiled C program, scored with weighted preferences, sorted by insertion sort, and returned ranked.</p>
              <p className="mt-1 text-slate-500">Time complexity: O(n + k²)</p>
            </div>
          </form>
        </aside>

        {/* Results */}
        <main>
          {loading && <LoadingSpinner message="Running C recommendation algorithm..." />}

          {error && (
            <div className="card p-6 border-red-500/30 bg-red-500/5">
              <div className="flex gap-3">
                <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-400">Recommendation failed</p>
                  <p className="text-sm text-slate-400 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {results && !loading && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {results.length} Recommendation{results.length !== 1 ? 's' : ''}
                  </h2>
                  {meta && (
                    <p className="text-slate-400 text-sm">
                      From {meta.total} available rooms · sorted by preference score
                    </p>
                  )}
                </div>
                {results.length > 0 && (
                  <span className="text-xs bg-purple-500/15 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-full">
                    C Algorithm ✓
                  </span>
                )}
              </div>

              {results.length === 0 ? (
                <div className="card p-10 text-center">
                  <p className="text-3xl mb-3">😔</p>
                  <p className="text-slate-300 font-medium mb-2">No rooms match your preferences</p>
                  <p className="text-slate-400 text-sm">Try relaxing some preferences — e.g., remove the floor or block preference.</p>
                  <button className="btn-secondary text-sm mt-4" onClick={() => navigate('/rooms')}>
                    Browse All Available Rooms
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {results.map((room, i) => (
                    <div key={room.room_id} className="relative">
                      {i === 0 && (
                        <div className="absolute -top-2 -left-2 z-10 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                          ⭐ Best Match
                        </div>
                      )}
                      <RoomCard
                        room={room}
                        showScore={true}
                        score={room.score}
                        reason={room.reason}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {!results && !loading && !error && (
            <div className="card p-12 text-center border-dashed border-slate-600">
              <Sparkles size={40} className="mx-auto text-purple-400/50 mb-4" />
              <p className="text-slate-300 font-medium mb-2">Set your preferences</p>
              <p className="text-slate-500 text-sm">
                Fill in the form on the left and click "Get Recommendations" to see rooms
                ranked by the C algorithm.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
