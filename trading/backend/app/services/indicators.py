"""
Service: Technical Indicators
=============================
Calculates EMA 9, EMA 21, Cumulative VWAP, ATR 14, and Relative Volume.
"""

import numpy as np
import pandas as pd
from app.config import (
    EMA_FAST,
    EMA_SLOW,
    ATR_PERIOD,
    OPENING_RANGE_START,
    OPENING_RANGE_END,
)


def compute_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """Computes technical indicators on the candlestick dataframe."""
    df = df.copy()

    # 1. Exponential Moving Averages (EMA 9 & EMA 21)
    df["EMA_9"] = df["Close"].ewm(span=EMA_FAST, adjust=False).mean()
    df["EMA_21"] = df["Close"].ewm(span=EMA_SLOW, adjust=False).mean()

    # 2. Cumulative VWAP (resets fresh each morning)
    df["Date"] = df.index.date
    df["Typical_Price"] = (df["High"] + df["Low"] + df["Close"]) / 3.0
    df["VP"] = df["Typical_Price"] * df["Volume"]

    cum_vp = df.groupby("Date")["VP"].cumsum()
    cum_vol = df.groupby("Date")["Volume"].cumsum()
    df["VWAP"] = np.where(cum_vol > 0, cum_vp / cum_vol, df["Close"])

    # 3. Average True Range (ATR 14)
    prev_close = df["Close"].shift(1)
    tr1 = df["High"] - df["Low"]
    tr2 = (df["High"] - prev_close).abs()
    tr3 = (df["Low"] - prev_close).abs()
    tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    df["ATR_14"] = tr.rolling(window=ATR_PERIOD).mean()

    # 4. Relative Volume: Current candle vol / average of previous 20 candles
    df["Vol_Avg_20"] = df["Volume"].shift(1).rolling(window=20).mean()
    df["Rel_Vol"] = np.where(
        df["Vol_Avg_20"] > 0, df["Volume"] / df["Vol_Avg_20"], 0.0
    )

    return df


def get_opening_range(curr_df: pd.DataFrame) -> tuple[float, float]:
    """
    Returns (ORH, ORL) for the opening range (09:15 - 09:30).
    Works dynamically across any timeframe (3m, 5m, 10m, 15m).
    """
    or_df = curr_df[
        (curr_df.index.time >= OPENING_RANGE_START)
        & (curr_df.index.time < OPENING_RANGE_END)
    ]
    if len(or_df) < 1:
        or_df = curr_df.iloc[:1]

    orh = float(or_df["High"].max())
    orl = float(or_df["Low"].min())
    return orh, orl


def get_previous_day_levels(
    df: pd.DataFrame, prev_date
) -> tuple[float, float]:
    """Returns (PDH, PDL) for the previous trading session."""
    prev_df = df[df["Date"] == prev_date]
    pdh = float(prev_df["High"].max())
    pdl = float(prev_df["Low"].min())
    return pdh, pdl
