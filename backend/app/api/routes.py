from __future__ import annotations

from datetime import date as _date

from fastapi import APIRouter, HTTPException, Query

from app.services import pitcher_service, prospects_service

router = APIRouter()


def _parse_date(s: str | None) -> _date:
    if not s:
        return _date.today()
    try:
        return _date.fromisoformat(s)
    except ValueError:
        raise HTTPException(status_code=400, detail="date must be YYYY-MM-DD")


@router.get("/today")
async def today(
    date: str | None = Query(None, description="YYYY-MM-DD (defaults to today)"),
    refresh: bool = Query(False, description="Force rebuild, skipping cache"),
):
    on_date = _parse_date(date)
    return await pitcher_service.get_or_build_daily(on_date, force=refresh)


@router.get("/rankings")
async def rankings(
    date: str | None = Query(None),
    min_score: float | None = None,
    throws: str | None = Query(None, pattern="^[LR]$"),
    team: str | None = None,
    sleepers_only: bool = False,
    limit: int = 100,
):
    data = await pitcher_service.get_or_build_daily(_parse_date(date))
    rows = data.get("starters", [])
    if min_score is not None:
        rows = [r for r in rows if r["score"] >= min_score]
    if throws:
        rows = [r for r in rows if r["pitcher"]["throws"] == throws]
    if team:
        t = team.upper()
        rows = [r for r in rows if (r["pitcher"].get("team_abbr") or "").upper() == t]
    if sleepers_only:
        rows = [r for r in rows if r.get("sleeper")]
    return {"count": len(rows), "rows": rows[:limit]}


@router.get("/sleepers")
async def sleepers(
    date: str | None = Query(None),
    tier: str | None = Query(None, pattern="^(premium|basic)$",
                             description="premium = Hidden Gem, basic = Streamer"),
):
    """Low-rostered starters (<40% ESPN). Optionally filter by tier."""
    data = await pitcher_service.get_or_build_daily(_parse_date(date))
    rows = data.get("sleepers", [])
    if tier:
        rows = [r for r in rows if (r.get("sleeper") or {}).get("tier") == tier]
    # Sort: premium first, then by score
    rows.sort(key=lambda r: (
        0 if (r.get("sleeper") or {}).get("tier") == "premium" else 1,
        -r["score"],
    ))
    return {"count": len(rows), "rows": rows}


@router.get("/two-start")
async def two_start(
    start: str | None = Query(None, description="Week start YYYY-MM-DD (defaults to today)"),
    days: int = Query(7, ge=2, le=14),
):
    return await pitcher_service.two_start_week(_parse_date(start), days=days)


@router.get("/trends")
async def trends(date: str | None = Query(None)):
    return await pitcher_service.trends_today(_parse_date(date))


@router.get("/pitcher/{pitcher_id}")
async def pitcher_detail(pitcher_id: int, date: str | None = Query(None)):
    """Pull the per-pitcher block from today's cached snapshot."""
    data = await pitcher_service.get_or_build_daily(_parse_date(date))
    for p in data.get("starters", []):
        if p["pitcher"]["id"] == pitcher_id:
            return p
    raise HTTPException(status_code=404, detail="Pitcher not starting today.")


@router.get("/prospects")
async def prospects(date: str | None = Query(None)):
    """Future prospects: pitchers under 30% rostered with measurable upside signals."""
    return await prospects_service.find_prospects(_parse_date(date))


@router.post("/refresh")
async def manual_refresh(date: str | None = Query(None)):
    on_date = _parse_date(date)
    payload = await pitcher_service.refresh_daily(on_date)
    return {"ok": True, "starters": len(payload.get("starters", [])), "date": on_date.isoformat()}
