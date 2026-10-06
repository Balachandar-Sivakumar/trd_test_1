"""
Service: Trade History Manager
==============================
Persists completed trade outcomes (TARGET HIT, STOPPED, INVALID) to JSON storage.
Provides historical analytics, win rates, and summary statistics.
"""

from datetime import datetime
import json
import os
import threading
from app.config import IST

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")

_HISTORY_LOCK = threading.Lock()


def _ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "w") as f:
            json.dump([], f)


def load_history() -> list[dict]:
    """Loads all stored trade history records."""
    _ensure_data_dir()
    with _HISTORY_LOCK:
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []


def record_trades(trades: list[dict], timeframe: str, ratio: float):
    """
    Records completed trades (TARGET HIT, STOPPED, INVALID) into the history file.
    Deduplicates records based on (date, symbol, time, timeframe).
    """
    _ensure_data_dir()
    completed_outcomes = {"TARGET HIT", "STOPPED", "INVALID"}

    with _HISTORY_LOCK:
        try:
            with open(HISTORY_FILE, "r") as f:
                history = json.load(f)
        except Exception:
            history = []

        existing_ids = {item["id"] for item in history}
        updated = False

        for t in trades:
            outcome = t.get("status")
            if outcome not in completed_outcomes:
                continue

            date_str = t.get("date", datetime.now(IST).strftime("%Y-%m-%d"))
            trade_id = f"{date_str}_{t['symbol']}_{t['time']}_{timeframe}_{t['side']}"

            if trade_id not in existing_ids:
                record = {
                    "id": trade_id,
                    "date": date_str,
                    "time": t["time"],
                    "symbol": t["symbol"],
                    "side": t["side"],
                    "timeframe": timeframe,
                    "ratio": ratio,
                    "level_cleared": t.get("level_cleared", "ORH"),
                    "entry": t["entry"],
                    "stop": t["stop"],
                    "target": t["target"],
                    "risk": t["risk"],
                    "exit_price": t.get("current_price", t["target"] if outcome == "TARGET HIT" else t["stop"]),
                    "status": outcome,
                    "r_gain": t.get("r_gain", ratio if outcome == "TARGET HIT" else (-1.0 if outcome == "STOPPED" else 0.0)),
                    "recorded_at": datetime.now(IST).strftime("%Y-%m-%d %H:%M:%S"),
                }
                history.insert(0, record)  # Newest first
                existing_ids.add(trade_id)
                updated = True

        if updated:
            with open(HISTORY_FILE, "w") as f:
                json.dump(history, f, indent=2)


def get_history_summary() -> dict:
    """Calculates win rate, total R gain, and outcome counts from stored history."""
    history = load_history()
    target_hits = sum(1 for h in history if h["status"] == "TARGET HIT")
    stopped = sum(1 for h in history if h["status"] == "STOPPED")
    invalid = sum(1 for h in history if h["status"] == "INVALID")
    total_completed = target_hits + stopped

    win_rate = round((target_hits / total_completed * 100), 1) if total_completed > 0 else 0.0
    total_r_gain = round(sum(h.get("r_gain", 0.0) for h in history), 2)

    return {
        "total_records": len(history),
        "target_hits": target_hits,
        "stopped": stopped,
        "invalid": invalid,
        "total_completed_trades": total_completed,
        "win_rate": win_rate,
        "total_r_gain": total_r_gain,
        "history": history,
    }


def clear_history() -> bool:
    """Clears all stored history."""
    _ensure_data_dir()
    with _HISTORY_LOCK:
        try:
            with open(HISTORY_FILE, "w") as f:
                json.dump([], f)
            return True
        except Exception:
            return False
