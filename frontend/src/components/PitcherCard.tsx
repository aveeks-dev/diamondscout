import { Link } from "react-router-dom";
import type { Sleeper, Starter } from "../api";
import TierBadge from "./TierBadge";
import ComponentBars from "./ComponentBars";
import { formatFirstPitch } from "./StartTime";

function SleeperPill({ s }: { s: Sleeper }) {
  // Premium (Hidden Gem) = gold, basic (Streamer) = blue. Visual distinction.
  const premium = s.tier === "premium";
  const cls = premium
    ? "bg-diamond-gold/15 text-diamond-gold border-diamond-gold/40"
    : "bg-diamond-blue/15 text-diamond-blue border-diamond-blue/40";
  const icon = premium ? "◆" : "◇";
  return (
    <div className={`pill border ${cls} self-start`}>
      <span className="font-display">{icon}</span>
      {s.tag} — {s.reason}
    </div>
  );
}

function OwnershipChip({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  // Color map: low ownership = bright gold (interesting), high = muted gray
  let color = "#4aa3ff";
  if (pct < 10) color = "#f5c46b";
  else if (pct < 40) color = "#4aa3ff";
  else if (pct < 80) color = "#8aa3c2";
  else color = "#6a8199";
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold tabular-nums"
      style={{ backgroundColor: `${color}1f`, color, border: `1px solid ${color}55` }}
    >
      {pct.toFixed(0)}% rostered
    </span>
  );
}

function fmt(v: any, dash = "—"): string {
  if (v === undefined || v === null || v === "") return dash;
  return String(v);
}

export default function PitcherCard({ s }: { s: Starter }) {
  const ss = s.season_stats;
  return (
    <Link
      to={`/pitcher/${s.pitcher.id}`}
      className="card p-4 flex flex-col gap-4 hover:border-diamond-gold/50 transition-colors group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-field-mute">
              {s.pitcher.team_abbr}
            </span>
            <span className="text-[11px] text-field-mute">vs</span>
            <span className="text-[11px] font-semibold text-field-mute">
              {s.opponent.team_abbr}
            </span>
            <span className="text-[11px] text-field-mute">
              · {formatFirstPitch(s.game_time_utc)} · {s.venue.is_home ? "home" : "away"}
            </span>
          </div>
          <div className="font-display text-2xl tracking-wide truncate mt-0.5 group-hover:text-diamond-gold transition-colors">
            {s.pitcher.name}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-field-mute">
              {s.pitcher.throws}HP · {s.park.name} (park {s.park.runs})
            </span>
            <OwnershipChip pct={s.ownership.percent_owned} />
          </div>
        </div>
        <TierBadge tier={s.tier_meta} score={s.score} size="md" />
      </div>

      {s.sleeper && <SleeperPill s={s.sleeper} />}

      <div className="grid grid-cols-4 gap-2 text-center">
        <Stat label="ERA" value={fmt(ss.era)} />
        <Stat label="WHIP" value={fmt(ss.whip)} />
        <Stat label="K/9" value={fmt(ss.so9)} />
        <Stat label="IP" value={fmt(ss.ip)} />
      </div>

      <ComponentBars components={s.components} />
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="stat-value text-field-chalk tabular-nums">{value}</div>
    </div>
  );
}
