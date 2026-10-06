"""
API Routes: Endpoints for Scanner Data, Dynamic Settings, and Trade History
===========================================================================
Provides REST API endpoints for the React frontend with dynamic timeframes (3m, 5m, 10m, 15m),
ratios, and trade outcome history.
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from app.config import IST, SUPPORTED_TIMEFRAMES, DEFAULT_TIMEFRAME, DEFAULT_RATIO
from app.core.state import get_scan_state, trigger_scan_async
from app.services.history_manager import get_history_summary, clear_history

router = APIRouter(prefix="/api", tags=["Scanner"])


@router.get("/data")
def get_dashboard_data(
    timeframe: str = Query(DEFAULT_TIMEFRAME, regex="^(3m|5m|10m|15m)$"),
    ratio: float = Query(DEFAULT_RATIO, ge=1.0, le=5.0),
):
    """
    Returns cached scan results, shortlist, and aggregated statistics
    for the selected timeframe and risk-to-reward ratio.
    """
    state = get_scan_state(timeframe=timeframe, ratio=ratio)
    # If no data is cached yet for this timeframe/ratio, trigger an initial scan
    if state["last_scan_time"] is None and not state["is_scanning"]:
        trigger_scan_async(timeframe=timeframe, ratio=ratio)
    return state


@router.post("/scan")
def trigger_manual_scan(
    timeframe: str = Query(DEFAULT_TIMEFRAME, regex="^(3m|5m|10m|15m)$"),
    ratio: float = Query(DEFAULT_RATIO, ge=1.0, le=5.0),
):
    """Triggers an immediate background scan for the specified timeframe and ratio."""
    started = trigger_scan_async(timeframe=timeframe, ratio=ratio)
    if not started:
        raise HTTPException(
            status_code=409,
            detail="A scan is already in progress. Please wait for it to complete.",
        )
    return {
        "status": "started",
        "timeframe": timeframe,
        "ratio": ratio,
        "message": f"Scan started for {timeframe} with {ratio}R target",
    }


@router.get("/status")
def get_system_status(timeframe: str = Query(DEFAULT_TIMEFRAME)):
    """
    Returns countdown to the next candle boundary for the selected timeframe (3m, 5m, 10m, 15m),
    market open/close status, and scanner status.
    """
    now = datetime.now(IST)

    # Step minutes based on timeframe
    step_map = {"3m": 3, "5m": 5, "10m": 10, "15m": 15}
    step_min = step_map.get(timeframe, 5)

    mins_to_next = step_min - (now.minute % step_min)
    sec_to_next = (mins_to_next * 60) - now.second
    if sec_to_next < 0:
        sec_to_next += step_min * 60

    is_weekday = now.weekday() < 5
    is_market_open = is_weekday and (
        (now.hour == 9 and now.minute >= 15)
        or (9 < now.hour < 15)
        or (now.hour == 15 and now.minute <= 30)
    )

    state = get_scan_state(timeframe=timeframe)
    return {
        "timeframe": timeframe,
        "is_scanning": state["is_scanning"],
        "last_scan_time": state["last_scan_time"],
        "market_open": is_market_open,
        "seconds_until_next_candle": sec_to_next,
        "server_time": now.strftime("%H:%M:%S"),
    }


@router.get("/history")
def get_trade_history():
    """
    Returns all recorded trade history (TARGET HIT, STOPPED, INVALID)
    along with win rate, completed trades count, and net R-multiple gain.
    """
    return get_history_summary()


@router.post("/history/clear")
def clear_trade_history():
    """Clears all stored historical trade records."""
    success = clear_history()
    return {"status": "ok" if success else "error", "message": "History cleared"}


@router.get("/health")
def health_check():
    """Basic health check endpoint."""
    return {"status": "ok", "timestamp": datetime.now(IST).isoformat()}
