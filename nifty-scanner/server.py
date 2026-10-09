"""FastAPI backend server for NIFTY 50 In-Play Noise Breakout Scanner.

Fully dynamic intraday algorithmic trading scanner & analytics engine:
- Live Yahoo Finance 5-min candle ingestion with local cache fallback
- Dynamic candle resampling to 5m, 10m, and 15m intervals
- Opening RVOL ranking (09:15-09:30 vs 14-day slot average) for Top 10 In-Play
- 14-day Time-of-Day RVOL, VWAP, EMA 9/21, and Dynamic Noise Bands
- Order state machine: ENTRY PENDING (3 candles validity), OPEN, TARGET HIT, STOP LOSS HIT, TIME EXIT, CANCELLED
- Automated background daemon scanner at candle boundaries (anchored at 09:15 IST)
- 60-day Backtest analytics with cumulative equity curve & drawdown
- Interactive candlestick charts with indicator overlays
"""
import csv
import json
import os
import sys
import threading
import time
from datetime import datetime, timedelta, date
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import pandas as pd

from core import IST, PARAMS, TFS, build, checks, hhmm, opening_rvol, run_day, session
from scanner import universe, fetch_5m, load_all, read_tf, HERE
from backtest import META as BT_META, SESSION_DONE, run_all as run_backtest_all

app = FastAPI(title="NIFTY 50 Breakout Scanner API", version="1.1.0")

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State & In-Memory Cache
_scan_cache: Dict[int, Dict[str, Any]] = {}
_last_scan_time: Dict[int, float] = {}
_is_scanning: bool = False
_scan_lock = threading.Lock()
_bg_thread = None
_bg_stop_event = threading.Event()
_bt_lock = threading.Lock()
_bt_state: Dict[str, Any] = {"running": False, "last_error": None, "last_attempt": 0.0}
BT_RETRY_SECS = 1800    # wait this long before retrying a failed daily backtest


def clean_float(val: Any, nd: int = 2) -> Optional[float]:
    """Safely convert any numeric value to float, converting NaN/Inf to None."""
    if val is None:
        return None
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return None
        return round(f, nd)
    except (TypeError, ValueError):
        return None


def load_industry_map() -> Dict[str, str]:
    """Load symbol -> industry mapping from nifty50.csv."""
    p = os.path.join(HERE, "nifty50.csv")
    if os.path.exists(p):
        try:
            return {r["Symbol"].strip(): r.get("Industry", "Equities").strip() for r in csv.DictReader(open(p))}
        except Exception:
            pass
    return {}


class TimeframeRequest(BaseModel):
    tf: int


def get_market_state(now: Optional[datetime] = None) -> Dict[str, Any]:
    if now is None:
        now = datetime.now(IST)
    is_weekend = now.weekday() >= 5
    hm = now.hour * 100 + now.minute
    
    is_open = not is_weekend and (915 <= hm <= 1530)
    pre_market = not is_weekend and (hm < 915)
    opening_window = not is_weekend and (915 <= hm < 930)
    signal_window = not is_weekend and (PARAMS["start"] <= hm <= PARAMS["end"])
    trade_exit_window = not is_weekend and (hm >= PARAMS["exit_at"])
    after_hours = is_weekend or (hm > 1530)

    tf = read_tf(5)
    base = now.replace(hour=9, minute=15, second=0, microsecond=0)
    
    if is_open:
        mins = max(0, (now - base).total_seconds() / 60)
        next_close = base + timedelta(minutes=(int(mins // tf) + 1) * tf)
        secs_left = max(0, int((next_close - now).total_seconds()))
    else:
        next_close = None
        secs_left = 0

    return {
        "current_time_ist": now.strftime("%Y-%m-%d %H:%M:%S"),
        "time_str": now.strftime("%H:%M:%S"),
        "date_str": now.strftime("%Y-%m-%d"),
        "market_open": is_open,
        "is_weekend": is_weekend,
        "pre_market": pre_market,
        "opening_window": opening_window,
        "signal_window_active": signal_window,
        "trades_closing": trade_exit_window,
        "after_hours": after_hours,
        "active_tf": tf,
        "next_candle_secs": secs_left,
        "next_candle_time": next_close.strftime("%H:%M:%S") if next_close else None
    }


def execute_scan(tf: int, force_live: bool = False) -> Dict[str, Any]:
    """Execute dynamic scan across all 50 Nifty stocks for the given timeframe."""
    global _is_scanning
    with _scan_lock:
        _is_scanning = True
        try:
            P = PARAMS
            now = datetime.now(IST)
            m_state = get_market_state(now)
            today = now.date()
            syms, src = universe()

            # 1. Fetch live 5-min candles with thread pool
            raw = load_all(syms)
            data = {}
            problems = []
            
            os.makedirs(os.path.join(HERE, "data"), exist_ok=True)

            for s, df, err in raw:
                # If live download fails, fallback to local pkl if available
                pkl_file = os.path.join(HERE, "data", f"{s}.pkl")
                if df is None:
                    if os.path.exists(pkl_file):
                        try:
                            df = pd.read_pickle(pkl_file)
                        except Exception:
                            df = None
                    if df is None:
                        problems.append(f"{s}: download failed ({err})")
                        continue
                else:
                    # Update local cache
                    try:
                        df.to_pickle(pkl_file)
                    except Exception:
                        pass

                df = session(df)
                exit_open = None
                x = df[(df.index.date == today) & (hhmm(df.index) >= P["exit_at"])]
                if len(x):
                    exit_open = float(x.open.iloc[0])

                df = df[df.index + timedelta(minutes=5) <= now]
                td = df[df.index.date == today]

                # If market is closed or weekend and today has no candles yet, use the latest available trading date in df
                if td.empty and m_state["after_hours"]:
                    available_dates = sorted(df.index.date)
                    if available_dates:
                        active_date = available_dates[-1]
                        td = df[df.index.date == active_date]
                    else:
                        problems.append(f"{s}: no historical candles")
                        continue
                elif td.empty:
                    problems.append(f"{s}: no candles for today")
                    continue

                last_end = td.index[-1] + timedelta(minutes=5)
                if m_state["market_open"] and (now - last_end) > timedelta(minutes=12):
                    problems.append(f"{s}: stale, last candle ended {last_end:%H:%M}")
                    continue

                data[s] = (df, exit_open, last_end, td.index.date[0])

            # Determine scan target date (today or most recent completed date)
            target_dates = [td_date for _, _, _, td_date in data.values()]
            scan_date = max(target_dates) if target_dates else today

            # 2. Compute Opening RVOL ranking (09:15 - 09:30 vs 14-day average)
            orv = {}
            for s, (df, _, _, _) in data.items():
                r = opening_rvol(df, P)
                if scan_date in r.index and pd.notna(r[scan_date]):
                    orv[s] = float(r[scan_date])

            rank = pd.Series(orv).sort_values(ascending=False)
            top = list(rank.head(P["top_n"]).index)

            top10_list = []
            for k, s in enumerate(top, 1):
                top10_list.append({
                    "rank": k,
                    "symbol": s,
                    "opening_rvol": round(rank[s], 2)
                })

            # 3. Dynamic indicators and breakout evaluation for top 10 stocks
            results = {}
            waits = []
            for s in top:
                df5, exit_open, last_end, _ = data[s]
                bars = build(df5, tf, P)
                bars = bars[bars.index + timedelta(minutes=tf) <= last_end]
                day = bars[bars.date == scan_date]
                if day.empty:
                    waits.append({"symbol": s, "current_price": None, "reason": "No completed candle yet"})
                    continue

                is_live_exit = (now.hour * 100 + now.minute >= P["exit_at"]) if scan_date == today else True
                recs = run_day(day, P, exit_open=exit_open if is_live_exit else None, final=not m_state["market_open"])
                last = day.iloc[-1]

                if recs:
                    results[s] = (recs, last)
                else:
                    lg, sh = checks(last, P)
                    hm_now = now.hour * 100 + now.minute
                    if hm_now > P["end"] and scan_date == today:
                        why = "No candle met all conditions between 09:45 and 14:30"
                    elif not lg["window"]:
                        why = "Signal window opens at 09:45 IST"
                    else:
                        conds = []
                        if not (lg['rvol'] or sh['rvol']):
                            conds.append(f"ToD RVOL {last.tod_rvol:.2f}x (< 2.0x)")
                        if not (lg['band'] or sh['band']):
                            conds.append(f"Inside noise band ({last.lower:.2f} - {last.upper:.2f})")
                        why = "Waiting: " + (", ".join(conds) if conds else "Conditions not met")
                    waits.append({
                        "symbol": s,
                        "current_price": round(float(last.close), 2),
                        "reason": why
                    })

            # 4. Format Signals List
            signals_list = []
            for s, (recs, last) in results.items():
                for r in recs:
                    signals_list.append({
                        "symbol": s,
                        "trigger": r["trigger"],
                        "side": r["side"],
                        "signal_candle": r["signal_candle"].strftime("%H:%M"),
                        "entry": clean_float(r["entry"]),
                        "stop": clean_float(r["stop"]),
                        "target": clean_float(r["target"]),
                        "risk": clean_float(r["risk"]),
                        "risk_pct": clean_float(r["risk_pct"]),
                        "atr": clean_float(r["atr"]),
                        "tod_rvol": clean_float(r["tod_rvol"]),
                        "opening_rvol": clean_float(rank[s]),
                        "vwap": clean_float(r["vwap"]),
                        "ema9": clean_float(r["ema9"]),
                        "ema21": clean_float(r["ema21"]),
                        "close": clean_float(r["close"]),
                        "upper": clean_float(r["upper"]),
                        "lower": clean_float(r["lower"]),
                        "current_price": clean_float(last.close),
                        "status": r["status"],
                        "candles_left": r.get("candles_left"),
                        "entry_time": r["entry_time"].strftime("%H:%M") if r.get("entry_time") is not None else None,
                        "exit_time": r["exit_time"].strftime("%H:%M") if r.get("exit_time") is not None else None,
                        "exit_price": clean_float(r.get("exit_price")),
                        "gross_R": clean_float(r.get("gross_R")),
                        "cost_R": clean_float(r.get("cost_R")),
                        "net_R": clean_float(r.get("net_R")),
                    })

            # 5. Compute Summary Metrics
            trades = [r for r in signals_list if r["entry_time"] is not None]
            closed = [r for r in trades if r["status"] != "OPEN"]
            open_trades = [r for r in trades if r["status"] == "OPEN"]
            wins = [r for r in closed if (r["net_R"] or 0) > 0]
            losses = [r for r in closed if (r["net_R"] or 0) <= 0]
            g = sum(r["gross_R"] or 0 for r in closed)
            c = sum(r["cost_R"] or 0 for r in closed)
            open_unrealised_R = sum(r["gross_R"] or 0 for r in open_trades)

            summary = {
                "scan_date": str(scan_date),
                "trades_triggered": len(trades),
                "closed": len(closed),
                "wins": len(wins),
                "losses": len(losses),
                "open": len(open_trades),
                "win_rate": round(100 * len(wins) / len(closed), 1) if closed else 0,
                "gross_R": round(g, 2),
                "cost_R": round(c, 2),
                "net_R": round(g - c, 2),
                "open_unrealised_R": round(open_unrealised_R, 2),
                "total_signals": len(signals_list),
                "target_hits": len([r for r in signals_list if r["status"] == "TARGET HIT"]),
                "stop_losses": len([r for r in signals_list if r["status"] == "STOP LOSS HIT"]),
                "time_exits": len([r for r in signals_list if r["status"] == "TIME EXIT"]),
                "cancelled": len([r for r in signals_list if r["status"] == "CANCELLED"]),
                "pending": len([r for r in signals_list if r["status"] == "ENTRY PENDING"])
            }

            # 6. Save to logs
            os.makedirs(os.path.join(HERE, "logs"), exist_ok=True)
            path = os.path.join(HERE, "logs", f"{scan_date}_tf{tf}.csv")
            cols = ["timestamp", "symbol", "trigger", "side", "signal_candle", "entry", "stop", "target", "atr", "tod_rvol",
                    "opening_rvol", "vwap", "ema9", "ema21", "status", "entry_time", "exit_time", "exit_price",
                    "gross_R", "cost", "net_R"]
            with open(path, "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(cols)
                for r in signals_list:
                    w.writerow([
                        f"{now:%Y-%m-%d %H:%M:%S}", r["symbol"], r["trigger"], r["side"], r["signal_candle"],
                        r["entry"], r["stop"], r["target"], r["atr"], r["tod_rvol"],
                        r["opening_rvol"], r["vwap"], r["ema9"], r["ema21"], r["status"],
                        r["entry_time"] or "", r["exit_time"] or "",
                        r["exit_price"] or "", r["gross_R"] or "", r["cost_R"] or "", r["net_R"] or ""
                    ])

            res = {
                "timeframe": tf,
                "scan_date": str(scan_date),
                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                "market_state": m_state,
                "data_source": src,
                "top10": top10_list,
                "signals": signals_list,
                "waits": waits,
                "summary": summary,
                "problems": problems
            }

            _scan_cache[tf] = res
            _last_scan_time[tf] = time.time()
            return res
        finally:
            _is_scanning = False


def load_from_log_cache(tf: int) -> Optional[Dict[str, Any]]:
    """Loads the most recent log file from logs/ directory."""
    logs_dir = os.path.join(HERE, "logs")
    if not os.path.exists(logs_dir):
        return None
    matching_files = sorted([f for f in os.listdir(logs_dir) if f.endswith(f"_tf{tf}.csv")], reverse=True)
    if not matching_files:
        return None

    log_file = os.path.join(logs_dir, matching_files[0])
    try:
        df = pd.read_csv(log_file)
        if df.empty:
            return None

        signals = []
        top10_dict = {}
        for _, row in df.iterrows():
            sym = str(row["symbol"])
            orv = float(row["opening_rvol"]) if pd.notna(row["opening_rvol"]) else 1.0
            top10_dict[sym] = max(top10_dict.get(sym, 0), orv)

            signals.append({
                "symbol": sym,
                "trigger": str(row.get("trigger", "BREAKOUT")) if pd.notna(row.get("trigger")) else "BREAKOUT",
                "side": str(row["side"]),
                "signal_candle": str(row["signal_candle"]),
                "entry": round(float(row["entry"]), 2),
                "stop": round(float(row["stop"]), 2),
                "target": round(float(row["target"]), 2),
                "risk": round(abs(float(row["entry"]) - float(row["stop"])), 2),
                "risk_pct": round(100 * abs(float(row["entry"]) - float(row["stop"])) / float(row["entry"]), 2),
                "atr": round(float(row["atr"]), 2) if pd.notna(row["atr"]) else 0,
                "tod_rvol": round(float(row["tod_rvol"]), 2) if pd.notna(row["tod_rvol"]) else 0,
                "opening_rvol": round(orv, 2),
                "vwap": round(float(row["vwap"]), 2) if pd.notna(row["vwap"]) else 0,
                "ema9": round(float(row["ema9"]), 2) if pd.notna(row["ema9"]) else 0,
                "ema21": round(float(row["ema21"]), 2) if pd.notna(row["ema21"]) else 0,
                "close": round(float(row["entry"]), 2),
                "current_price": round(float(row["exit_price"]) if pd.notna(row.get("exit_price")) else float(row["entry"]), 2),
                "status": str(row["status"]),
                "candles_left": None,
                "entry_time": str(row["entry_time"]) if pd.notna(row["entry_time"]) and str(row["entry_time"]) != "nan" else None,
                "exit_time": str(row["exit_time"]) if pd.notna(row["exit_time"]) and str(row["exit_time"]) != "nan" else None,
                "exit_price": round(float(row["exit_price"]), 2) if pd.notna(row["exit_price"]) else None,
                "gross_R": round(float(row["gross_R"]), 2) if pd.notna(row["gross_R"]) else None,
                "cost_R": round(float(row["cost"]), 2) if pd.notna(row["cost"]) else None,
                "net_R": round(float(row["net_R"]), 2) if pd.notna(row["net_R"]) else None,
            })

        sorted_top = sorted(top10_dict.items(), key=lambda x: x[1], reverse=True)
        top10_list = [{"rank": i + 1, "symbol": s, "opening_rvol": r} for i, (s, r) in enumerate(sorted_top[:10])]

        trades = [r for r in signals if r["entry_time"] is not None]
        closed = [r for r in trades if r["status"] != "OPEN"]
        open_trades = [r for r in trades if r["status"] == "OPEN"]
        wins = [r for r in closed if (r["net_R"] or 0) > 0]
        losses = [r for r in closed if (r["net_R"] or 0) <= 0]
        g = sum(r["gross_R"] or 0 for r in closed)
        c = sum(r["cost_R"] or 0 for r in closed)

        scan_date_str = matching_files[0].split("_")[0]

        summary = {
            "scan_date": scan_date_str,
            "trades_triggered": len(trades),
            "closed": len(closed),
            "wins": len(wins),
            "losses": len(losses),
            "open": len(open_trades),
            "win_rate": round(100 * len(wins) / len(closed), 1) if closed else 0,
            "gross_R": round(g, 2),
            "cost_R": round(c, 2),
            "net_R": round(g - c, 2),
            "open_unrealised_R": 0.0,
            "total_signals": len(signals),
            "target_hits": len([r for r in signals if r["status"] == "TARGET HIT"]),
            "stop_losses": len([r for r in signals if r["status"] == "STOP LOSS HIT"]),
            "time_exits": len([r for r in signals if r["status"] == "TIME EXIT"]),
            "cancelled": len([r for r in signals if r["status"] == "CANCELLED"]),
            "pending": len([r for r in signals if r["status"] == "ENTRY PENDING"])
        }

        return {
            "timeframe": tf,
            "scan_date": scan_date_str,
            "timestamp": df.iloc[0]["timestamp"] if "timestamp" in df.columns else datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S"),
            "market_state": get_market_state(),
            "data_source": "NSE Log Cache",
            "top10": top10_list,
            "signals": signals,
            "waits": [],
            "summary": summary,
            "problems": []
        }
    except Exception as e:
        print(f"Error loading log: {e}")
        return None


# Background Daemon for Live Scanning at Candle Close
def bg_scanner_loop():
    print("[Background Scanner] Daemon loop started.")
    while not _bg_stop_event.is_set():
        try:
            now = datetime.now(IST)
            m_state = get_market_state(now)
            active_tf = read_tf(5)

            if m_state["market_open"]:
                # Compute next candle boundary + 30s feed delay
                base = now.replace(hour=9, minute=15, second=0, microsecond=0)
                mins = max(0, (now - base).total_seconds() / 60)
                nxt = base + timedelta(minutes=(int(mins // active_tf) + 1) * active_tf, seconds=30)
                sleep_secs = max(5, (nxt - datetime.now(IST)).total_seconds())

                # Sleep until candle close
                if _bg_stop_event.wait(timeout=sleep_secs):
                    break

                # Execute dynamic live scan
                print(f"[Background Scanner] Waking up at {datetime.now(IST):%H:%M:%S} to scan {active_tf}m candle...")
                execute_scan(active_tf, force_live=True)
            else:
                # Outside market hours, sleep 30 seconds
                if _bg_stop_event.wait(timeout=30):
                    break
        except Exception as e:
            print(f"[Background Scanner] Error: {e}")
            time.sleep(10)


# Daily Backtest Refresh
def last_closed_session(now: datetime) -> date:
    """Most recent weekday whose session is complete in the feed (holidays are tolerated, see backtest_due)."""
    d = now.date()
    if now.weekday() < 5 and now.hour * 100 + now.minute >= SESSION_DONE:
        return d
    d -= timedelta(days=1)
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d


def read_bt_meta() -> Dict[str, Any]:
    try:
        with open(BT_META) as f:
            return json.load(f)
    except Exception:
        return {}


def backtest_due(now: datetime) -> bool:
    # session_target is recorded per run, so a holiday triggers one run and no retries
    csvs_ok = all(os.path.exists(os.path.join(HERE, f"backtest_tf{tf}.csv")) for tf in TFS)
    if csvs_ok and read_bt_meta().get("session_target") == str(last_closed_session(now)):
        return False
    if _bt_state["last_error"] and time.time() - _bt_state["last_attempt"] < BT_RETRY_SECS:
        return False
    return True


def run_backtest_job() -> bool:
    """Refresh backtest data and results. Returns False if a run is already in progress."""
    if not _bt_lock.acquire(blocking=False):
        return False
    _bt_state.update(running=True, last_attempt=time.time())
    try:
        target = str(last_closed_session(datetime.now(IST)))
        print(f"[Backtest] Refreshing data and results (session {target})...")
        _, meta = run_backtest_all(refresh=True, extra={"session_target": target})
        _bt_state["last_error"] = None
        print(f"[Backtest] Done: {meta['data_from']} -> {meta['data_to']}, {meta['sessions']} sessions.")
    except BaseException as e:      # universe() may sys.exit
        _bt_state["last_error"] = str(e)
        print(f"[Backtest] Error: {e}")
    finally:
        _bt_state["running"] = False
        _bt_lock.release()
    return True


def bt_scheduler_loop():
    while not _bg_stop_event.is_set():
        try:
            if backtest_due(datetime.now(IST)):
                run_backtest_job()
        except Exception as e:
            print(f"[Backtest] Scheduler error: {e}")
        if _bg_stop_event.wait(timeout=300):
            break


def backtest_info() -> Dict[str, Any]:
    return {**read_bt_meta(), "running": _bt_state["running"], "last_error": _bt_state["last_error"]}


@app.on_event("startup")
def startup_event():
    global _bg_thread
    _bg_stop_event.clear()
    _bg_thread = threading.Thread(target=bg_scanner_loop, daemon=True)
    _bg_thread.start()
    threading.Thread(target=bt_scheduler_loop, daemon=True).start()


@app.on_event("shutdown")
def shutdown_event():
    _bg_stop_event.set()


@app.get("/api/status")
def get_status():
    return get_market_state()


@app.get("/api/timeframe")
def get_timeframe():
    return {"tf": read_tf(5), "supported": list(TFS)}


@app.post("/api/timeframe")
def set_timeframe(req: TimeframeRequest):
    if req.tf not in TFS:
        raise HTTPException(status_code=400, detail=f"Invalid timeframe. Must be one of {TFS}")
    config_path = os.path.join(HERE, "config.json")
    with open(config_path, "w") as f:
        json.dump({"tf": req.tf}, f)
    # Clear in-memory cache for new timeframe so fresh scan executes
    if req.tf in _scan_cache:
        del _scan_cache[req.tf]
    return {"tf": req.tf, "status": "updated"}


@app.get("/api/scan")
def get_scan(tf: Optional[int] = Query(None)):
    current_tf = tf if tf in TFS else read_tf(5)
    now = datetime.now(IST)
    m_state = get_market_state(now)

    # 1. During market hours: return cache if under 20s old, otherwise run live scan
    if m_state["market_open"]:
        cache_age = time.time() - _last_scan_time.get(current_tf, 0)
        if current_tf in _scan_cache and cache_age < 20:
            return _scan_cache[current_tf]
        return execute_scan(current_tf, force_live=True)

    # 2. Outside market hours: check in-memory cache
    if current_tf in _scan_cache:
        return _scan_cache[current_tf]

    # 3. Check existing log file
    cached_log = load_from_log_cache(current_tf)
    if cached_log:
        _scan_cache[current_tf] = cached_log
        _last_scan_time[current_tf] = time.time()
        return cached_log

    # 4. Otherwise execute scan
    return execute_scan(current_tf)


@app.post("/api/scan")
def trigger_scan(tf: Optional[int] = Query(None)):
    global _is_scanning
    if _is_scanning:
        raise HTTPException(status_code=429, detail="Scan already in progress. Please wait.")
    current_tf = tf if tf in TFS else read_tf(5)
    return execute_scan(current_tf, force_live=True)


@app.get("/api/backtest")
def get_backtest(tf: int = Query(5)):
    if tf not in TFS:
        raise HTTPException(status_code=400, detail=f"Invalid timeframe. Must be one of {TFS}")

    csv_path = os.path.join(HERE, f"backtest_tf{tf}.csv")
    if not os.path.exists(csv_path) or os.path.getsize(csv_path) == 0:
        if _bt_state["running"] or not run_backtest_job():
            raise HTTPException(status_code=503, detail="Backtest is being generated. Try again in a minute.")
        if not os.path.exists(csv_path):
            raise HTTPException(status_code=500, detail=f"Failed to generate backtest: {_bt_state['last_error']}")
    df = pd.read_csv(csv_path)
    total_signals = len(df)
    cancelled = int((df.status == "CANCELLED").sum())
    tr = df[df.entry_time.notna()].copy()
    trades_count = len(tr)

    if tr.empty:
        return {"summary": {}, "equity_curve": [], "trades": [], "meta": backtest_info()}

    tr = tr.sort_values(["date", "entry_time"])
    tr["cum_net_R"] = tr.net_R.cumsum()
    peak = tr.cum_net_R.cummax()
    tr["drawdown"] = tr.cum_net_R - peak

    days = sorted(tr.date.unique())
    mid_date = days[len(days) // 2] if days else None

    wins = tr[tr.net_R > 0]
    losses = tr[tr.net_R <= 0]
    win_rate = round(100 * len(wins) / len(tr), 1)

    tgt_count = int((tr.status == "TARGET HIT").sum())
    stop_count = int((tr.status == "STOP LOSS HIT").sum())
    time_count = int((tr.status == "TIME EXIT").sum())

    total_net_R = round(float(tr.net_R.sum()), 2)
    max_dd = round(float(tr["drawdown"].min()), 2)
    gross_mean = round(float(tr.gross_R.mean()), 3)
    net_mean = round(float(tr.net_R.mean()), 3)
    se = round(float(tr.net_R.std() / np.sqrt(len(tr))), 3)

    first_half_r = round(float(tr[tr.date < mid_date].net_R.mean()), 3) if mid_date else 0
    second_half_r = round(float(tr[tr.date >= mid_date].net_R.mean()), 3) if mid_date else 0

    profit_factor = round(wins.net_R.sum() / abs(losses.net_R.sum()), 2) if not losses.empty and losses.net_R.sum() != 0 else 0

    equity_curve = []
    equity_curve.append({"trade": 0, "date": tr.iloc[0]["date"], "net_R": 0.0, "cum_R": 0.0, "drawdown": 0.0})
    for i, (_, row) in enumerate(tr.iterrows(), 1):
        equity_curve.append({
            "trade": i,
            "date": row["date"],
            "symbol": row["sym"],
            "trigger": row.get("trigger", "BREAKOUT"),
            "side": row["side"],
            "net_R": round(float(row["net_R"]), 2),
            "cum_R": round(float(row["cum_net_R"]), 2),
            "drawdown": round(float(row["drawdown"]), 2),
            "status": row["status"]
        })

    by_sym = {}
    for sym, group in tr.groupby("sym"):
        w = group[group.net_R > 0]
        by_sym[sym] = {
            "symbol": sym,
            "trades": len(group),
            "wins": len(w),
            "win_rate": round(100 * len(w) / len(group), 1),
            "net_R": round(float(group.net_R.sum()), 2)
        }
    sorted_syms = sorted(by_sym.values(), key=lambda x: x["net_R"], reverse=True)

    trades_list = []
    for _, row in tr.iterrows():
        trades_list.append({
            "symbol": row["sym"],
            "date": str(row["date"]),
            "trigger": row.get("trigger", "BREAKOUT"),
            "side": row["side"],
            "signal_candle": str(row["signal_candle"])[:16],
            "entry": round(float(row["entry"]), 2),
            "stop": round(float(row["stop"]), 2),
            "target": round(float(row["target"]), 2),
            "fill": round(float(row["fill"]), 2) if pd.notna(row["fill"]) else None,
            "exit_price": round(float(row["exit_price"]), 2) if pd.notna(row["exit_price"]) else None,
            "entry_time": str(row["entry_time"])[:16] if pd.notna(row["entry_time"]) else "",
            "exit_time": str(row["exit_time"])[:16] if pd.notna(row["exit_time"]) else "",
            "gross_R": round(float(row["gross_R"]), 2) if pd.notna(row["gross_R"]) else 0,
            "net_R": round(float(row["net_R"]), 2) if pd.notna(row["net_R"]) else 0,
            "status": row["status"],
            "risk_pct": round(float(row["risk_pct"]), 2) if pd.notna(row["risk_pct"]) else 0,
        })

    return {
        "timeframe": tf,
        "summary": {
            "days": len(days),
            "total_signals": total_signals,
            "cancelled": cancelled,
            "trades": trades_count,
            "wins": len(wins),
            "losses": len(losses),
            "win_rate": win_rate,
            "target_hits": tgt_count,
            "target_hit_pct": round(100 * tgt_count / trades_count, 1),
            "stop_losses": stop_count,
            "stop_loss_pct": round(100 * stop_count / trades_count, 1),
            "time_exits": time_count,
            "time_exit_pct": round(100 * time_count / trades_count, 1),
            "total_net_R": total_net_R,
            "max_drawdown": max_dd,
            "avg_gross_R": gross_mean,
            "avg_net_R": net_mean,
            "std_error": se,
            "profit_factor": profit_factor,
            "first_half_avg_R": first_half_r,
            "second_half_avg_R": second_half_r
        },
        "equity_curve": equity_curve,
        "by_symbol": sorted_syms,
        "trades": trades_list,
        "meta": backtest_info()
    }


@app.get("/api/backtest/status")
def get_backtest_status():
    return backtest_info()


@app.post("/api/backtest/refresh")
def refresh_backtest():
    if _bt_state["running"]:
        raise HTTPException(status_code=409, detail="Backtest refresh already in progress.")
    _bt_state["running"] = True     # visible to the next status poll before the thread starts
    def job():
        _bt_state["last_error"] = None
        if not run_backtest_job():
            _bt_state["running"] = False
    threading.Thread(target=job, daemon=True).start()
    return backtest_info()


@app.get("/api/stock/{symbol}")
def get_stock_data(symbol: str, tf: int = Query(5)):
    clean_sym = symbol.replace(".NS", "").strip().upper()
    pkl_path = os.path.join(HERE, "data", f"{clean_sym}.pkl")
    
    # Try local cache first, or live fetch if missing
    df5 = None
    if os.path.exists(pkl_path):
        try:
            df5 = pd.read_pickle(pkl_path)
        except Exception:
            df5 = None

    if df5 is None:
        try:
            df5 = fetch_5m(clean_sym)
            df5.to_pickle(pkl_path)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Stock data for {clean_sym} could not be loaded: {e}")

    df5 = session(df5)
    bars = build(df5, tf, PARAMS)

    unique_dates = sorted(bars.date.unique())
    last_dates = unique_dates[-3:] if len(unique_dates) >= 3 else unique_dates
    recent_bars = bars[bars.date.isin(last_dates)].copy()

    candles = []
    for idx, row in recent_bars.iterrows():
        candles.append({
            "time": idx.strftime("%Y-%m-%d %H:%M"),
            "open": clean_float(row["open"]),
            "high": clean_float(row["high"]),
            "low": clean_float(row["low"]),
            "close": clean_float(row["close"]),
            "volume": int(row["volume"]) if pd.notna(row["volume"]) else 0,
            "ema9": clean_float(row.get("ema9")),
            "ema21": clean_float(row.get("ema21")),
            "vwap": clean_float(row.get("vwap")),
            "upper": clean_float(row.get("upper")),
            "lower": clean_float(row.get("lower")),
            "tod_rvol": clean_float(row.get("tod_rvol")),
        })

    return {
        "symbol": clean_sym,
        "timeframe": tf,
        "candles": candles,
        "count": len(candles)
    }


@app.get("/api/data")
def get_data_compat(timeframe: Optional[str] = Query("5m"), ratio: Optional[float] = Query(2.0)):
    """Backward compatibility alias for /api/data."""
    tf_num = 5
    if timeframe:
        clean_tf = str(timeframe).lower().replace("m", "")
        if clean_tf.isdigit() and int(clean_tf) in TFS:
            tf_num = int(clean_tf)
    return get_scan(tf=tf_num)


@app.get("/api/params")
def get_params():
    return PARAMS


@app.get("/api/history")
def get_history_logs():
    logs_dir = os.path.join(HERE, "logs")
    if not os.path.exists(logs_dir):
        return {"logs": []}
    files = [f for f in os.listdir(logs_dir) if f.endswith(".csv")]
    return {"logs": sorted(files, reverse=True)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
