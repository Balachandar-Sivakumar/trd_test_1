import React from 'react';
import { Search } from 'lucide-react';

export default function TableFilters({
  activeFilter,
  onFilterChange,
  searchTerm,
  onSearchChange,
  counts = {},
}) {
  const filterTabs = [
    { id: 'ALL', label: `All (${counts.all || 0})` },
    { id: 'SHORTLIST', label: `⭐ Shortlist (${counts.shortlist || 0})` },
    { id: 'LIVE', label: `LIVE (${counts.live || 0})` },
    { id: 'PENDING', label: `Pending (${counts.pending || 0})` },
    { id: 'TARGET HIT', label: `Target Hit (${counts.targetHit || 0})` },
    { id: 'STOPPED', label: `Stopped (${counts.stopped || 0})` },
  ];

  return (
    <div className="p-4 border-b border-brand-cardBorder flex flex-wrap items-center justify-between gap-3">
      {/* FILTER TABS */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-semibold text-slate-400 mr-1 uppercase tracking-wider">
          Filter:
        </span>
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onFilterChange(tab.id)}
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

      {/* SEARCH BAR */}
      <div className="relative w-full sm:w-64">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search symbol (e.g. RELIANCE)..."
          className="w-full bg-slate-900 border border-brand-cardBorder rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
      </div>
    </div>
  );
}
