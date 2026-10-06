import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import SummaryStats from './components/SummaryStats';
import TopInPlay from './components/TopInPlay';
import LiveSignals from './components/LiveSignals';
import BacktestView from './components/BacktestView';
import StockChartModal from './components/StockChartModal';
import StrategyModal from './components/StrategyModal';
import {
  fetchStatus,
  fetchScan,
  triggerScan,
  fetchTimeframe,
  setTimeframe as updateTimeframeApi
} from './services/api';
import { RefreshCw, AlertCircle, CheckCircle, LineChart } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [timeframe, setTimeframe] = useState(5);
  const [status, setStatus] = useState(null);
  const [scanData, setScanData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(0); // 0 = off, 15, 30, 60
  const [selectedStock, setSelectedStock] = useState(null);
  const [toast, setToast] = useState(null);

  const refreshTimerRef = useRef(null);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        // Load initial timeframe
        const tfRes = await fetchTimeframe().catch(() => ({ tf: 5 }));
        const initTf = tfRes.tf || 5;
        setTimeframe(initTf);

        // Load market status
        const statusRes = await fetchStatus().catch(() => null);
        setStatus(statusRes);

        // Load scan data
        const scanRes = await fetchScan(initTf);
        setScanData(scanRes);
      } catch (err) {
        showToast(`Failed to load data: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Status clock polling every 5 seconds
  useEffect(() => {
    const clockInterval = setInterval(async () => {
      try {
        const s = await fetchStatus();
        setStatus(s);
      } catch (e) {
        // quiet error
      }
    }, 5000);
    return () => clearInterval(clockInterval);
  }, []);

  // Auto-refresh scan data
  useEffect(() => {
    if (autoRefresh <= 0) return;

    const timer = setInterval(async () => {
      if (isScanning) return;
      try {
        const res = await fetchScan(timeframe);
        setScanData(res);
      } catch (e) {
        console.error('Auto-refresh error:', e);
      }
    }, autoRefresh * 1000);

    return () => clearInterval(timer);
  }, [autoRefresh, timeframe, isScanning]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleTimeframeChange = async (newTf) => {
    if (newTf === timeframe) return;
    try {
      setTimeframe(newTf);
      await updateTimeframeApi(newTf);
      setLoading(true);
      const res = await fetchScan(newTf);
      setScanData(res);
      showToast(`Switched to ${newTf}-minute timeframe`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScanClick = async () => {
    if (isScanning) return;
    try {
      setIsScanning(true);
      showToast('Executing live scan on 50 stocks...', 'info');
      const res = await triggerScan(timeframe);
      setScanData(res);
      showToast(`Scan complete! Logged ${res.signals.length} signals.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d19] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl backdrop-blur-md transition-all animate-bounce bg-slate-900 border border-slate-700 text-white">
          {toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 text-rose-400" />
          ) : (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        timeframe={timeframe}
        setTimeframe={handleTimeframeChange}
        status={status}
        isScanning={isScanning}
        onScanClick={handleScanClick}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28">
            <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin mb-4" />
            <h2 className="text-base font-semibold text-slate-200">Initializing Scanner...</h2>
            <p className="text-xs text-slate-400 mt-1">Connecting to FastAPI backend & loading NIFTY 50 data</p>
          </div>
        ) : (
          <>
            {/* VIEW 1: LIVE SCANNER */}
            {activeTab === 'scanner' && (
              <>
                {/* Dynamic Session State Banner */}
                {status && (
                  <div className={`mb-4 px-4 py-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    status.market_open
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${status.market_open ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                      <span>
                        {status.market_open ? (
                          <><b>Live Market Active:</b> Ingestion feed scanning completed candles dynamically. Signal window: 09:45 – 14:30 IST.</>
                        ) : (
                          <><b>Market Closed:</b> Displaying session results for <b>{scanData?.summary?.scan_date || 'today'}</b>. Dynamic live scanning auto-activates at 09:15 AM IST.</>
                        )}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
                      Data Source: Yahoo Finance 5-min OHLCV
                    </div>
                  </div>
                )}

                <SummaryStats summary={scanData?.summary} />
                <TopInPlay
                  top10={scanData?.top10}
                  onSelectStock={setSelectedStock}
                  selectedStock={selectedStock}
                />
                <LiveSignals
                  signals={scanData?.signals || []}
                  waits={scanData?.waits || []}
                  onSelectStock={setSelectedStock}
                />
              </>
            )}

            {/* VIEW 2: BACKTEST ANALYTICS */}
            {activeTab === 'backtest' && (
              <BacktestView
                timeframe={timeframe}
                setTimeframe={handleTimeframeChange}
                onSelectStock={setSelectedStock}
              />
            )}

            {/* VIEW 3: DEDICATED STOCK CHART VIEW */}
            {activeTab === 'chart' && (
              <div className="space-y-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LineChart className="h-5 w-5 text-emerald-400" />
                    <div>
                      <h2 className="text-sm font-bold text-white">Stock Candlestick Analysis</h2>
                      <p className="text-xs text-slate-400">Select any NIFTY stock to view OHLCV with indicators</p>
                    </div>
                  </div>

                  {/* Stock Quick Selector */}
                  <select
                    value={selectedStock || 'BSE'}
                    onChange={(e) => setSelectedStock(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none"
                  >
                    {(scanData?.top10 || []).map(item => (
                      <option key={item.symbol} value={item.symbol}>
                        {item.symbol} (#{item.rank} In-Play - {item.opening_rvol}x)
                      </option>
                    ))}
                    <option value="RELIANCE">RELIANCE</option>
                    <option value="HDFCBANK">HDFCBANK</option>
                    <option value="TCS">TCS</option>
                    <option value="INFY">INFY</option>
                    <option value="ICICIBANK">ICICIBANK</option>
                    <option value="TRENT">TRENT</option>
                    <option value="BSE">BSE</option>
                  </select>
                </div>

                <StockChartModal
                  symbol={selectedStock || 'BSE'}
                  onClose={() => setActiveTab('scanner')}
                  defaultTf={timeframe}
                />
              </div>
            )}

            {/* VIEW 4: STRATEGY RULES DOCUMENTATION */}
            {activeTab === 'rules' && (
              <StrategyModal onClose={() => setActiveTab('scanner')} />
            )}
          </>
        )}
      </main>

      {/* Popup Stock Chart Modal when clicked from any view */}
      {selectedStock && activeTab !== 'chart' && (
        <StockChartModal
          symbol={selectedStock}
          onClose={() => setSelectedStock(null)}
          defaultTf={timeframe}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 px-4 text-center text-xs text-slate-500">
        <p>NIFTY 50 In-Play Noise Breakout Scanner • Algorithmic Intraday Trading System</p>
        <p className="text-[11px] text-slate-600 mt-0.5">Research scanner only — not investment advice.</p>
      </footer>
    </div>
  );
}
