"""
Matchup score — the "creative score" shown on each starter's card.

Philosophy: a scout doesn't look at one number. They look at (a) how good
the pitcher is, (b) how tough the lineup is handed the right way, (c) the
environment (park, home/away), and (d) whether the pitcher is actually
throwing the ball well right now. We mirror that with four weighted
components, then map to a 0-100 score and a letter grade.

Every sub-score is z-scored against a reasonable league mean and scaled
back into a 0-100 band, so each component is comparable before we weight
them. This keeps the math simple and the output interpretable — each
card can display a breakdown showing why a pitcher got their grade.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# League-average priors for a given season. These are rounded MLB averages;
# they don't need to be exact — they only define "neutral" for z-scoring.
LEAGUE = {
    "k_pct":   22.5,   # strikeout rate
    "bb_pct":   8.5,
    "era":      4.20,
    "whip":     1.28,
    "xfip":     4.20,
    "wOBA":     0.318, # team wOBA
    "ops":      0.720,
    "team_k_pct": 22.5,
}


def _f(d: dict, *keys: str, default: float = 0.0) -> float:
    """Coerce first-present numeric key to float, tolerating strings and missing."""
    for k in keys:
        v = d.get(k)
        if v is None or v == "" or v == "-.--":
            continue
        try:
            return float(v)
        except (TypeError, ValueError):
            continue
    return default


def _pct(d: dict, num: str, denom: str) -> float:
    n, de = _f(d, num), _f(d, denom)
    return (n / de * 100.0) if de > 0 else 0.0


def _clamp(x: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, x))


# ------------- component scores (each returns 0..100) -------------

def pitcher_skill_score(season: dict) -> tuple[float, dict]:
    """Pitcher's true-talent snapshot from season stats."""
    k_pct  = _f(season, "strikeoutsPer9Inn") / 9.0 * 25.0  # rough K% from K/9
    # MLB API sometimes gives strikeOuts + battersFaced directly:
    k_pct  = _pct(season, "strikeOuts", "battersFaced") or k_pct or LEAGUE["k_pct"]
    bb_pct = _pct(season, "baseOnBalls", "battersFaced") or LEAGUE["bb_pct"]
    era    = _f(season, "era", default=LEAGUE["era"])
    whip   = _f(season, "whip", default=LEAGUE["whip"])

    # normalize each to 0..100 around league average
    s_k    = 50 + (k_pct  - LEAGUE["k_pct"])  * 3.5
    s_bb   = 50 - (bb_pct - LEAGUE["bb_pct"]) * 4.5
    s_era  = 50 - (era    - LEAGUE["era"])    * 10.0
    s_whip = 50 - (whip   - LEAGUE["whip"])   * 120.0

    score = _clamp(0.35 * s_era + 0.30 * s_k + 0.20 * s_whip + 0.15 * s_bb)
    return score, {
        "K%": round(k_pct, 1),
        "BB%": round(bb_pct, 1),
        "ERA": round(era, 2),
        "WHIP": round(whip, 2),
    }


def opponent_score(
    team_hit_vs_hand: dict,
    team_hit_season: dict,
    team_hit_recent: dict,
) -> tuple[float, dict]:
    """Lower is better for the pitcher — we invert so bigger = tougher day."""
    # vs-handedness numbers are the headline; season as fallback
    src = team_hit_vs_hand or team_hit_season
    ops   = _f(src, "ops", default=LEAGUE["ops"])
    k_pct = _pct(src, "strikeOuts", "plateAppearances") or LEAGUE["team_k_pct"]

    # recent form nudges the score
    recent_ops = _f(team_hit_recent, "ops", default=ops)
    ops_blend = 0.7 * ops + 0.3 * recent_ops

    s_ops = 50 - (ops_blend - LEAGUE["ops"]) * 300.0   # good hitters -> lower score
    s_k   = 50 + (k_pct - LEAGUE["team_k_pct"]) * 3.0  # whiff-prone -> higher score

    score = _clamp(0.65 * s_ops + 0.35 * s_k)
    return score, {
        "OPS_vs_hand": round(ops, 3),
        "K%_vs_hand": round(k_pct, 1),
        "OPS_last14": round(recent_ops, 3),
    }


def environment_score(park: dict, is_home: bool) -> tuple[float, dict]:
    runs = park.get("runs", 100)
    hr   = park.get("hr", 100)
    # pitcher-friendly park (sub-100) should boost the score
    s_park = 50 - (runs - 100) * 1.2 - (hr - 100) * 0.6
    s_home = 55 if is_home else 45  # modest home-field nudge

    score = _clamp(0.7 * s_park + 0.3 * s_home)
    return score, {
        "park": park.get("name"),
        "park_runs_idx": runs,
        "park_hr_idx": hr,
        "home": is_home,
    }


def recent_form_score(last_n: list[dict]) -> tuple[float, dict]:
    """Composite of the pitcher's last few starts. Hot > cold."""
    if not last_n:
        return 50.0, {"starts_used": 0}

    eras, whips, ks, ips = [], [], [], []
    for g in last_n:
        stat = g.get("stat") or g
        eras.append(_f(stat, "era",  default=LEAGUE["era"]))
        whips.append(_f(stat, "whip", default=LEAGUE["whip"]))
        ks.append(_f(stat, "strikeOuts"))
        ips.append(_f(stat, "inningsPitched"))

    avg_era  = sum(eras) / len(eras)
    avg_whip = sum(whips) / len(whips)
    k_per_9  = (sum(ks) * 9 / sum(ips)) if sum(ips) > 0 else 0

    s_era  = 50 - (avg_era  - LEAGUE["era"])  * 9.0
    s_whip = 50 - (avg_whip - LEAGUE["whip"]) * 100.0
    s_k    = 50 + (k_per_9 - 8.5) * 3.0

    score = _clamp(0.5 * s_era + 0.25 * s_whip + 0.25 * s_k)
    return score, {
        "starts_used": len(last_n),
        "last_era": round(avg_era, 2),
        "last_whip": round(avg_whip, 2),
        "last_k9": round(k_per_9, 1),
    }


# ------------- composite -------------

@dataclass
class MatchupScore:
    score: float
    components: dict[str, float] = field(default_factory=dict)
    breakdown: dict[str, Any] = field(default_factory=dict)


# Percentile tiers — assigned once per slate so the distribution is always
# visible (there's always an S-tier and an F-tier each day). Static letter
# grades felt dead because the scoring range compresses to roughly 35–75;
# fixed thresholds like "A = 85+" never triggered. Percentile-relative tiers
# also match how fantasy players actually talk ("S-tier stream tonight").
#
# Cumulative cutoffs from the top (rank 0 = best score):
#   S: top 15%   A: next 20%   B: next 30%   C: next 20%   D: next 10%   F: bottom 5%
TIER_CUTOFFS: list[tuple[str, float]] = [
    ("S", 0.15),
    ("A", 0.35),
    ("B", 0.65),
    ("C", 0.85),
    ("D", 0.95),
    ("F", 1.00),
]


def assign_tiers(scores_desc: list[float]) -> list[str]:
    """
    Map a list of scores (highest first) to tier labels by percentile.
    Returns parallel list of tiers for each score.
    """
    n = len(scores_desc)
    if n == 0:
        return []
    tiers: list[str] = []
    for i in range(n):
        pct = (i + 1) / n  # 1..n/n
        for label, cutoff in TIER_CUTOFFS:
            if pct <= cutoff:
                tiers.append(label)
                break
        else:
            tiers.append("F")
    return tiers


TIER_META: dict[str, dict] = {
    "S": {"label": "S",  "name": "ACE",    "color": "#f5c46b", "desc": "Top of the slate, auto start"},
    "A": {"label": "A",  "name": "STUD",   "color": "#3fd17a", "desc": "Confident start, plus matchup"},
    "B": {"label": "B",  "name": "SOLID",  "color": "#4aa3ff", "desc": "Reliable mid rotation play"},
    "C": {"label": "C",  "name": "STREAM", "color": "#c7b56a", "desc": "Streamable, some volatility"},
    "D": {"label": "D",  "name": "PUNT",   "color": "#e08c4e", "desc": "Only in deep leagues or DFS"},
    "F": {"label": "F",  "name": "AVOID",  "color": "#e04e4e", "desc": "Rough spot, sit if possible"},
}


def compute_matchup_score(
    pitcher_season: dict,
    last_n_games: list[dict],
    opponent_vs_hand: dict,
    opponent_season: dict,
    opponent_recent: dict,
    park: dict,
    is_home: bool,
) -> MatchupScore:
    skill, skill_br = pitcher_skill_score(pitcher_season)
    opp,   opp_br   = opponent_score(opponent_vs_hand, opponent_season, opponent_recent)
    env,   env_br   = environment_score(park, is_home)
    form,  form_br  = recent_form_score(last_n_games)

    # Weights: pitcher talent and matchup drive the day; recent form matters;
    # environment is a tiebreaker. Tuned from common streaming heuristics.
    score = 0.35 * skill + 0.30 * opp + 0.20 * form + 0.15 * env
    return MatchupScore(
        score=round(score, 1),
        components={
            "pitcher_skill": round(skill, 1),
            "opponent": round(opp, 1),
            "recent_form": round(form, 1),
            "environment": round(env, 1),
        },
        breakdown={
            "pitcher": skill_br,
            "opponent": opp_br,
            "environment": env_br,
            "form": form_br,
        },
    )


# ------------- sleeper tag -------------

# Roster thresholds (ESPN percentOwned, 0-100 scale)
OWNED_WIDELY     = 40.0   # above this: widely rostered, not a "sleeper" at all
OWNED_DEEP       = 10.0   # below this: truly under-the-radar


def sleeper_tag(percent_owned: float | None, score: float) -> dict | None:
    """
    Two-tier tagging using real ESPN `percentOwned`:
      - **Hidden Gem** — low-rostered AND the matchup projects well. This is
        the headline pick: a pitcher most leagues leave available, in a good
        spot today. The premium tag.
      - **Streamer** — low-rostered with an average board. Still pickup-able
        but not a hot-take pick. Useful in deep leagues or DFS punts.

    Returns None if the pitcher is widely rostered (≥40%), because they
    aren't a "sleeper" in any meaningful fantasy sense — most people already
    have them rostered.
    """
    # Unknown ownership: don't tag. Fake-tagging rostered stars was the bug.
    if percent_owned is None:
        return None

    if percent_owned >= OWNED_WIDELY:
        return None

    # Premium — low-owned AND good matchup
    if score >= 65.0:
        reason = f"{percent_owned:.0f}% rostered, {int(round(score))} matchup grade"
        if percent_owned < OWNED_DEEP:
            reason = f"Under-10% owned, elite {int(round(score))} matchup"
        return {
            "tag": "Hidden Gem",
            "reason": reason,
            "tier": "premium",
            "percent_owned": round(percent_owned, 1),
        }

    # Basic — low-owned, decent-to-meh board. Still a valid spot-start option.
    if score >= 48.0:
        return {
            "tag": "Streamer",
            "reason": f"{percent_owned:.0f}% rostered — viable waiver option",
            "tier": "basic",
            "percent_owned": round(percent_owned, 1),
        }

    return None
