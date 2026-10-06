import React from 'react';
import { Target, AlertTriangle, XCircle, Award, TrendingUp } from 'lucide-react';

export default function HistoryStats({ summary = {} }) {
  const {
    total_records = 0,
    target_hits = 0,
    stopped = 0,
    invalid = 0,
    win_rate = 0,
    total_r_gain = 0,
  } = summary;

  const rGainSign = total_r_gain >= 0 ? '+' : '';
  const rGainColor = total_r_gain >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. TOTAL COMPLETED */}
      <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-3.5 flex flex-col justify-between">
        <span className="text-xs text-slate-400 font-medium">Logged Trades</span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-white">{total_records}</span>
          <span className="text-[11px] text-slate-500">Total Setups</span>
        </div>
      </div>

      {/* 2. WIN RATE */}
      <div className="bg-brand-card border border-emerald-500/40 rounded-xl p-3.5 flex flex-col justify-between bg-gradient-to-br from-emerald-950/20 to-brand-card">
        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
          <Award className="w-3.5 h-3.5 text-emerald-400" />
          Win Rate
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-emerald-400">{win_rate}%</span>
          <span className="text-[11px] text-emerald-500/80">Target / Stopped</span>
        </div>
      </div>

      {/* 3. NET R-GAIN */}
      <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-3.5 flex flex-col justify-between">
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          Net R-Gain
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-2xl font-bold font-mono ${rGainColor}`}>
            {rGainSign}{total_r_gain}R
          </span>
          <span className="text-[11px] text-slate-500">Cumulative</span>
        </div>
      </div>

      {/* 4. TARGET HITS */}
      <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-3.5 flex flex-col justify-between">
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-emerald-400" />
          Target Hit
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-emerald-400">{target_hits}</span>
          <span className="text-[11px] text-slate-500">Winners</span>
        </div>
      </div>

      {/* 5. STOPPED OUT */}
      <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-3.5 flex flex-col justify-between">
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          Stopped Out
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-red-400">{stopped}</span>
          <span className="text-[11px] text-slate-500">Losses</span>
        </div>
      </div>

      {/* 6. INVALIDATED / FAILED */}
      <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-3.5 flex flex-col justify-between">
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-slate-400" />
          Invalidated
        </span>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-2xl font-bold font-mono text-slate-400">{invalid}</span>
          <span className="text-[11px] text-slate-500">Before Entry</span>
        </div>
      </div>
    </div>
  );
}
