import React from 'react';
import { formatCurrency, formatRGain, getRGainColor, getStatusBadge } from '../../utils/formatters';

export default function ShortlistCard({ setup }) {
  const {
    symbol,
    side,
    time,
    timeframe = '5m',
    ratio = 2.0,
    rel_vol,
    level_cleared,
    entry,
    stop,
    target,
    risk,
    current_price,
    status,
    r_gain,
  } = setup;

  const isLong = side === 'LONG';
  const sideBadgeClass = isLong
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : 'bg-red-500/10 text-red-400 border-red-500/30';

  const statusInfo = getStatusBadge(status);
  const rGainText = formatRGain(r_gain);
  const rGainColor = getRGainColor(r_gain);

  // Dynamic progress bar percentage based on user ratio
  const maxRatio = Number(ratio) || 2.0;
  const barPercent = Math.min(100, Math.max(0, (r_gain / maxRatio) * 100));

  return (
    <div className="bg-brand-card border border-emerald-500/35 hover:border-emerald-500/70 rounded-xl p-4.5 space-y-3.5 shadow-lg transition pulse-card relative overflow-hidden">
      {/* CARD HEADER */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold font-mono text-white">{symbol}</h3>
            <span className={`px-2 py-0.5 text-xs font-bold rounded border ${sideBadgeClass}`}>
              {side}
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-brand-cardBorder">
              {timeframe}
            </span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
            <span>⏰ {time} IST</span>
            <span>•</span>
            <span className="text-cyan-400 font-semibold">{rel_vol}x Vol</span>
            <span>•</span>
            <span className="text-slate-300 font-medium">Cleared {level_cleared}</span>
          </div>
        </div>
        <div>
          <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* 3-COLUMN TRADE LEVELS */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-brand-cardBorder font-mono text-xs">
        <div>
          <span className="text-[10px] text-slate-500 uppercase block font-sans">Entry</span>
          <span className="font-bold text-slate-200">{formatCurrency(entry)}</span>
        </div>
        <div>
          <span className="text-[10px] text-red-400 uppercase block font-sans">Stop Loss</span>
          <span className="font-bold text-red-400">{formatCurrency(stop)}</span>
        </div>
        <div>
          <span className="text-[10px] text-emerald-400 uppercase block font-sans">Target (1:{ratio})</span>
          <span className="font-bold text-emerald-400">{formatCurrency(target)}</span>
        </div>
      </div>

      {/* CURRENT STATUS & PROGRESS BAR */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            LTP: <strong className="text-white font-mono">{formatCurrency(current_price)}</strong>{' '}
            <span className="text-slate-500">(Risk: {formatCurrency(risk)})</span>
          </span>
          <span className={`font-mono font-bold ${rGainColor}`}>
            {status === 'LIVE' ? `${rGainText} Gain` : (status === 'PENDING' ? 'Waiting Entry' : rGainText)}
          </span>
        </div>

        {/* DYNAMIC PROGRESS BAR */}
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-brand-cardBorder">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              status === 'PENDING'
                ? 'bg-amber-400 w-full'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-400'
            }`}
            style={{ width: status === 'PENDING' ? '100%' : `${barPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
