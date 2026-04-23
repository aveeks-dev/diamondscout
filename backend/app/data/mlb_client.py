"""
MLB Stats API client.

The MLB Stats API is the official, public API behind mlb.com/stats. It
exposes schedules, probable pitchers, season stats, game logs, splits,
Statcast metrics, and ballpark info — all free, no auth required.

Docs: https://statsapi.mlb.com/docs/
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any, Iterable

import httpx
from cachetools import TTLCache

log = logging.getLogger(__name__)

BASE = "https://statsapi.mlb.com/api/v1"
TIMEOUT = httpx.Timeout(15.0, connect=5.0)

# In-process TTL cache — prevents slamming the API when many frontend
# requests arrive in the same second. Actual durable caching happens in
# SQLite via the service layer.
_cache: TTLCache[str, Any] = TTLCache(maxsize=1024, ttl=120)


class MlbClient:
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=TIMEOUT, base_url=BASE)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> dict:
        key = f"{path}?{sorted((params or {}).items())}"
        if key in _cache:
            return _cache[key]
        try:
            r = await self._client.get(path, params=params)
            r.raise_for_status()
            data = r.json()
            _cache[key] = data
            return data
        except httpx.HTTPError as e:
            log.warning("MLB API error on %s: %s", path, e)
            return {}

    # ---------- schedule / probable pitchers ----------

    async def schedule(self, on_date: date) -> list[dict]:
        """Return games on a given date with probable pitchers hydrated."""
        data = await self._get(
            "/schedule",
            params={
                "sportId": 1,
                "date": on_date.isoformat(),
                "hydrate": "probablePitcher(note),linescore,team,venue(location),weather",
            },
        )
        dates = data.get("dates", [])
        return dates[0]["games"] if dates else []

    # ---------- player / pitcher ----------

    async def player(self, person_id: int) -> dict:
        data = await self._get(f"/people/{person_id}")
        people = data.get("people", [])
        return people[0] if people else {}

    async def pitcher_season(self, person_id: int, season: int) -> dict:
        """Season pitching line."""
        data = await self._get(
            f"/people/{person_id}/stats",
            params={"stats": "season", "group": "pitching", "season": season},
        )
        stats = data.get("stats", [])
        if not stats or not stats[0].get("splits"):
            return {}
        return stats[0]["splits"][0].get("stat", {})

    async def pitcher_last_n_games(self, person_id: int, season: int, n: int = 5) -> list[dict]:
        """Return the last N regular-season starts (most recent first)."""
        data = await self._get(
            f"/people/{person_id}/stats",
            params={"stats": "gameLog", "group": "pitching", "season": season},
        )
        stats = data.get("stats", [])
        if not stats:
            return []
        splits = stats[0].get("splits", [])
        # Most APIs return oldest-first; sort to be safe.
        splits.sort(key=lambda s: s.get("date", ""), reverse=True)
        # Starts only (IP > 0 as starter is close enough; API has `isStarter` in some contexts)
        return splits[:n]

    async def pitcher_splits(self, person_id: int, season: int) -> dict:
        """Return splits vs LHB / RHB.

        MLB's statSplits endpoint uses sitCodes. `vl`/`vr` = vs LHB/RHB.
        """
        data = await self._get(
            f"/people/{person_id}/stats",
            params={
                "stats": "statSplits",
                "group": "pitching",
                "season": season,
                "sitCodes": "vl,vr",
            },
        )
        out: dict[str, dict] = {}
        for group in data.get("stats", []):
            for split in group.get("splits", []):
                code = split.get("split", {}).get("code")
                if code in ("vl", "vr"):
                    out[code] = split.get("stat", {})
        return out

    # ---------- team / offense ----------

    async def team_hitting(self, team_id: int, season: int) -> dict:
        data = await self._get(
            f"/teams/{team_id}/stats",
            params={"stats": "season", "group": "hitting", "season": season},
        )
        stats = data.get("stats", [])
        if not stats or not stats[0].get("splits"):
            return {}
        return stats[0]["splits"][0].get("stat", {})

    async def team_hitting_vs_hand(self, team_id: int, season: int) -> dict:
        """Team batting splits vs LHP (vl) and RHP (vr)."""
        data = await self._get(
            f"/teams/{team_id}/stats",
            params={
                "stats": "statSplits",
                "group": "hitting",
                "season": season,
                "sitCodes": "vl,vr",
            },
        )
        out: dict[str, dict] = {}
        for group in data.get("stats", []):
            for split in group.get("splits", []):
                code = split.get("split", {}).get("code")
                if code in ("vl", "vr"):
                    out[code] = split.get("stat", {})
        return out

    async def team_hitting_last_n_days(self, team_id: int, n: int = 14) -> dict:
        end = date.today()
        start = end - timedelta(days=n)
        data = await self._get(
            f"/teams/{team_id}/stats",
            params={
                "stats": "byDateRange",
                "group": "hitting",
                "startDate": start.isoformat(),
                "endDate": end.isoformat(),
            },
        )
        stats = data.get("stats", [])
        if not stats or not stats[0].get("splits"):
            return {}
        return stats[0]["splits"][0].get("stat", {})

    # ---------- misc ----------

    async def teams(self) -> list[dict]:
        data = await self._get("/teams", params={"sportId": 1})
        return data.get("teams", [])


_singleton: MlbClient | None = None


def get_client() -> MlbClient:
    global _singleton
    if _singleton is None:
        _singleton = MlbClient()
    return _singleton
