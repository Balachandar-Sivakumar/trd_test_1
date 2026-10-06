import React from 'react';

export default function StatsOverview({ stats = {} }) {
  const {
    total_scanned = 50,
    total_breakouts = 0,
    shortlist_count = 0,
    long_count = 0,
    short_count = 0,
    live_count = 0,
    target_hit_count = 0,
  } = stats;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. SCANNED POOL */}
      <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-3.5 flex flex-col justify-between">
        <span className="text-xs text-slate-400 font-medium">Scanned Pool</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-white">{total_scanned}</span>
          <span className="text-[11px] text-slate-500">Nifty Stocks</span>
        </div>
      </div>

      {/* 2. BREAKOUTS TODAY */}
      <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-3.5 flex flex-col justify-between">
        <span className="text-xs text-slate-400 font-medium">Breakouts Today</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-cyan-400">{total_breakouts}</span>
          <span className="text-[11px] text-slate-500">Qualified</span>
        </div>
      </div>

      {/* 3. ACTIONABLE SHORTLIST */}
      <div className="bg-brand-card border border-emerald-500/40 rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-emerald-950/20 to-brand-card">
        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Actionable Shortlist
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {shortlist_count}
          </span>
          <span className="text-[11px] text-emerald-500/80">Pending/Live</span>
        </div>
      </div>

      {/* 4. LONG / SHORT RATIO */}
      <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-3.5 flex flex-col justify-between">
        <span className="text-xs text-slate-400 font-medium">Long / Short</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-slate-200">
            {long_count} / {short_count}
          </span>
          <span className="text-[11px] text-slate-500">Breakouts</span>
        </div>
      </div>

      {/* 5. IN-FLIGHT LIVE */}
      <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-3.5 flex flex-col justify-between">
        <span className="text-xs text-slate-400 font-medium">In-Flight (LIVE)</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-blue-400">{live_count}</span>
          <span className="text-[11px] text-slate-500">Active</span>
        </div>
      </div>

      {/* 6. TARGET HIT (2R) */}
      <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-3.5 flex flex-col justify-between">
        <span className="text-xs text-slate-400 font-medium">Target Hit (2R)</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {target_hit_count}
          </span>
          <span className="text-[11px] text-slate-500">Completed</span>
        </div>
      </div>
    </div>
  );
}
