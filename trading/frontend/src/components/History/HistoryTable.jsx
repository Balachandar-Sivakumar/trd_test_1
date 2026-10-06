import React, { useState, useMemo } from 'react';
import { Search, Trash2 } from 'lucide-react';
import { formatCurrency, formatRGain, getRGainColor, getStatusBadge } from '../../utils/formatters';

export default function HistoryTable({ history = [], onClearHistory }) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const filterTabs = [
    { id: 'ALL', label: `All (${history.length})` },
    {
      id: 'TARGET HIT',
      label: `Target Hit 🎯 (${history.filter((h) => h.status === 'TARGET HIT').length})`,
    },
    {
      id: 'STOPPED',
      label: `Stopped 🛑 (${history.filter((h) => h.status === 'STOPPED').length})`,
    },
    {
      id: 'INVALID',
      label: `Invalid ❌ (${history.filter((h) => h.status === 'INVALID').length})`,
    },
  ];

  const filteredHistory = useMemo(() => {
    let list = history;
    if (activeFilter !== 'ALL') {
      list = list.filter((h) => h.status === activeFilter);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toUpperCase();
      list = list.filter(
        (h) =>
          h.symbol.toUpperCase().includes(q) ||
          h.date.includes(q) ||
          (h.timeframe && h.timeframe.toUpperCase().includes(q))
      );
    }
    return list;
  }, [history, activeFilter, searchTerm]);

  return (
    <div className="bg-brand-card border border-brand-cardBorder rounded-xl overflow-hidden shadow-xl">
      {/* FILTER & ACTIONS BAR */}
      <div className="p-4 border-b border-brand-cardBorder flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 mr-1 uppercase tracking-wider">
            Filter:
          </span>
          {filterTabs.map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'border border-blue-500 bg-blue-500/10 text-blue-400 font-semibold'
                    : 'border border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* SEARCH INPUT */}
          <div className="relative flex-1 sm:w-60">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search symbol or date..."
              className="w-full bg-slate-900 border border-brand-cardBorder rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          {/* CLEAR HISTORY BUTTON */}
          {history.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all recorded trade history?')) {
                  onClearHistory();
                }
              }}
              className="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              title="Clear all trade history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-brand-cardBorder bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-3">Time</th>
              <th className="py-3 px-3">Symbol</th>
              <th className="py-3 px-3">Side</th>
              <th className="py-3 px-3">TF</th>
              <th className="py-3 px-3">1:R</th>
              <th className="py-3 px-3 font-mono">Entry</th>
              <th className="py-3 px-3 font-mono">Stop</th>
              <th className="py-3 px-3 font-mono">Target</th>
              <th className="py-3 px-3 font-mono">Risk</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-4 font-mono text-right">Net R</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-cardBorder/60 text-slate-300">
            {filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-12 text-slate-500">
                  No historical trade records found for this filter.
                </td>
              </tr>
            ) : (
              filteredHistory.map((h) => {
                const isLong = h.side === 'LONG';
                const sideBadgeClass = isLong
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20';

                const statusInfo = getStatusBadge(h.status);
                const rGainColor = getRGainColor(h.r_gain);

                return (
                  <tr key={h.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-400">{h.date}</td>
                    <td className="py-3 px-3 text-slate-300">{h.time}</td>
                    <td className="py-3 px-3 font-bold font-mono text-white">{h.symbol}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${sideBadgeClass}`}>
                        {h.side}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300 font-semibold">{h.timeframe || '5m'}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">1:{h.ratio || 2.0}</td>
                    <td className="py-3 px-3 font-mono text-slate-200">{formatCurrency(h.entry)}</td>
                    <td className="py-3 px-3 font-mono text-red-400">{formatCurrency(h.stop)}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">
                      {formatCurrency(h.target)}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{formatCurrency(h.risk)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className={`py-3 px-4 font-mono font-bold text-right ${rGainColor}`}>
                      {formatRGain(h.r_gain)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
