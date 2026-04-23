"""
Park factors, 3-year rolling averages based on public research (e.g.,
FanGraphs park factors, Statcast). A value of 100 is neutral; higher
favors hitters. These move slowly so a static table is fine; refresh
pre-season once per year.

Keys are MLB `venue_id` (from the schedule endpoint).
"""
from __future__ import annotations

# name kept for transparency / debugging; only `runs` and `hr` are used by scoring
PARK_FACTORS: dict[int, dict] = {
    1:   {"name": "Oracle Park",           "runs":  92, "hr":  85},
    2:   {"name": "Chase Field",           "runs": 105, "hr": 110},
    3:   {"name": "Angel Stadium",         "runs":  97, "hr":  99},
    4:   {"name": "Truist Park",           "runs": 103, "hr": 104},
    5:   {"name": "Oriole Park",           "runs": 100, "hr": 112},
    7:   {"name": "Fenway Park",           "runs": 108, "hr":  96},
    12:  {"name": "Wrigley Field",         "runs": 101, "hr":  99},
    14:  {"name": "Guaranteed Rate Field", "runs": 100, "hr": 106},
    17:  {"name": "Great American",        "runs": 106, "hr": 119},
    22:  {"name": "Progressive Field",     "runs":  97, "hr":  94},
    19:  {"name": "Coors Field",           "runs": 114, "hr": 108},
    2392:{"name": "Comerica Park",         "runs":  97, "hr":  91},
    15:  {"name": "Minute Maid Park",      "runs": 101, "hr": 103},
    2394:{"name": "Kauffman Stadium",      "runs":  99, "hr":  93},
    22:  {"name": "Dodger Stadium",        "runs":  97, "hr": 102},
    2395:{"name": "loanDepot park",        "runs":  95, "hr":  91},
    32:  {"name": "American Family Field", "runs": 102, "hr": 105},
    3312:{"name": "Target Field",          "runs":  98, "hr":  99},
    3289:{"name": "Citi Field",            "runs":  96, "hr":  95},
    3313:{"name": "Yankee Stadium",        "runs": 103, "hr": 114},
    2507:{"name": "Oakland Coliseum",      "runs":  96, "hr":  94},
    2681:{"name": "Citizens Bank Park",    "runs": 102, "hr": 108},
    31:  {"name": "PNC Park",              "runs":  97, "hr":  89},
    2680:{"name": "Petco Park",            "runs":  98, "hr":  94},
    680: {"name": "T-Mobile Park",         "runs":  95, "hr":  97},
    2889:{"name": "Busch Stadium",         "runs":  97, "hr":  92},
    12:  {"name": "Tropicana Field",       "runs":  96, "hr":  95},
    5325:{"name": "Globe Life Field",      "runs": 100, "hr": 102},
    14:  {"name": "Rogers Centre",         "runs": 102, "hr": 107},
    3309:{"name": "Nationals Park",        "runs": 100, "hr": 100},
}


def park_factor(venue_id: int | None) -> dict:
    if venue_id is None:
        return {"name": "Unknown", "runs": 100, "hr": 100}
    return PARK_FACTORS.get(int(venue_id), {"name": "Unknown", "runs": 100, "hr": 100})
