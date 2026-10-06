import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, RefreshCw, BookOpen, TrendingUp, History, BarChart3 } from 'lucide-react';
import CandleCountdown from './CandleCountdown';
import { getISTTime, isMarketOpen } from '../../utils/marketTime';

export default function Header({
  isScanning,
  onTriggerScan,
  soundEnabled,
  onToggleSound,
  onOpenRules,
  timeframe,
  onChangeTimeframe,
  ratio,
  onChangeRatio,
  activeView,
  onChangeView,
  historyCount = 0,
}) {
  const [istTime, setIstTime] = useState('--:--:--');
  const [marketStatus, setMarketStatus] = useState(false);

  const timeframes = ['3m', '5m', '10m', '15m'];
  const ratios = [
    { label: '1:1.5', val: 1.5 },
    { label: '1:2', val: 2.0 },
    { label: '1:2.5', val: 2.5 },
    { label: '1:3', val: 3.0 },
  ];

  useEffect(() => {
    const updateTime = () => {
      setIstTime(getISTTime());
      setMarketStatus(isMarketOpen());
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="border-b border-brand-cardBorder bg-brand-card/95 backdrop-blur sticky top-0 z-40 px-4 lg:px-8 py-3 space-y-3">
      {/* TOP ROW: BRANDING + TIME + STATUS + ACTIONS */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* LOGO & TITLE */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                NIFTY 50 • INTRADAY SCANNER
              </h1>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {timeframe} • 1:{ratio} R:R
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Rule-Based Volume Breakout (ORH/ORL • VWAP • EMA 9/21)
            </p>
          </div>
        </div>

        {/* STATUS & ACTIONS */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* IST CLOCK */}
          <div className="bg-slate-900/90 border border-brand-cardBorder px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-slate-400">IST:</span>
            <span className="font-mono font-semibold text-slate-200">{istTime}</span>
          </div>

          {/* MARKET STATUS BADGE */}
          <div
            className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 ${
              marketStatus
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                marketStatus ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            <span>{marketStatus ? 'NSE OPEN' : 'NSE CLOSED'}</span>
          </div>

          {/* CANDLE COUNTDOWN */}
          <CandleCountdown timeframe={timeframe} />

          {/* SOUND TOGGLE */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-lg border border-brand-cardBorder bg-slate-900/90 hover:bg-slate-800 text-slate-300 transition cursor-pointer"
            title={soundEnabled ? 'Mute alert sounds' : 'Enable audio alert chime'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* RULES BUTTON */}
          <button
            onClick={onOpenRules}
            className="px-3 py-1.5 rounded-lg border border-brand-cardBorder bg-slate-900/90 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Rules</span>
          </button>

          {/* SCAN NOW BUTTON */}
          <button
            onClick={onTriggerScan}
            disabled={isScanning}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-medium px-4 py-1.5 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Scanning...' : 'Scan Now'}</span>
          </button>
        </div>
      </div>

      {/* BOTTOM ROW: DYNAMIC TIMEFRAME & RATIO SELECTORS + VIEW TABS */}
      <div className="max-w-7xl mx-auto pt-2 border-t border-brand-cardBorder/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* VIEW TABS: SCANNER VS HISTORY */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-brand-cardBorder">
          <button
            onClick={() => onChangeView('scanner')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              activeView === 'scanner'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Live Scanner</span>
          </button>
          <button
            onClick={() => onChangeView('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer ${
              activeView === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Trade History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
                {historyCount}
              </span>
            )}
          </button>
        </div>

        {/* DYNAMIC SETTINGS PILLS */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* TIMEFRAME SELECTOR */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              Timeframe:
            </span>
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-brand-cardBorder">
              {timeframes.map((tf) => (
                <button
                  key={tf}
                  onClick={() => onChangeTimeframe(tf)}
                  className={`px-2.5 py-1 rounded font-mono font-bold transition cursor-pointer text-xs ${
                    timeframe === tf
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* RISK:REWARD RATIO SELECTOR */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              Target Ratio:
            </span>
            <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-brand-cardBorder">
              {ratios.map((r) => (
                <button
                  key={r.label}
                  onClick={() => onChangeRatio(r.val)}
                  className={`px-2.5 py-1 rounded font-mono font-bold transition cursor-pointer text-xs ${
                    ratio === r.val
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
