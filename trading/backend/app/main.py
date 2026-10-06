"""
FastAPI Application Entry Point
===============================
Configures CORS, registers API routes, and launches background workers.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router
from app.core.state import start_background_workers


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Launch auto-refresh daemon thread
    print("🚀 Starting Nifty 50 Scanner Background Worker...")
    start_background_workers()
    yield
    # Shutdown
    print("🛑 Shutting down Nifty 50 Scanner...")


app = FastAPI(
    title="NIFTY 50 Intraday 5-Min Breakout Scanner API",
    description="Algorithmic volume breakout scanner backend with 1:2 R:R targets.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for React frontend (Vite dev server or production port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints
app.include_router(router)


@app.get("/")
def root():
    return {
        "app": "NIFTY 50 Breakout Scanner API",
        "status": "online",
        "docs_url": "/docs",
    }
