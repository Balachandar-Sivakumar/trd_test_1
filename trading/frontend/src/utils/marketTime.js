/**
 * Utilities for calculating IST time, candle countdowns for dynamic timeframes, and market hours.
 */

export function getISTTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
  });
}

export function getNextCandleCountdown(timeframe = '5m') {
  const now = new Date();
  const minutes = parseInt(
    now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', minute: 'numeric' })
  );
  const seconds = parseInt(
    now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', second: 'numeric' })
  );

  const stepMap = { '3m': 3, '5m': 5, '10m': 10, '15m': 15 };
  const stepMin = stepMap[timeframe] || 5;

  const minsLeft = (stepMin - 1) - (minutes % stepMin);
  const secsLeft = 60 - seconds;
  const totalSeconds = minsLeft * 60 + secsLeft;

  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');

  return { formatted: `${mm}:${ss}`, totalSeconds };
}

export function isMarketOpen() {
  const now = new Date();
  const day = now.getDay();
  // Monday = 1, Friday = 5
  if (day < 1 || day > 5) return false;

  const hours = parseInt(
    now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', hour12: false })
  );
  const minutes = parseInt(
    now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', minute: 'numeric' })
  );

  if (hours === 9 && minutes >= 15) return true;
  if (hours > 9 && hours < 15) return true;
  if (hours === 15 && minutes <= 30) return true;
  return false;
}
