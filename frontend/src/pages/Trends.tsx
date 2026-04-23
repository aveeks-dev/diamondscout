import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTrends, type Starter } from "../api";

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
    return <div className="py-20 text-center text-field-mute">Loading trends…</div>;
  }

  return (
    <div className="space-y-8 pb-20">
      <div>
        <div className="font-display text-4xl tracking-wide">Roster Trends</div>
        <div className="text-field-mute text-sm mt-1 max-w-2xl">
          Week-over-week change in ESPN ownership for today's starters. <strong className="text-diamond-green">Risers</strong> are
          getting added on waivers — there's a reason. <strong className="text-diamond-red">Fallers</strong> are
          being dropped; check if the slide is justified.
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TrendTable title="Risers" rows={rising} direction="up" />
        <TrendTable title="Fallers" rows={falling} direction="down" />
      </div>
    </div>
  );
}

function TrendTable({
  title, rows, direction,
}: { title: string; rows: Starter[]; direction: "up" | "down" }) {
  const color = direction === "up" ? "text-diamond-green" : "text-diamond-red";
  const arrow = direction === "up" ? "▲" : "▼";
  return (
    <div className="card overflow-hidden">
      <div className={`px-5 py-3 border-b border-field-line/60 font-display text-2xl tracking-wide ${color}`}>
        {arrow} {title}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-field-mute text-xs uppercase tracking-wider">
            <th className="px-4 py-2">Pitcher</th>
            <th className="px-2 py-2">Owned</th>
            <th className="px-2 py-2">Δ Week</th>
            <th className="px-2 py-2">Today</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const own = s.ownership.percent_owned ?? 0;
            const chg = s.ownership.percent_change ?? 0;
            return (
              <tr key={s.pitcher.id} className="border-t border-field-line/60 hover:bg-field-line/20">
                <td className="px-4 py-2">
                  <Link to={`/pitcher/${s.pitcher.id}`} className="hover:text-diamond-gold">
                    {s.pitcher.name}
                  </Link>
                  <span className="ml-2 text-xs text-field-mute">
                    {s.pitcher.team_abbr} vs {s.opponent.team_abbr}
                  </span>
                </td>
                <td className="px-2 py-2 tabular-nums">{own.toFixed(0)}%</td>
                <td className={`px-2 py-2 tabular-nums ${chg > 0 ? "text-diamond-green" : chg < 0 ? "text-diamond-red" : "text-field-mute"}`}>
                  {chg > 0 ? "+" : ""}{chg.toFixed(1)}
                </td>
                <td className="px-2 py-2 font-display text-lg">
                  <span style={{ color: s.tier_meta.color }}>{s.tier}</span>
                  <span className="text-field-mute text-xs ml-1 tabular-nums">{s.score.toFixed(0)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="py-6 text-center text-field-mute text-sm">No data.</div>
      )}
    </div>
  );
}
