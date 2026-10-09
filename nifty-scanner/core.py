"""In-Play Noise Breakout + Reversal — core logic shared by the live scanner and the backtest.

One signal engine, BUY and SELL. A candle qualifies when the common checks pass
(window, ToD RVOL, candle colour, VWAP, EMA 9/21) and price has either
  - broken out of the noise band (breakout), or
  - reversed a strong day: SELL after an up-day fades off its high,
    BUY after a down-day bounces off its low (reversal).

Everything that decides a signal, its levels or its outcome lives here, so live
mode and backtest mode can never drift apart.
"""
from datetime import timezone, timedelta

import numpy as np
import pandas as pd

IST = timezone(timedelta(hours=5, minutes=30))

PARAMS = dict(
    lookback=14,        # trading days for opening RVOL, ToD RVOL and noise band
    top_n=10,           # in-play stocks kept each day
    rvol_min=2.0,       # ToD RVOL needed on the signal candle
    start=945,          # first signal candle (HHMM, candle start time)
    end=1430,           # last signal candle
    exit_at=1515,       # time exit for open trades; no entries from here on
    atr_len=14,
    ema_fast=9,
    ema_slow=21,
    entry_buf_atr=0.05,
    expiry_bars=3,      # stop order valid for the next 3 candles
    min_risk_atr=0.5,
    max_risk_atr=1.5,
    min_risk_pct=0.003,
    rr=2.0,
    cost_pct=0.0005,    # estimated round-trip cost on notional
    max_trades=1,       # trades per stock per day for each trigger (breakout / reversal),
                        # one after the other, never overlapping
    # reversal trigger: a strong day that turns back through VWAP
    rev_long=True,     # also BUY bounces on down-days — off: -0.11R/trade in the 60-day backtest
    rev_start=1100,     # first reversal signal candle
    rev_move=0.02,      # session high/low must be >= 2% beyond previous close
    rev_pull=0.015,     # close must be >= 1.5% back from that high/low
    rev_rvol=1.5,       # ToD RVOL needed on a reversal candle
    rev_swing=6,        # candles for the recent swing high/low (structure + stop)
    rev_rr=1.2,
)

TFS = (5, 10, 15)


def hhmm(idx):
    return idx.hour * 100 + idx.minute


def session(df5):
    s = hhmm(df5.index)
    return df5[(s >= 915) & (s <= 1525)]


def resample(df5, tf):
    """5-min OHLCV -> tf-min OHLCV, candles anchored at 09:15 IST."""
    if tf == 5:
        return df5.copy()
    origin = pd.Timestamp("2000-01-03 09:15", tz=IST)
    agg = {"open": "first", "high": "max", "low": "min", "close": "last", "volume": "sum"}
    out = df5.resample(f"{tf}min", origin=origin, label="left", closed="left").agg(agg)
    return out.dropna(subset=["open"])


def opening_rvol(df5, P=PARAMS):
    """Per day: 09:15-09:30 volume / mean of the previous `lookback` days. Uses 5-min data."""
    o = df5[hhmm(df5.index) < 930]
    g = o.groupby(o.index.date)
    orv = g.volume.sum().where(g.volume.count() == 3)
    return orv / orv.shift(1).rolling(P["lookback"], min_periods=P["lookback"]).mean()


def _slot_lookup(pivot, df):
    keys = pd.MultiIndex.from_arrays([df["date"], df["slot"]])
    return pivot.stack().reindex(keys).to_numpy()


def build(df5, tf, P=PARAMS):
    """Indicators on tf-min candles. df5 must contain only completed 5-min candles."""
    df5 = session(df5)
    df = resample(df5, tf)
    df["date"] = df.index.date
    df["slot"] = hhmm(df.index)
    lb = P["lookback"]

    df["ema9"] = df.close.ewm(span=P["ema_fast"], adjust=False).mean()
    df["ema21"] = df.close.ewm(span=P["ema_slow"], adjust=False).mean()
    tr = pd.concat([df.high - df.low, (df.high - df.close.shift()).abs(),
                    (df.low - df.close.shift()).abs()], axis=1).max(axis=1)
    df["atr"] = tr.rolling(P["atr_len"]).mean()
    tp = (df.high + df.low + df.close) / 3
    df["vwap"] = (tp * df.volume).groupby(df.date).cumsum() / df.volume.groupby(df.date).cumsum()

    # time-of-day RVOL: same slot, previous 14 trading days
    vol = df.pivot_table(index="date", columns="slot", values="volume", aggfunc="sum", fill_value=0)
    df["tod_rvol"] = df.volume / _slot_lookup(vol.shift(1).rolling(lb, min_periods=lb).mean(), df)

    # noise band: mean |close/open - 1| at this slot over previous 14 days
    g = df.groupby("date")
    day = pd.DataFrame({"open": g.open.first(), "close": g.close.last()})
    day["prev_close"] = day.close.shift()
    mv = (df.close / df.date.map(day.open) - 1).abs()
    mvp = pd.DataFrame({"date": df.date, "slot": df.slot, "mv": mv}).pivot_table(
        index="date", columns="slot", values="mv")
    df["normal_move"] = _slot_lookup(mvp.shift(1).rolling(lb, min_periods=lb).mean(), df)
    df["day_open"] = df.date.map(day.open)
    df["prev_close"] = df.date.map(day.prev_close)
    df["upper"] = np.maximum(df.day_open, df.prev_close) * (1 + df.normal_move)
    df["lower"] = np.minimum(df.day_open, df.prev_close) * (1 - df.normal_move)

    # reversal inputs: session extremes, recent swing high/low, 3 closes on one side of VWAP
    g = df.groupby("date")
    df["cum_high"] = g.high.cummax()
    df["cum_low"] = g.low.cummin()
    sw = P["rev_swing"]
    df["swing_hi"] = g.high.transform(lambda x: x.rolling(sw, min_periods=1).max())
    df["swing_lo"] = g.low.transform(lambda x: x.rolling(sw, min_periods=1).min())
    for name, side in (("above_vwap3", df.close > df.vwap), ("below_vwap3", df.close < df.vwap)):
        df[name] = side.astype(int).groupby(df.date).transform(lambda x: x.rolling(3, min_periods=3).sum()) == 3
    return df


def reversal(b, P=PARAMS):
    """(long, short) reversal triggers: a strong day turning back through VWAP."""
    if b.slot < P["rev_start"]:
        return False, False
    short = bool(b.cum_high >= b.prev_close * (1 + P["rev_move"])         # up-day
                 and b.close <= b.cum_high * (1 - P["rev_pull"])          # faded off the high
                 and b.below_vwap3 and b.swing_hi < b.cum_high)           # lost VWAP, lower high
    long_ = bool(P["rev_long"]
                 and b.cum_low <= b.prev_close * (1 - P["rev_move"])      # down-day
                 and b.close >= b.cum_low * (1 + P["rev_pull"])           # bounced off the low
                 and b.above_vwap3 and b.swing_lo > b.cum_low)            # reclaimed VWAP, higher low
    return long_, short


def checks(b, P=PARAMS):
    """All signal conditions for one candle (in-play is checked by the caller).

    `band` passes on a noise-band breakout or a reversal; a reversal needs only
    `rev_rvol`, a breakout `rvol_min`.
    """
    inwin = P["start"] <= b.slot <= P["end"]
    rev_l, rev_s = reversal(b, P)
    band_l, band_s = b.close > b.upper, b.close < b.lower
    rv_l = b.tod_rvol >= (P["rvol_min"] if band_l or not rev_l else P["rev_rvol"])
    rv_s = b.tod_rvol >= (P["rvol_min"] if band_s or not rev_s else P["rev_rvol"])
    long_ = dict(window=inwin, rvol=bool(rv_l), candle=b.close > b.open, band=bool(band_l or rev_l),
                 vwap=b.close > b.vwap, ema=b.ema9 > b.ema21)
    short = dict(window=inwin, rvol=bool(rv_s), candle=b.close < b.open, band=bool(band_s or rev_s),
                 vwap=b.close < b.vwap, ema=b.ema9 < b.ema21)
    return long_, short


def signal_side(b, P=PARAMS):
    long_, short = checks(b, P)
    if all(long_.values()):
        return 1
    if all(short.values()):
        return -1
    return 0


def trigger(b, side):
    """'BREAKOUT' if the candle closed outside the noise band, else 'REVERSAL'."""
    return "BREAKOUT" if (b.close > b.upper if side == 1 else b.close < b.lower) else "REVERSAL"


def levels(b, side, P=PARAMS):
    """Entry / stop / target / risk for a signal candle.

    Breakout: stop at the tighter of candle extreme / EMA21, target `rr`.
    Reversal: stop beyond the recent swing or VWAP, whichever is nearer, target `rev_rr`.
    """
    atr = b.atr
    rev = trigger(b, side) == "REVERSAL"
    if side == 1:
        entry = b.high + P["entry_buf_atr"] * atr
        stop0 = max(b.swing_lo, b.vwap - 0.1 * atr) if rev else max(b.low, b.ema21)
    else:
        entry = b.low - P["entry_buf_atr"] * atr
        stop0 = min(b.swing_hi, b.vwap + 0.1 * atr) if rev else min(b.high, b.ema21)
    risk = side * (entry - stop0)
    risk = min(max(risk, P["min_risk_atr"] * atr), P["max_risk_atr"] * atr)
    risk = max(risk, P["min_risk_pct"] * entry)
    rr = P["rev_rr"] if rev else P["rr"]
    return entry, entry - side * risk, entry + side * rr * risk, risk


def run_day(day, P=PARAMS, exit_open=None, final=True):
    """Replay one stock-day of completed candles. Returns every signal with its outcome.

    day       : today's candles for one in-play stock (output of build), completed only
    exit_open : live mode, the 15:15 price if the 15:15 candle has not completed yet
    final     : backtest mode, the day is over (no PENDING / OPEN left)

    Up to `max_trades` breakout and `max_trades` reversal trades per stock per day;
    scanning resumes after a trade exits, so a failed BUY can still be followed by a SELL.
    """
    out, n, i = [], len(day), 0
    trades = {"BREAKOUT": 0, "REVERSAL": 0}
    while i < n and min(trades.values()) < P["max_trades"]:
        b = day.iloc[i]
        nan = np.isnan(b.tod_rvol) or np.isnan(b.normal_move) or np.isnan(b.atr) or np.isnan(b.prev_close)
        side = 0 if nan else signal_side(b, P)
        if side and trades[trigger(b, side)] >= P["max_trades"]:
            side = 0
        if not side:
            i += 1
            continue
        entry, stop, target, risk = levels(b, side, P)
        rec = dict(side="BUY" if side == 1 else "SELL", trigger=trigger(b, side), signal_candle=day.index[i],
                   entry=entry, stop=stop, target=target, risk=risk, risk_pct=100 * risk / entry, atr=b.atr,
                   tod_rvol=b.tod_rvol, vwap=b.vwap, ema9=b.ema9, ema21=b.ema21, close=b.close,
                   upper=b.upper, lower=b.lower, entry_time=None, fill=None, exit_time=None, exit_price=None,
                   gross_R=None, cost_R=None, net_R=None, candles_left=None)
        out.append(rec)

        # pending stop order: next `expiry_bars` candles, never at/after the time exit
        trig, seen = None, 0
        for j in range(i + 1, min(i + 1 + P["expiry_bars"], n)):
            c = day.iloc[j]
            if c.slot >= P["exit_at"]:
                seen = P["expiry_bars"]
                break
            seen += 1
            if (side == 1 and c.high >= entry) or (side == -1 and c.low <= entry):
                trig = j
                break
        if trig is None:
            if seen >= P["expiry_bars"] or final or exit_open is not None:
                rec["status"] = "CANCELLED"
                i += P["expiry_bars"] + 1
                continue
            rec["status"] = "ENTRY PENDING"
            rec["candles_left"] = P["expiry_bars"] - seen
            break

        # triggered — fill at entry, or at the open if the candle gapped through it
        c = day.iloc[trig]
        fill = max(entry, c.open) if side == 1 else min(entry, c.open)
        rec.update(entry_time=day.index[trig], fill=fill)
        for j in range(trig, n):
            c = day.iloc[j]
            if c.slot >= P["exit_at"]:
                rec.update(status="TIME EXIT", exit_time=day.index[j], exit_price=c.open)
                break
            hit_stop = c.low <= stop if side == 1 else c.high >= stop
            hit_tgt = c.high >= target if side == 1 else c.low <= target
            if hit_stop:     # also covers stop+target in one candle: assume stop first
                rec.update(status="STOP LOSS HIT", exit_time=day.index[j], exit_price=stop)
                break
            if hit_tgt:
                rec.update(status="TARGET HIT", exit_time=day.index[j], exit_price=target)
                break
        else:
            if exit_open is not None:
                rec.update(status="TIME EXIT", exit_price=exit_open,
                           exit_time=day.index[-1].replace(hour=15, minute=15))
            elif final:
                rec.update(status="TIME EXIT", exit_time=day.index[-1], exit_price=day.iloc[-1].close)
            else:
                rec["status"] = "OPEN"
        px = rec["exit_price"] if rec["exit_price"] is not None else day.iloc[-1].close
        rec["gross_R"] = side * (px - fill) / risk
        rec["cost_R"] = P["cost_pct"] * fill / risk
        rec["net_R"] = rec["gross_R"] - rec["cost_R"]
        if rec["status"] == "OPEN":
            break
        trades[rec["trigger"]] += 1
        i = j + 1           # next signal can come only after this trade has exited
    return out
