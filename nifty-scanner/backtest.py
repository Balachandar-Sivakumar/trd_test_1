"""Backtest the In-Play Noise Breakout with the exact same core logic as the live scanner.

    python3 backtest.py            # 5, 10 and 15-min
    python3 backtest.py --tf 15
Uses Yahoo's maximum 5-min history (~60 days) per download, cached in data/bt/.
Every refresh merges the new download into the cache, so the history keeps
growing beyond 60 days as the backtest is re-run each trading day.
"""
import argparse, json, os, time, urllib.parse
from datetime import datetime
import numpy as np, pandas as pd
from core import IST, PARAMS, TFS, build, hhmm, opening_rvol, run_day, session
from scanner import get, universe

HERE = os.path.dirname(os.path.abspath(__file__))
BT_DIR = os.path.join(HERE, "data", "bt")      # kept apart from the live scan's 1-month cache in data/
META = os.path.join(HERE, "backtest_meta.json")
SESSION_DONE = 1545     # HHMM IST after which today's session counts as complete in the feed


def fetch_60d(s):
    d = json.loads(get(f"https://query2.finance.yahoo.com/v8/finance/chart/"
                       f"{urllib.parse.quote(s)}.NS?interval=5m&range=60d"))["chart"]["result"][0]
    q = d["indicators"]["quote"][0]
    df = pd.DataFrame({k: q[k] for k in ["open", "high", "low", "close", "volume"]},
                      index=pd.to_datetime(d["timestamp"], unit="s", utc=True).tz_convert(IST)).dropna()
    return df[(df.index.second == 0) & (df.index.minute % 5 == 0)]


def complete_sessions(df, now):
    """Drop days that did not start at 09:15 (cut-off first day of a download, special sessions)
    and today's session while it is still running."""
    df = session(df)
    first = df.groupby(df.index.date).apply(lambda g: hhmm(g.index).min())
    keep = set(first[first == 915].index)
    if hhmm(pd.DatetimeIndex([now]))[0] < SESSION_DONE:
        keep.discard(now.date())
    return df[np.isin(df.index.date, list(keep))]


def load(syms, refresh):
    """Returns ({sym: 5-min df}, [symbols whose download failed])."""
    os.makedirs(BT_DIR, exist_ok=True)
    now = datetime.now(IST)
    out, failed = {}, []
    for s in syms:
        p = os.path.join(BT_DIR, f"{s}.pkl")
        old = pd.read_pickle(p).tz_convert(IST) if os.path.exists(p) else None
        df = old
        if refresh or old is None or time.time() - os.path.getmtime(p) > 12 * 3600:
            try:
                df = pd.concat([old, fetch_60d(s)]) if old is not None else fetch_60d(s)
                df = df[~df.index.duplicated(keep="last")].sort_index()
                df.to_pickle(p)
            except Exception as e:
                failed.append(f"{s}: {e}")
            time.sleep(0.3)
        if df is not None:
            out[s] = complete_sessions(df, now)
    return out, failed


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


def run_all(refresh=True, tfs=TFS, extra=None):
    """Refresh data, re-run every timeframe, write backtest_tf*.csv and backtest_meta.json."""
    syms, src = universe()
    data, failed = load(syms, refresh)
    if not data:
        raise RuntimeError("no backtest data available: " + "; ".join(failed[:5]))
    results = {}
    for tf in tfs:
        t = backtest(data, tf)
        path = os.path.join(HERE, f"backtest_tf{tf}.csv")
        t.to_csv(path + ".tmp", index=False)
        os.replace(path + ".tmp", path)      # the API never reads a half-written file
        results[tf] = t
    dates = sorted({d for df in data.values() for d in set(df.index.date)})
    meta = dict(updated_at=f"{datetime.now(IST):%Y-%m-%d %H:%M:%S}", data_from=str(dates[0]),
                data_to=str(dates[-1]), sessions=len(dates), symbols=len(data),
                universe_source=src, failed=failed, **(extra or {}))
    with open(META + ".tmp", "w") as f:
        json.dump(meta, f, indent=2)
    os.replace(META + ".tmp", META)
    return results, meta


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
    results, meta = run_all(a.refresh, [a.tf] if a.tf else TFS)
    print(f"Data {meta['data_from']} → {meta['data_to']} ({meta['sessions']} sessions, {meta['symbols']} stocks)")
    for f in meta["failed"]:
        print("  download failed:", f)
    for tf, t in results.items():
        report(t, tf)
        for trig in ("BREAKOUT", "REVERSAL"):
            print(f"      {trig:<8}", end=" ")
            report(t[t.trigger == trig], tf)
