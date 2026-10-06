import React from 'react';
import { Flame, LineChart, ExternalLink } from 'lucide-react';

export default function TopInPlay({ top10, onSelectStock, selectedStock }) {
  if (!top10 || top10.length === 0) return null;

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 mb-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Top 10 In-Play Stocks Today
          </h2>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            (Opening RVOL 09:15–09:30 vs 14-day slot average)
          </span>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Only top 10 are scanned for breakouts
        </span>
      </div>

      {/* Grid of In-Play Stocks */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
        {top10.map((item) => {
          const isSelected = selectedStock === item.symbol;
          const rvol = item.opening_rvol;
          const isHigh = rvol >= 3.0;
          const isMed = rvol >= 2.0;

          return (
            <button
              key={item.symbol}
              onClick={() => onSelectStock && onSelectStock(item.symbol)}
              className={`p-2 rounded-lg border text-left transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-mono text-slate-400 font-bold">#{item.rank}</span>
                <LineChart className="h-3 w-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
              </div>
              <div className="font-bold text-xs truncate text-white">
                {item.symbol}
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-slate-400 text-[10px]">RVOL:</span>
                <span className={`font-mono font-semibold ${
                  isHigh ? 'text-amber-400' : isMed ? 'text-emerald-400' : 'text-slate-300'
                }`}>
                  {rvol}x
                </span>
              </div>
              
              {/* RVOL visual indicator bar */}
              <div className="w-full bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    isHigh ? 'bg-amber-400' : isMed ? 'bg-emerald-400' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, (rvol / 5.0) * 100)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
