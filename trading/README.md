# NIFTY 50 Intraday Volume Breakout Scanner (Fullstack)

Enterprise-grade algorithmic trading scanner built with a modular Python/FastAPI backend and a modern React (Vite + Tailwind CSS + Lucide Icons) frontend.

---

## ⚡ New Features & Capabilities

1. **⏱️ Dynamic Timeframe Selection (`3m`, `5m`, `10m`, `15m`)**:
   - Switch candle timeframes on the fly in the UI.
   - Resamples data dynamically using Pandas for non-native intervals (`3m`, `10m`).
   - Automatically drops forming candles (< 3m, < 5m, < 10m, < 15m) to prevent false breakout signals.
   - Next Candle Countdown accurately synchronizes with the selected timeframe boundary.

2. **🎯 Dynamic Risk:Reward Ratio (`1:1.5`, `1:2`, `1:2.5`, `1:3`)**:
   - Change your profit target multiplier dynamically.
   - Target and R-Multiple progress bars update in real time.
   - Replay engine verifies target hits against the selected ratio.

3. **📜 Permanent Trade History & Outcome Analytics**:
   - Persists all completed trade outcomes to disk (`backend/data/history.json`):
     - `TARGET HIT 🎯`: Winning trades.
     - `STOPPED 🛑`: Stopped-out trades.
     - `INVALID ❌`: Setups cancelled before entry.
   - Dedicated **Trade History** dashboard view showing:
     - Win Rate % (Wins / (Wins + Losses))
     - Net Cumulative R-Gain (e.g. `+24.5R`)
     - Logged trades table with Date, Time, Symbol, Side, Timeframe, 1:R, Entry, Stop, Target, Status, and Net R.
     - Filtering (`All`, `Target Hit`, `Stopped`, `Invalid`) and Clear History button.

---

## 📁 Clean Folder Structure

```text
/home/dckap/Documents/trading/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI App & CORS configuration
│   │   ├── config.py                # Supported timeframes (3m, 5m, 10m, 15m), ratios & tickers
│   │   ├── core/
│   │   │   ├── scanner.py           # Parallel multithreaded scanner engine
│   │   │   └── state.py             # Multi-cache by timeframe/ratio & auto-refresh daemon
│   │   ├── services/
│   │   │   ├── data_fetcher.py      # Resampling (3m, 10m) & unfinished candle filter
│   │   │   ├── indicators.py        # EMA 9/21, VWAP, ATR 14, RVOL, ORH/ORL, PDH/PDL
│   │   │   ├── breakout_analyzer.py # Dynamic ratio target calculation & ATR clamping
│   │   │   ├── replay_engine.py     # State machine (PENDING, LIVE, TARGET HIT, etc.)
│   │   │   └── history_manager.py   # Disk persistence for trade outcomes & statistics
│   │   └── api/
│   │       └── routes.py            # REST API (/api/data, /api/scan, /api/status, /api/history)
│   ├── data/
│   │   └── history.json             # Persistent trade history storage
│   ├── requirements.txt             # Backend dependencies
│   └── run.py                       # Backend server launcher
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header/
│   │   │   │   ├── Header.jsx       # Dynamic Timeframe & Ratio pills, View switcher
│   │   │   │   └── CandleCountdown.jsx # Dynamic timeframe candle timer
│   │   │   ├── Dashboard/
│   │   │   │   ├── StatsOverview.jsx# 6 KPI metric cards
│   │   │   │   ├── ShortlistSection.jsx # Shortlist hero cards container
│   │   │   │   └── ShortlistCard.jsx# Individual card with dynamic 1:R progress bar
│   │   │   ├── History/
│   │   │   │   ├── HistorySection.jsx # Trade history view container
│   │   │   │   ├── HistoryStats.jsx # Win Rate %, Net R-gain KPI cards
│   │   │   │   └── HistoryTable.jsx # Searchable & filterable history table
│   │   │   ├── Table/
│   │   │   │   ├── SetupsTable.jsx  # Main breakouts table
│   │   │   │   ├── TableRow.jsx     # Table row with colored badges
│   │   │   │   └── TableFilters.jsx # Tab filters & instant search
│   │   │   └── Modals/
│   │   │       └── RulesModal.jsx   # Strategy rules popup modal
│   │   ├── hooks/
│   │   │   ├── useScannerData.js    # Data fetching & auto-polling hook
│   │   │   └── useAudioAlert.js     # Web Audio synthesizer chime hook
│   │   ├── services/
│   │   │   └── api.js               # REST client functions
│   │   ├── utils/
│   │   │   ├── formatters.js        # Currency, numbers & status colors
│   │   │   └── marketTime.js        # Market hours & countdown calculations
│   │   ├── App.jsx                  # Main application container
│   │   ├── main.jsx                 # React root entry
│   │   └── index.css                # Tailwind directives & glow animations
│   ├── package.json
│   ├── vite.config.js               # Dev server & backend proxy
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── start.sh                         # One-click start script for both services
└── README.md                        # Documentation
```

---

## 🚀 How to Run

### One-Click Launch:
```bash
cd /home/dckap/Documents/trading
./start.sh
```

* **Frontend UI**: [http://localhost:3000](http://localhost:3000)
* **Backend API**: [http://localhost:8000](http://localhost:8000)
* **API Documentation (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
