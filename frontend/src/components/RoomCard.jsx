/**
 * components/RoomCard.jsx
 * =======================
 * Displays a single room with its details and Reserve button.
 */

import { Users, Building2, Layers, CheckCircle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TYPE_COLORS = {
  '2-Seater': 'from-violet-500/20 to-purple-500/10 border-violet-500/30',
  '3-Seater': 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30',
  '4-Seater': 'from-amber-500/20 to-orange-500/10 border-amber-500/30',
};

const TYPE_BADGE = {
  '2-Seater': 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  '3-Seater': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  '4-Seater': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
};

export default function RoomCard({ room, showScore, score, reason, compact = false }) {
  const navigate = useNavigate();
  const isAvailable = room.status === 'AVAILABLE';
  const gradient = TYPE_COLORS[room.room_type] || TYPE_COLORS['3-Seater'];
  const badge    = TYPE_BADGE[room.room_type] || TYPE_BADGE['3-Seater'];

  return (
    <div className={`relative overflow-hidden rounded-2xl border transition-all duration-300
      bg-gradient-to-br ${gradient}
      ${isAvailable
        ? 'hover:shadow-lg hover:shadow-cyan-500/10 hover:-translate-y-0.5 cursor-pointer group'
        : 'opacity-50 cursor-not-allowed'}`}
      onClick={() => isAvailable && navigate(`/rooms/${room.room_id}`)}
    >
      {/* Score badge (for recommendations) */}
      {showScore && score !== undefined && (
        <div className="absolute top-3 right-3 bg-slate-900/80 rounded-lg px-2 py-1 text-xs font-bold text-cyan-400">
          {score}%
        </div>
      )}

      <div className={`p-5 ${compact ? 'p-4' : ''}`}>
        {/* Room ID + type */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className={`font-bold text-white tracking-tight ${compact ? 'text-base' : 'text-lg'}`}>
              {room.room_id}
            </h3>
            <span className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${badge}`}>
              {room.room_type}
            </span>
          </div>
          <div className={`mt-1 ${isAvailable ? 'badge-available' : 'badge-reserved'}`}>
            {isAvailable ? <CheckCircle size={12} /> : <Lock size={12} />}
            {isAvailable ? 'Available' : 'Reserved'}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Building2 size={14} className="shrink-0" />
            <span>{room.block === 'AC' ? 'AC Block' : 'Non-AC Block'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Layers size={14} className="shrink-0" />
            <span>Floor {room.floor}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users size={14} className="shrink-0" />
            <span>Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'}</span>
          </div>
        </div>

        {/* Recommendation reason */}
        {reason && (
          <p className="text-xs text-cyan-300/80 italic mb-3 border-t border-slate-600/30 pt-2">
            💡 {reason}
          </p>
        )}

        {/* CTA */}
        {isAvailable && (
          <button
            className="btn-primary w-full text-sm py-2 group-hover:shadow-cyan-500/30"
            onClick={(e) => { e.stopPropagation(); navigate(`/rooms/${room.room_id}`); }}
          >
            Reserve This Room →
          </button>
        )}
      </div>
    </div>
  );
}
