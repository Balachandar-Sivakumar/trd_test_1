import React, { useState, useEffect } from 'react';
import { X, LineChart, Layers, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import { fetchStockData } from '../services/api';

export default function StockChartModal({ symbol, onClose, defaultTf = 5 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartTf, setChartTf] = useState(defaultTf);
  const [showIndicators, setShowIndicators] = useState({
    ema: true,
    vwap: true,
    bands: true,
  });
  const [hoveredCandle, setHoveredCandle] = useState(null);

  useEffect(() => {
    if (symbol) {
      loadChart(symbol, chartTf);
    }
  }, [symbol, chartTf]);

  async function loadChart(sym, tf) {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchStockData(sym, tf);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!symbol) return null;

  const candles = data?.candles || [];
  const displayCandles = candles.slice(-50); // Show last 50 candles for clean display

  // Calculate scales
  const chartW = 850;
  const chartH = 340;
  const volH = 60;
  const pad = { top: 25, right: 65, bottom: 25, left: 20 };

  const prices = displayCandles.flatMap(c => [
    c.high, c.low, 
    showIndicators.ema && c.ema9, showIndicators.ema && c.ema21, 
    showIndicators.vwap && c.vwap,
    showIndicators.bands && c.upper, showIndicators.bands && c.lower
  ]).filter(Boolean);

  const minPrice = prices.length ? Math.min(...prices) * 0.998 : 0;
  const maxPrice = prices.length ? Math.max(...prices) * 1.002 : 100;
  const maxVol = displayCandles.length ? Math.max(...displayCandles.map(c => c.volume)) : 1;

  const getX = (idx) => {
    return pad.left + (idx / Math.max(1, displayCandles.length - 1)) * (chartW - pad.left - pad.right);
  };

  const getY = (price) => {
    return pad.top + (1 - (price - minPrice) / (maxPrice - minPrice || 1)) * (chartH - pad.top - pad.bottom);
  };

  const getVolY = (vol) => {
    return chartH + volH - (vol / (maxVol || 1)) * (volH - 10);
  };

  // Paths for indicators
  const ema9Path = showIndicators.ema ? displayCandles.map((c, i) => c.ema9 ? `${getX(i)},${getY(c.ema9)}` : '').filter(Boolean).join(' ') : '';
  const ema21Path = showIndicators.ema ? displayCandles.map((c, i) => c.ema21 ? `${getX(i)},${getY(c.ema21)}` : '').filter(Boolean).join(' ') : '';
  const vwapPath = showIndicators.vwap ? displayCandles.map((c, i) => c.vwap ? `${getX(i)},${getY(c.vwap)}` : '').filter(Boolean).join(' ') : '';
  const upperPath = showIndicators.bands ? displayCandles.map((c, i) => c.upper ? `${getX(i)},${getY(c.upper)}` : '').filter(Boolean).join(' ') : '';
  const lowerPath = showIndicators.bands ? displayCandles.map((c, i) => c.lower ? `${getX(i)},${getY(c.lower)}` : '').filter(Boolean).join(' ') : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold font-mono text-white">{symbol}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              NSE 5-MIN CANDLES
            </span>
            {candles.length > 0 && (
              <span className="text-xs text-slate-400 font-mono">
                LTP: ₹{candles[candles.length - 1].close?.toLocaleString('en-IN')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Timeframe selector */}
            <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs font-mono">
              {[5, 10, 15].map(tf => (
                <button
                  key={tf}
                  onClick={() => setChartTf(tf)}
                  className={`px-2 py-1 rounded ${chartTf === tf ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  {tf}m
                </button>
              ))}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Indicator Toggles Bar */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-950/60 border-b border-slate-800/60 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">Overlays:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-cyan-400">
              <input
                type="checkbox"
                checked={showIndicators.ema}
                onChange={e => setShowIndicators(p => ({ ...p, ema: e.target.checked }))}
                className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
              />
              <span>EMA 9 / EMA 21</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-purple-400">
              <input
                type="checkbox"
                checked={showIndicators.vwap}
                onChange={e => setShowIndicators(p => ({ ...p, vwap: e.target.checked }))}
                className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-0"
              />
              <span>VWAP</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-400">
              <input
                type="checkbox"
                checked={showIndicators.bands}
                onChange={e => setShowIndicators(p => ({ ...p, bands: e.target.checked }))}
                className="rounded bg-slate-900 border-slate-700 text-slate-500 focus:ring-0"
              />
              <span>Noise Bands (Upper/Lower)</span>
            </label>
          </div>

          {/* Candle Details Hover */}
          {hoveredCandle && (
            <div className="font-mono text-[11px] flex items-center gap-2 text-slate-300">
              <span className="text-slate-500">{hoveredCandle.time.slice(11)}</span>
              <span>O: <b className="text-white">₹{hoveredCandle.open}</b></span>
              <span>H: <b className="text-emerald-400">₹{hoveredCandle.high}</b></span>
              <span>L: <b className="text-rose-400">₹{hoveredCandle.low}</b></span>
              <span>C: <b className="text-white">₹{hoveredCandle.close}</b></span>
            </div>
          )}
        </div>

        {/* Modal Body / Chart Canvas */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center">
          {loading ? (
            <div className="py-20 flex flex-col items-center">
              <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin mb-3" />
              <p className="text-slate-400 text-sm">Rendering {symbol} candlestick data...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-400">
              <p>{error}</p>
            </div>
          ) : (
            <div className="w-full">
              <svg
                viewBox={`0 0 ${chartW} ${chartH + volH}`}
                className="w-full h-auto select-none font-mono"
              >
                {/* Horizontal grid lines */}
                {[0.25, 0.5, 0.75].map((pct, i) => {
                  const y = pad.top + pct * (chartH - pad.top - pad.bottom);
                  const priceVal = maxPrice - pct * (maxPrice - minPrice);
                  return (
                    <g key={i}>
                      <line
                        x1={pad.left}
                        y1={y}
                        x2={chartW - pad.right}
                        y2={y}
                        stroke="#1e293b"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={chartW - pad.right + 8}
                        y={y + 3}
                        fill="#64748b"
                        fontSize="10"
                      >
                        ₹{priceVal.toFixed(1)}
                      </text>
                    </g>
                  );
                })}

                {/* Noise Bands */}
                {upperPath && (
                  <polyline
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    points={upperPath}
                  />
                )}
                {lowerPath && (
                  <polyline
                    fill="none"
                    stroke="#64748b"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    points={lowerPath}
                  />
                )}

                {/* VWAP */}
                {vwapPath && (
                  <polyline
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="1.8"
                    points={vwapPath}
                  />
                )}

                {/* EMA 9 */}
                {ema9Path && (
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.8"
                    points={ema9Path}
                  />
                )}

                {/* EMA 21 */}
                {ema21Path && (
                  <polyline
                    fill="none"
                    stroke="#fb923c"
                    strokeWidth="1.8"
                    points={ema21Path}
                  />
                )}

                {/* Candlesticks & Volumes */}
                {displayCandles.map((c, i) => {
                  const x = getX(i);
                  const isGreen = c.close >= c.open;
                  const bodyTop = getY(Math.max(c.open, c.close));
                  const bodyBottom = getY(Math.min(c.open, c.close));
                  const bodyHeight = Math.max(2, bodyBottom - bodyTop);
                  const color = isGreen ? '#10b981' : '#f43f5e';
                  const candleW = Math.max(3, (chartW - pad.left - pad.right) / displayCandles.length * 0.7);

                  return (
                    <g
                      key={i}
                      onMouseEnter={() => setHoveredCandle(c)}
                      className="cursor-crosshair"
                    >
                      {/* High-Low Wick */}
                      <line
                        x1={x}
                        y1={getY(c.high)}
                        x2={x}
                        y2={getY(c.low)}
                        stroke={color}
                        strokeWidth="1.2"
                      />

                      {/* Open-Close Body */}
                      <rect
                        x={x - candleW / 2}
                        y={bodyTop}
                        width={candleW}
                        height={bodyHeight}
                        fill={color}
                        rx="1"
                      />

                      {/* Volume Bar */}
                      <rect
                        x={x - candleW / 2}
                        y={getVolY(c.volume)}
                        width={candleW}
                        height={chartH + volH - getVolY(c.volume)}
                        fill={isGreen ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}
                      />
                    </g>
                  );
                })}

                {/* Legend in Chart */}
                <g transform={`translate(${pad.left + 10}, ${pad.top + 10})`} fontSize="10">
                  <circle cx="5" cy="5" r="4" fill="#38bdf8" />
                  <text x="14" y="8" fill="#94a3b8">EMA 9</text>

                  <circle cx="70" cy="5" r="4" fill="#fb923c" />
                  <text x="79" y="8" fill="#94a3b8">EMA 21</text>

                  <circle cx="140" cy="5" r="4" fill="#c084fc" />
                  <text x="149" y="8" fill="#94a3b8">VWAP</text>

                  <line x1="205" y1="5" x2="225" y2="5" stroke="#64748b" strokeDasharray="3 3" />
                  <text x="230" y="8" fill="#94a3b8">Noise Bands</text>
                </g>
              </svg>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <span>Showing last {displayCandles.length} completed candles</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
