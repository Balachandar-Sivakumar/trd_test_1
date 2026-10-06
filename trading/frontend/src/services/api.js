/**
 * API Service for interacting with FastAPI backend.
 * Points directly to http://localhost:8000 with CORS support.
 */

// Default directly to http://localhost:8000 so requests never depend on Vite proxy quirks
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function fetchDashboardData(timeframe = '5m', ratio = 2.0) {
  const params = new URLSearchParams({ timeframe, ratio: String(ratio) });
  const url = `${BASE_URL}/api/data?${params}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[API Error] Failed to fetch from ${url}:`, err);
    throw err;
  }
}

export async function triggerManualScan(timeframe = '5m', ratio = 2.0) {
  const params = new URLSearchParams({ timeframe, ratio: String(ratio) });
  const url = `${BASE_URL}/api/scan?${params}`;
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      if (res.status === 409) {
        throw new Error('A scan is already in progress');
      }
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[API Error] Failed to trigger scan at ${url}:`, err);
    throw err;
  }
}

export async function fetchSystemStatus(timeframe = '5m') {
  const url = `${BASE_URL}/api/status?timeframe=${timeframe}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[API Error] Failed to fetch status from ${url}:`, err);
    throw err;
  }
}

export async function fetchTradeHistory() {
  const url = `${BASE_URL}/api/history`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[API Error] Failed to fetch history from ${url}:`, err);
    throw err;
  }
}

export async function clearTradeHistory() {
  const url = `${BASE_URL}/api/history/clear`;
  try {
    const res = await fetch(url, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[API Error] Failed to clear history at ${url}:`, err);
    throw err;
  }
}
