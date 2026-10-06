import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchDashboardData, triggerManualScan } from '../services/api';

/**
 * Custom hook to manage scanner data for dynamic timeframe and ratio.
 * Includes explicit console logs and clean 5-second polling interval.
 */
export function useScannerData(timeframe, ratio, onNewShortlist) {
  const [data, setData] = useState({
    timeframe,
    ratio,
    is_scanning: false,
    last_scan_time: null,
    stats: {},
    shortlist: [],
    results: [],
    server_time: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);

  const knownSymbolsRef = useRef(new Set());
  const onNewShortlistRef = useRef(onNewShortlist);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    onNewShortlistRef.current = onNewShortlist;
  }, [onNewShortlist]);

  const loadData = useCallback(async (tf, rt) => {
    if (isFetchingRef.current) {
      console.log(`[Scanner] Skipped overlapping poll for ${tf}`);
      return;
    }
    isFetchingRef.current = true;

    try {
      console.log(`[Scanner] 📡 Sending request to BE: /api/data?timeframe=${tf}&ratio=${rt}`);
      const res = await fetchDashboardData(tf, rt);
      console.log(`[Scanner] ✅ Received BE response:`, {
        breakouts: res.results?.length || 0,
        shortlist: res.shortlist?.length || 0,
        is_scanning: res.is_scanning,
      });

      setData(res);
      setIsScanning(Boolean(res.is_scanning));
      setError(null);

      // Check for newly added shortlist stocks
      const currentShortlist = res.shortlist || [];
      const currentSymbols = new Set(currentShortlist.map((s) => s.symbol));

      let hasNew = false;
      for (const sym of currentSymbols) {
        if (!knownSymbolsRef.current.has(sym)) {
          hasNew = true;
          break;
        }
      }

      if (hasNew && knownSymbolsRef.current.size > 0 && onNewShortlistRef.current) {
        onNewShortlistRef.current();
      }
      knownSymbolsRef.current = currentSymbols;
    } catch (err) {
      console.error(`[Scanner] ❌ Request failed:`, err);
      setError(err.message || 'Failed to connect to backend server');
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Fetch immediately when timeframe or ratio changes, and auto-poll every 5 seconds
  useEffect(() => {
    setIsLoading(true);
    loadData(timeframe, ratio);

    const interval = setInterval(() => {
      loadData(timeframe, ratio);
    }, 5000); // Polls every 5 seconds

    return () => clearInterval(interval);
  }, [timeframe, ratio, loadData]);

  const handleScan = async () => {
    try {
      setIsScanning(true);
      console.log(`[Scanner] 🚀 Triggering manual scan for ${timeframe}...`);
      await triggerManualScan(timeframe, ratio);

      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try {
          const res = await fetchDashboardData(timeframe, ratio);
          setData(res);
          if (!res.is_scanning || attempts >= 20) {
            setIsScanning(false);
            clearInterval(poll);
          }
        } catch (_) {
          setIsScanning(false);
          clearInterval(poll);
        }
      }, 2500);
    } catch (err) {
      setError(err.message);
      setIsScanning(false);
    }
  };

  return {
    data,
    isLoading,
    isScanning,
    error,
    refreshData: () => loadData(timeframe, ratio),
    triggerScan: handleScan,
  };
}
