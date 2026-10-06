import React, { useState, useEffect } from 'react';
import { getNextCandleCountdown } from '../../utils/marketTime';

export default function CandleCountdown({ timeframe = '5m' }) {
  const [countdown, setCountdown] = useState('--:--');

  useEffect(() => {
    const update = () => {
      const { formatted } = getNextCandleCountdown(timeframe);
      setCountdown(formatted);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timeframe]);

  return (
    <div className="bg-slate-900/90 border border-brand-cardBorder px-3 py-1.5 rounded-lg flex items-center gap-2">
      <span className="text-slate-400 text-xs">Next Candle ({timeframe}):</span>
      <span className="font-mono font-bold text-amber-400 text-xs">{countdown}</span>
    </div>
  );
}
