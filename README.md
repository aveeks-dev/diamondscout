# Diamond Scout

Diamond Scout is a fantasy baseball research website I built to help with weekly streamer and spot start decisions. It pulls probable starters from the official MLB Stats API, layers in ESPN fantasy ownership data, and scores every pitcher on the slate so you can quickly see who is worth starting, who is a waiver wire pickup, and who you should probably sit.

## What it does

The main board shows every probable starter for the day, grouped into tiers. Tiers run from S (ace) down to F (avoid) and are assigned by percentile across that day's slate, so there is always an S tier and always an F tier. I found this more useful than fixed cutoffs, which usually left no one in the top band because the underlying 0 to 100 score tends to compress into the 35 to 75 range.

The score itself is a weighted average of four components:

* Pitcher skill from current season stats (35%)
* Opponent offense against the pitcher's throwing hand (30%)
* Recent form from the last five starts (20%)
* Ballpark factor and home or road (15%)

There are a few additional views:

* **Streamers**, which lists every pitcher rostered below 40% on ESPN. Pitchers with a score of 65 or better get a Hidden Gem tag. The rest get a Streamer tag.
* **Rankings**, a sortable table with ownership, week over week ownership change, ERA, WHIP, K/9, and filters for handedness and ownership ceiling.
* **Trends**, the top ten rising and top ten falling pitchers in ownership this week among today's starters.
* **Two Start Week**, a scan of the next seven days for pitchers with two probable starts, which is a big lineup decision in weekly leagues.
* A detail page for each pitcher with season line, last five starts, splits vs LHB and RHB, opponent offense, park factors, and the ESPN fantasy profile including ADP.

## Running it locally

You will need Python 3.10 or newer and Node.js 18 or newer installed.

### 1. Clone the repository

```bash
git clone https://github.com/aveeks-dev/diamondscout.git
cd diamondscout
```

### 2. Start the backend

In a terminal inside the project folder, run:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Leave this terminal open. The first request takes around ten seconds while the server pulls the current slate from the MLB API. Everything is cached in SQLite after that, so later loads are instant. A background scheduler refreshes the cache four times a day to pick up late scratches and lineup postings.

### 3. Start the frontend

Open a second terminal in the project folder and run:

```bash
cd frontend
npm install
npm run dev
```

### 4. Open the website

Go to http://localhost:5173 in your browser. That is the full site. The Vite dev server automatically forwards `/api` calls to the backend on port 8000, so you never have to visit the backend URL directly.

If you want to see the raw API, interactive docs live at http://localhost:8000/docs while the backend is running.

## API reference

For anyone who wants to pull data directly, the backend exposes these endpoints on port 8000:

* `GET /api/today` returns every probable starter for today with full stats and scoring
* `GET /api/rankings` supports query params for throws, team, min_score, and sleepers_only
* `GET /api/sleepers` returns only the Hidden Gem and Streamer picks, with an optional tier filter
* `GET /api/trends` returns this week's biggest ownership risers and fallers
* `GET /api/two-start` returns pitchers with two probable starts in the next seven days
* `GET /api/pitcher/{id}` returns the detailed block for a single starter
* `POST /api/refresh` forces a rebuild of today's snapshot

## Data sources

All stats come from statsapi.mlb.com, which is the public API behind mlb.com itself. No key required. Ownership data comes from ESPN's public fantasy endpoint, which is the one their own site calls and the one most third party fantasy tools use. There is no scraping involved.

Yahoo ownership is not used. Yahoo requires OAuth per user and their ownership is scoped to individual leagues rather than site wide, so the numbers are not comparable across users.

## Tech stack

* Backend: FastAPI, httpx, SQLAlchemy, APScheduler, SQLite
* Frontend: React, TypeScript, Vite, Tailwind CSS, React Router
* Deployment: currently local only

## Project layout

```
backend/
  app/
    api/            FastAPI routes
    core/           scoring algorithm and static tables like park factors
    data/           clients for MLB Stats API and ESPN
    services/       orchestration, caching, daily snapshot logic
    models/         SQLAlchemy models
    main.py         entry point with CORS and scheduler lifespan
frontend/
  src/
    pages/          Dashboard, Streamers, Rankings, Trends, TwoStart, PitcherDetail
    components/     PitcherCard, TierBadge, ComponentBars
    api.ts          typed API client
```

## Notes for anyone reading the code

* The ESPN fetch is cached for one hour in memory. Ownership moves slowly, so this is plenty fresh and keeps me off their rate limits.
* Park factors live in `app/core/park_factors.py` as a static table of rolling three year averages. They only meaningfully move between seasons, so updating once a year is fine.
* Scoring weights and the league average priors are in `app/core/scoring.py`. Both are easy to tune if you want a different flavor of ranking.
* The Two Start Week view will often show zero pitchers early in the week because MLB typically only publishes probable starters three to four days ahead. It fills out as the week progresses.

## Author

Built by Aveek. If you spot something broken or have an idea for a new view, feel free to open an issue on the repository.
