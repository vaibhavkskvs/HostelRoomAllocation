/**
 * pages/RoomsPage.jsx
 * ====================
 * Browse all rooms with filters: block, floor, room type, status.
 */

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { getRooms } from '../services/api';
import RoomCard from '../components/RoomCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/LoadingSpinner';

const ROOM_TYPES = ['2-Seater', '3-Seater', '4-Seater'];
const FLOORS     = [1, 2, 3, 4, 5, 6];

export default function RoomsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [rooms,   setRooms]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [filters, setFilters] = useState({
    block  : searchParams.get('block')  || '',
    floor  : searchParams.get('floor')  || '',
    type   : searchParams.get('type')   || '',
    status : searchParams.get('status') || 'AVAILABLE',
  });

  const [showFilters, setShowFilters] = useState(false);

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.block)  params.block  = filters.block;
      if (filters.floor)  params.floor  = filters.floor;
      if (filters.type)   params.type   = filters.type;
      if (filters.status) params.status = filters.status;
      const data = await getRooms(params);
      setRooms(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load rooms.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRooms();
    const timer = setInterval(fetchRooms, 10000);
    return () => clearInterval(timer);
  }, [fetchRooms]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    setSearchParams(p);
  };

  const clearFilters = () => {
    setFilters({ block: '', floor: '', type: '', status: 'AVAILABLE' });
    setSearchParams({});
  };

  const activeCount = [filters.block, filters.floor, filters.type].filter(Boolean).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Browse Rooms</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {loading ? '...' : `${rooms.length} room${rooms.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 btn-secondary text-sm relative
            ${showFilters ? 'bg-slate-700' : ''}`}
        >
          <SlidersHorizontal size={16} /> Filters
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card p-5 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Block */}
            <div className="min-w-[140px]">
              <label className="label">Block</label>
              <select
                value={filters.block}
                onChange={e => updateFilter('block', e.target.value)}
                className="input-field"
              >
                <option value="">All Blocks</option>
                <option value="AC">AC Block</option>
                <option value="NAC">Non-AC Block</option>
              </select>
            </div>

            {/* Floor */}
            <div className="min-w-[120px]">
              <label className="label">Floor</label>
              <select
                value={filters.floor}
                onChange={e => updateFilter('floor', e.target.value)}
                className="input-field"
              >
                <option value="">All Floors</option>
                {FLOORS.map(f => (
                  <option key={f} value={f}>Floor {f}</option>
                ))}
              </select>
            </div>

            {/* Room type */}
            <div className="min-w-[140px]">
              <label className="label">Room Type</label>
              <select
                value={filters.type}
                onChange={e => updateFilter('type', e.target.value)}
                className="input-field"
              >
                <option value="">All Types</option>
                {ROOM_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="min-w-[140px]">
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={e => updateFilter('status', e.target.value)}
                className="input-field"
              >
                <option value="AVAILABLE">Available Only</option>
                <option value="">All Rooms</option>
                <option value="RESERVED">Reserved Only</option>
              </select>
            </div>

            {activeCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors py-3">
                <X size={14} /> Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner message="Loading rooms..." />
      ) : error ? (
        <ErrorMessage error={error} onRetry={fetchRooms} />
      ) : rooms.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-3xl mb-3">🔍</p>
          <p className="text-slate-400">No rooms match your current filters.</p>
          <button onClick={clearFilters} className="btn-secondary text-sm mt-4">Clear Filters</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map(room => (
            <RoomCard key={room.room_id} room={room} compact />
          ))}
        </div>
      )}
    </div>
  );
}
