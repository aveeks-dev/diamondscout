import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Starter } from "../api";
import TierBadge from "../components/TierBadge";
import Sparkline from "../components/Sparkline";
import WeatherChip from "../components/WeatherChip";
import { formatFirstPitch } from "../components/StartTime";

export default function PitcherDetail() {
  const { id } = useParams();
  const [s, setS] = useState<Starter | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pitcher/${id}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`Not starting today (${r.status})`);
        setS(await r.json());
      })
      .catch((e) => setErr(e.message));
  }, [id]);

  if (err) {
    return (
      <div className="panel p-8 border-neg/30">
        <div className="display text-2xl text-neg">Not starting today</div>
        <div className="text-sm text-ink-dim mt-1">{err}</div>
        <Link to="/" className="inline-block mt-4 text-accent hover:underline text-sm">
          ← Back to board
        </Link>
      </div>
    );
  }

  if (!s) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <div className="eyebrow">Loading pitcher</div>
      </div>
    );
  }

  const ss = s.season_stats;
  const last5Eras = s.last5.map((g) => (g.era !== undefined ? Number(g.era) : null));

  return (
    <div className="space-y-10 pb-16">
      <Link to="/" className="text-accent text-xs tracking-wider uppercase hover:underline">
        ← Board
      </Link>

      {/* Masthead */}
      <header className="border-b border-ink-line pb-8">
        <div className="grid grid-cols-[1fr_auto] gap-8 items-start">
          <div className="min-w-0">
            <div className="eyebrow mb-2">
              {s.pitcher.team} · {s.pitcher.throws}HP
              {s.sleeper && (
                <span className="ml-3" style={{ color: s.sleeper.tier === "premium" ? "#c89c4c" : "#7d95b5" }}>
                  {s.sleeper.tag}
                </span>
              )}
            </div>
            <h1 className="display text-[64px] leading-[0.95] tracking-tight truncate">
              {s.pitcher.name}
            </h1>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-4 text-sm text-ink-dim">
              <span>vs <span className="text-ink-text">{s.opponent.name}</span></span>
              <span>·</span>
              <span className="num">{formatFirstPitch(s.game_time_utc)}</span>
              <span>·</span>
              <span>{s.venue.is_home ? "Home" : "Road"}</span>
              <span>·</span>
              <WeatherChip weather={s.weather} size="md" />
            </div>
          </div>
          <TierBadge tier={s.tier_meta} score={s.score} size="lg" />
        </div>
      </header>

      {/* Season line — full box score */}
      <section>
        <SectionHead overline="Season" title="Line" />
        <div className="panel divide-x divide-ink-line grid grid-cols-5 md:grid-cols-10">
          <BigStat label="IP" v={ss.ip} />
          <BigStat label="W-L" v={`${ss.w ?? 0}-${ss.l ?? 0}`} />
          <BigStat label="ERA" v={ss.era} highlight />
          <BigStat label="WHIP" v={ss.whip} highlight />
          <BigStat label="K" v={ss.k} />
          <BigStat label="BB" v={ss.bb} />
          <BigStat label="K/9" v={ss.so9} />
          <BigStat label="BB/9" v={ss.bb9} />
          <BigStat label="HR" v={ss.hr} />
          <BigStat label="AVG" v={ss.avg_against} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Panel title="Opponent" overline={`vs ${s.opponent_offense.faces_hand}`}>
          <div className="eyebrow text-ink-faint mb-3">{s.opponent.name}</div>
          <DataList
            rows={[
              ["OPS vs hand", s.opponent_offense.vs_hand.ops ?? s.opponent_offense.season.ops],
              ["OPS (season)", s.opponent_offense.season.ops],
              ["OPS (last 14)", s.opponent_offense.last14.ops],
              ["K (season)", s.opponent_offense.season.so],
              ["HR (season)", s.opponent_offense.season.hr],
              ["Runs (season)", s.opponent_offense.season.runs],
            ]}
          />
        </Panel>

        <Panel title="Environment" overline={s.venue.is_home ? "Home start" : "Road start"}>
          <DataList
            rows={[
              ["Park factor (R)", s.park.runs],
              ["Park factor (HR)", s.park.hr],
              ["Weather", s.weather?.indoor ? "Indoors" : s.weather?.condition ?? "—"],
              ["Temp", s.weather?.temp_f !== null && s.weather?.temp_f !== undefined ? `${s.weather.temp_f}°F` : null],
              ["Wind", s.weather?.wind_mph !== null && s.weather?.wind_mph !== undefined
                ? `${s.weather.wind_mph} mph${s.weather.windy ? " · windy" : ""}`
                : null],
              ...(s.weather?.precip_in && s.weather.precip_in > 0
                ? [["Precip", `${s.weather.precip_in}"`] as [string, any]]
                : []),
            ]}
          />
        </Panel>

        <Panel title="Fantasy" overline="ESPN">
          <DataList
            rows={[
              ["Rostered", s.ownership.percent_owned !== null ? `${s.ownership.percent_owned.toFixed(1)}%` : null],
              ["Started", s.ownership.percent_started !== null ? `${s.ownership.percent_started.toFixed(1)}%` : null],
              [
                "Week change",
                s.ownership.percent_change !== null
                  ? `${s.ownership.percent_change > 0 ? "+" : ""}${s.ownership.percent_change.toFixed(1)}`
                  : null,
              ],
              ["ADP", s.ownership.adp && s.ownership.adp > 0 ? s.ownership.adp.toFixed(1) : "Undrafted"],
              ["Auction", s.ownership.auction_value && s.ownership.auction_value > 0 ? `$${s.ownership.auction_value.toFixed(0)}` : null],
            ]}
          />
        </Panel>
      </section>

      {/* Recent form */}
      <section>
        <SectionHead overline="Recent" title="Last 5 starts" />
        {s.last5.length === 0 ? (
          <div className="panel p-6 text-sm text-ink-dim">No recorded starts this season yet.</div>
        ) : (
          <div className="panel p-5 flex flex-col gap-4">
            <div className="flex items-center gap-4 pb-3 border-b border-ink-line">
              <span className="eyebrow">Trend</span>
              <Sparkline values={last5Eras} width={200} height={30} invert />
              <span className="num text-xs text-ink-dim ml-auto">ERA by start</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opp</th>
                    <th className="num">IP</th>
                    <th className="num">ER</th>
                    <th className="num">H</th>
                    <th className="num">BB</th>
                    <th className="num">K</th>
                    <th className="num">HR</th>
                    <th className="num">Pitches</th>
                    <th className="num">ERA</th>
                  </tr>
                </thead>
                <tbody>
                  {s.last5.map((g, i) => (
                    <tr key={i}>
                      <td className="num">{g.date}</td>
                      <td className="num text-ink-dim">{g.opp ?? "—"}</td>
                      <td className="num">{g.ip ?? "—"}</td>
                      <td className="num">{g.er ?? "—"}</td>
                      <td className="num">{g.h ?? "—"}</td>
                      <td className="num">{g.bb ?? "—"}</td>
                      <td className="num">{g.k ?? "—"}</td>
                      <td className="num">{g.hr ?? "—"}</td>
                      <td className="num">{g.pitches ?? "—"}</td>
                      <td className="num">{g.era ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Splits" overline="Pitcher vs hand">
          <div className="grid grid-cols-2 gap-x-8">
            <SplitColumn label="vs LHB" s={s.splits.vs_L} />
            <SplitColumn label="vs RHB" s={s.splits.vs_R} />
          </div>
        </Panel>
        <Panel title="How the score is built" overline="Breakdown">
          <ScoreBreakdown s={s} />
        </Panel>
      </section>
    </div>
  );
}

// ─── shared bits ────────────────────────────────────────────────────────────

function SectionHead({ overline, title }: { overline: string; title: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-4 pb-2 border-b border-ink-line">
      <span className="eyebrow">{overline}</span>
      <h2 className="display text-[26px] leading-none">{title}</h2>
    </div>
  );
}

function Panel({
  title, overline, children,
}: { title: string; overline?: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-ink-line">
        {overline && <span className="eyebrow">{overline}</span>}
        <h3 className="display text-[20px] leading-none">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function BigStat({ label, v, highlight }: { label: string; v: any; highlight?: boolean }) {
  return (
    <div className="px-3 py-4 text-center">
      <div className="eyebrow mb-1">{label}</div>
      <div className={`num text-2xl ${highlight ? "text-accent" : "text-ink-text"}`}>
        {v ?? "—"}
      </div>
    </div>
  );
}

function DataList({ rows }: { rows: Array<[string, any]> }) {
  return (
    <dl className="divide-y divide-ink-line text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between py-2">
          <dt className="text-ink-dim">{k}</dt>
          <dd className="num">{v === null || v === undefined || v === "" ? "—" : v}</dd>
        </div>
      ))}
    </dl>
  );
}

function SplitColumn({ label, s }: { label: string; s: any }) {
  return (
    <div>
      <div className="eyebrow mb-3">{label}</div>
      <DataList
        rows={[
          ["ERA", s.era],
          ["WHIP", s.whip],
          ["AVG", s.avg_against],
          ["K", s.k],
        ]}
      />
    </div>
  );
}

// ─── score breakdown ────────────────────────────────────────────────────────

const BREAKDOWN_LABELS: Record<string, string> = {
  "K%": "Strikeout rate",
  "BB%": "Walk rate",
  "ERA": "Season ERA",
  "WHIP": "Season WHIP",
  "OPS_vs_hand": "Opponent OPS vs hand",
  "K%_vs_hand": "Opponent K% vs hand",
  "OPS_last14": "Opponent OPS last 14",
  "park": "Park",
  "park_runs_idx": "Park runs index",
  "park_hr_idx": "Park HR index",
  "home": "Home start",
  "starts_used": "Starts analyzed",
  "last_era": "Recent ERA",
  "last_whip": "Recent WHIP",
  "last_k9": "Recent K/9",
};

const COMPONENT_META: Array<{
  key: keyof Starter["components"];
  breakdownKey: string;
  label: string;
  sub: string;
}> = [
  { key: "pitcher_skill", breakdownKey: "pitcher",     label: "Pitcher skill", sub: "Season talent snapshot" },
  { key: "opponent",      breakdownKey: "opponent",    label: "Opponent",      sub: "Lineup quality vs this hand" },
  { key: "recent_form",   breakdownKey: "form",        label: "Recent form",   sub: "Last few starts trend" },
  { key: "environment",   breakdownKey: "environment", label: "Environment",   sub: "Park and home or road" },
];

function colorForScore(x: number): string {
  if (x >= 72) return "#7ba974";
  if (x >= 54) return "#7d95b5";
  if (x >= 42) return "#c89c4c";
  return "#c87670";
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
    <div className="space-y-3">
      <p className="text-xs text-ink-dim leading-relaxed">
        The matchup score is a weighted blend of four components, each normalized to
        a 0 to 100 scale around league average before combining.
      </p>
      {COMPONENT_META.map((m) => {
        const value = s.components[m.key];
        const color = colorForScore(value);
        const inputs = (s.breakdown[m.breakdownKey] || {}) as Record<string, any>;
        return (
          <div key={m.key} className="border-t border-ink-line pt-3">
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="text-sm">{m.label}</div>
                <div className="eyebrow">{m.sub}</div>
              </div>
              <div className="num text-xl" style={{ color }}>{value.toFixed(0)}</div>
            </div>
            <div className="h-[2px] bg-ink-line mb-2 overflow-hidden">
              <div className="h-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              {Object.entries(inputs).map(([ik, iv]) => (
                <div key={ik} className="contents">
                  <dt className="text-ink-dim">{BREAKDOWN_LABELS[ik] || ik}</dt>
                  <dd className="num text-right">{formatBreakdownValue(iv)}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
