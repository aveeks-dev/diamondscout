"""
ESPN MLB news client.

ESPN exposes a public news feed at their site API. We use it to enrich
prospect candidates with real-world context: if ESPN has published a
recent article mentioning a pitcher, we show the headline and a link so
users can follow up for the actual reporting.

This is not a substitute for player-level news. ESPN's per-athlete news
endpoint is inconsistent. Instead we pull the general MLB feed (50–100
recent articles) and fuzzy-match pitcher names against headlines and
descriptions. That way we surface whatever ESPN is writing about without
depending on a per-player endpoint.
"""
from __future__ import annotations

import logging
import re
import time
import unicodedata
from typing import Any

import httpx

log = logging.getLogger(__name__)

ESPN_NEWS_URL = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news"

_cache: tuple[float, list[dict]] | None = None
_TTL = 60 * 30  # 30 minutes


def _norm(name: str) -> str:
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


async def fetch_articles(limit: int = 60) -> list[dict]:
    """Pull recent MLB news. Returns list of {headline, description, url, published}."""
    global _cache
    now = time.time()
    if _cache and now - _cache[0] < _TTL:
        return _cache[1]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(ESPN_NEWS_URL, params={"limit": limit})
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as e:
        log.warning("ESPN news fetch failed: %s", e)
        return []

    out = []
    for a in data.get("articles", []):
        # Prefer the actual article link if present, otherwise root URL
        links = a.get("links", {}) or {}
        web = (links.get("web") or {}).get("href") or ""
        out.append({
            "headline": a.get("headline") or "",
            "description": a.get("description") or "",
            "url": web,
            "published": a.get("published") or "",
            "type": a.get("type") or "",
        })

    _cache = (now, out)
    log.info("ESPN news: loaded %d articles", len(out))
    return out


def articles_mentioning(articles: list[dict], player_name: str, max_hits: int = 2) -> list[dict]:
    """
    Return articles whose headline or description mentions the player's full
    name OR last name plus first initial (handles "P. Skenes" style refs).
    """
    if not player_name:
        return []
    norm_full = _norm(player_name)
    parts = norm_full.split()
    if not parts:
        return []

    last = parts[-1]
    first_initial = parts[0][0] if parts[0] else ""
    alt = f"{first_initial} {last}".strip()

    out: list[dict] = []
    for a in articles:
        text = _norm(f"{a['headline']} {a['description']}")
        if norm_full in text or (alt and alt in text and len(last) > 3):
            out.append(a)
            if len(out) >= max_hits:
                break
    return out
