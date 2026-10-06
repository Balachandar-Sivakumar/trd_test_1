import React from 'react';
import HistoryStats from './HistoryStats';
import HistoryTable from './HistoryTable';

export default function HistorySection({ historyData, onClearHistory }) {
  return (
    <div className="space-y-6">
      {/* KPI METRICS */}
      <HistoryStats summary={historyData} />

      {/* DETAILED HISTORY TABLE */}
      <HistoryTable
        history={historyData.history || []}
        onClearHistory={onClearHistory}
      />
    </div>
  );
}
