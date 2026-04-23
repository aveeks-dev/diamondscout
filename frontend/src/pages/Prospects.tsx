import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProspects, type Prospect, type ProspectReason } from "../api";

export default function Prospects() {
  const [rows, setRows] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchProspects()
      .then((d) => {
        setRows(d.prospects);
        setLoading(false);
      })
      .catch((e) => {
        setErr(e.message || "Failed to load");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-field-mute">Scanning pitchers for breakout signals…</div>;
  }

  if (err) {
    return (
      <div className="card p-6 text-diamond-red border-diamond-red/40">
        <div className="font-display text-2xl">Could not load prospects</div>
        <div className="text-sm text-field-mute mt-1">{err}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <div className="font-display text-4xl tracking-wide">Future Prospects</div>
        <div className="text-field-mute text-sm mt-2 max-w-3xl leading-relaxed">
          Pitchers rostered in under 30% of ESPN leagues with measurable upside. Each candidate needs
          at least two qualifying signals to make the list, drawn from season performance, recent form,
          age and debut date, waiver momentum, and recent ESPN news mentions. The goal is to surface
          names worth a speculative add before the broader fantasy crowd catches on.
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-field-mute">
          No prospects matched the criteria today. Check back after tonight's games.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {rows.map((p) => (
            <ProspectCard key={p.pitcher.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProspectCard({ p }: { p: Prospect }) {
  const ss = p.season_stats;
  const own = p.ownership.percent_owned;
  return (
    <div className="card p-5 flex flex-col gap-4 hover:border-diamond-gold/40 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap text-[11px] uppercase tracking-widest text-field-mute">
            {p.pitcher.team_abbr && <span className="font-semibold">{p.pitcher.team_abbr}</span>}
            {p.pitcher.throws && <span>{p.pitcher.throws}HP</span>}
            {p.pitcher.age && <span>· age {p.pitcher.age}</span>}
            {p.starting_today && (
              <span className="text-diamond-gold font-semibold">
                · Starting today vs {p.next_start_opp}
              </span>
            )}
          </div>
          <Link
            to={`/pitcher/${p.pitcher.id}`}
            className="font-display text-3xl tracking-wide truncate hover:text-diamond-gold transition-colors block"
          >
            {p.pitcher.name}
          </Link>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-widest text-field-mute">Rostered</div>
          <div className="font-display text-3xl text-diamond-gold tabular-nums">
            {own !== null ? `${own.toFixed(1)}%` : "—"}
          </div>
          {p.ownership.percent_change !== null && p.ownership.percent_change !== 0 && (
            <div
              className="text-xs tabular-nums"
              style={{ color: p.ownership.percent_change > 0 ? "#3fd17a" : "#e04e4e" }}
            >
              {p.ownership.percent_change > 0 ? "▲" : "▼"}
              {Math.abs(p.ownership.percent_change).toFixed(1)} this week
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 text-center border-y border-field-line/60 py-3">
        <MiniStat label="ERA" v={ss.era} />
        <MiniStat label="WHIP" v={ss.whip} />
        <MiniStat label="K/9" v={ss.so9} />
        <MiniStat label="BB/9" v={ss.bb9} />
        <MiniStat label="IP" v={ss.ip} />
      </div>

      <div className="space-y-2">
        {p.reasons.map((r, i) => (
          <ReasonRow key={i} r={r} />
        ))}
      </div>

      {p.articles.length > 0 && (
        <div className="border-t border-field-line/60 pt-3">
          <div className="text-[10px] uppercase tracking-widest text-field-mute mb-2">
            Recent coverage
          </div>
          <ul className="space-y-1.5">
            {p.articles.map((a, i) => (
              <li key={i} className="text-sm">
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-diamond-blue hover:text-diamond-gold transition-colors"
                >
                  {a.headline}
                </a>
                {a.published && (
                  <span className="ml-2 text-xs text-field-mute tabular-nums">
                    {new Date(a.published).toLocaleDateString(undefined, {
                      month: "short", day: "numeric",
                    })}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, v }: { label: string; v: any }) {
  return (
    <div>
      <div className="stat-label">{label}</div>
      <div className="font-display text-xl text-field-chalk tabular-nums">
        {v ?? "—"}
      </div>
    </div>
  );
}

function ReasonRow({ r }: { r: ProspectReason }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-lg"
        style={{
          background: "rgba(245,196,107,0.08)",
          border: "1px solid rgba(245,196,107,0.25)",
        }}
      >
        {r.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-field-chalk">{r.tag}</div>
        <div className="text-xs text-field-mute">{r.detail}</div>
      </div>
    </div>
  );
}
