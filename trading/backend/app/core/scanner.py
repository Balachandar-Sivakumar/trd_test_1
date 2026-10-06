"""
Core: Scanner Orchestrator
==========================
Coordinates data fetching, indicator computation, breakout analysis, and replay
across all 50 Nifty tickers in parallel for dynamic timeframes and ratios.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
import pandas as pd
from app.config import NIFTY_50_TICKERS, MAX_WORKERS, IST
from app.services.data_fetcher import fetch_stock_data
from app.services.indicators import (
    compute_indicators,
    get_opening_range,
    get_previous_day_levels,
)
from app.services.breakout_analyzer import (
    find_qualifying_breakouts,
    calculate_trade_levels,
)
from app.services.replay_engine import replay_trade_lifecycle


def analyze_single_stock(symbol: str, timeframe: str = "5m", ratio: float = 2.0) -> dict | None:
    """End-to-end analysis of a single stock against strategy rules for given timeframe & ratio."""
    raw_df = fetch_stock_data(symbol, timeframe=timeframe)
    if raw_df.empty or len(raw_df) < 20:
        return None

    df = compute_indicators(raw_df)
    unique_dates = sorted(list(df["Date"].unique()))
    if len(unique_dates) < 2:
        return None

    prev_date = unique_dates[-2]
    curr_date = unique_dates[-1]

    # Previous Day Levels
    pdh, pdl = get_previous_day_levels(df, prev_date)

    # Today's session data
    curr_df = df[df["Date"] == curr_date].copy()
    if len(curr_df) < 2:
        return None

    # Opening Range (09:15 - 09:30)
    orh, orl = get_opening_range(curr_df)

    # Breakout candidates
    candidates = find_qualifying_breakouts(curr_df, orh, orl, pdh, pdl)
    if not candidates:
        return None

    # Pick the most recent qualifying breakout candle
    bo = candidates[-1]
    levels = calculate_trade_levels(bo, ratio=ratio)
    if levels["risk"] <= 0:
        return None

    bo_time = bo["timestamp"]
    bo_candle = bo["candle"]

    # Replay subsequent candles
    after_df = curr_df[curr_df.index > bo_time]
    latest_close = float(curr_df.iloc[-1]["Close"])

    replay = replay_trade_lifecycle(
        after_df=after_df,
        side=levels["side"],
        entry=levels["entry"],
        stop=levels["stop"],
        target=levels["target"],
        risk=levels["risk"],
        latest_close=latest_close,
        ratio=ratio,
    )

    cleared_pd = bo["cleared_pd"]
    if levels["side"] == "LONG":
        level_cleared = "PDH" if cleared_pd else "ORH"
    else:
        level_cleared = "PDL" if cleared_pd else "ORL"

    return {
        "symbol": symbol.replace(".NS", ""),
        "full_symbol": symbol,
        "date": curr_date.strftime("%Y-%m-%d") if hasattr(curr_date, "strftime") else str(curr_date),
        "side": levels["side"],
        "time": bo_time.strftime("%H:%M"),
        "timeframe": timeframe,
        "ratio": ratio,
        "rel_vol": round(float(bo_candle["Rel_Vol"]), 1),
        "level_cleared": level_cleared,
        "entry": levels["entry"],
        "stop": levels["stop"],
        "risk": levels["risk"],
        "target": levels["target"],
        "current_price": round(latest_close, 2),
        "status": replay["status"],
        "r_gain": replay["r_gain"],
        "is_shortlist": replay["is_shortlist"],
        "candles_since": replay["candles_since"],
    }


def scan_all_stocks(timeframe: str = "5m", ratio: float = 2.0) -> list[dict]:
    """Scans all Nifty 50 stocks concurrently using a thread pool for given timeframe and ratio."""
    results = []
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(analyze_single_stock, sym, timeframe, ratio): sym
            for sym in NIFTY_50_TICKERS
        }
        for future in as_completed(futures):
            try:
                res = future.result()
                if res:
                    results.append(res)
            except Exception:
                pass

    # Sort: Shortlist setups first, then sorted chronologically by setup time
    results.sort(key=lambda x: (not x["is_shortlist"], x["time"]))
    return results
