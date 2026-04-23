"""
Weather client backed by Open-Meteo (https://open-meteo.com).

Free, no API key needed, no auth, no rate limits at personal-project scale.
We fetch a daily hourly forecast for each unique venue on the slate and
pick the hour closest to first pitch.

The MLB Stats API exposes venue coordinates via the `venue(location)`
hydrate, so we already have lat/lon per game. Indoor stadiums still return
weather for the city, which we flag since it does not affect play.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime
from typing import Any

import httpx

log = logging.getLogger(__name__)

OPEN_METEO = "https://api.open-meteo.com/v1/forecast"

# WMO weather code to a short, readable label
_WMO_MAP: dict[int, str] = {
    0: "Clear",
    1: "Mostly Clear",
    2: "Partly Cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Fog",
    51: "Drizzle",
    53: "Drizzle",
    55: "Drizzle",
    61: "Rain",
    63: "Rain",
    65: "Heavy Rain",
    66: "Freezing Rain",
    67: "Freezing Rain",
    71: "Snow",
    73: "Snow",
    75: "Heavy Snow",
    77: "Snow",
    80: "Showers",
    81: "Showers",
    82: "Heavy Showers",
    85: "Snow Showers",
    86: "Snow Showers",
    95: "Thunderstorms",
    96: "Thunderstorms",
    99: "Thunderstorms",
}

# Retractable or domed stadiums. Weather in these parks rarely affects
# play, so we flag them in the UI. Venue IDs verified against the live
# MLB schedule endpoint.
INDOOR_VENUES: set[int] = {
    12,    # Tropicana Field
    14,    # Rogers Centre
    15,    # Chase Field
    32,    # American Family Field
    2392,  # Daikin Park (formerly Minute Maid Park)
    5325,  # Globe Life Field
}


def _wmo_label(code: int | None) -> str:
    if code is None:
        return "Unknown"
    return _WMO_MAP.get(int(code), "Unclear")


# Cache per (lat,lon,target_date) for a few hours. Ownership cache pattern.
_cache: dict[tuple[float, float, str], tuple[float, dict]] = {}
_TTL = 60 * 60 * 3  # 3h


async def fetch_forecast(
    lat: float,
    lon: float,
    at_iso_utc: str,
    venue_id: int | None = None,
) -> dict[str, Any] | None:
    """
    Return the hourly forecast values closest to `at_iso_utc` for the given
    coordinates. `at_iso_utc` should be an ISO-8601 UTC timestamp (the MLB
    schedule's `gameDate` is UTC already).
    """
    if lat is None or lon is None:
        return None

    try:
        target = datetime.fromisoformat(at_iso_utc.replace("Z", "+00:00"))
    except ValueError:
        return None

    target_date = target.strftime("%Y-%m-%d")
    key = (round(lat, 3), round(lon, 3), target_date)
    now = time.time()
    hit = _cache.get(key)
    if hit and now - hit[0] < _TTL:
        forecast = hit[1]
    else:
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "temperature_2m,precipitation,wind_speed_10m,weather_code",
            "temperature_unit": "fahrenheit",
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "timezone": "UTC",
            "start_date": target_date,
            "end_date": target_date,
        }
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(OPEN_METEO, params=params)
                r.raise_for_status()
                forecast = r.json()
                _cache[key] = (now, forecast)
        except httpx.HTTPError as e:
            log.warning("Open-Meteo fetch failed for %s,%s: %s", lat, lon, e)
            return None

    hourly = forecast.get("hourly", {})
    times: list[str] = hourly.get("time", [])
    if not times:
        return None

    # Find hour closest to first pitch
    target_hour = target.strftime("%Y-%m-%dT%H:00")
    best_idx = 0
    best_diff = 10**9
    for i, t in enumerate(times):
        # Open-Meteo returns times like "2026-04-23T23:00"
        try:
            th = datetime.fromisoformat(t.replace("Z", "+00:00") if t.endswith("Z") else t + "+00:00")
        except ValueError:
            continue
        diff = abs((th - target).total_seconds())
        if diff < best_diff:
            best_diff = diff
            best_idx = i

    def _at(key: str):
        arr = hourly.get(key) or []
        return arr[best_idx] if best_idx < len(arr) else None

    temp = _at("temperature_2m")
    wind = _at("wind_speed_10m")
    precip = _at("precipitation")
    code = _at("weather_code")

    condition = _wmo_label(code)
    # Decorate the label with precipitation or wind when it's notable
    is_indoor = venue_id is not None and venue_id in INDOOR_VENUES
    is_windy = isinstance(wind, (int, float)) and wind >= 15
    is_wet = isinstance(precip, (int, float)) and precip > 0.02

    return {
        "condition": condition,
        "temp_f": round(temp, 0) if isinstance(temp, (int, float)) else None,
        "wind_mph": round(wind, 0) if isinstance(wind, (int, float)) else None,
        "precip_in": round(precip, 2) if isinstance(precip, (int, float)) else None,
        "indoor": is_indoor,
        "windy": is_windy,
        "wet": is_wet,
    }
