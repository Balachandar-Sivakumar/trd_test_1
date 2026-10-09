"""Live Nifty 50 scanner — In-Play Noise Breakout + Reversal.

    python3 scanner.py                 # one scan, 5-min candles
    python3 scanner.py --tf 15         # one scan, 15-min candles
    python3 scanner.py --loop          # rescan after every candle close until 15:31 IST

In --loop mode the timeframe is re-read from config.json before every scan, so it
can be switched between 5 / 10 / 15 while the scanner is running:
    echo '{"tf": 10}' > config.json

Research scanner only — not investment advice.
"""
import argparse
import csv
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import pandas as pd

from core import IST, PARAMS, TFS, build, checks, hhmm, opening_rvol, run_day, session

HERE = os.path.dirname(os.path.abspath(__file__))
UA = {"User-Agent": "Mozilla/5.0"}
NSE_LIST = "https://archives.nseindia.com/content/indices/ind_nifty50list.csv"
STALE_MIN = 12          # a symbol is stale if its last completed 5-min candle is older than this
MAX_STALE = 5           # abort the scan if more symbols than this are stale/missing


def get(url, timeout=20, tries=4):
    for k in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout).read()
        except Exception as e:
            err = e
            time.sleep(1.5 * (k + 1))
    raise err


def universe():
    cache = os.path.join(HERE, "nifty50.csv")
    try:
        raw = get(NSE_LIST, tries=2).decode()
        syms = [r["Symbol"].strip() for r in csv.DictReader(io.StringIO(raw))]
        if len(syms) >= 45:
            open(cache, "w").write(raw)
            return syms, "NSE (live)"
    except Exception:
        pass
    if os.path.exists(cache):
        return [r["Symbol"].strip() for r in csv.DictReader(open(cache))], "NSE (cached copy)"
    sys.exit("Could not load the Nifty 50 constituent list from NSE and no cached copy exists.")


def fetch_5m(sym):
    url = (f"https://query2.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}.NS"
           f"?interval=5m&range=1mo")
    d = json.loads(get(url))["chart"]["result"][0]
    q = d["indicators"]["quote"][0]
    df = pd.DataFrame({k: q[k] for k in ["open", "high", "low", "close", "volume"]},
                      index=pd.to_datetime(d["timestamp"], unit="s", utc=True).tz_convert(IST)).dropna()
    df = df[~df.index.duplicated(keep="last")]
    # Yahoo appends the live quote as an off-grid zero-volume row (e.g. 15:15:01) — not a real candle
    return df[(df.index.second == 0) & (df.index.minute % 5 == 0)]


def load_all(syms):
    def one(s):
        try:
            return s, fetch_5m(s), None
        except Exception as e:
            return s, None, str(e)
    with ThreadPoolExecutor(6) as ex:
        return list(ex.map(one, syms))


def fmt(x, nd=2):
    return "-" if x is None or pd.isna(x) else f"{x:,.{nd}f}"


def tick(ok):
    return "✓" if ok else "✗"


def explain(sym, orv, r, tf):
    side = 1 if r["side"] == "BUY" else -1
    word = "above" if side == 1 else "below"
    band = r["upper"] if side == 1 else r["lower"]
    return "\n".join([
        f"  {sym} — {r['side']}  (signal candle {r['signal_candle']:%H:%M}, {tf}-min)",
        f"    ✓ Top-10 In-Play          Opening RVOL = {orv:.2f}x",
        f"    ✓ ToD RVOL >= {'2.0' if r['trigger'] == 'BREAKOUT' else '1.5'}         {r['tod_rvol']:.2f}x",
        f"    ✓ {'Green' if side == 1 else 'Red'} candle",
        (f"    ✓ Close {word} noise band  close {fmt(r['close'])} vs band {fmt(band)}"
         if r["trigger"] == "BREAKOUT" else
         f"    ✓ Reversal                {'down-day bounced 1.5%+ off the low, higher low' if side == 1 else 'up-day faded 1.5%+ off the high, lower high'}, 3 closes {word} VWAP"),
        f"    ✓ Close {word} VWAP        VWAP {fmt(r['vwap'])}",
        f"    ✓ EMA 9 {'>' if side == 1 else '<'} EMA 21          {fmt(r['ema9'])} vs {fmt(r['ema21'])}",
        f"    Entry {fmt(r['entry'])} | Stop {fmt(r['stop'])} | Target {fmt(r['target'])} | "
        f"Risk {fmt(r['risk'])} ({r['risk_pct']:.2f}%) | ATR {fmt(r['atr'])}",
        f"    Status = {label(r)}",
    ])


def label(r):
    s = r["status"]
    if s == "ENTRY PENDING":
        return f"SIGNAL CONFIRMED — ENTRY PENDING ({r['candles_left']} candle(s) left)"
    if s == "OPEN":
        return f"ENTRY TRIGGERED — OPEN {r['gross_R']:+.2f}R"
    if s in ("TARGET HIT", "STOP LOSS HIT", "TIME EXIT"):
        return f"ENTRY TRIGGERED — {s} {r['gross_R']:+.2f}R gross / {r['net_R']:+.2f}R net"
    return "SIGNAL CONFIRMED — CANCELLED (entry not reached in 3 candles)"


def scan(tf):
    P = PARAMS
    now = datetime.now(IST)
    print("=" * 110)
    print(f"IN-PLAY NOISE BREAKOUT — LIVE SCAN   {now:%Y-%m-%d %H:%M:%S} IST   timeframe {tf}-min")
    print("=" * 110)
    syms, src = universe()
    print(f"Universe: {len(syms)} stocks from {src}.  Data: Yahoo Finance 5-min OHLCV (may lag a few minutes).")

    if now.weekday() >= 5:
        print("Market closed (weekend). Showing nothing — no live data to scan.")
        return
    if hhmm(pd.DatetimeIndex([now]))[0] < 930:
        print("Waiting for opening 15-minute data (09:15–09:30).")
        return

    raw = load_all(syms)
    today = now.date()
    data, problems = {}, []
    for s, df, err in raw:
        if df is None:
            problems.append(f"{s}: download failed ({err})")
            continue
        df = session(df)
        exit_open = None
        x = df[(df.index.date == today) & (hhmm(df.index) >= P["exit_at"])]
        if len(x):
            exit_open = float(x.open.iloc[0])
        df = df[df.index + timedelta(minutes=5) <= now]         # completed 5-min candles only
        td = df[df.index.date == today]
        if td.empty:
            problems.append(f"{s}: no candles for today")
            continue
        last_end = td.index[-1] + timedelta(minutes=5)
        market_open = hhmm(pd.DatetimeIndex([now]))[0] <= 1530
        if market_open and (now - last_end) > timedelta(minutes=STALE_MIN):
            problems.append(f"{s}: stale, last candle ended {last_end:%H:%M}")
            continue
        data[s] = (df, exit_open, last_end)

    if problems:
        print(f"\nData problems ({len(problems)}): " + "; ".join(problems))
    if len(problems) > MAX_STALE:
        print("\n*** LIVE DATA UNAVAILABLE — too many stocks missing or stale. No signals produced. ***")
        return

    # A) opening RVOL ranking
    orv = {}
    for s, (df, _, _) in data.items():
        r = opening_rvol(df, P)
        if today in r.index and pd.notna(r[today]):
            orv[s] = float(r[today])
    if len(orv) < len(data) - MAX_STALE:
        print("\n*** LIVE DATA UNAVAILABLE — opening 15-minute data / 14-day history incomplete. ***")
        return
    rank = pd.Series(orv).sort_values(ascending=False)
    top = list(rank.head(P["top_n"]).index)

    print("\nA) TOP 10 IN-PLAY STOCKS (opening RVOL, 09:15–09:30 vs 14-day average)")
    for k, s in enumerate(top, 1):
        print(f"   {k:2d}. {s:<12s} {rank[s]:5.2f}x")

    # run the algorithm on today's completed tf candles
    results, waits = {}, {}
    for s in top:
        df5, exit_open, last_end = data[s]
        bars = build(df5, tf, P)
        bars = bars[bars.index + timedelta(minutes=tf) <= last_end]   # completed tf candles only
        day = bars[bars.date == today]
        if day.empty:
            waits[s] = (None, "no completed candle yet")
            continue
        recs = run_day(day, P, exit_open=exit_open if now.hour * 100 + now.minute >= P["exit_at"] else None,
                       final=False)
        last = day.iloc[-1]
        if recs:
            results[s] = (recs, last)
        else:
            lg, sh = checks(last, P)
            hm_now = now.hour * 100 + now.minute
            if hm_now > P["end"]:
                why = "no candle met all conditions between 09:45 and 14:30"
            elif not lg["window"]:
                why = "signal window opens at 09:45"
            else:
                reasons = []
                if not (lg["rvol"] or sh["rvol"]):
                    reasons.append(f"ToD RVOL {last.tod_rvol:.2f}x (< 2.0x)")
                if not (lg["band"] or sh["band"]):
                    reasons.append(f"inside bands {fmt(last.lower)}/{fmt(last.upper)}")
                why = f"last candle {last.name:%H:%M}: " + (", ".join(reasons) if reasons else "conditions not met")
            waits[s] = (last, why)

    # table
    rows, logrows = [], []
    for s, (recs, last) in results.items():
        for r in recs:
            rows.append((s, r, last))
    hdr = f"{'TIME':5} | {'STOCK':<11} | {'SIDE':4} | {'TRIGGER':<8} | {'ENTRY':>10} | {'STOP':>10} | " \
          f"{'TARGET':>10} | {'RISK':>6} | {'CURRENT':>10} | STATUS"
    print(f"\nLIVE TABLE ({tf}-min candles; TIME = signal candle start)")
    print(hdr)
    print("-" * len(hdr))
    for s, r, last in rows:
        print(f"{r['signal_candle']:%H:%M} | {s:<11} | {r['side']:4} | {r['trigger']:<8} | {fmt(r['entry']):>10} | "
              f"{fmt(r['stop']):>10} | {fmt(r['target']):>10} | {r['risk_pct']:5.2f}% | {fmt(last.close):>10} | "
              f"{label(r)}")
    for s, (last, why) in waits.items():
        cur = fmt(last.close) if last is not None else "-"
        print(f"{'':5} | {s:<11} | WAIT | {'-':<8} | {'':>10} | {'':>10} | {'':>10} | {'':>6} | {cur:>10} | "
              f"No valid breakout")

    def section(title, pred):
        sel = [(s, r, last) for s, r, last in rows if pred(r)]
        print(f"\n{title}: {len(sel)}")
        return sel

    latest = {s: last.name for s, (recs, last) in results.items()}
    new = [(s, r, last) for s, r, last in rows if r["signal_candle"] == latest[s]]
    print(f"\nB) NEW SIGNALS (confirmed on the latest completed candle): {len(new)}")
    for s, r, last in new:
        print(explain(s, rank[s], r, tf))
    for title, st in [("C) PENDING ENTRY ORDERS", "ENTRY PENDING"), ("D) OPEN TRADES", "OPEN"),
                      ("E) TARGET HIT", "TARGET HIT"), ("F) STOP LOSS HIT", "STOP LOSS HIT"),
                      ("   TIME EXIT (15:15)", "TIME EXIT"), ("G) CANCELLED SIGNALS", "CANCELLED")]:
        sel = section(title, lambda r, st=st: r["status"] == st)
        for s, r, last in sel:
            if (s, r, last) in new:
                print(f"  {s} — see B")
            elif st in ("ENTRY PENDING", "OPEN"):
                print(explain(s, rank[s], r, tf))
            else:
                extra = f" | {r['gross_R']:+.2f}R gross / {r['net_R']:+.2f}R net" if r["gross_R"] is not None else ""
                print(f"  {s:<11} {r['side']:4} {r['trigger']:<8} signal {r['signal_candle']:%H:%M} | entry {fmt(r['entry'])} "
                      f"stop {fmt(r['stop'])} target {fmt(r['target'])}{extra}")
    print(f"\nH) STOCKS WITH NO SIGNAL (in top 10): {len(waits)}")
    for s, (last, why) in waits.items():
        print(f"  {s:<11} WAIT — {why}")

    # summary
    trades = [r for _, r, _ in rows if r["entry_time"] is not None]
    closed = [r for r in trades if r["status"] != "OPEN"]
    wins = [r for r in closed if r["net_R"] > 0]
    losses = [r for r in closed if r["net_R"] <= 0]
    g = sum(r["gross_R"] for r in closed)
    c = sum(r["cost_R"] for r in closed)
    print("\nTODAY'S SUMMARY (closed trades; open trades shown separately)")
    print(f"  Trades triggered: {len(trades)} | Closed: {len(closed)} | Wins: {len(wins)} | Losses: {len(losses)} | "
          f"Open: {len(trades) - len(closed)}")
    print(f"  Gross R: {g:+.2f} | Estimated costs: {c:.2f}R | Net R: {g - c:+.2f} | "
          f"Win rate: {100 * len(wins) / len(closed):.0f}%" if closed else "  No closed trades yet.")
    open_ = [r for r in trades if r["status"] == "OPEN"]
    if open_:
        print(f"  Open trades unrealised: {sum(r['gross_R'] for r in open_):+.2f}R gross")
    hm = now.hour * 100 + now.minute
    if hm > P["end"]:
        msg = "  After 14:30 — no new signals are created."
        if hm >= P["exit_at"]:
            msg += (" 15:15 passed — time exit due; waiting for the 15:15 candle price from the feed."
                    if open_ else " 15:15 passed — all trades closed.")
        print(msg)

    # log
    os.makedirs(os.path.join(HERE, "logs"), exist_ok=True)
    path = os.path.join(HERE, "logs", f"{today}_tf{tf}.csv")
    cols = ["timestamp", "symbol", "trigger", "side", "signal_candle", "entry", "stop", "target", "atr", "tod_rvol",
            "opening_rvol", "vwap", "ema9", "ema21", "status", "entry_time", "exit_time", "exit_price",
            "gross_R", "cost", "net_R"]
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for s, r, _ in rows:
            w.writerow([f"{now:%Y-%m-%d %H:%M:%S}", s, r["trigger"], r["side"], f"{r['signal_candle']:%H:%M}",
                        *(round(r[k], 2) for k in ("entry", "stop", "target", "atr", "tod_rvol")),
                        round(rank[s], 2), *(round(r[k], 2) for k in ("vwap", "ema9", "ema21")), r["status"],
                        f"{r['entry_time']:%H:%M}" if r["entry_time"] is not None else "",
                        f"{r['exit_time']:%H:%M}" if r["exit_time"] is not None else "",
                        "" if r["exit_price"] is None else round(r["exit_price"], 2),
                        "" if r["gross_R"] is None else round(r["gross_R"], 3),
                        "" if r["cost_R"] is None else round(r["cost_R"], 3),
                        "" if r["net_R"] is None else round(r["net_R"], 3)])
    print(f"\nLogged {len(rows)} signal(s) to {path}")
    print("Research scanner only — not investment advice.")


def read_tf(default):
    try:
        tf = int(json.load(open(os.path.join(HERE, "config.json"))).get("tf", default))
        return tf if tf in TFS else default
    except Exception:
        return default


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tf", type=int, choices=TFS, default=5)
    ap.add_argument("--loop", action="store_true")
    a = ap.parse_args()
    if not a.loop:
        scan(a.tf)
        return
    while True:
        tf = read_tf(a.tf)
        scan(tf)
        now = datetime.now(IST)
        if now.hour * 100 + now.minute >= 1531:
            print("Market closed — loop finished.")
            return
        # sleep until the next tf candle closes (candles anchored at 09:15) + 30 s for the feed to catch up
        base = now.replace(hour=9, minute=15, second=0, microsecond=0)
        mins = max(0, (now - base).total_seconds() / 60)
        nxt = base + timedelta(minutes=(int(mins // tf) + 1) * tf, seconds=30)
        time.sleep(max(5, (nxt - datetime.now(IST)).total_seconds()))


if __name__ == "__main__":
    main()
