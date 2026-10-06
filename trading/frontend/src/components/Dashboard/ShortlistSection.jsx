import React from 'react';
import { Target, Inbox } from 'lucide-react';
import ShortlistCard from './ShortlistCard';

export default function ShortlistSection({ shortlist = [] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Actionable Shortlist</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {shortlist.length}
            </span>
          </h2>
          <span className="text-xs text-slate-400 hidden sm:inline">
            (Pending setups from last 3 candles + Live setups close to entry &le; 0.5R)
          </span>
        </div>
      </div>

      {shortlist.length === 0 ? (
        <div className="bg-brand-card border border-brand-cardBorder rounded-xl p-8 text-center text-slate-400">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 mb-2">
            <Inbox className="w-6 h-6 text-slate-400" />
          </div>
          <p className="font-medium text-slate-300">No active setups in shortlist right now</p>
          <p className="text-xs text-slate-500 mt-1">
            Shortlist populates when a 5-min candle breaks out with &ge; 2x volume between 09:30 & 14:30 IST.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shortlist.map((setup) => (
            <ShortlistCard key={setup.symbol} setup={setup} />
          ))}
        </div>
      )}
    </section>
  );
}
