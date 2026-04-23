# Diamond Scout

Auto-updating MLB pitcher research for fantasy baseball. Pulls live data from the MLB Stats API (free, official), scores every probable starter on a 0-100 matchup grade, and surfaces low-ownership sleepers you can stream.

## Run it

Two terminals.

**Backend**
```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

Vite proxies `/api/*` to the backend, so you only visit the frontend URL.

## What it does

- **Live data**: every probable starter on the slate, pulled from `statsapi.mlb.com` (no API key, no scraping)
- **Matchup Score (0-100)**: composite of pitcher skill (35%), opponent offense vs that hand (30%), recent form / last 5 starts (20%), park + home/road (15%), mapped to letter grades A+ → F
- **Sleeper spotlight**: tags lightly-used arms (under ~50 season IP) with plus matchups — good stand-ins for real "low-owned" data which is proprietary to Yahoo/ESPN
- **Opponent breakdown**: team OPS vs LHP/RHP, season and last-14-day trend
- **Pitcher detail page**: last 5 game log, vs-L/vs-R splits, park factors, score math broken out
- **Daily auto-refresh**: APScheduler refreshes the snapshot at 9am, 1pm, 4pm, 7pm (covers lineup postings + weather)
- **SQLite snapshot cache**: first page load warms the slate, subsequent loads are instant

## Architecture

```
backend/
  app/
    data/mlb_client.py      async httpx client for MLB Stats API
    core/scoring.py         matchup score algorithm + letter grade mapping
    core/park_factors.py    static 3-yr park factors table
    services/               orchestrates API calls, scoring, sleeper tagging, SQLite cache
    api/routes.py           FastAPI endpoints
    models/db.py            SQLAlchemy models
    main.py                 app + CORS + scheduler lifespan
frontend/
  src/
    pages/Dashboard.tsx     today's board, sleepers section, all starters ranked
    pages/Rankings.tsx      sortable/filterable table
    pages/PitcherDetail.tsx per-pitcher drilldown
    components/             ScoreDial, ComponentBars, PitcherCard
```

## API

- `GET /api/today?date=YYYY-MM-DD&refresh=false` — full slate
- `GET /api/rankings?throws=R&sleepers_only=true&team=NYY&min_score=60` — filtered rows
- `GET /api/sleepers` — just sleepers
- `GET /api/pitcher/{id}` — one pitcher's enriched block
- `POST /api/refresh` — manually rebuild today's snapshot

Full docs at `http://localhost:8000/docs` (FastAPI autogen).

## Notes

- Park factors are a static table (they only move pre-season). Edit `app/core/park_factors.py` to tune.
- Scoring weights live in `app/core/scoring.py`'s `compute_matchup_score`. League-average priors in `LEAGUE` can be nudged.
- The "sleeper" tag is a heuristic (low IP + good matchup) — not real ownership data. To upgrade, scrape Yahoo/ESPN public ownership pages into a nightly job.
