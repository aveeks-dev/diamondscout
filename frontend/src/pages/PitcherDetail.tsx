import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Starter } from "../api";
import TierBadge from "../components/TierBadge";
import ComponentBars from "../components/ComponentBars";
import { formatFirstPitch } from "../components/StartTime";
import WeatherChip from "../components/WeatherChip";

export default function PitcherDetail() {
  const { id } = useParams();
  const [s, setS] = useState<Starter | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pitcher/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Not found (${r.status})`);
        setS(await r.json());
      })
      .catch((e) => setErr(e.message));
  }, [id]);

  if (err) {
    return (
      <div className="card p-6 text-diamond-red border-diamond-red/40">
        <div className="font-display text-2xl">Not starting today</div>
        <div className="text-sm text-field-mute mt-1">{err}</div>
        <Link to="/" className="inline-block mt-4 text-diamond-gold hover:underline">← Back to board</Link>
      </div>
    );
  }

  if (!s) return <div className="py-20 text-center text-field-mute">Loading…</div>;

  const ss = s.season_stats;
  return (
    <div className="space-y-6 pb-20">
      <Link to="/" className="text-diamond-gold text-sm hover:underline">← Back to board</Link>

      <div className="card p-6 flex flex-col md:flex-row gap-6 md:items-center">
        <TierBadge tier={s.tier_meta} score={s.score} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="text-xs text-field-mute uppercase tracking-widest">
            {s.pitcher.team} — {s.pitcher.throws}HP
          </div>
          <div className="font-display text-5xl tracking-wide truncate">
            {s.pitcher.name}
          </div>
          <div className="text-field-mute mt-1 flex items-center flex-wrap gap-x-3 gap-y-1">
            <span>vs {s.opponent.name}</span>
            <span>· {formatFirstPitch(s.game_time_utc)}</span>
            <span>· {s.venue.is_home ? "Home start" : "Road start"}</span>
            <WeatherChip weather={s.weather} size="md" />
          </div>
          {s.sleeper && (
            <div className="pill bg-diamond-gold/15 text-diamond-gold border border-diamond-gold/30 mt-3">
              ★ {s.sleeper.tag} — {s.sleeper.reason}
            </div>
          )}
        </div>
        <div className="w-full md:w-64 shrink-0">
          <ComponentBars components={s.components} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Season line">
          <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <Row k="IP"    v={ss.ip} />
            <Row k="W-L"   v={`${ss.w ?? 0}-${ss.l ?? 0}`} />
            <Row k="ERA"   v={ss.era} />
            <Row k="WHIP"  v={ss.whip} />
            <Row k="K"     v={ss.k} />
            <Row k="BB"    v={ss.bb} />
            <Row k="K/9"   v={ss.so9} />
            <Row k="BB/9"  v={ss.bb9} />
            <Row k="HR"    v={ss.hr} />
            <Row k="AVG"   v={ss.avg_against} />
          </dl>
        </Card>

        <Card title={`Opponent (vs ${s.opponent_offense.faces_hand})`}>
          <div className="text-xs text-field-mute mb-2">{s.opponent.name}</div>
          <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <Row k="OPS vs hand"  v={s.opponent_offense.vs_hand.ops ?? s.opponent_offense.season.ops} />
            <Row k="OPS (season)" v={s.opponent_offense.season.ops} />
            <Row k="OPS (last 14)" v={s.opponent_offense.last14.ops} />
            <Row k="K (season)"    v={s.opponent_offense.season.so} />
            <Row k="HR (season)"   v={s.opponent_offense.season.hr} />
            <Row k="Runs (season)" v={s.opponent_offense.season.runs} />
          </dl>
        </Card>

        <Card title="Environment">
          <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
            <Row k="Park runs" v={s.park.runs} />
            <Row k="Park HR"   v={s.park.hr} />
            <Row k="Home/Road" v={s.venue.is_home ? "Home" : "Road"} />
            {s.weather && (
              <>
                <Row k="Weather" v={s.weather.indoor ? "Indoors" : s.weather.condition} />
                {s.weather.temp_f !== null && <Row k="Temp" v={`${s.weather.temp_f}°F`} />}
                {s.weather.wind_mph !== null && (
                  <Row k="Wind" v={`${s.weather.wind_mph} mph${s.weather.windy ? " (windy)" : ""}`} />
                )}
                {s.weather.precip_in !== null && s.weather.precip_in > 0 && (
                  <Row k="Precip" v={`${s.weather.precip_in}"`} />
                )}
              </>
            )}
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-1">
        <Card title="Fantasy profile (ESPN)">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-6 text-sm">
            <Row k="Rostered"
                 v={s.ownership.percent_owned !== null
                    ? `${s.ownership.percent_owned.toFixed(1)}%` : "—"} />
            <Row k="Started"
                 v={s.ownership.percent_started !== null
                    ? `${s.ownership.percent_started.toFixed(1)}%` : "—"} />
            <Row k="Δ this week"
                 v={s.ownership.percent_change !== null
                    ? `${s.ownership.percent_change > 0 ? "+" : ""}${s.ownership.percent_change.toFixed(1)}`
                    : "—"} />
            <Row k="ADP"
                 v={s.ownership.adp && s.ownership.adp > 0
                    ? s.ownership.adp.toFixed(1) : "Undrafted"} />
          </dl>
        </Card>
      </div>

      <Card title="Last 5 starts">
        {s.last5.length === 0 ? (
          <div className="text-field-mute text-sm">No recent starts on record this season yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-field-mute">
              <tr className="text-left">
                <th className="py-1">Date</th>
                <th>Opp</th>
                <th>IP</th>
                <th>ER</th>
                <th>H</th>
                <th>BB</th>
                <th>K</th>
                <th>HR</th>
                <th>Pitches</th>
                <th>ERA</th>
              </tr>
            </thead>
            <tbody>
              {s.last5.map((g, i) => (
                <tr key={i} className="border-t border-field-line/60 tabular-nums">
                  <td className="py-1">{g.date}</td>
                  <td>{g.opp ?? "—"}</td>
                  <td>{g.ip ?? "—"}</td>
                  <td>{g.er ?? "—"}</td>
                  <td>{g.h ?? "—"}</td>
                  <td>{g.bb ?? "—"}</td>
                  <td>{g.k ?? "—"}</td>
                  <td>{g.hr ?? "—"}</td>
                  <td>{g.pitches ?? "—"}</td>
                  <td>{g.era ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Splits (pitcher)">
          <div className="grid grid-cols-2 gap-x-6">
            <SplitCol label="vs LHB" s={s.splits.vs_L} />
            <SplitCol label="vs RHB" s={s.splits.vs_R} />
          </div>
        </Card>
        <Card title="How the score is built">
          <ScoreBreakdown s={s} />
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="font-display text-xl tracking-wide mb-3">{title}</div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <>
      <dt className="text-field-mute">{k}</dt>
      <dd className="tabular-nums">{v ?? "—"}</dd>
    </>
  );
}

// Human-readable labels for the underlying inputs that feed each scoring
// component. Mapping keeps the backend breakdown keys flexible while
// guaranteeing the UI only shows things it understands.
const BREAKDOWN_LABELS: Record<string, string> = {
  "K%": "Strikeout rate",
  "BB%": "Walk rate",
  "ERA": "Season ERA",
  "WHIP": "Season WHIP",
  "OPS_vs_hand": "Opponent OPS vs hand",
  "K%_vs_hand": "Opponent K% vs hand",
  "OPS_last14": "Opponent OPS, last 14 days",
  "park": "Park",
  "park_runs_idx": "Park factor (runs)",
  "park_hr_idx": "Park factor (HR)",
  "home": "Home start",
  "starts_used": "Starts analyzed",
  "last_era": "Recent ERA",
  "last_whip": "Recent WHIP",
  "last_k9": "Recent K/9",
};

const COMPONENT_META: Record<string, { label: string; key: keyof Starter["components"]; desc: string }> = {
  pitcher:     { label: "Pitcher skill",  key: "pitcher_skill", desc: "Season talent snapshot" },
  opponent:    { label: "Opponent",       key: "opponent",      desc: "Lineup quality vs this hand" },
  form:        { label: "Recent form",    key: "recent_form",   desc: "Last few starts trend" },
  environment: { label: "Environment",    key: "environment",   desc: "Park and home or road" },
};

function colorForScore(x: number): string {
  if (x >= 72) return "#3fd17a";
  if (x >= 54) return "#4aa3ff";
  if (x >= 42) return "#f5c46b";
  return "#e04e4e";
}

function formatBreakdownValue(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(v > 10 ? 1 : 3).replace(/\.?0+$/, "");
  }
  return String(v);
}

function ScoreBreakdown({ s }: { s: Starter }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-field-mute leading-relaxed">
        The matchup score is a weighted blend of four components. Each one is normalized to a 0 to
        100 scale around league average before being combined, so the inputs below are directly
        comparable.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(COMPONENT_META).map(([k, meta]) => {
          const value = s.components[meta.key];
          const color = colorForScore(value);
          const inputs = s.breakdown[k] || {};
          return (
            <div key={k} className="rounded-lg border border-field-line/60 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold">{meta.label}</div>
                  <div className="text-[11px] text-field-mute">{meta.desc}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl tabular-nums" style={{ color }}>
                    {value.toFixed(0)}
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-field-line rounded-full overflow-hidden mb-3">
                <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
              </div>
              <dl className="grid grid-cols-2 gap-y-1 text-xs">
                {Object.entries(inputs).map(([ik, iv]) => (
                  <div key={ik} className="contents">
                    <dt className="text-field-mute truncate">{BREAKDOWN_LABELS[ik] || ik}</dt>
                    <dd className="text-right tabular-nums">{formatBreakdownValue(iv)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SplitCol({ label, s }: { label: string; s: any }) {
  return (
    <div>
      <div className="text-xs text-field-mute uppercase tracking-widest mb-1">{label}</div>
      <dl className="grid grid-cols-2 gap-y-1 text-sm">
        <Row k="ERA"  v={s.era} />
        <Row k="WHIP" v={s.whip} />
        <Row k="AVG"  v={s.avg_against} />
        <Row k="K"    v={s.k} />
      </dl>
    </div>
  );
}
