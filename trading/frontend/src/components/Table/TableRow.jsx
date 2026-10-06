import React from 'react';
import { formatCurrency, formatRGain, getRGainColor, getStatusBadge } from '../../utils/formatters';

export default function TableRow({ setup }) {
  const {
    symbol,
    side,
    time,
    rel_vol,
    level_cleared,
    entry,
    stop,
    target,
    risk,
    current_price,
    status,
    r_gain,
    is_shortlist,
  } = setup;

  const isLong = side === 'LONG';
  const sideBadgeClass = isLong
    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
    : 'bg-red-500/10 text-red-400 border border-red-500/20';

  const statusInfo = getStatusBadge(status);
  const rGainText = formatRGain(r_gain);
  const rGainColor = getRGainColor(r_gain);

  return (
    <tr className="hover:bg-slate-800/40 transition">
      <td className="py-3 px-4 font-bold font-mono text-white">{symbol}</td>
      <td className="py-3 px-3">
        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${sideBadgeClass}`}>
          {side}
        </span>
      </td>
      <td className="py-3 px-3 text-slate-300">{time}</td>
      <td className="py-3 px-3 font-mono font-semibold text-cyan-400">{rel_vol}x</td>
      <td className="py-3 px-3 font-medium text-slate-300">{level_cleared}</td>
      <td className="py-3 px-3 font-mono text-slate-200">{formatCurrency(entry)}</td>
      <td className="py-3 px-3 font-mono text-red-400">{formatCurrency(stop)}</td>
      <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
        {formatCurrency(target)}
      </td>
      <td className="py-3 px-3 font-mono text-slate-400">{formatCurrency(risk)}</td>
      <td className="py-3 px-3 font-mono font-bold text-white">
        {formatCurrency(current_price)}
      </td>
      <td className="py-3 px-3">
        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusInfo.className}`}>
          {statusInfo.label}
        </span>
      </td>
      <td className={`py-3 px-3 font-mono font-bold text-right ${rGainColor}`}>
        {rGainText}
      </td>
      <td className="py-3 px-4 text-center">
        {is_shortlist ? (
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
            ⭐ YES
          </span>
        ) : (
          <span className="text-slate-600">NO</span>
        )}
      </td>
    </tr>
  );
}
