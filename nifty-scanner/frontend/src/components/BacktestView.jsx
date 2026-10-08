import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Calendar,
  Layers,
  Search,
  Filter,
  ArrowUpDown,
  RotateCcw,
  CheckCircle2,
  Timer,
  ChevronLeft,
  ChevronRight,
  LineChart,
  RefreshCw
} from 'lucide-react';
import { fetchBacktest, fetchBacktestStatus, refreshBacktest } from '../services/api';

export default function BacktestView({ timeframe, setTimeframe, onSelectStock }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'trades' | 'symbols'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredTrade, setHoveredTrade] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const pageSize = 25;

  useEffect(() => {
    loadBacktestData(timeframe);
  }, [timeframe]);

  // While the server regenerates the backtest, poll its status and reload when done
  useEffect(() => {
    if (!refreshing) return;
    const timer = setInterval(async () => {
      try {
        const st = await fetchBacktestStatus();
        if (st.running) return;
        setRefreshing(false);
        if (st.last_error) setError(`Backtest refresh failed: ${st.last_error}`);
        else loadBacktestData(timeframe);
      } catch (e) {
        // keep polling
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [refreshing, timeframe]);

  async function loadBacktestData(tf) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchBacktest(tf);
      setData(res);
      setCurrentPage(1);
      if (res.meta?.running) setRefreshing(true);
    } catch (err) {
      const st = await fetchBacktestStatus().catch(() => null);
      if (st?.running) setRefreshing(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    try {
      await refreshBacktest();
      setRefreshing(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Loading {timeframe}-minute backtest analytics...</p>
      </div>
    );
  }

  if (refreshing && (error || !data)) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Generating backtest from the latest market data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-rose-950/20 border border-rose-800/50 rounded-xl p-6 text-center text-rose-300">
        <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-rose-400" />
        <p className="font-semibold">Failed to load backtest data</p>
        <p className="text-xs text-rose-400/80 mt-1">{error}</p>
        <button
          onClick={() => loadBacktestData(timeframe)}
          className="mt-4 px-4 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, equity_curve, trades, by_symbol, meta = {} } = data;

  // Filter trades
  let filteredTrades = trades || [];
  if (statusFilter !== 'ALL') {
    filteredTrades = filteredTrades.filter(t => t.status === statusFilter);
  }
  if (search.trim()) {
    const q = search.trim().toUpperCase();
    filteredTrades = filteredTrades.filter(t => t.symbol.toUpperCase().includes(q));
  }

  const totalPages = Math.ceil(filteredTrades.length / pageSize);
  const paginatedTrades = filteredTrades.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // SVG Chart Dimensions & Scale calculations
  const chartWidth = 900;
  const chartHeight = 280;
  const padding = { top: 20, right: 30, bottom: 30, left: 50 };

  const cumValues = equity_curve.map(d => d.cum_R);
  const minR = Math.min(0, Math.min(...cumValues));
  const maxR = Math.max(5, Math.max(...cumValues) * 1.1);

  const getX = (idx) => {
    return padding.left + (idx / Math.max(1, equity_curve.length - 1)) * (chartWidth - padding.left - padding.right);
  };

  const getY = (val) => {
    const range = maxR - minR || 1;
    return chartHeight - padding.bottom - ((val - minR) / range) * (chartHeight - padding.top - padding.bottom);
  };

  const points = equity_curve.map((d, i) => `${getX(i)},${getY(d.cum_R)}`).join(' ');
  const zeroY = getY(0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Timeframe Switcher & Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>In-Play Breakout Backtest Results</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {timeframe}-MIN CANDLES
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {meta.symbols ?? '–'} NIFTY stocks • trades on {summary.days} days • data {meta.data_from ?? '–'} → {meta.data_to ?? '–'} ({meta.sessions ?? '–'} sessions)
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
            <span>
              {refreshing ? 'Updating with latest data...' : `Last updated ${meta.updated_at ?? 'unknown'} IST • auto-refreshes daily after market close`}
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              title="Re-download data and re-run the backtest"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <span className="text-xs text-slate-500 px-2 font-mono">TF:</span>
          {[5, 10, 15].map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-md transition-all ${
                timeframe === tf
                  ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tf}m
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Net R */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-emerald-500/30 glow-green">
          <div className="text-[11px] text-slate-400 mb-1">Total Net R-Gain</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {summary.total_net_R > 0 ? `+${summary.total_net_R}` : summary.total_net_R}R
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Avg: {summary.avg_net_R > 0 ? `+${summary.avg_net_R}` : summary.avg_net_R}R / trade
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 mb-1">Win Rate</div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {summary.win_rate}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {summary.wins} Wins / {summary.losses} Losses
          </div>
        </div>

        {/* Target Hit Rate */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] text-emerald-400/80 mb-1">Target Hits (2R)</div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {summary.target_hit_pct}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            {summary.target_hits} trades reached +2R
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] text-rose-400/80 mb-1">Max Drawdown</div>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {summary.max_drawdown}R
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Peak to trough net R drop
          </div>
        </div>

        {/* Profit Factor */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 mb-1">Profit Factor</div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {summary.profit_factor}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Gross wins / Gross losses
          </div>
        </div>

        {/* Consistency: 1st vs 2nd Half */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="text-[11px] text-slate-400 mb-1">Stability (1H / 2H)</div>
          <div className="text-sm font-bold font-mono text-white mt-1">
            <span className="text-emerald-400">{summary.first_half_avg_R}R</span> / <span className="text-emerald-400">{summary.second_half_avg_R}R</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Average R per half
          </div>
        </div>
      </div>

      {/* Sub Tabs: Equity Curve / Trades History / Performance By Symbol */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('chart')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'chart'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Equity Curve Chart
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'trades'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Trades List ({trades.length})
        </button>
        <button
          onClick={() => setActiveTab('symbols')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'symbols'
              ? 'bg-emerald-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Breakdown By Symbol ({by_symbol?.length || 0})
        </button>
      </div>

      {/* 1. EQUITY CURVE CHART VIEW */}
      {activeTab === 'chart' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Cumulative Net R-Multiple Progression</h3>
              <p className="text-xs text-slate-400">Total {equity_curve.length - 1} trades triggered across {summary.days} trading days</p>
            </div>
            {hoveredTrade && (
              <div className="bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 font-mono text-xs flex items-center gap-3">
                <span className="text-white font-bold">{hoveredTrade.symbol}</span>
                <span className="text-slate-400">{hoveredTrade.date}</span>
                <span className={hoveredTrade.net_R > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  Net: {hoveredTrade.net_R > 0 ? `+${hoveredTrade.net_R}` : hoveredTrade.net_R}R
                </span>
                <span className="text-cyan-400 font-bold">
                  Cum: {hoveredTrade.cum_R}R
                </span>
              </div>
            )}
          </div>

          {/* SVG Line Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto min-w-[700px] select-none"
            >
              {/* Grid Lines */}
              <line
                x1={padding.left}
                y1={zeroY}
                x2={chartWidth - padding.right}
                y2={zeroY}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <line
                x1={padding.left}
                y1={padding.top}
                x2={chartWidth - padding.right}
                y2={padding.top}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <line
                x1={padding.left}
                y1={chartHeight - padding.bottom}
                x2={chartWidth - padding.right}
                y2={chartHeight - padding.bottom}
                stroke="#1e293b"
                strokeWidth="1"
              />

              {/* Y-Axis Labels */}
              <text x={padding.left - 8} y={getY(maxR)} fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">
                +{maxR.toFixed(0)}R
              </text>
              <text x={padding.left - 8} y={zeroY + 3} fill="#94a3b8" fontSize="10" textAnchor="end" fontFamily="monospace">
                0R
              </text>
              {minR < 0 && (
                <text x={padding.left - 8} y={getY(minR)} fill="#f43f5e" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {minR.toFixed(0)}R
                </text>
              )}

              {/* Area fill */}
              <polygon
                points={`${padding.left},${zeroY} ${points} ${getX(equity_curve.length - 1)},${zeroY}`}
                fill="rgba(16, 185, 129, 0.08)"
              />

              {/* Equity Line */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />

              {/* Interactive Hover Dots */}
              {equity_curve.map((d, i) => {
                if (i === 0) return null;
                const cx = getX(i);
                const cy = getY(d.cum_R);
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={hoveredTrade?.trade === d.trade ? 5 : 2}
                    fill={d.net_R > 0 ? '#10b981' : '#f43f5e'}
                    className="cursor-pointer transition-all hover:r-5"
                    onMouseEnter={() => setHoveredTrade(d)}
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono mt-2 pt-2 border-t border-slate-800">
            <span>Trade #1 ({equity_curve[1]?.date})</span>
            <span className="text-slate-400">Hover over any data point to inspect individual trade performance</span>
            <span>Trade #{equity_curve.length - 1} ({equity_curve[equity_curve.length - 1]?.date})</span>
          </div>
        </div>
      )}

      {/* 2. TRADES LIST VIEW */}
      {activeTab === 'trades' && (
        <div className="space-y-3">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter stock..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="TARGET HIT">Target Hit (+2R)</option>
                <option value="STOP LOSS HIT">Stop Loss (-1R)</option>
                <option value="TIME EXIT">Time Exit (15:15)</option>
              </select>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Showing {paginatedTrades.length} of {filteredTrades.length} trades
            </div>
          </div>

          {/* Table */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Stock</th>
                    <th className="py-2.5 px-4">Side</th>
                    <th className="py-2.5 px-4 text-right">Entry</th>
                    <th className="py-2.5 px-4 text-right">Stop</th>
                    <th className="py-2.5 px-4 text-right">Target</th>
                    <th className="py-2.5 px-4 text-right">Exit Price</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Net R</th>
                    <th className="py-2.5 px-4 text-center">Chart</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {paginatedTrades.map((t, idx) => {
                    const isWin = t.net_R > 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2 px-4 text-slate-400">{t.date}</td>
                        <td className="py-2 px-4 font-bold text-white">{t.symbol}</td>
                        <td className="py-2 px-4">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.side === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {t.side}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right text-slate-300">₹{t.entry}</td>
                        <td className="py-2 px-4 text-right text-rose-400">₹{t.stop}</td>
                        <td className="py-2 px-4 text-right text-emerald-400">₹{t.target}</td>
                        <td className="py-2 px-4 text-right text-slate-200">₹{t.exit_price || '-'}</td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            t.status === 'TARGET HIT'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : t.status === 'STOP LOSS HIT'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className={`py-2 px-4 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {t.net_R > 0 ? `+${t.net_R}` : t.net_R}R
                        </td>
                        <td className="py-2 px-4 text-center">
                          <button
                            onClick={() => onSelectStock(t.symbol)}
                            className="p-1 text-slate-400 hover:text-emerald-400 transition-colors"
                          >
                            <LineChart className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-950/60 border-t border-slate-800 text-xs">
                <span className="text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded bg-slate-800 text-slate-300 disabled:opacity-50 hover:bg-slate-700"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. BREAKDOWN BY SYMBOL VIEW */}
      {activeTab === 'symbols' && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Stock Symbol</th>
                  <th className="py-3 px-4 text-right">Trades Count</th>
                  <th className="py-3 px-4 text-right">Wins</th>
                  <th className="py-3 px-4 text-right">Win Rate</th>
                  <th className="py-3 px-4 text-right">Cumulative Net R</th>
                  <th className="py-3 px-4 text-center">Chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {by_symbol && by_symbol.map((item, idx) => {
                  const isPositive = item.net_R >= 0;
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-4 text-slate-500 font-bold">#{idx + 1}</td>
                      <td className="py-2.5 px-4 font-bold text-white">{item.symbol}</td>
                      <td className="py-2.5 px-4 text-right text-slate-300">{item.trades}</td>
                      <td className="py-2.5 px-4 text-right text-emerald-400">{item.wins}</td>
                      <td className="py-2.5 px-4 text-right text-cyan-300">{item.win_rate}%</td>
                      <td className={`py-2.5 px-4 text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.net_R > 0 ? `+${item.net_R}` : item.net_R}R
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
