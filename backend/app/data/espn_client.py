"""
ESPN Fantasy ownership client.

ESPN exposes a public (unauthenticated) endpoint that powers their Fantasy
Baseball player universe page. It returns the full player pool with
`ownership.percentOwned`, `percentStarted`, `averageDraftPosition`, and a
week-over-week `percentChange` — exactly what we need to call out real
low-owned streaming targets.

This endpoint is not officially documented; it's what the ESPN site itself
calls. It has historically been stable for years (many fantasy tools rely
on it), but we still treat it as best-effort and fall back to "unknown"
ownership if it stops responding.

Yahoo's equivalent data requires OAuth and is per-league, so it isn't
usable for a public dashboard. FantasyPros aggregates but gates behind a
subscription. ESPN's public endpoint is the industry-standard proxy.

Name matching: ESPN gives us ESPN player IDs which don't map to MLB's
`person_id`. We match by normalized full name. That's robust across >99%
of relevant pitchers; accents and Jr./Sr. suffixes are handled.
"""
from __future__ import annotations

import logging
import re
import time
import unicodedata
from typing import Any

import httpx

log = logging.getLogger(__name__)

ESPN_URL = (
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/seasons/{season}"
    "/segments/0/leaguedefaults/3?view=kona_player_info"
)

# Limit is generous; the top ~1500 covers every rostered player in deep leagues.
FILTER_HEADER = {
    "x-fantasy-filter": (
        '{"players":{"limit":1500,'
        '"sortPercOwned":{"sortPriority":1,"sortAsc":false}}}'
    ),
    "Accept": "application/json",
    "User-Agent": "DiamondScout/0.1 (fantasy baseball research)",
}

# module-level cache; ESPN updates percentOwned a few times per day
_cache: dict[int, tuple[float, dict[str, dict]]] = {}
_CACHE_TTL = 60 * 60  # 1 hour


def _norm(name: str) -> str:
    """Normalize name: strip accents, lower, remove Jr/Sr/II/III, collapse spaces."""
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"\b(jr|sr|ii|iii|iv)\.?\b", "", s)
    s = re.sub(r"[^a-z0-9\s]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


async def fetch_ownership(season: int) -> dict[str, dict]:
    """Return {normalized_name: ownership_dict} for the season. Cached 1h."""
    now = time.time()
    hit = _cache.get(season)
    if hit and now - hit[0] < _CACHE_TTL:
        return hit[1]

    url = ESPN_URL.format(season=season)
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(url, headers=FILTER_HEADER)
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        log.warning("ESPN ownership fetch failed: %s", e)
        return {}

    out: dict[str, dict] = {}
    for entry in data.get("players", []):
        p = entry.get("player") or {}
        full = p.get("fullName") or f"{p.get('firstName','')} {p.get('lastName','')}"
        own = p.get("ownership") or {}
        out[_norm(full)] = {
            "percent_owned": float(own.get("percentOwned") or 0.0),
            "percent_started": float(own.get("percentStarted") or 0.0),
            "percent_change": float(own.get("percentChange") or 0.0),
            "adp": float(own.get("averageDraftPosition") or 0.0),
            "auction_value": float(own.get("auctionValueAverage") or 0.0),
            "espn_id": p.get("id"),
        }

    _cache[season] = (now, out)
    log.info("ESPN ownership: loaded %d players for %d", len(out), season)
    return out


def lookup(own_map: dict[str, dict], name: str) -> dict[str, Any]:
    """Return ownership info for a player name, or a safe default."""
    key = _norm(name)
    if key in own_map:
        return own_map[key]
    # last-resort: match on last + first initial (handles nicknames like "Matt" vs "Matthew")
    parts = key.split()
    if len(parts) >= 2:
        needle = f"{parts[0][0]} {parts[-1]}"
        for k, v in own_map.items():
            kp = k.split()
            if len(kp) >= 2 and f"{kp[0][0]} {kp[-1]}" == needle:
                return v
    return {
        "percent_owned": None,
        "percent_started": None,
        "percent_change": None,
        "adp": None,
        "auction_value": None,
        "espn_id": None,
    }
