/**
 * pages/HomePage.jsx
 * ==================
 * Landing page with live stats, block cards, and how-it-works section.
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, CheckCircle, Lock, Wind, Snowflake,
  ChevronRight, RefreshCw
} from 'lucide-react';
import { getRoomStats } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

function StatCard({ label, value, sub, color = 'cyan' }) {
  const colors = {
    cyan  : 'text-cyan-400',
    green : 'text-emerald-400',
    red   : 'text-red-400',
    blue  : 'text-blue-400',
  };
  return (
    <div className="stat-card">
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-sm font-medium text-slate-300">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function BlockCard({ block, stats, onExplore }) {
  const isAC = block === 'AC';
  const Icon = isAC ? Snowflake : Wind;
  const pct  = stats ? Math.round((stats.available / stats.total) * 100) : 0;

  return (
    <div className={`card-hover p-6 cursor-pointer ${isAC ? '' : ''}`} onClick={onExplore}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center
          ${isAC ? 'bg-cyan-500/15 text-cyan-400' : 'bg-amber-500/15 text-amber-400'}`}>
          <Icon size={24} />
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full border
          ${isAC ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                 : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
          {isAC ? 'Air Conditioned' : 'Non-AC'}
        </span>
      </div>

      <h3 className="text-xl font-bold text-white mb-1">
        {isAC ? 'AC Block' : 'Non-AC Block'}
      </h3>
      <p className="text-slate-400 text-sm mb-4">6 residential floors · 96 rooms total</p>

      {stats ? (
        <>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-emerald-400 font-medium">{stats.available} available</span>
            <span className="text-red-400 font-medium">{stats.reserved} reserved</span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1.5">{pct}% availability</p>
        </>
      ) : (
        <div className="h-8 bg-slate-700/50 rounded-lg animate-pulse" />
      )}

      <button className={`mt-4 w-full btn-outline text-sm flex items-center justify-center gap-2
        ${isAC ? 'border-cyan-500/50 text-cyan-400' : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'}`}>
        Explore Rooms <ChevronRight size={16} />
      </button>
    </div>
  );
}

const STEPS = [
  { n: '01', title: 'Choose Your Block',    desc: 'Select between the AC or Non-AC hostel block based on your preference.' },
  { n: '02', title: 'Set Preferences',      desc: 'Specify your preferred room type, floor, and priorities for personalized recommendations.' },
  { n: '03', title: 'Browse & Select',      desc: 'Browse available rooms or pick from AI-powered recommendations ranked by your preferences.' },
  { n: '04', title: 'Reserve & Confirm',    desc: 'Fill in your student details, review, and confirm your reservation instantly.' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const data = await getRoomStats();
      setStats(data);
      setError('');
    } catch {
      setError('Could not load live statistics. Backend may be starting up.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Poll every 10 seconds for live updates
    const timer = setInterval(fetchStats, 10000);
    return () => clearInterval(timer);
  }, [fetchStats]);

  const getBlockStats = (block) =>
    stats?.byBlock?.find(b => b.block === block) || null;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-700/50">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative page-container text-center py-16 sm:py-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            DSA Project — B.Tech Data Structures & Algorithms
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight">
            Hostel Room
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Allocation System
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
            Smart, preference-based room reservation powered by C algorithms and real-time availability tracking.
            Find and reserve your perfect hostel room in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => navigate('/rooms')} className="btn-primary text-base px-8 py-3 flex items-center gap-2">
              <Building2 size={18} /> Explore Rooms
            </button>
            <button onClick={() => navigate('/recommend')} className="btn-secondary text-base px-8 py-3">
              Get Recommendations
            </button>
          </div>
        </div>
      </section>

      <div className="page-container space-y-12">
        {/* Live Stats */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Live Availability</h2>
            <button
              onClick={fetchStats}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-400 transition-colors"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading availability data..." />
          ) : error ? (
            <div className="card p-6 text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={fetchStats} className="btn-secondary text-sm mt-3">Retry</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Rooms"     value={stats?.total     ?? 0} color="blue"  sub="Both blocks" />
              <StatCard label="Available Rooms" value={stats?.available ?? 0} color="green" sub="Ready to reserve" />
              <StatCard label="Reserved Rooms"  value={stats?.reserved  ?? 0} color="red"   sub="Already booked" />
              <StatCard label="Available Beds"  value={stats?.availBeds ?? 0} color="cyan"  sub="Across all rooms" />
            </div>
          )}
        </section>

        {/* Block Cards */}
        <section>
          <h2 className="section-title mb-6">Hostel Blocks</h2>
          <div className="grid sm:grid-cols-2 gap-6 max-w-3xl">
            <BlockCard
              block="AC"
              stats={getBlockStats('AC')}
              onExplore={() => navigate('/block/AC')}
            />
            <BlockCard
              block="NAC"
              stats={getBlockStats('NAC')}
              onExplore={() => navigate('/block/NAC')}
            />
          </div>
        </section>

        {/* Floor availability table */}
        {stats?.byFloor && stats.byFloor.length > 0 && (
          <section>
            <h2 className="section-title mb-4">Availability by Floor</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="text-left px-5 py-3">Block</th>
                      <th className="text-left px-5 py-3">Floor</th>
                      <th className="text-right px-5 py-3">Total</th>
                      <th className="text-right px-5 py-3">Available</th>
                      <th className="px-5 py-3">Availability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {stats.byFloor.map(row => {
                      const pct = Math.round((row.available / row.total) * 100);
                      return (
                        <tr
                          key={`${row.block}-${row.floor}`}
                          className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                          onClick={() => navigate(`/block/${row.block}/floor/${row.floor}`)}
                        >
                          <td className="px-5 py-3 font-medium text-slate-300">
                            {row.block === 'AC' ? 'AC Block' : 'Non-AC Block'}
                          </td>
                          <td className="px-5 py-3 text-slate-400">Floor {row.floor}</td>
                          <td className="px-5 py-3 text-right text-slate-400">{row.total}</td>
                          <td className={`px-5 py-3 text-right font-medium ${
                            row.available > 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}>{row.available}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        <section className="pb-8">
          <h2 className="section-title mb-6 text-center">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="card p-5 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-sm">
                  {n}
                </div>
                <h4 className="font-semibold text-white mb-2 text-sm">{title}</h4>
                <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
