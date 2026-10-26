/**
 * pages/BlockDashboard.jsx
 * ========================
 * Shows a specific hostel block with floor navigation and per-floor room grid.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Snowflake, Wind, Layers, ChevronLeft, Users } from 'lucide-react';
import { getFloorRooms, getRooms } from '../services/api';
import RoomCard from '../components/RoomCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/LoadingSpinner';

const FLOORS = [1, 2, 3, 4, 5, 6];

export default function BlockDashboard() {
  const { block } = useParams();
  const navigate  = useNavigate();
  const isAC      = block?.toUpperCase() === 'AC';
  const normBlock  = isAC ? 'AC' : 'NAC';

  const [selectedFloor, setSelectedFloor]  = useState(1);
  const [floorData, setFloorData]          = useState(null);
  const [blockSummary, setBlockSummary]    = useState([]);
  const [loading, setLoading]              = useState(true);
  const [error, setError]                  = useState('');

  // Fetch per-floor stats for the summary sidebar
  const fetchBlockSummary = useCallback(async () => {
    try {
      const data = await getRooms({ block: normBlock });
      // Build per-floor summary
      const summary = FLOORS.map(f => {
        const floorRooms = data.filter(r => r.floor === f);
        return {
          floor    : f,
          total    : floorRooms.length,
          available: floorRooms.filter(r => r.status === 'AVAILABLE').length,
        };
      });
      setBlockSummary(summary);
    } catch {
      // non-critical
    }
  }, [normBlock]);

  const fetchFloor = useCallback(async (floor) => {
    setLoading(true);
    setError('');
    try {
      const data = await getFloorRooms(normBlock, floor);
      setFloorData(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load floor data.');
    } finally {
      setLoading(false);
    }
  }, [normBlock]);

  useEffect(() => {
    fetchBlockSummary();
    fetchFloor(selectedFloor);
    // Poll
    const timer = setInterval(() => {
      fetchBlockSummary();
      fetchFloor(selectedFloor);
    }, 8000);
    return () => clearInterval(timer);
  }, [selectedFloor, fetchBlockSummary, fetchFloor]);

  const Icon = isAC ? Snowflake : Wind;
  const accentColor = isAC ? 'cyan' : 'amber';

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate('/')} className="btn-secondary py-2 px-3">
          <ChevronLeft size={18} />
        </button>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center
          ${isAC ? 'bg-cyan-500/15 text-cyan-400' : 'bg-amber-500/15 text-amber-400'}`}>
          <Icon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isAC ? 'AC Block' : 'Non-AC Block'}
          </h1>
          <p className="text-slate-400 text-sm">6 residential floors · 96 rooms</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px,1fr] gap-6">
        {/* Sidebar: Floor nav + summary */}
        <aside className="space-y-4">
          {/* Ground floor */}
          <div className="card p-4 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Ground Floor</p>
            <p className="font-semibold text-slate-300 text-sm">🍽️ Mess / Dining Hall</p>
            <p className="text-xs text-slate-500 mt-1">No residential rooms</p>
          </div>

          {/* Residential floors */}
          <div className="card p-4 space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Residential Floors</p>
            {blockSummary.map(({ floor, total, available }) => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`floor-btn ${selectedFloor === floor ? 'floor-btn-active' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span>Floor {floor}</span>
                  <span className={`text-xs font-semibold ${available > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {available}/{total}
                  </span>
                </div>
                <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: total > 0 ? `${(available / total) * 100}%` : '0%' }}
                  />
                </div>
              </button>
            ))}
          </div>

          {/* Jump to recommendations */}
          <button
            onClick={() => navigate('/recommend')}
            className={`w-full btn-outline text-sm py-3
              ${isAC ? 'border-cyan-500/50 text-cyan-400' : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'}`}
          >
            🎯 Get Recommendations
          </button>
        </aside>

        {/* Main: Floor room grid */}
        <main>
          {/* Floor header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Floor {selectedFloor}</h2>
            {floorData && (
              <div className="flex gap-3">
                <span className="badge-available">
                  <Users size={11} /> {floorData.stats?.available} available
                </span>
                <span className="badge-reserved">
                  <Users size={11} /> {floorData.stats?.reserved} reserved
                </span>
              </div>
            )}
          </div>

          {/* Type breakdown */}
          {floorData?.stats?.by_type && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {['2-Seater', '3-Seater', '4-Seater'].map(type => {
                const t = floorData.stats.by_type[type];
                if (!t) return null;
                return (
                  <div key={type} className="card p-3 text-center">
                    <p className="text-lg font-bold text-white">{t.available}<span className="text-slate-500 text-sm">/{t.total}</span></p>
                    <p className="text-xs text-slate-400 mt-0.5">{type}</p>
                  </div>
                );
              })}
            </div>
          )}

          {loading ? (
            <LoadingSpinner message="Loading rooms..." />
          ) : error ? (
            <ErrorMessage error={error} onRetry={() => fetchFloor(selectedFloor)} />
          ) : (
            <>
              {/* Only available rooms */}
              {floorData?.rooms?.filter(r => r.status === 'AVAILABLE').length === 0 ? (
                <div className="card p-10 text-center">
                  <p className="text-2xl mb-2">🏠</p>
                  <p className="text-slate-400">All rooms on this floor are reserved.</p>
                  <button className="btn-secondary text-sm mt-4" onClick={() => navigate('/recommend')}>
                    Check Other Floors
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {floorData.rooms
                    .filter(r => r.status === 'AVAILABLE')
                    .map(room => (
                      <RoomCard key={room.room_id} room={room} />
                    ))}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
