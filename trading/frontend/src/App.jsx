import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header/Header';
import StatsOverview from './components/Dashboard/StatsOverview';
import ShortlistSection from './components/Dashboard/ShortlistSection';
import SetupsTable from './components/Table/SetupsTable';
import HistorySection from './components/History/HistorySection';
import RulesModal from './components/Modals/RulesModal';
import { useScannerData } from './hooks/useScannerData';
import { useAudioAlert } from './hooks/useAudioAlert';
import { fetchTradeHistory, clearTradeHistory } from './services/api';

export default function App() {
  const [timeframe, setTimeframe] = useState('5m');
  const [ratio, setRatio] = useState(2.0);
  const [activeView, setActiveView] = useState('scanner'); // 'scanner' | 'history'
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [historyData, setHistoryData] = useState({
    total_records: 0,
    target_hits: 0,
    stopped: 0,
    invalid: 0,
    win_rate: 0,
    total_r_gain: 0,
    history: [],
  });

  const { soundEnabled, toggleSound, playChime } = useAudioAlert();

  // Load scanner data for current dynamic timeframe & ratio
  const { data, isScanning, triggerScan, error } = useScannerData(
    timeframe,
    ratio,
    playChime
  );

  // Load trade history (only on mount and when activeView === 'history')
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetchTradeHistory();
      setHistoryData(res);
    } catch (err) {
      console.error('Failed to load trade history:', err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, activeView]);

  const handleClearHistory = async () => {
    try {
      await clearTradeHistory();
      await loadHistory();
    } catch (err) {
      alert('Failed to clear history: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-slate-100 flex flex-col font-sans">
      {/* HEADER WITH DYNAMIC TIMEFRAME & RATIO CONTROLS */}
      <Header
        isScanning={isScanning}
        onTriggerScan={triggerScan}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenRules={() => setIsRulesOpen(true)}
        timeframe={timeframe}
        onChangeTimeframe={setTimeframe}
        ratio={ratio}
        onChangeRatio={setRatio}
        activeView={activeView}
        onChangeView={setActiveView}
      />

      {/* BACKEND CONNECTION ERROR WARNING BANNER */}
      {error && (
        <div className="bg-red-950/80 border-b border-red-500/40 text-red-200 px-4 lg:px-8 py-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-400">⚠️ Backend Connection Error:</span>
            <span>{error} — Make sure backend is running on <strong>http://localhost:8000</strong></span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="underline text-red-300 hover:text-white cursor-pointer ml-4 font-semibold"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto w-full px-4 lg:px-8 pt-6 pb-16 space-y-6 flex-1">
        {activeView === 'scanner' ? (
          <>
            {/* KPI STATS */}
            <StatsOverview stats={data.stats} />

            {/* ACTIONABLE SHORTLIST HERO SECTION */}
            <ShortlistSection shortlist={data.shortlist} />

            {/* FULL BREAKOUTS TABLE */}
            <SetupsTable
              results={data.results}
              lastScanTime={data.last_scan_time}
            />
          </>
        ) : (
          /* TRADE HISTORY & ANALYTICS VIEW */
          <HistorySection
            historyData={historyData}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {/* STRATEGY RULES MODAL */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
    </div>
  );
}
