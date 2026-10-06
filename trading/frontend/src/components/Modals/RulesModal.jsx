import React from 'react';
import { X, BookOpen } from 'lucide-react';

export default function RulesModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-brand-card border border-brand-cardBorder rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-brand-cardBorder pb-3">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <span>Intraday 5-Min Volume Breakout Strategy Rules</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
          <div className="bg-slate-900/80 p-3 rounded-lg border border-brand-cardBorder space-y-1">
            <strong className="text-emerald-400 block font-semibold">1. Data & Chart:</strong>
            <p>
              Applied strictly to 5-minute candles of 50 Nifty index stocks via Yahoo Finance API (.NS).
              The forming/unfinished candle (&lt; 5 min old) is automatically dropped to avoid false breakouts.
            </p>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-brand-cardBorder space-y-1">
            <strong className="text-emerald-400 block font-semibold">2. Long Qualification:</strong>
            <p>
              • Volume &ge; 2.0&times; the 20-candle average.<br />
              • Close &gt; Opening Range High (09:15 - 09:30, first 3 candles). Clears PDH if noted.<br />
              • Close &gt; VWAP (Cumulative, resets every morning).<br />
              • EMA 9 &gt; EMA 21 (Short-term trend pointing up).<br />
              • Green Candle (Close &gt; Open).<br />
              • Formed between 09:30 and 14:30 IST.
            </p>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-brand-cardBorder space-y-1">
            <strong className="text-red-400 block font-semibold">3. Short Qualification (Mirror):</strong>
            <p>
              • Volume &ge; 2.0&times; 20-candle average, Close &lt; ORL, Close &lt; VWAP, EMA 9 &lt; EMA 21,
              Red candle, formed between 09:30 and 14:30 IST.
            </p>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-brand-cardBorder space-y-1">
            <strong className="text-amber-400 block font-semibold">4. Entry, Stop Loss & Target (1:2):</strong>
            <p>
              • <strong>Entry:</strong> Breakout High + 0.05 &times; ATR (Long) / Breakout Low - 0.05 &times; ATR (Short).<br />
              • <strong>Stop:</strong> Tighter of candle extremity and EMA 21.<br />
              • <strong>ATR Clamping:</strong> Widened to 0.5 &times; ATR if closer than noise; capped at 1.5 &times; ATR to keep scalps tight.<br />
              • <strong>Target:</strong> Entry + 2 &times; Risk (strict 1:2 Risk-to-Reward).
            </p>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-brand-cardBorder space-y-1">
            <strong className="text-blue-400 block font-semibold">5. States & Shortlist:</strong>
            <p>
              • <strong>PENDING:</strong> Price hasn't reached entry yet.<br />
              • <strong>INVALID:</strong> Candle closed past stop before entry triggered.<br />
              • <strong>LIVE:</strong> Entry triggered, in flight.<br />
              • <strong>TARGET HIT:</strong> 2R target achieved.<br />
              • <strong>STOPPED:</strong> Stop loss was hit.<br />
              • <strong>Shortlist:</strong> PENDING from last 3 candles + LIVE close to entry (&le; 0.5R).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
