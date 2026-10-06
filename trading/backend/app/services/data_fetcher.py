"""
Service: Data Fetcher
====================
Downloads candlestick data from Yahoo Finance and resamples to dynamic timeframes:
3m, 5m, 10m, 15m. Drops forming/unfinished candles.
"""

from datetime import datetime
import pandas as pd
import yfinance as yf
from app.config import IST

# Timeframe seconds mapping
TIMEFRAME_SECONDS = {
    "3m": 180,
    "5m": 300,
    "10m": 600,
    "15m": 900,
}


def _clean_and_localize(df: pd.DataFrame) -> pd.DataFrame:
    """Ensures DataFrame has IST timezone index and valid columns."""
    if df.empty:
        return df
    if df.index.tz is None:
        df.index = df.index.tz_localize("UTC").tz_convert(IST)
    else:
        df.index = df.index.tz_convert(IST)
    return df


def fetch_stock_data(symbol: str, timeframe: str = "5m") -> pd.DataFrame:
    """
    Fetches candlestick data for the specified timeframe (3m, 5m, 10m, 15m).
    Applies resampling when native Yahoo Finance interval is not directly available.
    Drops the forming/incomplete candle.
    """
    try:
        ticker = yf.Ticker(symbol)
        now_ist = datetime.now(IST)
        candle_sec = TIMEFRAME_SECONDS.get(timeframe, 300)

        if timeframe == "3m":
            # Fetch 1m candles and resample to 3min
            raw = ticker.history(period="5d", interval="1m")
            if raw.empty or len(raw) < 50:
                return pd.DataFrame()
            raw = _clean_and_localize(raw)

            # Drop forming 1m candle
            if (now_ist - raw.index[-1]).total_seconds() < 60:
                raw = raw.iloc[:-1]

            # Resample to 3min
            df = raw.resample("3min", origin="start_day").agg({
                "Open": "first",
                "High": "max",
                "Low": "min",
                "Close": "last",
                "Volume": "sum",
            }).dropna()

        elif timeframe == "10m":
            # Fetch 5m candles and resample to 10min
            raw = ticker.history(period="5d", interval="5m")
            if raw.empty or len(raw) < 30:
                return pd.DataFrame()
            raw = _clean_and_localize(raw)

            # Drop forming 5m candle
            if (now_ist - raw.index[-1]).total_seconds() < 300:
                raw = raw.iloc[:-1]

            # Resample to 10min
            df = raw.resample("10min", origin="start_day").agg({
                "Open": "first",
                "High": "max",
                "Low": "min",
                "Close": "last",
                "Volume": "sum",
            }).dropna()

        elif timeframe == "15m":
            # Native 15m candles
            raw = ticker.history(period="5d", interval="15m")
            if raw.empty or len(raw) < 20:
                return pd.DataFrame()
            df = _clean_and_localize(raw)

        else:  # Default "5m"
            raw = ticker.history(period="5d", interval="5m")
            if raw.empty or len(raw) < 30:
                return pd.DataFrame()
            df = _clean_and_localize(raw)

        if df.empty or len(df) < 20:
            return pd.DataFrame()

        # Drop unfinished candle for current timeframe
        latest_candle_time = df.index[-1]
        if (now_ist - latest_candle_time).total_seconds() < candle_sec:
            df = df.iloc[:-1].copy()

        return df
    except Exception:
        return pd.DataFrame()
