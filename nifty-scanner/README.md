# NIFTY 50 In-Play Noise Breakout Scanner (Fullstack)

An intraday algorithmic trading system and research dashboard built with a **FastAPI** Python backend and a modern **React (Vite + Tailwind CSS + Lucide Icons)** frontend.

---

## ⚡ Architecture Overview

- **Backend**:
  - `core.py`: Mathematical core logic (14-day opening RVOL, time-of-day RVOL, noise bands, EMA 9/21, VWAP, ATR risk clamping, trade replay state machine).
  - `scanner.py`: Live NIFTY 50 scanner with Yahoo Finance multithreaded candle ingestion.
  - `backtest.py`: 60-day historical replay and statistical reporting across 5m, 10m, and 15m timeframes.
  - `server.py`: FastAPI REST API connecting core strategy routines to the frontend.
  - `config.json`: Live configuration (active timeframe: `5`, `10`, or `15`).
- **Frontend**:
  - `frontend/`: React + Vite application with dark trading terminal UI.
  - Live Scanner dashboard with Top 10 In-play stocks ribbon, real-time R-multiple progress bars, and breakout checklist.
  - Backtest analytics with interactive SVG Equity Curve and Drawdown analysis.
  - Interactive Stock Candlestick chart modal with EMA 9/21, VWAP, and Noise Bands overlays.
  - Strategy Rules framework documentation.

---

## 🚀 One-Click Start

To run both the backend API and React frontend dev server concurrently:

```bash
./start.sh
```

- **Frontend URL**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs (Swagger)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Check**: [http://localhost:8000/api/status](http://localhost:8000/api/status)

---

## 🛠 Manual Execution

### 1. Run Backend Server Only
```bash
/home/dckap/.pyenv/versions/3.13.2/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Run React Frontend Only
```bash
cd frontend
npm run dev
```

### 3. Run Command Line Scanner
```bash
python3 scanner.py            # 5-minute candles
python3 scanner.py --tf 15    # 15-minute candles
python3 scanner.py --loop     # Rescan at each candle close
```

### 4. Run Backtest
```bash
python3 backtest.py           # Evaluates 5m, 10m, and 15m
```
