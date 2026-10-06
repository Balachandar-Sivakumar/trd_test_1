/**
 * Formatting helpers for prices, gains, and numbers.
 */

export function formatCurrency(val) {
  if (val === undefined || val === null) return '--';
  return '₹' + Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRGain(gain) {
  if (gain === undefined || gain === null) return '0.00R';
  const num = Number(gain);
  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}R`;
}

export function getRGainColor(gain) {
  const num = Number(gain);
  if (num > 0) return 'text-emerald-400';
  if (num < 0) return 'text-red-400';
  return 'text-slate-400';
}

export function getStatusBadge(status) {
  switch (status) {
    case 'LIVE':
      return {
        label: 'LIVE ⚡',
        className: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      };
    case 'PENDING':
      return {
        label: 'PENDING ⏳',
        className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      };
    case 'TARGET HIT':
      return {
        label: 'TARGET HIT 🎯',
        className: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      };
    case 'STOPPED':
      return {
        label: 'STOPPED 🛑',
        className: 'bg-red-500/20 text-red-300 border border-red-500/30',
      };
    case 'INVALID':
      return {
        label: 'INVALID ❌',
        className: 'bg-slate-800/80 text-slate-500 border border-slate-700',
      };
    default:
      return {
        label: status || 'UNKNOWN',
        className: 'bg-slate-800 text-slate-400 border border-slate-700',
      };
  }
}
