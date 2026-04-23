"""
Service layer — orchestrates MLB API calls, runs the scoring engine, and
returns rich dicts ready for the HTTP layer. Caches today's full payload
in SQLite so the frontend dashboard loads instantly after the first
refresh of the day.
"""
from __future__ import annotations

import asyncio
import json
import logging
from datetime import date, datetime, timezone
from typing import Any

from app.core.park_factors import park_factor
from app.core.scoring import TIER_META, assign_tiers, compute_matchup_score, sleeper_tag
from app.data.espn_client import fetch_ownership, lookup as lookup_ownership
from app.data.mlb_client import get_client
from app.models.db import DailySnapshot, PitcherCache, SessionLocal

log = logging.getLogger(__name__)


def _season_for(on_date: date) -> int:
    # MLB season straddles March-October; use calendar year for simplicity.
    return on_date.year


def _get_team_id(game_side: dict) -> int | None:
    team = (game_side or {}).get("team") or {}
    return team.get("id")


def _handedness(pitcher_meta: dict) -> str:
    hand = (pitcher_meta.get("pitchHand") or {}).get("code") or "R"
    return hand  # "L" or "R"


async def _enrich_starter(
    game: dict,
    side_key: str,
    opp_key: str,
    season: int,
    ownership_map: dict[str, dict],
) -> dict | None:
    side = game.get("teams", {}).get(side_key, {})
    opp  = game.get("teams", {}).get(opp_key, {})
    probable = side.get("probablePitcher")
    if not probable:
        return None

    mlb = get_client()
    pid = probable["id"]
    team_id = _get_team_id(side)
    opp_team_id = _get_team_id(opp)

    # Full player doc (handedness, throws, etc.)
    player_doc = await mlb.player(pid)
    throws = (player_doc.get("pitchHand") or {}).get("code") or "R"

    # Opponent batting split opposite to pitcher's throwing hand
    opp_hand_key = "vr" if throws == "R" else "vl"

    season_stats, last_n, splits, opp_season, opp_vs_hand, opp_recent = await asyncio.gather(
        mlb.pitcher_season(pid, season),
        mlb.pitcher_last_n_games(pid, season, n=5),
        mlb.pitcher_splits(pid, season),
        mlb.team_hitting(opp_team_id, season) if opp_team_id else _empty(),
        mlb.team_hitting_vs_hand(opp_team_id, season) if opp_team_id else _empty_dict(),
        mlb.team_hitting_last_n_days(opp_team_id, 14) if opp_team_id else _empty(),
    )

    venue_id = (game.get("venue") or {}).get("id")
    park = park_factor(venue_id)
    is_home = side_key == "home"

    opp_vs = opp_vs_hand.get(opp_hand_key, {}) if isinstance(opp_vs_hand, dict) else {}

    ms = compute_matchup_score(
        pitcher_season=season_stats,
        last_n_games=last_n,
        opponent_vs_hand=opp_vs,
        opponent_season=opp_season,
        opponent_recent=opp_recent,
        park=park,
        is_home=is_home,
    )

    # Ownership lookup (real ESPN percentOwned, not a proxy)
    own = lookup_ownership(ownership_map, probable.get("fullName") or "")
    sleeper = sleeper_tag(own.get("percent_owned"), ms.score)

    return {
        "game_pk": game.get("gamePk"),
        "game_time_utc": game.get("gameDate"),
        "status": (game.get("status") or {}).get("detailedState"),
        "pitcher": {
            "id": pid,
            "name": probable.get("fullName"),
            "throws": throws,
            "team_id": team_id,
            "team": (side.get("team") or {}).get("name"),
            "team_abbr": (side.get("team") or {}).get("abbreviation"),
        },
        "opponent": {
            "id": opp_team_id,
            "name": (opp.get("team") or {}).get("name"),
            "team_abbr": (opp.get("team") or {}).get("abbreviation"),
        },
        "venue": {"id": venue_id, "name": (game.get("venue") or {}).get("name"), "is_home": is_home},
        "park": park,
        "weather": game.get("weather"),
        "season_stats": _pick_pitcher_stats(season_stats),
        "last5": [_pick_game_log(g) for g in last_n],
        "splits": {
            "vs_L": _pick_pitcher_stats(splits.get("vl", {})),
            "vs_R": _pick_pitcher_stats(splits.get("vr", {})),
        },
        "opponent_offense": {
            "season": _pick_team_hit(opp_season),
            "vs_hand": _pick_team_hit(opp_vs),
            "last14": _pick_team_hit(opp_recent),
            "faces_hand": "RHP" if throws == "R" else "LHP",
        },
        "ownership": own,
        "score": ms.score,
        # tier is assigned later, after all starters are scored, so it's
        # percentile-relative to the whole slate.
        "tier": None,
        "tier_meta": None,
        "components": ms.components,
        "breakdown": ms.breakdown,
        "sleeper": sleeper,
    }


def _pick_pitcher_stats(s: dict) -> dict:
    """Keep payload lean — only the fields the UI renders."""
    if not s:
        return {}
    return {
        "ip": s.get("inningsPitched"),
        "era": s.get("era"),
        "whip": s.get("whip"),
        "k": s.get("strikeOuts"),
        "bb": s.get("baseOnBalls"),
        "hr": s.get("homeRuns"),
        "bf": s.get("battersFaced"),
        "w": s.get("wins"),
        "l": s.get("losses"),
        "so9": s.get("strikeoutsPer9Inn"),
        "bb9": s.get("walksPer9Inn"),
        "h9": s.get("hitsPer9Inn"),
        "avg_against": s.get("avg"),
    }


def _pick_team_hit(s: dict) -> dict:
    if not s:
        return {}
    return {
        "avg": s.get("avg"),
        "obp": s.get("obp"),
        "slg": s.get("slg"),
        "ops": s.get("ops"),
        "hr": s.get("homeRuns"),
        "so": s.get("strikeOuts"),
        "pa": s.get("plateAppearances"),
        "runs": s.get("runs"),
    }


def _pick_game_log(g: dict) -> dict:
    stat = g.get("stat") or {}
    opp = g.get("opponent") or {}
    return {
        "date": g.get("date"),
        "opp": opp.get("abbreviation") or opp.get("name"),
        "ip": stat.get("inningsPitched"),
        "era": stat.get("era"),
        "er": stat.get("earnedRuns"),
        "k": stat.get("strikeOuts"),
        "bb": stat.get("baseOnBalls"),
        "h": stat.get("hits"),
        "hr": stat.get("homeRuns"),
        "pitches": stat.get("numberOfPitches"),
        "decision": g.get("isWin") and "W" or (g.get("isLoss") and "L" or "-"),
    }


async def _empty() -> dict:   # helper for skipped gathers
    return {}


async def _empty_dict() -> dict:
    return {}


# ---------------- public API ----------------

async def build_daily_payload(on_date: date) -> dict:
    mlb = get_client()
    season = _season_for(on_date)

    # Pull schedule and ownership map concurrently
    games, ownership_map = await asyncio.gather(
        mlb.schedule(on_date),
        fetch_ownership(season),
    )

    tasks: list[Any] = []
    for g in games:
        tasks.append(_enrich_starter(g, "home", "away", season, ownership_map))
        tasks.append(_enrich_starter(g, "away", "home", season, ownership_map))

    starters = [s for s in await asyncio.gather(*tasks, return_exceptions=False) if s]

    # Sort high-to-low by score
    starters.sort(key=lambda p: p["score"], reverse=True)

    # Percentile-based tiers — relative to today's slate, so there's always
    # an S-tier and always an F-tier. Beats a fixed letter grade that never
    # hits A because the score range compresses.
    tiers = assign_tiers([s["score"] for s in starters])
    for s, t in zip(starters, tiers):
        s["tier"] = t
        s["tier_meta"] = TIER_META[t]

    sleepers = [s for s in starters if s.get("sleeper")]

    return {
        "date": on_date.isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "games_count": len(games),
        "starters": starters,
        "sleepers": sleepers,
    }


async def get_or_build_daily(on_date: date, force: bool = False) -> dict:
    db = SessionLocal()
    try:
        if not force:
            row = (
                db.query(DailySnapshot)
                .filter(DailySnapshot.on_date == on_date)
                .order_by(DailySnapshot.generated_at.desc())
                .first()
            )
            if row:
                return json.loads(row.payload)

        payload = await build_daily_payload(on_date)
        row = DailySnapshot(
            on_date=on_date,
            payload=json.dumps(payload),
            generated_at=datetime.now(timezone.utc),
        )
        db.add(row)
        db.commit()
        return payload
    finally:
        db.close()


async def refresh_daily(on_date: date | None = None) -> dict:
    on_date = on_date or date.today()
    log.info("Refreshing daily snapshot for %s", on_date)
    return await get_or_build_daily(on_date, force=True)


# ---------------- new: two-start week ----------------

async def two_start_week(start: date, days: int = 7) -> dict:
    """
    Scan the next N days of MLB probables and surface pitchers with ≥2
    probable starts in that window. Weekly fantasy leagues score cumulatively,
    so a two-start week is a meaningful lineup decision.
    """
    from datetime import timedelta

    mlb = get_client()
    season = _season_for(start)
    ownership_map = await fetch_ownership(season)

    counts: dict[int, dict] = {}
    for i in range(days):
        d = start + timedelta(days=i)
        games = await mlb.schedule(d)
        for g in games:
            for side_key in ("home", "away"):
                side = g.get("teams", {}).get(side_key, {})
                opp = g.get("teams", {}).get("away" if side_key == "home" else "home", {})
                pp = side.get("probablePitcher")
                if not pp:
                    continue
                pid = pp["id"]
                entry = counts.setdefault(
                    pid,
                    {
                        "pitcher": {
                            "id": pid,
                            "name": pp.get("fullName"),
                            "team": (side.get("team") or {}).get("name"),
                            "team_abbr": (side.get("team") or {}).get("abbreviation"),
                        },
                        "starts": [],
                    },
                )
                entry["starts"].append({
                    "date": d.isoformat(),
                    "opp": (opp.get("team") or {}).get("abbreviation"),
                    "is_home": side_key == "home",
                    "venue": (g.get("venue") or {}).get("name"),
                })

    rows = [r for r in counts.values() if len(r["starts"]) >= 2]
    # Attach ownership so fantasy managers can filter for streamable two-start guys
    for r in rows:
        own = lookup_ownership(ownership_map, r["pitcher"]["name"] or "")
        r["ownership"] = own
    rows.sort(key=lambda r: (-len(r["starts"]), r["ownership"].get("percent_owned") or 0))

    return {
        "start": start.isoformat(),
        "days": days,
        "count": len(rows),
        "rows": rows,
    }


# ---------------- new: trends ----------------

async def trends_today(on_date: date) -> dict:
    """
    Surface the biggest rising/falling rostered starters in today's slate
    using ESPN's week-over-week `percentChange`. This is the waiver-wire
    signal: pitchers whose roster% is climbing have momentum (recent good
    start, trending pickup); falling means managers are dropping them.
    """
    data = await get_or_build_daily(on_date)
    rows = [s for s in data.get("starters", []) if s.get("ownership", {}).get("percent_change") is not None]
    rising  = sorted(rows, key=lambda s: s["ownership"]["percent_change"], reverse=True)[:10]
    falling = sorted(rows, key=lambda s: s["ownership"]["percent_change"])[:10]
    return {"date": on_date.isoformat(), "rising": rising, "falling": falling}
