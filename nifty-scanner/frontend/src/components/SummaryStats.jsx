import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Percent,
  Coins,
  Timer,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';

export default function SummaryStats({ summary }) {
  if (!summary) return null;

  const isNetPositive = (summary.net_R || 0) >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* 1. Net R-Gain */}
      <div className={`p-4 rounded-xl border backdrop-blur-sm transition-all ${
        isNetPositive 
          ? 'bg-emerald-950/20 border-emerald-800/40 glow-green' 
          : 'bg-rose-950/20 border-rose-800/40 glow-red'
      }`}>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Today's Net R</span>
          <Coins className={`h-4 w-4 ${isNetPositive ? 'text-emerald-400' : 'text-rose-400'}`} />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold font-mono tracking-tight ${
            isNetPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {summary.net_R !== undefined ? (summary.net_R > 0 ? `+${summary.net_R}` : summary.net_R) : '0.00'}R
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
          <span>Gross: {summary.gross_R > 0 ? `+${summary.gross_R}` : summary.gross_R}R</span>
          <span className="text-slate-500">Cost: {summary.cost_R}R</span>
        </div>
      </div>

      {/* 2. Win Rate */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Win Rate</span>
          <Percent className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-cyan-300 tracking-tight">
            {summary.win_rate || 0}%
          </span>
          <span className="text-xs text-slate-400">
            ({summary.wins || 0}W / {summary.losses || 0}L)
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
          <div 
            className="bg-cyan-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(0, summary.win_rate || 0))}%` }}
          />
        </div>
      </div>

      {/* 3. Trades Triggered */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Trades Triggered</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {summary.trades_triggered || 0}
          </span>
          <span className="text-xs text-slate-400">
            of {summary.total_signals || 0} signals
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          <span>Closed: {summary.closed || 0} • Open: {summary.open || 0}</span>
        </div>
      </div>

      {/* 4. Target Hit */}
      <div className="p-4 rounded-xl bg-emerald-950/15 border border-emerald-900/30 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-emerald-400/80 mb-1">
          <span className="font-medium">Target Hit (2R)</span>
          <Target className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
            {summary.target_hits || 0}
          </span>
          <span className="text-xs text-emerald-500/70">
            🎯 +2.0R each
          </span>
        </div>
        <div className="text-[11px] text-emerald-400/60 mt-1">
          Max profit targets reached
        </div>
      </div>

      {/* 5. Stop Loss Hit */}
      <div className="p-4 rounded-xl bg-rose-950/15 border border-rose-900/30 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-rose-400/80 mb-1">
          <span className="font-medium">Stop Loss Hit</span>
          <ShieldAlert className="h-4 w-4 text-rose-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-rose-400 tracking-tight">
            {summary.stop_losses || 0}
          </span>
          <span className="text-xs text-rose-500/70">
            🛑 -1.0R each
          </span>
        </div>
        <div className="text-[11px] text-rose-400/60 mt-1">
          Protected by strict ATR stop
        </div>
      </div>

      {/* 6. Time Exits & Cancelled */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
          <span className="font-medium">Time Exits / Expired</span>
          <Timer className="h-4 w-4 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono text-amber-300 tracking-tight">
            {summary.time_exits || 0}
          </span>
          <span className="text-xs text-slate-400">
            / {summary.cancelled || 0} canc.
          </span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          15:15 IST Square-off
        </div>
      </div>
    </div>
  );
}
