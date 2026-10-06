import React from 'react';
import {
  Activity,
  Play,
  RotateCw,
  Clock,
  Layers,
  BarChart3,
  BookOpen,
  LineChart,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  timeframe,
  setTimeframe,
  status,
  isScanning,
  onScanClick,
  autoRefresh,
  setAutoRefresh,
  lastUpdated
}) {
  const timeframes = [5, 10, 15];

  return (
    <header className="bg-[#0b1329] border-b border-slate-800/80 sticky top-0 z-40 backdrop-blur-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Strategy Title */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">NIFTY 50</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  NOISE BREAKOUT
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                In-Play Opening RVOL • 14D Volatility Bands • 1:2 Risk/Reward
              </p>
            </div>
          </div>

          {/* Controls: Timeframe, Scan Now, Auto Refresh, Market Time */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Timeframe Selector */}
            <div className="bg-slate-900/90 p-1 rounded-lg border border-slate-800 flex items-center gap-1">
              <span className="text-[11px] font-mono text-slate-400 px-1.5 hidden md:inline">TF:</span>
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  disabled={isScanning}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all font-mono ${
                    timeframe === tf
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tf}m
                </button>
              ))}
            </div>

            {/* Run Scan Button */}
            <button
              onClick={onScanClick}
              disabled={isScanning}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isScanning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-95'
              }`}
            >
              {isScanning ? (
                <>
                  <RotateCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  <span className="hidden sm:inline">Scanning...</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Scan Now</span>
                </>
              )}
            </button>

            {/* Auto Refresh Toggle */}
            <div className="hidden lg:flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800 text-xs text-slate-300">
              <RotateCw className={`h-3 w-3 ${autoRefresh > 0 ? 'text-emerald-400 animate-spin' : 'text-slate-500'}`} style={{ animationDuration: '6s' }} />
              <select
                value={autoRefresh}
                onChange={(e) => setAutoRefresh(Number(e.target.value))}
                className="bg-transparent text-slate-300 text-xs focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-slate-900 text-slate-300">Auto: Off</option>
                <option value={15} className="bg-slate-900 text-slate-300">Auto: 15s</option>
                <option value={30} className="bg-slate-900 text-slate-300">Auto: 30s</option>
                <option value={60} className="bg-slate-900 text-slate-300">Auto: 60s</option>
              </select>
            </div>

            {/* Market Status Pill & Countdown */}
            <div className="hidden md:flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${status?.market_open ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                <span className="text-[11px] font-semibold text-slate-300">
                  {status?.market_open ? 'MARKET LIVE' : 'MARKET CLOSED'}
                </span>
              </div>
              
              {status?.market_open && status?.next_candle_secs > 0 && (
                <>
                  <div className="h-3 w-px bg-slate-700" />
                  <div className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-amber-400 animate-pulse" />
                    <span>Next Candle: {Math.floor(status.next_candle_secs / 60)}m {status.next_candle_secs % 60}s</span>
                  </div>
                </>
              )}

              <div className="h-3 w-px bg-slate-700" />
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <span>{status?.time_str || '--:--:--'} IST</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 -mb-px overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'scanner'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Live Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('backtest')}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'backtest'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Backtest Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'chart'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <LineChart className="h-4 w-4" />
            <span>Stock Chart View</span>
          </button>

          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-2 py-2.5 px-3.5 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${
              activeTab === 'rules'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Strategy Rules</span>
          </button>
        </div>
      </div>
    </header>
  );
}
