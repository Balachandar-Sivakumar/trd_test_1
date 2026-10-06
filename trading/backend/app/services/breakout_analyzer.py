"""
Service: Breakout Analyzer
==========================
Evaluates volume breakout criteria, calculates Entry, Dynamic Clamped Stop,
and dynamic Risk:Reward Target (1:1.5, 1:2, 1:2.5, 1:3, etc.).
"""

from datetime import time
import pandas as pd
from app.config import (
    WINDOW_START,
    WINDOW_END,
    RELATIVE_VOLUME_THRESHOLD,
    ENTRY_ATR_BUFFER,
    STOP_MIN_ATR_FACTOR,
    STOP_MAX_ATR_FACTOR,
)


def find_qualifying_breakouts(
    curr_df: pd.DataFrame, orh: float, orl: float, pdh: float, pdl: float
) -> list[dict]:
    """Finds all candles qualifying as Long or Short breakouts within the 09:30 - 14:30 window."""
    window_df = curr_df[
        (curr_df.index.time >= WINDOW_START) & (curr_df.index.time <= WINDOW_END)
    ]

    candidates = []
    for idx, row in window_df.iterrows():
        # Long conditions
        is_long = (
            row["Rel_Vol"] >= RELATIVE_VOLUME_THRESHOLD
            and row["Close"] > orh
            and row["Close"] > row["VWAP"]
            and row["EMA_9"] > row["EMA_21"]
            and row["Close"] > row["Open"]  # Green candle
            and not pd.isna(row["ATR_14"])
        )

        # Short conditions
        is_short = (
            row["Rel_Vol"] >= RELATIVE_VOLUME_THRESHOLD
            and row["Close"] < orl
            and row["Close"] < row["VWAP"]
            and row["EMA_9"] < row["EMA_21"]
            and row["Close"] < row["Open"]  # Red candle
            and not pd.isna(row["ATR_14"])
        )

        if is_long:
            candidates.append(
                {
                    "type": "LONG",
                    "timestamp": idx,
                    "candle": row,
                    "cleared_pd": row["Close"] > pdh,
                }
            )
        elif is_short:
            candidates.append(
                {
                    "type": "SHORT",
                    "timestamp": idx,
                    "candle": row,
                    "cleared_pd": row["Close"] < pdl,
                }
            )

    return candidates


def calculate_trade_levels(bo: dict, ratio: float = 2.0) -> dict:
    """
    Calculates Entry, Dynamic ATR-clamped Stop Loss, Risk amount,
    and Target based on the user-selected Risk:Reward ratio.
    """
    side = bo["type"]
    bo_candle = bo["candle"]
    atr = float(bo_candle["ATR_14"])
    ema21 = float(bo_candle["EMA_21"])

    if side == "LONG":
        entry = round(float(bo_candle["High"]) + ENTRY_ATR_BUFFER * atr, 2)
        initial_stop = max(float(bo_candle["Low"]), ema21)
        dist = entry - initial_stop

        # ATR Noise clamping
        if dist < STOP_MIN_ATR_FACTOR * atr:
            stop = round(entry - STOP_MIN_ATR_FACTOR * atr, 2)
        elif dist > STOP_MAX_ATR_FACTOR * atr:
            stop = round(entry - STOP_MAX_ATR_FACTOR * atr, 2)
        else:
            stop = round(initial_stop, 2)

        risk = round(entry - stop, 2)
        target = round(entry + ratio * risk, 2)

    else:  # SHORT
        entry = round(float(bo_candle["Low"]) - ENTRY_ATR_BUFFER * atr, 2)
        initial_stop = min(float(bo_candle["High"]), ema21)
        dist = initial_stop - entry

        # ATR Noise clamping
        if dist < STOP_MIN_ATR_FACTOR * atr:
            stop = round(entry + STOP_MIN_ATR_FACTOR * atr, 2)
        elif dist > STOP_MAX_ATR_FACTOR * atr:
            stop = round(entry + STOP_MAX_ATR_FACTOR * atr, 2)
        else:
            stop = round(initial_stop, 2)

        risk = round(stop - entry, 2)
        target = round(entry - ratio * risk, 2)

    return {
        "side": side,
        "entry": entry,
        "stop": stop,
        "risk": risk,
        "target": target,
        "ratio": ratio,
        "atr": round(atr, 2),
    }
