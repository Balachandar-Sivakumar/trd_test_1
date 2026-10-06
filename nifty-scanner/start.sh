#!/bin/bash
# ==============================================================================
# NIFTY 50 In-Play Breakout Scanner — One-Click Runner (Backend + Frontend)
# ==============================================================================

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
PYTHON_EXEC="/home/dckap/.pyenv/versions/3.13.2/bin/python3"

# Fallback to python3 if custom path not found
if [ ! -f "$PYTHON_EXEC" ]; then
    PYTHON_EXEC="python3"
fi

echo "======================================================================"
echo " Starting NIFTY 50 Breakout Scanner System"
echo "======================================================================"
echo " Backend  : FastAPI (Uvicorn) on http://localhost:8000"
echo " Frontend : React (Vite) on http://localhost:5173"
echo "======================================================================"

# Start backend server
echo "-> Starting Backend API server..."
cd "$DIR"
$PYTHON_EXEC -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start frontend dev server
echo "-> Starting React Frontend..."
cd "$DIR/frontend"
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!

# Trap Ctrl+C (SIGINT) to terminate both servers cleanly
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo "Done."
    exit 0
}

trap cleanup INT TERM

# Wait for background processes
wait
