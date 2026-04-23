import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTwoStart, type TwoStartRow } from "../api";

export default function TwoStart() {
  const [rows, setRows] = useState<TwoStartRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTwoStart(7).then((d) => {
      setRows(d.rows);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="py-20 text-center text-field-mute">Scanning next 7 days…</div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <div className="font-display text-4xl tracking-wide">Two-Start Week</div>
        <div className="text-field-mute text-sm mt-1 max-w-2xl">
          Pitchers with two probable starts in the next 7 days. Weekly-scoring leagues
          benefit massively from starting a two-start arm — it doubles their contribution
          to your totals.
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="font-display text-2xl">No two-start pitchers announced yet</div>
          <div className="text-field-mute text-sm mt-2 max-w-xl mx-auto">
            MLB typically publishes probable starters only 3-4 days ahead. Pitchers
            starting today won't have their next start announced yet. Check back
            mid-week — this view will fill out as more probables post.
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Link
              key={r.pitcher.id}
              to={`/pitcher/${r.pitcher.id}`}
              className="card p-4 hover:border-diamond-gold/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-display text-2xl truncate">{r.pitcher.name}</div>
                  <div className="text-xs text-field-mute">
                    {r.pitcher.team_abbr}
                    {r.ownership.percent_owned !== null && (
                      <> · {r.ownership.percent_owned.toFixed(0)}% rostered</>
                    )}
                  </div>
                </div>
                <div className="font-display text-3xl text-diamond-gold">
                  {r.starts.length}×
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {r.starts.map((s, i) => (
                  <div key={i} className="flex justify-between border-t border-field-line/60 pt-1">
                    <span className="text-field-mute">{new Date(s.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span>
                      {s.is_home ? "vs" : "@"} <strong>{s.opp}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
