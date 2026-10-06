"""
Service: Candle Replay Engine
=============================
Replays post-breakout candles sequentially to evaluate trade lifecycle states:
PENDING -> LIVE -> TARGET HIT / STOPPED / INVALID.
Also calculates R-multiple gains and evaluates Shortlist criteria with dynamic ratios.
"""

import pandas as pd


def replay_trade_lifecycle(
    after_df: pd.DataFrame,
    side: str,
    entry: float,
    stop: float,
    target: float,
    risk: float,
    latest_close: float,
    ratio: float = 2.0,
) -> dict:
    """
    Replays all candles after the breakout candle and determines current status and R-gain.
    """
    status = "PENDING"

    for _, candle in after_df.iterrows():
        c_open, c_high, c_low, c_close = (
            float(candle["Open"]),
            float(candle["High"]),
            float(candle["Low"]),
            float(candle["Close"]),
        )

        if side == "LONG":
            if status == "PENDING":
                # Closed below stop before entry triggered -> INVALID
                if c_close <= stop:
                    status = "INVALID"
                    break
                # Entry triggered
                if c_high >= entry:
                    status = "LIVE"
                    if c_high >= target:
                        status = "TARGET HIT"
                        break
                    elif c_low <= stop:
                        status = "STOPPED"
                        break
            elif status == "LIVE":
                if c_high >= target:
                    status = "TARGET HIT"
                    break
                elif c_low <= stop:
                    status = "STOPPED"
                    break

        else:  # SHORT
            if status == "PENDING":
                # Closed above stop before entry triggered -> INVALID
                if c_close >= stop:
                    status = "INVALID"
                    break
                # Entry triggered
                if c_low <= entry:
                    status = "LIVE"
                    if c_low <= target:
                        status = "TARGET HIT"
                        break
                    elif c_high >= stop:
                        status = "STOPPED"
                        break
            elif status == "LIVE":
                if c_low <= target:
                    status = "TARGET HIT"
                    break
                elif c_high >= stop:
                    status = "STOPPED"
                    break

    # Dynamic R-Multiple gain calculation based on user ratio
    if status == "TARGET HIT":
        r_gain = float(ratio)
    elif status == "STOPPED":
        r_gain = -1.0
    elif status == "LIVE":
        if side == "LONG":
            r_gain = round((latest_close - entry) / risk, 2)
        else:
            r_gain = round((entry - latest_close) / risk, 2)
    else:
        r_gain = 0.0

    candles_since_bo = len(after_df)

    # Actionable Shortlist logic:
    # 1. PENDING setup formed within the last 3 candles
    # 2. LIVE trade still close to entry (r_gain <= 0.5)
    is_shortlist = False
    if status == "PENDING" and candles_since_bo <= 3:
        is_shortlist = True
    elif status == "LIVE" and r_gain <= 0.5:
        is_shortlist = True

    return {
        "status": status,
        "r_gain": r_gain,
        "is_shortlist": is_shortlist,
        "candles_since": candles_since_bo,
    }
