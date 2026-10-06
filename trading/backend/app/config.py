"""
Trading Configuration & Constants
================================
Defines stock tickers, market hours, and dynamic strategy parameters.
"""

from datetime import time
import pytz

# Timezone
IST = pytz.timezone("Asia/Kolkata")

# Nifty 50 Stock Tickers (Yahoo Finance .NS)
NIFTY_50_TICKERS = [
    "ADANIENT.NS", "ADANIPORTS.NS", "APOLLOHOSP.NS", "ASIANPAINT.NS", "AXISBANK.NS",
    "BAJAJ-AUTO.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "BEL.NS", "BPCL.NS",
    "BHARTIARTL.NS", "BRITANNIA.NS", "CIPLA.NS", "COALINDIA.NS", "DRREDDY.NS",
    "EICHERMOT.NS", "GRASIM.NS", "HCLTECH.NS", "HDFCBANK.NS", "HDFCLIFE.NS",
    "HEROMOTOCO.NS", "HINDALCO.NS", "HINDUNILVR.NS", "ICICIBANK.NS", "ITC.NS",
    "INDUSINDBK.NS", "INFY.NS", "JSWSTEEL.NS", "KOTAKBANK.NS", "LT.NS",
    "M&M.NS", "MARUTI.NS", "NTPC.NS", "NESTLEIND.NS", "ONGC.NS",
    "POWERGRID.NS", "RELIANCE.NS", "SBILIFE.NS", "SHRIRAMFIN.NS", "SBIN.NS",
    "SUNPHARMA.NS", "TCS.NS", "TATACONSUM.NS", "TATAMOTORS.NS", "TATASTEEL.NS",
    "TECHM.NS", "TITAN.NS", "TRENT.NS", "ULTRACEMCO.NS", "WIPRO.NS",
]

# Supported Timeframes & Defaults
SUPPORTED_TIMEFRAMES = ["3m", "5m", "10m", "15m"]
DEFAULT_TIMEFRAME = "5m"
DEFAULT_RATIO = 2.0

# Market Timings (IST)
MARKET_OPEN_TIME = time(9, 15)
MARKET_CLOSE_TIME = time(15, 30)
OPENING_RANGE_START = time(9, 15)
OPENING_RANGE_END = time(9, 30)
WINDOW_START = time(9, 30)
WINDOW_END = time(14, 30)

# Strategy Parameters
RELATIVE_VOLUME_THRESHOLD = 2.0
ATR_PERIOD = 14
EMA_FAST = 9
EMA_SLOW = 21
ENTRY_ATR_BUFFER = 0.05
STOP_MIN_ATR_FACTOR = 0.5
STOP_MAX_ATR_FACTOR = 1.5

# Server & Worker Settings
DEFAULT_PORT = 8000
HOST = "0.0.0.0"
MAX_WORKERS = 10
