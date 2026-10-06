#!/usr/bin/env bash
# ==============================================================
# Nifty 50 Intraday Scanner - Fullstack Launch Script
# ==============================================================

echo "=========================================================="
echo "🚀 Starting Nifty 50 Breakout Scanner (Backend + Frontend)"
echo "=========================================================="

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# 1. Start Backend API (FastAPI) in background
echo "📡 Starting Backend API on http://localhost:8000..."
cd "$DIR/backend"
if [ -d "$DIR/venv" ]; then
    source "$DIR/venv/bin/activate"
fi
python3 run.py &
BACKEND_PID=$!

# 2. Start Frontend (React + Vite)
echo "🌐 Starting React Frontend on http://localhost:3000..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!

cleanup() {
    echo ""
    echo "🛑 Shutting down backend (PID $BACKEND_PID) and frontend (PID $FRONTEND_PID)..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "✅ Both services running!"
echo "   👉 Frontend UI  : http://localhost:3000"
echo "   👉 Backend API : http://localhost:8000"
echo "   👉 Swagger Docs: http://localhost:8000/docs"
echo "Press Ctrl+C to stop both servers."
wait
