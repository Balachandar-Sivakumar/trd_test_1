"""
Core: Application State & Background Worker
===========================================
Holds thread-safe cached scan results for dynamic timeframes & ratios.
Automatically persists completed/stopped/invalid trades into history.
"""

from datetime import datetime
import threading
import time
from app.config import (
    IST,
    NIFTY_50_TICKERS,
    DEFAULT_TIMEFRAME,
    DEFAULT_RATIO,
)
from app.core.scanner import scan_all_stocks
from app.services.history_manager import record_trades

_STATE_LOCK = threading.Lock()

# Multi-cache dictionary: key = f"{timeframe}_{ratio}"
_STATE = {
    "active_timeframe": DEFAULT_TIMEFRAME,
    "active_ratio": DEFAULT_RATIO,
    "is_scanning": False,
    "caches": {},  # key -> { results, shortlist, last_scan_time, stats }
}


def _get_cache_key(timeframe: str, ratio: float) -> str:
    return f"{timeframe}_{ratio:.1f}"


def get_scan_state(timeframe: str = DEFAULT_TIMEFRAME, ratio: float = DEFAULT_RATIO) -> dict:
    """Returns a thread-safe snapshot of the current state for given timeframe & ratio."""
    key = _get_cache_key(timeframe, ratio)
    with _STATE_LOCK:
        cached = _STATE["caches"].get(key)
        is_scanning = _STATE["is_scanning"]

    if cached:
        return {
            "timeframe": timeframe,
            "ratio": ratio,
            "is_scanning": is_scanning,
            "last_scan_time": cached["last_scan_time"],
            "results": list(cached["results"]),
            "shortlist": list(cached["shortlist"]),
            "stats": dict(cached["stats"]),
            "server_time": datetime.now(IST).strftime("%H:%M:%S"),
        }

    return {
        "timeframe": timeframe,
        "ratio": ratio,
        "is_scanning": is_scanning,
        "last_scan_time": None,
        "results": [],
        "shortlist": [],
        "stats": {
            "total_scanned": len(NIFTY_50_TICKERS),
            "total_breakouts": 0,
            "long_count": 0,
            "short_count": 0,
            "shortlist_count": 0,
            "target_hit_count": 0,
            "live_count": 0,
            "pending_count": 0,
            "stopped_count": 0,
        },
        "server_time": datetime.now(IST).strftime("%H:%M:%S"),
    }


def run_scan_job(timeframe: str = DEFAULT_TIMEFRAME, ratio: float = DEFAULT_RATIO) -> bool:
    """Runs a complete scan for specified timeframe & ratio, updates cache, and persists trade history."""
    global _STATE
    with _STATE_LOCK:
        if _STATE["is_scanning"]:
            return False
        _STATE["is_scanning"] = True
        _STATE["active_timeframe"] = timeframe
        _STATE["active_ratio"] = ratio

    try:
        now_str = datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now_str}] 🚀 Scanning {timeframe} candles with {ratio}R Target...")

        results = scan_all_stocks(timeframe=timeframe, ratio=ratio)
        shortlist = [r for r in results if r["is_shortlist"]]

        # Automatically record completed trades to history (TARGET HIT, STOPPED, INVALID)
        record_trades(results, timeframe=timeframe, ratio=ratio)

        # Statistics
        longs = sum(1 for r in results if r["side"] == "LONG")
        shorts = sum(1 for r in results if r["side"] == "SHORT")
        target_hits = sum(1 for r in results if r["status"] == "TARGET HIT")
        live_trades = sum(1 for r in results if r["status"] == "LIVE")
        pending_trades = sum(1 for r in results if r["status"] == "PENDING")
        stopped_trades = sum(1 for r in results if r["status"] == "STOPPED")

        key = _get_cache_key(timeframe, ratio)
        with _STATE_LOCK:
            _STATE["caches"][key] = {
                "results": results,
                "shortlist": shortlist,
                "last_scan_time": datetime.now(IST).strftime("%I:%M:%S %p"),
                "stats": {
                    "total_scanned": len(NIFTY_50_TICKERS),
                    "total_breakouts": len(results),
                    "long_count": longs,
                    "short_count": shorts,
                    "shortlist_count": len(shortlist),
                    "target_hit_count": target_hits,
                    "live_count": live_trades,
                    "pending_count": pending_trades,
                    "stopped_count": stopped_trades,
                },
            }

        print(
            f"[{now_str}] ✅ Scan completed ({timeframe}, {ratio}R): {len(results)} breakouts, {len(shortlist)} shortlisted."
        )
        return True
    finally:
        with _STATE_LOCK:
            _STATE["is_scanning"] = False


def trigger_scan_async(timeframe: str = DEFAULT_TIMEFRAME, ratio: float = DEFAULT_RATIO) -> bool:
    """Triggers an asynchronous scan for given timeframe and ratio."""
    with _STATE_LOCK:
        if _STATE["is_scanning"]:
            return False
    t = threading.Thread(target=run_scan_job, args=(timeframe, ratio), daemon=True)
    t.start()
    return True


def auto_refresh_daemon():
    """Background daemon auto-refreshing the active timeframe periodically."""
    # Run initial scan for default settings
    threading.Thread(target=run_scan_job, args=(DEFAULT_TIMEFRAME, DEFAULT_RATIO), daemon=True).start()

    while True:
        with _STATE_LOCK:
            tf = _STATE["active_timeframe"]
            rt = _STATE["active_ratio"]

        # Interval in minutes
        minutes_map = {"3m": 3, "5m": 5, "10m": 10, "15m": 15}
        step_min = minutes_map.get(tf, 5)

        now = datetime.now(IST)
        minute = now.minute
        second = now.second

        mins_to_next = step_min - (minute % step_min)
        sleep_sec = (mins_to_next * 60) - second + 15
        if sleep_sec < 10:
            sleep_sec += step_min * 60

        time.sleep(sleep_sec)

        # Trigger during market hours
        curr = datetime.now(IST)
        if curr.weekday() < 5 and (9, 15) <= (curr.hour, curr.minute) <= (15, 40):
            run_scan_job(timeframe=tf, ratio=rt)


def start_background_workers():
    """Starts the auto-refresh background daemon thread."""
    t = threading.Thread(target=auto_refresh_daemon, daemon=True)
    t.start()
