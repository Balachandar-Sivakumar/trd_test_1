import React, { useState, useMemo } from 'react';
import TableFilters from './TableFilters';
import TableRow from './TableRow';

export default function SetupsTable({ results = [], lastScanTime = '--' }) {
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Counts for filter tabs
  const counts = useMemo(() => {
    return {
      all: results.length,
      shortlist: results.filter((r) => r.is_shortlist).length,
      live: results.filter((r) => r.status === 'LIVE').length,
      pending: results.filter((r) => r.status === 'PENDING').length,
      targetHit: results.filter((r) => r.status === 'TARGET HIT').length,
      stopped: results.filter((r) => r.status === 'STOPPED').length,
    };
  }, [results]);

  // Filtered and searched data
  const filteredResults = useMemo(() => {
    let list = results;

    // Filter by tab
    if (activeFilter === 'SHORTLIST') {
      list = list.filter((r) => r.is_shortlist);
    } else if (activeFilter !== 'ALL') {
      list = list.filter((r) => r.status === activeFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toUpperCase();
      list = list.filter((r) => r.symbol.toUpperCase().includes(term));
    }

    return list;
  }, [results, activeFilter, searchTerm]);

  return (
    <section className="bg-brand-card border border-brand-cardBorder rounded-xl overflow-hidden shadow-xl">
      {/* FILTER CONTROLS */}
      <TableFilters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        counts={counts}
      />

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-brand-cardBorder bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Symbol</th>
              <th className="py-3 px-3">Side</th>
              <th className="py-3 px-3">Signal Time</th>
              <th className="py-3 px-3">Rel Vol</th>
              <th className="py-3 px-3">Level Cleared</th>
              <th className="py-3 px-3 font-mono">Entry</th>
              <th className="py-3 px-3 font-mono">Stop (ATR Clamped)</th>
              <th className="py-3 px-3 font-mono">Target (1:2)</th>
              <th className="py-3 px-3 font-mono">Risk</th>
              <th className="py-3 px-3 font-mono">LTP</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 font-mono text-right">R-Gain</th>
              <th className="py-3 px-4 text-center">Shortlist</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-cardBorder/60 text-slate-300">
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center py-12 text-slate-500">
                  No breakout setups matching current criteria.
                </td>
              </tr>
            ) : (
              filteredResults.map((setup) => (
                <TableRow key={setup.symbol} setup={setup} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="p-3 border-t border-brand-cardBorder bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
        <span>
          Last Scan: <strong className="text-slate-200">{lastScanTime || '--'}</strong>
        </span>
        <span>Auto-refreshes every 5-min candle interval</span>
      </div>
    </section>
  );
}
