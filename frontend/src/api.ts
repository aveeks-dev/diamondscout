export type Ownership = {
  percent_owned: number | null;
  percent_started: number | null;
  percent_change: number | null;
  adp: number | null;
  auction_value: number | null;
  espn_id: number | null;
};

export type Sleeper = {
  tag: "Hidden Gem" | "Streamer";
  reason: string;
  tier: "premium" | "basic";
  percent_owned: number;
};

export type Tier = "S" | "A" | "B" | "C" | "D" | "F";

export type TierMeta = {
  label: Tier;
  name: string;   // e.g. "ACE", "FRONT-LINE"
  color: string;  // hex
  desc: string;
};

export type Starter = {
  game_pk: number;
  game_time_utc: string;
  status: string;
  pitcher: {
    id: number;
    name: string;
    throws: "L" | "R";
    team: string;
    team_abbr: string;
    team_id: number;
  };
  opponent: { id: number; name: string; team_abbr: string };
  venue: { id: number; name: string; is_home: boolean };
  park: { name: string; runs: number; hr: number };
  weather?: {
    condition: string;
    temp_f: number | null;
    wind_mph: number | null;
    precip_in: number | null;
    indoor: boolean;
    windy: boolean;
    wet: boolean;
  } | null;
  season_stats: Record<string, any>;
  last5: Array<Record<string, any>>;
  splits: { vs_L: Record<string, any>; vs_R: Record<string, any> };
  opponent_offense: {
    season: Record<string, any>;
    vs_hand: Record<string, any>;
    last14: Record<string, any>;
    faces_hand: "LHP" | "RHP";
  };
  ownership: Ownership;
  score: number;
  tier: Tier;
  tier_meta: TierMeta;
  components: {
    pitcher_skill: number;
    opponent: number;
    recent_form: number;
    environment: number;
  };
  breakdown: Record<string, Record<string, any>>;
  sleeper: Sleeper | null;
};

export type TwoStartRow = {
  pitcher: { id: number; name: string; team: string; team_abbr: string };
  starts: Array<{ date: string; opp: string; is_home: boolean; venue: string }>;
  ownership: Ownership;
};

export type DailyPayload = {
  date: string;
  generated_at: string;
  games_count: number;
  starters: Starter[];
  sleepers: Starter[];
};

export async function fetchToday(date?: string, refresh = false): Promise<DailyPayload> {
  const qs = new URLSearchParams();
  if (date) qs.set("date", date);
  if (refresh) qs.set("refresh", "true");
  const r = await fetch(`/api/today?${qs.toString()}`);
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

export async function triggerRefresh(date?: string) {
  const qs = new URLSearchParams();
  if (date) qs.set("date", date);
  const r = await fetch(`/api/refresh?${qs.toString()}`, { method: "POST" });
  if (!r.ok) throw new Error(`Refresh failed ${r.status}`);
  return r.json();
}

export async function fetchSleepers(): Promise<{ count: number; rows: Starter[] }> {
  const r = await fetch("/api/sleepers");
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

export async function fetchTrends(): Promise<{
  date: string;
  rising: Starter[];
  falling: Starter[];
}> {
  const r = await fetch("/api/trends");
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

export async function fetchTwoStart(days = 7): Promise<{
  start: string;
  days: number;
  count: number;
  rows: TwoStartRow[];
}> {
  const r = await fetch(`/api/two-start?days=${days}`);
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}

export type ProspectReason = {
  tag: string;
  icon: string;
  detail: string;
  url?: string;
  published?: string;
};

export type Prospect = {
  pitcher: {
    id: number;
    name: string;
    team?: string;
    team_abbr?: string;
    throws?: string;
    age?: number | null;
    birth_date?: string | null;
    mlb_debut?: string | null;
  };
  ownership: Ownership;
  score: number;
  season_stats: Record<string, any>;
  reasons: ProspectReason[];
  articles: Array<{ headline: string; description: string; url: string; published: string }>;
  starting_today: boolean;
  next_start_opp: string | null;
};

export async function fetchProspects(): Promise<{
  date: string;
  generated_at: string;
  count: number;
  prospects: Prospect[];
}> {
  const r = await fetch("/api/prospects");
  if (!r.ok) throw new Error(`API error ${r.status}`);
  return r.json();
}
