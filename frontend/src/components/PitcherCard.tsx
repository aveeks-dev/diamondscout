import { Link } from "react-router-dom";
import type { Sleeper, Starter } from "../api";
import TierBadge from "./TierBadge";
import Sparkline from "./Sparkline";
import WeatherChip from "./WeatherChip";
import { formatFirstPitch } from "./StartTime";

function SleeperMark({ s }: { s: Sleeper }) {
  const premium = s.tier === "premium";
  return (
    <span
      className="eyebrow"
      style={{ color: premium ? "#c89c4c" : "#7d95b5" }}
    >
      {s.tag}
    </span>
  );
}

function Ownership({ own, chg }: { own: number | null; chg: number | null }) {
  if (own === null) return null;
  return (
    <span className="num text-xs text-ink-dim">
      {own.toFixed(0)}% rostered
      {chg !== null && chg !== 0 && (
        <span
          className="ml-1.5"
          style={{ color: chg > 0 ? "#7ba974" : "#c87670" }}
        >
          {chg > 0 ? "↑" : "↓"}
          {Math.abs(chg).toFixed(1)}
        </span>
      )}
    </span>
  );
}

function fmt(v: any): string {
  if (v === undefined || v === null || v === "") return "—";
  return String(v);
}

export default function PitcherCard({ s }: { s: Starter }) {
  const ss = s.season_stats;
  const last5Eras = s.last5.map((g) => (g.era !== undefined ? Number(g.era) : null));

  return (
    <Link
      to={`/pitcher/${s.pitcher.id}`}
      className="panel p-5 flex flex-col gap-4 group transition-colors hover:border-accent/50"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-2xs tracking-wider">
            <span className="num font-semibold text-ink-text/80">{s.pitcher.team_abbr}</span>
            <span className="text-ink-faint">VS</span>
            <span className="num font-semibold text-ink-text/80">{s.opponent.team_abbr}</span>
            <span className="text-ink-faint">·</span>
            <span className="num text-ink-dim">{formatFirstPitch(s.game_time_utc)}</span>
            <span className="text-ink-faint">·</span>
            <span className="text-ink-dim uppercase tracking-widest">{s.venue.is_home ? "Home" : "Road"}</span>
            {s.sleeper && (
              <>
                <span className="text-ink-faint">·</span>
                <SleeperMark s={s.sleeper} />
              </>
            )}
          </div>
          <div className="display text-[26px] leading-tight mt-1.5 truncate group-hover:text-accent transition-colors">
            {s.pitcher.name}
          </div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-ink-dim">
            <span>{s.pitcher.throws}HP</span>
            <WeatherChip weather={s.weather} />
            <Ownership own={s.ownership.percent_owned} chg={s.ownership.percent_change} />
          </div>
        </div>
        <TierBadge tier={s.tier_meta} score={s.score} size="md" />
      </div>

      {/* Stat strip — box-score feel */}
      <div className="grid grid-cols-5 border-y border-ink-line py-3 -mx-1">
        <StatCell label="ERA"  v={fmt(ss.era)} />
        <StatCell label="WHIP" v={fmt(ss.whip)} />
        <StatCell label="K/9"  v={fmt(ss.so9)} />
        <StatCell label="BB/9" v={fmt(ss.bb9)} />
        <StatCell label="IP"   v={fmt(ss.ip)} />
      </div>

      {/* Recent form: trend + sparkline */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="eyebrow">L5 ERA</span>
          <Sparkline values={last5Eras} width={100} height={22} invert={true} />
        </div>
        <div className="text-xs text-ink-dim">
          <span className="num text-ink-text">{fmt(ss.avg_against)}</span>
          <span className="ml-1.5">opp avg</span>
        </div>
      </div>
    </Link>
  );
}

function StatCell({ label, v }: { label: string; v: string }) {
  return (
    <div className="text-center px-1">
      <div className="eyebrow mb-1">{label}</div>
      <div className="num text-xl text-ink-text">{v}</div>
    </div>
  );
}
