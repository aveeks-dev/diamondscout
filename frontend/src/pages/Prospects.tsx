import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProspects, type Prospect, type ProspectReason } from "../api";

export default function Prospects() {
  const [rows, setRows] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchProspects()
      .then((d) => { setRows(d.prospects); setLoading(false); })
      .catch((e) => { setErr(e.message || "Failed to load"); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <div className="eyebrow">Scanning for breakout signals</div>
      </div>
    );
  }
  if (err) {
    return (
      <div className="panel p-6 border-neg/40">
        <div className="display text-2xl text-neg">Could not load prospects</div>
        <div className="text-sm text-ink-dim mt-1">{err}</div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      <header className="border-b border-ink-line pb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-1">Scouting</div>
          <h1 className="display text-[44px] leading-none">Future Prospects</h1>
          <p className="text-sm text-ink-dim mt-3 max-w-2xl">
            Pitchers rostered in under 30% of ESPN leagues with measurable upside.
            Each candidate clears at least two independent signals, drawn from
            season stats, recent form, age and debut date, waiver momentum, and
            ESPN news coverage.
          </p>
        </div>
        <div className="text-right">
          <div className="num display text-[40px] leading-none">{rows.length}</div>
          <div className="eyebrow mt-1">Candidates</div>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="panel p-10 text-center">
          <div className="display text-xl">No candidates matched today</div>
          <div className="text-sm text-ink-dim mt-2">Check back after tonight's slate.</div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {rows.map((p) => <ProspectCard key={p.pitcher.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

function ProspectCard({ p }: { p: Prospect }) {
  const ss = p.season_stats;
  const own = p.ownership.percent_owned;
  return (
    <article className="panel p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-2xs tracking-wider text-ink-dim uppercase">
            {p.pitcher.team_abbr && (
              <span className="num text-ink-text/80 font-semibold">{p.pitcher.team_abbr}</span>
            )}
            {p.pitcher.throws && <span>· {p.pitcher.throws}HP</span>}
            {p.pitcher.age && <span>· age {p.pitcher.age}</span>}
            {p.starting_today && (
              <span className="ml-1 text-accent font-semibold">
                · Starting today vs {p.next_start_opp}
              </span>
            )}
          </div>
          <Link
            to={`/pitcher/${p.pitcher.id}`}
            className="display text-[30px] leading-tight block mt-1 hover:text-accent transition-colors truncate"
          >
            {p.pitcher.name}
          </Link>
        </div>
        <div className="text-right shrink-0">
          <div className="num display text-[34px] leading-none text-accent">
            {own !== null ? `${own.toFixed(1)}%` : "—"}
          </div>
          <div className="eyebrow mt-1">Rostered</div>
          {p.ownership.percent_change !== null && p.ownership.percent_change !== 0 && (
            <div
              className="num text-2xs mt-1"
              style={{ color: p.ownership.percent_change > 0 ? "#7ba974" : "#c87670" }}
            >
              {p.ownership.percent_change > 0 ? "↑" : "↓"}
              {Math.abs(p.ownership.percent_change).toFixed(1)} this week
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 border-y border-ink-line py-3">
        <MiniStat label="ERA"  v={ss.era} />
        <MiniStat label="WHIP" v={ss.whip} />
        <MiniStat label="K/9"  v={ss.so9} />
        <MiniStat label="BB/9" v={ss.bb9} />
        <MiniStat label="IP"   v={ss.ip} />
      </div>

      <div>
        <div className="eyebrow mb-2">Why</div>
        <ul className="space-y-2.5">
          {p.reasons.map((r, i) => <ReasonRow key={i} r={r} />)}
        </ul>
      </div>

      {p.articles.length > 0 && (
        <div className="border-t border-ink-line pt-4">
          <div className="eyebrow mb-2">Recent coverage</div>
          <ul className="space-y-1.5">
            {p.articles.map((a, i) => (
              <li key={i} className="text-sm">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink-text hover:text-accent transition-colors underline underline-offset-2 decoration-ink-line2 hover:decoration-accent"
                >
                  {a.headline}
                </a>
                {a.published && (
                  <span className="ml-2 num text-2xs text-ink-faint">
                    {new Date(a.published).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

function MiniStat({ label, v }: { label: string; v: any }) {
  return (
    <div className="text-center">
      <div className="eyebrow mb-1">{label}</div>
      <div className="num text-lg">{v ?? "—"}</div>
    </div>
  );
}

// Map each reason tag to a color accent. No emoji; just a small label.
const REASON_COLOR: Record<string, string> = {
  "Hot Streak":       "#c89c4c",
  "Swing & Miss":     "#c89c4c",
  "Pinpoint Control": "#7ba974",
  "Hidden Quality":   "#c89c4c",
  "Trending Up":      "#7ba974",
  "Rookie":           "#7d95b5",
  "Young Arm":        "#7d95b5",
  "Waiver Riser":     "#7ba974",
  "In the News":      "#a69168",
};

function ReasonRow({ r }: { r: ProspectReason }) {
  const color = REASON_COLOR[r.tag] || "#9b9a94";
  return (
    <li className="flex gap-3 items-baseline">
      <span
        className="w-[3px] self-stretch rounded"
        style={{ background: color }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <span
            className="text-2xs font-semibold tracking-widest uppercase shrink-0"
            style={{ color }}
          >
            {r.tag}
          </span>
        </div>
        <div className="text-sm text-ink-text/85 mt-0.5">{r.detail}</div>
      </div>
    </li>
  );
}
