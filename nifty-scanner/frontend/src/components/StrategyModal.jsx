import React from 'react';
import { BookOpen, CheckCircle2, Shield, Target, Clock, Zap, ArrowRight, X } from 'lucide-react';

export default function StrategyModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-[#0b1329] border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">In-Play Noise Breakout Strategy Framework</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-300 leading-relaxed font-sans">
          {/* Step 1: In-Play Universe Selection */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-2">
              <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">1</span>
              Opening In-Play Selection (09:15 - 09:30 IST)
            </h3>
            <p className="text-slate-400 mb-2">
              At 09:30 AM, calculate the total volume of the first three 5-minute candles (09:15–09:30) and divide by the mean opening volume of the same slot over the past 14 trading days.
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-300">
              Opening RVOL = Volume(09:15–09:30) / Mean(Past 14 Days 09:15–09:30 Volume)
            </div>
            <p className="text-slate-400 mt-2">
              Only the <b>Top 10</b> ranked stocks are eligible for intraday trade signals today.
            </p>
          </div>

          {/* Step 2: Signal Candle Breakout Checks */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2 mb-2">
              <span className="h-5 w-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs">2</span>
              Intraday Noise Breakout Criteria
            </h3>
            <p className="text-slate-400 mb-3">
              Between 09:45 and 14:30 IST, all 6 conditions must be satisfied on a completed candle:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <span>ToD RVOL ≥ 2.0x (vs past 14d slot)</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <span>Green Candle (Close &gt; Open) for BUY</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <span>Close &gt; Upper Noise Band</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <span>Close &gt; Intraday VWAP</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <span>EMA 9 &gt; EMA 21 (Directional Trend)</span>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                <span>Window: 09:45 to 14:30 IST</span>
              </div>
            </div>
          </div>

          {/* Step 3: Noise Band Formula */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-2">
              <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">3</span>
              Noise Band Formulation
            </h3>
            <p className="text-slate-400 mb-2">
              Normal movement is calculated as the mean absolute excursion <code className="text-white">|Close / Open - 1|</code> at this specific candle slot over the prior 14 trading days:
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300 space-y-1">
              <div>Upper Band = max(Day Open, Prev Close) * (1 + Normal Move)</div>
              <div>Lower Band = min(Day Open, Prev Close) * (1 - Normal Move)</div>
            </div>
          </div>

          {/* Step 4: Execution & Risk Management */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-2">
              <span className="h-5 w-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs">4</span>
              Entry, Stop Loss & Target Multipliers
            </h3>
            <div className="space-y-2 text-slate-300">
              <div className="flex items-start gap-2">
                <span className="font-bold text-emerald-400 font-mono">Entry:</span>
                <span>Signal Candle High + 0.05 * ATR (Stop Buy Order)</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-rose-400 font-mono">Stop Loss:</span>
                <span>Tighter of Signal Candle Low or EMA 21. Clamped between 0.5 * ATR and 1.5 * ATR, with a minimum risk of 0.3% of entry price.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-amber-400 font-mono">Target:</span>
                <span>Strict 1:2 Risk-Reward (Entry + 2.0 * Risk).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-cyan-400 font-mono">Order Validity:</span>
                <span>Pending Stop order expires after 3 candles if un-triggered.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="font-bold text-purple-400 font-mono">Time Exit:</span>
                <span>15:15 IST hard square-off for all active positions.</span>
              </div>
            </div>
          </div>

          {/* Step 5: Reversal trigger */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2 mb-2">
              <span className="h-5 w-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">5</span>
              Noise Band Reversal (alternative to the band check)
            </h3>
            <p className="text-slate-400 mb-2">
              The band check also passes when a strong day turns back: a SELL fires on a stock that rallied and then failed, even while price is still above the lower band. All other checks (candle colour, VWAP, EMA 9/21) still apply. After a trade exits, scanning continues, so a failed BUY can be followed by a SELL.
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono text-[11px] text-amber-300 space-y-1">
              <div>SELL: Session High ≥ Prev Close × 1.02, Close ≤ High × 0.985</div>
              <div>Last 3 closes &lt; VWAP, lower high · ToD RVOL ≥ 1.5x · from 11:00 IST</div>
              <div>Stop: min(swing high, VWAP + 0.1 ATR) · Target: 1.2R</div>
              <div>Max 1 breakout + 1 reversal trade per stock per day</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Formula identity verified against backtest.py and scanner.py</span>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
