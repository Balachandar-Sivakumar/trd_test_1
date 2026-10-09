import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  LineChart,
  LayoutGrid,
  List,
  Search,
  Timer
} from 'lucide-react';

export default function LiveSignals({ signals, waits, onSelectStock }) {
  const [filter, setFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  // Group counts
  const targetHits = signals.filter(s => s.status === 'TARGET HIT');
  const stopLosses = signals.filter(s => s.status === 'STOP LOSS HIT');
  const timeExits = signals.filter(s => s.status === 'TIME EXIT');
  const openTrades = signals.filter(s => s.status === 'OPEN');
  const pendingOrders = signals.filter(s => s.status === 'ENTRY PENDING');
  const cancelledOrders = signals.filter(s => s.status === 'CANCELLED');

  // Filter logic
  let filteredSignals = signals;
  if (filter === 'TARGET_HIT') filteredSignals = targetHits;
  else if (filter === 'STOP_LOSS') filteredSignals = stopLosses;
  else if (filter === 'TIME_EXIT') filteredSignals = timeExits;
  else if (filter === 'OPEN') filteredSignals = openTrades;
  else if (filter === 'PENDING') filteredSignals = pendingOrders;
  else if (filter === 'CANCELLED') filteredSignals = cancelledOrders;

  if (search.trim()) {
    const q = search.trim().toUpperCase();
    filteredSignals = filteredSignals.filter(s => s.symbol.toUpperCase().includes(q));
  }

  const getStatusBadge = (status, netR) => {
    switch (status) {
      case 'TARGET HIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Target className="h-3 w-3" /> TARGET HIT {netR !== null ? `(+${netR}R)` : ''}
          </span>
        );
      case 'STOP LOSS HIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-3 w-3" /> STOP HIT {netR !== null ? `(${netR}R)` : ''}
          </span>
        );
      case 'TIME EXIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Timer className="h-3 w-3" /> TIME EXIT {netR !== null ? `(${netR}R)` : ''}
          </span>
        );
      case 'OPEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 animate-pulse">
            <Clock className="h-3 w-3" /> OPEN TRADE
          </span>
        );
      case 'ENTRY PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <AlertTriangle className="h-3 w-3" /> ENTRY PENDING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="h-3 w-3" /> CANCELLED
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and View Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'ALL'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Signals ({signals.length})
          </button>
          
          <button
            onClick={() => setFilter('TARGET_HIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              filter === 'TARGET_HIT'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
            }`}
          >
            <Target className="h-3 w-3 text-emerald-400" />
            <span>Target Hit ({targetHits.length})</span>
          </button>

          <button
            onClick={() => setFilter('STOP_LOSS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              filter === 'STOP_LOSS'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="h-3 w-3 text-rose-400" />
            <span>Stop Loss ({stopLosses.length})</span>
          </button>

          <button
            onClick={() => setFilter('TIME_EXIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
              filter === 'TIME_EXIT'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
            }`}
          >
            <Timer className="h-3 w-3 text-amber-400" />
            <span>Time Exit ({timeExits.length})</span>
          </button>

          {pendingOrders.length > 0 && (
            <button
              onClick={() => setFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                filter === 'PENDING'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  : 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
              }`}
            >
              <AlertTriangle className="h-3 w-3 text-cyan-400" />
              <span>Pending ({pendingOrders.length})</span>
            </button>
          )}

          {cancelledOrders.length > 0 && (
            <button
              onClick={() => setFilter('CANCELLED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all ${
                filter === 'CANCELLED'
                  ? 'bg-slate-800 text-slate-200 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>Cancelled ({cancelledOrders.length})</span>
            </button>
          )}

          <button
            onClick={() => setFilter('WAIT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'WAIT'
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Waiting ({waits?.length || 0})
          </button>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter stock..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-32 sm:w-40"
            />
          </div>

          <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md ${viewMode === 'table' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'}`}
              title="Detailed Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Show Waiting List if selected */}
      {filter === 'WAIT' ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            Top 10 Stocks Waiting For Valid Breakout
          </h3>
          <div className="divide-y divide-slate-800/80">
            {waits && waits.map((item, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-sm">{item.symbol}</span>
                  <span className="text-slate-400">{item.reason}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-slate-300">₹{item.current_price?.toLocaleString('en-IN') || '-'}</span>
                  <button
                    onClick={() => onSelectStock(item.symbol)}
                    className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    <LineChart className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-xl">
          <Target className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No signals match the selected filter.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSignals.map((item, idx) => {
            const isBuy = item.side === 'BUY';
            const isRev = item.trigger === 'REVERSAL';
            const rr = isRev ? 1.2 : 2;
            const isExpanded = expandedId === idx;
            const netR = item.net_R;
            const isWin = (netR || 0) > 0;
            const isLoss = (netR || 0) < 0;

            return (
              <div
                key={idx}
                className={`bg-slate-900/80 border rounded-xl p-4 transition-all hover:border-slate-700/80 ${
                  item.status === 'TARGET HIT'
                    ? 'border-emerald-500/30 bg-emerald-950/5'
                    : item.status === 'STOP LOSS HIT'
                    ? 'border-rose-500/30 bg-rose-950/5'
                    : item.status === 'OPEN'
                    ? 'border-blue-500/30 bg-blue-950/5'
                    : 'border-slate-800'
                }`}
              >
                {/* Header: Symbol, Side, Time, Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-white">{item.symbol}</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${
                      isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {item.side}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.signal_candle}
                    </span>
                  </div>
                  <button
                    onClick={() => onSelectStock(item.symbol)}
                    className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                    title="View Stock Chart"
                  >
                    <LineChart className="h-4 w-4" />
                  </button>
                </div>

                {/* Status Badge */}
                <div className="mb-3">
                  {getStatusBadge(item.status, item.net_R)}
                </div>

                {/* Price Levels Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-mono text-center text-xs mb-3">
                  <div>
                    <span className="text-[10px] text-slate-500 block uppercase">Entry</span>
                    <span className="font-semibold text-slate-200">₹{item.entry?.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-400 block uppercase">Stop (-1R)</span>
                    <span className="font-semibold text-rose-400">₹{item.stop?.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 block uppercase">Target (+{rr}R)</span>
                    <span className="font-semibold text-emerald-400">₹{item.target?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* R-Progress Visualization Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>Stop (-1R)</span>
                    <span>Entry (0R)</span>
                    <span>Target (+{rr}R)</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative flex">
                    <div className="bg-rose-500/40 border-r border-slate-700" style={{ width: `${100 / (1 + rr)}%` }} />
                    <div className="bg-emerald-500/40" style={{ width: `${100 * rr / (1 + rr)}%` }} />
                    {/* Fill marker if hit */}
                    {item.status === 'TARGET HIT' && (
                      <div className="absolute inset-y-0 right-0 w-3 bg-emerald-400 rounded-r shadow-sm" />
                    )}
                    {item.status === 'STOP LOSS HIT' && (
                      <div className="absolute inset-y-0 left-0 w-3 bg-rose-500 rounded-l shadow-sm" />
                    )}
                  </div>
                </div>

                {/* Outcome Stats or Trigger Details */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Risk:</span>
                    <span className="text-slate-300 font-mono">₹{item.risk} ({item.risk_pct}%)</span>
                  </div>
                  {item.net_R !== null && (
                    <div className="font-mono font-bold">
                      <span className={item.net_R > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {item.net_R > 0 ? `+${item.net_R}` : item.net_R}R Net
                      </span>
                    </div>
                  )}
                </div>

                {/* Expandable Breakdown Button */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : idx)}
                  className="w-full mt-2 pt-2 text-[11px] text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Signal Criteria Checklist</span>
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {/* Collapsible Checklist */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] space-y-1.5 bg-slate-950/40 p-2 rounded">
                    <div className="flex items-center justify-between text-slate-300">
                      <span>✓ Top 10 In-Play (Opening RVOL)</span>
                      <span className="font-mono text-emerald-400 font-semibold">{item.opening_rvol}x</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>✓ Signal Candle ToD RVOL (≥ {isRev ? '1.5' : '2.0'}x)</span>
                      <span className="font-mono text-emerald-400 font-semibold">{item.tod_rvol}x</span>
                    </div>
                    {isRev ? (
                      <div className="flex items-center justify-between text-slate-300">
                        <span>✓ Noise Band Reversal</span>
                        <span className="font-mono text-slate-300">
                          {isBuy ? 'Down-day bounced 1.5%+, higher low' : 'Up-day faded 1.5%+, lower high'}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-slate-300">
                        <span>✓ Noise Band Breakout</span>
                        <span className="font-mono text-slate-300">
                          {isBuy ? `Close > Upper ₹${item.upper}` : `Close < Lower ₹${item.lower}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-slate-300">
                      <span>✓ {isRev ? `3 Closes ${isBuy ? 'Above' : 'Below'} VWAP` : 'VWAP Trend Alignment'}</span>
                      <span className="font-mono text-slate-300">VWAP ₹{item.vwap}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>✓ EMA 9 / 21 Trend</span>
                      <span className="font-mono text-slate-300">EMA9 ₹{item.ema9} vs EMA21 ₹{item.ema21}</span>
                    </div>
                    {item.entry_time && (
                      <div className="flex items-center justify-between text-slate-400 pt-1 border-t border-slate-800">
                        <span>Entry Time:</span>
                        <span className="font-mono">{item.entry_time} IST</span>
                      </div>
                    )}
                    {item.exit_time && (
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Exit Time:</span>
                        <span className="font-mono">{item.exit_time} IST (₹{item.exit_price})</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* COMPACT TABLE VIEW */
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Time</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Side</th>
                  <th className="py-3 px-4 text-right">Entry</th>
                  <th className="py-3 px-4 text-right">Stop</th>
                  <th className="py-3 px-4 text-right">Target</th>
                  <th className="py-3 px-4 text-right">Risk %</th>
                  <th className="py-3 px-4 text-right">ToD RVOL</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Net R</th>
                  <th className="py-3 px-4 text-center">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSignals.map((item, idx) => {
                  const isBuy = item.side === 'BUY';
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400">{item.signal_candle}</td>
                      <td className="py-2.5 px-4 font-bold text-white">{item.symbol}</td>
                      <td className="py-2.5 px-4">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {item.side}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-200">₹{item.entry?.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right text-rose-400">₹{item.stop?.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-400">₹{item.target?.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right text-slate-400">{item.risk_pct}%</td>
                      <td className="py-2.5 px-4 text-right text-cyan-400">{item.tod_rvol}x</td>
                      <td className="py-2.5 px-4">{getStatusBadge(item.status, null)}</td>
                      <td className="py-2.5 px-4 text-right font-bold">
                        {item.net_R !== null ? (
                          <span className={item.net_R > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {item.net_R > 0 ? `+${item.net_R}` : item.net_R}R
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => onSelectStock(item.symbol)}
                          className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                          <LineChart className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
