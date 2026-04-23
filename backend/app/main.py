from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import date

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.data.mlb_client import get_client
from app.models.db import init_db
from app.services import pitcher_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
log = logging.getLogger("diamond_scout")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()

    # Warm today's snapshot so the first request is fast. Non-fatal on failure.
    try:
        await pitcher_service.get_or_build_daily(date.today())
    except Exception as e:
        log.warning("Startup warm failed: %s", e)

    scheduler = AsyncIOScheduler()
    # Refresh at 9am, 1pm, 4pm, and 7pm local (covers lineup postings, weather, scratches)
    for hour in (9, 13, 16, 19):
        scheduler.add_job(
            pitcher_service.refresh_daily, "cron", hour=hour, minute=5, id=f"refresh-{hour}"
        )
    scheduler.start()
    app.state.scheduler = scheduler
    log.info("Scheduler started with %d jobs", len(scheduler.get_jobs()))

    yield

    scheduler.shutdown(wait=False)
    await get_client().aclose()


app = FastAPI(
    title="Diamond Scout API",
    version="0.1.0",
    description="Auto-updating MLB pitcher research for fantasy baseball.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "service": "Diamond Scout",
        "docs": "/docs",
        "endpoints": ["/api/today", "/api/rankings", "/api/sleepers", "/api/pitcher/{id}"],
    }


@app.get("/health")
def health():
    return {"status": "ok"}
