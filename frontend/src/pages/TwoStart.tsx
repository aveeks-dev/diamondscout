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
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <div className="eyebrow">Scanning the next seven days</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <header className="border-b border-ink-line pb-6">
        <div className="eyebrow mb-1">Weekly leagues</div>
        <h1 className="display text-[44px] leading-none">Two-Start Week</h1>
        <p className="text-sm text-ink-dim mt-3 max-w-2xl">
          Pitchers with two probable starts scheduled in the next seven days.
          Starting a two-start arm effectively doubles their contribution to
          your weekly totals.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="panel p-10 text-center">
          <div className="display text-xl">Nothing scheduled yet</div>
          <div className="text-sm text-ink-dim mt-2 max-w-xl mx-auto">
            MLB typically publishes probable starters only three to four days
            ahead. Pitchers starting today do not yet have their next start
            announced. This view fills out as the week progresses.
          </div>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Link
              key={r.pitcher.id}
              to={`/pitcher/${r.pitcher.id}`}
              className="panel p-5 hover:border-accent/50 transition-colors flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-2xs tracking-wider text-ink-dim uppercase">
                    <span className="num font-semibold text-ink-text/80">{r.pitcher.team_abbr}</span>
                    {r.ownership.percent_owned !== null && (
                      <>
                        <span>·</span>
                        <span className="num">{r.ownership.percent_owned.toFixed(0)}% rostered</span>
                      </>
                    )}
                  </div>
                  <div className="display text-[26px] leading-tight mt-1 truncate">
                    {r.pitcher.name}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="num display text-[32px] leading-none text-accent">
                    {r.starts.length}×
                  </div>
                  <div className="eyebrow mt-1">Starts</div>
                </div>
              </div>
              <div className="border-t border-ink-line pt-3 space-y-1.5">
                {r.starts.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-ink-dim num">
                      {new Date(s.date).toLocaleDateString(undefined, {
                        weekday: "short", month: "short", day: "numeric",
                      })}
                    </span>
                    <span>
                      <span className="text-ink-dim">{s.is_home ? "vs" : "@"}</span>
                      <span className="num font-semibold ml-1">{s.opp}</span>
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
