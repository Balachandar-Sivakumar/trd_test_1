"""Backtest the In-Play Noise Breakout with the exact same core logic as the live scanner.

    python3 backtest.py            # 5, 10 and 15-min
    python3 backtest.py --tf 15
Uses Yahoo's maximum 5-min history (~60 days), cached in data/.
"""
import argparse, json, os, time, urllib.parse
import numpy as np, pandas as pd
from core import PARAMS, TFS, build, opening_rvol, run_day, session
from scanner import get, universe

HERE = os.path.dirname(os.path.abspath(__file__))


def load(syms, refresh):
    os.makedirs(os.path.join(HERE, "data"), exist_ok=True)
    out = {}
    for s in syms:
        p = os.path.join(HERE, "data", f"{s}.pkl")
        if refresh or not os.path.exists(p) or time.time() - os.path.getmtime(p) > 12 * 3600:
            d = json.loads(get(f"https://query2.finance.yahoo.com/v8/finance/chart/"
                                       f"{urllib.parse.quote(s)}.NS?interval=5m&range=60d"))["chart"]["result"][0]
            q = d["indicators"]["quote"][0]
            df = pd.DataFrame({k: q[k] for k in ["open", "high", "low", "close", "volume"]},
                              index=pd.to_datetime(d["timestamp"], unit="s", utc=True).tz_convert("Asia/Kolkata")).dropna()
            df = df[(df.index.second == 0) & (df.index.minute % 5 == 0)]
            df.to_pickle(p)
            time.sleep(0.3)
        out[s] = session(pd.read_pickle(p))
    return out


def backtest(data, tf, P=PARAMS):
    orv = pd.DataFrame({s: opening_rvol(df, P) for s, df in data.items()})
    top = {d: set(r.dropna().sort_values(ascending=False).head(P["top_n"]).index) for d, r in orv.iterrows()}
    rows = []
    for s, df in data.items():
        bars = build(df, tf, P)
        for d, day in bars.groupby("date"):
            if s not in top.get(d, ()):
                continue
            for r in run_day(day, P, final=True):
                rows.append(dict(sym=s, date=d, **r))
    return pd.DataFrame(rows)


def report(t, tf):
    tr = t[t.entry_time.notna()]
    if tr.empty:
        print(f"{tf:>3}-min: no trades"); return
    days = sorted(tr.date.unique()); mid = days[len(days) // 2]
    eq = tr.sort_values(["date", "entry_time"]).net_R.cumsum()
    se = tr.net_R.std() / np.sqrt(len(tr))
    print(f"{tf:>3}-min | days {len(days)} | signals {len(t)} | cancelled {(t.status == 'CANCELLED').sum()} | "
          f"trades {len(tr)} | win {100 * (tr.net_R > 0).mean():.0f}% | target {100 * (tr.status == 'TARGET HIT').mean():.0f}% "
          f"stop {100 * (tr.status == 'STOP LOSS HIT').mean():.0f}% time {100 * (tr.status == 'TIME EXIT').mean():.0f}% | "
          f"gross {tr.gross_R.mean():+.3f}R net {tr.net_R.mean():+.3f}R ±{se:.3f} | total {tr.net_R.sum():+.1f}R | "
          f"maxDD {(eq - eq.cummax()).min():.1f}R | 1st half {tr[tr.date < mid].net_R.mean():+.3f} "
          f"2nd half {tr[tr.date >= mid].net_R.mean():+.3f}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--tf", type=int, choices=TFS)
    ap.add_argument("--refresh", action="store_true")
    a = ap.parse_args()
    syms, src = universe()
    data = load(syms, a.refresh)
    for tf in ([a.tf] if a.tf else TFS):
        t = backtest(data, tf)
        t.to_csv(os.path.join(HERE, f"backtest_tf{tf}.csv"), index=False)
        report(t, tf)
