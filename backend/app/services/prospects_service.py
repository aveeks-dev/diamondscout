"""
Future Prospects service.

Surfaces pitchers under 30% rostered on ESPN who look like breakout
candidates based on measurable signals plus real-world news mentions.

Design choice: I build prospect reasons from three stacked sources so it
is not just "vibes":

  1. Performance signals computed from the MLB Stats API (hot streak,
     K/9, control, recent form vs season)
  2. Context signals from the ESPN fantasy endpoint (rookie, rising in
     ownership, undrafted but getting picked up)
  3. News mentions from ESPN's public MLB news feed

A pitcher needs at least two distinct reasons to make the list, which
keeps noise out. The final sort uses a simple additive score where
quality-of-stuff signals are weighted higher than pure context.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timezone
from typing import Any

from app.data.espn_client import fetch_ownership
from app.data.mlb_client import get_client
from app.data.news_client import articles_mentioning, fetch_articles
from app.services.pitcher_service import get_or_build_daily

log = logging.getLogger(__name__)

CURRENT_YEAR = datetime.now(timezone.utc).year


def _f(d: dict, *keys: str, default: float = 0.0) -> float:
    for k in keys:
        v = d.get(k)
        if v is None or v == "":
            continue
        try:
            return float(v)
        except (TypeError, ValueError):
            continue
    return default


def _years_since(iso_date: str | None) -> float | None:
    if not iso_date:
        return None
    try:
        d = datetime.fromisoformat(iso_date).date()
    except ValueError:
        return None
    return (date.today() - d).days / 365.25


def _analyze(
    pitcher: dict,
    season_stats: dict,
    last_n: list[dict],
    ownership: dict,
    articles_for_player: list[dict],
) -> tuple[float, list[dict]]:
    """Produce a (score, reasons) tuple for a single candidate."""
    reasons: list[dict] = []
    score = 0.0

    ip = _f(season_stats, "ip")
    era = _f(season_stats, "era", default=99)
    whip = _f(season_stats, "whip", default=9)
    so9 = _f(season_stats, "so9")
    bb9 = _f(season_stats, "bb9")

    # --- performance signals (require some season IP to be meaningful) ---
    if ip >= 10:
        if so9 >= 10.0:
            reasons.append({"tag": "Swing & Miss", "icon": "⚡",
                            "detail": f"{so9:.1f} K/9 — bat-missing stuff"})
            score += 3.0
        if bb9 > 0 and bb9 <= 2.5 and ip >= 15:
            reasons.append({"tag": "Pinpoint Control", "icon": "🎯",
                            "detail": f"{bb9:.1f} BB/9 — pounding the zone"})
            score += 2.0
        if era < 3.25 and whip < 1.15:
            reasons.append({"tag": "Hidden Quality", "icon": "💎",
                            "detail": f"{era:.2f} ERA / {whip:.2f} WHIP at low ownership"})
            score += 3.0

    # --- recent form trend ---
    if len(last_n) >= 2:
        recent_er = sum(_f(g.get("stat") or {}, "earnedRuns") for g in last_n[:3])
        recent_ip = sum(_f(g.get("stat") or {}, "inningsPitched") for g in last_n[:3])
        if recent_ip >= 10:
            recent_era = recent_er * 9 / recent_ip
            if recent_era < 2.75:
                reasons.append({"tag": "Hot Streak", "icon": "🔥",
                                "detail": f"{recent_era:.2f} ERA over last {len(last_n[:3])} starts"})
                score += 3.0
            elif recent_era < era - 1.0 and era > 4.0:
                reasons.append({"tag": "Trending Up", "icon": "📈",
                                "detail": f"recent {recent_era:.2f} ERA vs {era:.2f} season"})
                score += 2.0

    # --- rookie / young arm ---
    debut_years = _years_since(pitcher.get("mlb_debut"))
    age = pitcher.get("age")
    if debut_years is not None and debut_years <= 2.0:
        reasons.append({"tag": "Rookie", "icon": "🌱",
                        "detail": f"MLB debut {pitcher.get('mlb_debut')}"})
        score += 2.5
    elif age and age <= 25 and ip < 150:
        reasons.append({"tag": "Young Arm", "icon": "🌱",
                        "detail": f"age {age} with upside left"})
        score += 1.5

    # --- waiver momentum ---
    chg = ownership.get("percent_change")
    own = ownership.get("percent_owned")
    if chg is not None and chg >= 3.0:
        reasons.append({"tag": "Waiver Riser", "icon": "🚀",
                        "detail": f"+{chg:.1f}% rostered this week"})
        score += 2.0

    # --- news mentions ---
    if articles_for_player:
        a = articles_for_player[0]
        reasons.append({
            "tag": "In the News",
            "icon": "📰",
            "detail": a["headline"][:120],
            "url": a["url"],
            "published": a["published"],
        })
        score += 1.0

    # Low ownership itself is a mild boost when something else already qualifies.
    if own is not None and own < 10 and len(reasons) >= 1:
        score += 0.5

    return score, reasons


async def find_prospects(on_date: date, min_reasons: int = 2) -> dict:
    """
    Main entry point. Currently uses today's probable starters as the
    candidate pool (already enriched, zero extra API calls) plus extends
    into the ESPN pool for non-starting rising waiver pitchers.
    """
    mlb = get_client()
    ownership_map, articles = await asyncio.gather(
        fetch_ownership(CURRENT_YEAR),
        fetch_articles(limit=75),
    )

    daily = await get_or_build_daily(on_date)
    starters = daily.get("starters", [])

    prospects: list[dict] = []

    # --- candidates from today's starters ---
    for s in starters:
        own = s.get("ownership", {}) or {}
        pct = own.get("percent_owned")
        if pct is None or pct >= 30:
            continue
        pname = s["pitcher"]["name"]
        hits = articles_mentioning(articles, pname)
        score, reasons = _analyze(
            pitcher=s["pitcher"],
            season_stats=s.get("season_stats", {}),
            last_n=s.get("last5", []),
            ownership=own,
            articles_for_player=hits,
        )
        if len(reasons) < min_reasons:
            continue
        prospects.append({
            "pitcher": s["pitcher"],
            "ownership": own,
            "score": round(score, 1),
            "season_stats": s["season_stats"],
            "reasons": reasons,
            "articles": hits,
            "starting_today": True,
            "next_start_opp": s["opponent"]["team_abbr"],
        })

    # --- candidates from ESPN pool that aren't starting today ---
    # Limit to a few rising arms to avoid blowing out the budget on API calls.
    starting_names = {p["pitcher"]["name"].lower() for p in prospects}
    risers = sorted(
        [(k, v) for k, v in ownership_map.items() if
         v.get("percent_owned") is not None and
         3 <= v["percent_owned"] < 30 and
         (v.get("percent_change") or 0) >= 3.0],
        key=lambda kv: -(kv[1].get("percent_change") or 0),
    )[:12]

    async def _lookup(norm_name: str, own: dict) -> dict | None:
        # Resolve the MLB person by name via the MLB search endpoint.
        search = await mlb._get("/people/search", params={"names": norm_name, "sportId": 1})
        people = search.get("people") or []
        if not people:
            return None
        person = people[0]
        if person.get("fullName", "").lower() in starting_names:
            return None
        pid = person["id"]
        if person.get("primaryPosition", {}).get("code") not in ("1", "P"):
            return None
        season = await mlb.pitcher_season(pid, CURRENT_YEAR)
        last_n = await mlb.pitcher_last_n_games(pid, CURRENT_YEAR, n=5)
        pitcher = {
            "id": pid,
            "name": person.get("fullName"),
            "throws": (person.get("pitchHand") or {}).get("code") or "R",
            "team_abbr": (person.get("currentTeam") or {}).get("abbreviation"),
            "team": (person.get("currentTeam") or {}).get("name"),
            "age": person.get("currentAge"),
            "birth_date": person.get("birthDate"),
            "mlb_debut": person.get("mlbDebutDate"),
        }
        hits = articles_mentioning(articles, person.get("fullName") or "")
        score, reasons = _analyze(pitcher, {
            "ip": season.get("inningsPitched"),
            "era": season.get("era"),
            "whip": season.get("whip"),
            "so9": season.get("strikeoutsPer9Inn"),
            "bb9": season.get("walksPer9Inn"),
        }, last_n, own, hits)
        if len(reasons) < min_reasons:
            return None
        return {
            "pitcher": pitcher,
            "ownership": own,
            "score": round(score, 1),
            "season_stats": {
                "ip": season.get("inningsPitched"),
                "era": season.get("era"),
                "whip": season.get("whip"),
                "so9": season.get("strikeoutsPer9Inn"),
                "bb9": season.get("walksPer9Inn"),
                "k": season.get("strikeOuts"),
                "bb": season.get("baseOnBalls"),
            },
            "reasons": reasons,
            "articles": hits,
            "starting_today": False,
            "next_start_opp": None,
        }

    riser_results = await asyncio.gather(
        *[_lookup(norm_name, own) for norm_name, own in risers],
        return_exceptions=True,
    )
    for r in riser_results:
        if isinstance(r, dict):
            prospects.append(r)

    prospects.sort(key=lambda p: (-p["score"], p["ownership"].get("percent_owned") or 0))

    return {
        "date": on_date.isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "count": len(prospects),
        "prospects": prospects,
    }
