import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTrends, type Starter } from "../api";
import { TierInline } from "../components/TierBadge";

export default function Trends() {
  const [rising, setRising] = useState<Starter[]>([]);
  const [falling, setFalling] = useState<Starter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrends().then((d) => {
      setRising(d.rising);
      setFalling(d.falling);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <div className="eyebrow">Loading trends</div>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      <header className="border-b border-ink-line pb-6">
        <div className="eyebrow mb-1">Week over week</div>
        <h1 className="display text-[44px] leading-none">Roster Trends</h1>
        <p className="text-sm text-ink-dim mt-3 max-w-2xl">
          Biggest week over week changes in ESPN ownership among today's starters.
          Risers are getting added on waivers. Fallers are being dropped.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <TrendTable title="Risers" color="#7ba974" direction="up" rows={rising} />
        <TrendTable title="Fallers" color="#c87670" direction="down" rows={falling} />
      </div>
    </div>
  );
}

function TrendTable({
  title, color, direction, rows,
}: { title: string; color: string; direction: "up" | "down"; rows: Starter[] }) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-4 pb-2 border-b border-ink-line">
        <span className="eyebrow" style={{ color }}>{direction === "up" ? "Gaining" : "Losing"}</span>
        <h2 className="display text-[24px] leading-none">{title}</h2>
      </div>
      <div className="panel overflow-hidden">
        <table className="data">
          <thead>
            <tr>
              <th>Pitcher</th>
              <th className="num">Owned</th>
              <th className="num">Δ</th>
              <th>Today</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const own = s.ownership.percent_owned ?? 0;
              const chg = s.ownership.percent_change ?? 0;
              return (
                <tr key={s.pitcher.id}>
                  <td>
                    <Link to={`/pitcher/${s.pitcher.id}`} className="hover:text-accent transition-colors">
                      {s.pitcher.name}
                    </Link>
                    <span className="ml-2 num text-2xs text-ink-faint">
                      {s.pitcher.team_abbr} vs {s.opponent.team_abbr}
                    </span>
                  </td>
                  <td className="num">{own.toFixed(0)}%</td>
                  <td
                    className="num"
                    style={{ color: chg > 0 ? "#7ba974" : chg < 0 ? "#c87670" : "#6e6c65" }}
                  >
                    {chg > 0 ? "+" : ""}{chg.toFixed(1)}
                  </td>
                  <td><TierInline tier={s.tier} score={s.score} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="py-6 text-center text-ink-dim text-sm">No data</div>
        )}
      </div>
    </section>
  );
}
