const API_BASE = '/api';

export async function fetchStatus() {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function fetchScan(tf) {
  const url = tf ? `${API_BASE}/scan?tf=${tf}` : `${API_BASE}/scan`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch scan data');
  return res.json();
}

export async function triggerScan(tf) {
  const url = tf ? `${API_BASE}/scan?tf=${tf}` : `${API_BASE}/scan`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Scan request failed');
  }
  return res.json();
}

export async function fetchTimeframe() {
  const res = await fetch(`${API_BASE}/timeframe`);
  if (!res.ok) throw new Error('Failed to fetch timeframe');
  return res.json();
}

export async function setTimeframe(tf) {
  const res = await fetch(`${API_BASE}/timeframe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tf }),
  });
  if (!res.ok) throw new Error('Failed to update timeframe');
  return res.json();
}

export async function fetchBacktest(tf = 5) {
  const res = await fetch(`${API_BASE}/backtest?tf=${tf}`);
  if (!res.ok) throw new Error('Failed to fetch backtest results');
  return res.json();
}

export async function fetchStockData(symbol, tf = 5) {
  const res = await fetch(`${API_BASE}/stock/${encodeURIComponent(symbol)}?tf=${tf}`);
  if (!res.ok) throw new Error(`Failed to fetch stock data for ${symbol}`);
  return res.json();
}

export async function fetchParams() {
  const res = await fetch(`${API_BASE}/params`);
  if (!res.ok) throw new Error('Failed to fetch strategy parameters');
  return res.json();
}

export async function fetchHistory() {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error('Failed to fetch history logs');
  return res.json();
}
