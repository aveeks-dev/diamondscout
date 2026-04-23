import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchToday, type Starter } from "../api";

type SortKey = "score" | "era" | "whip" | "k9" | "owned";
type SortDir = "asc" | "desc";

export default function Rankings() {
  const [rows, setRows] = useState<Starter[]>([]);
  const [loading, setLoading] = useState(true);
  const [throws, setThrows] = useState<"" | "L" | "R">("");
  const [sleepersOnly, setSleepersOnly] = useState(false);
  const [ownedMax, setOwnedMax] = useState<number | "">("");
  const [sort, setSort] = useState<SortKey>("score");
  const [dir, setDir] = useState<SortDir>("desc");

  useEffect(() => {
    fetchToday().then((d) => {
      setRows(d.starters);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (throws) r = r.filter((s) => s.pitcher.throws === throws);
    if (sleepersOnly) r = r.filter((s) => s.sleeper);
    if (ownedMax !== "") {
      const mx = Number(ownedMax);
      r = r.filter((s) => (s.ownership.percent_owned ?? 100) <= mx);
    }
    const get = (s: Starter): number => {
      switch (sort) {
        case "era":   return Number(s.season_stats.era ?? 99);
        case "whip":  return Number(s.season_stats.whip ?? 9);
        case "k9":    return Number(s.season_stats.so9 ?? 0);
        case "owned": return s.ownership.percent_owned ?? 0;
        default:      return s.score;
      }
    };
    r = [...r].sort((a, b) => (dir === "desc" ? get(b) - get(a) : get(a) - get(b)));
    return r;
  }, [rows, throws, sleepersOnly, ownedMax, sort, dir]);

  if (loading) {
    return <div className="text-field-mute py-20 text-center">Loading rankings…</div>;
  }

  const toggle = (k: SortKey) => {
    if (sort === k) setDir(dir === "desc" ? "asc" : "desc");
    else { setSort(k); setDir(k === "score" || k === "k9" ? "desc" : "asc"); }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="font-display text-4xl tracking-wide">Daily Rankings</div>
        <div className="flex items-center gap-2 flex-wrap text-sm">
          <select
            value={throws}
            onChange={(e) => setThrows(e.target.value as any)}
            className="bg-field-panel border border-field-line rounded-md px-2 py-1"
          >
            <option value="">All hands</option>
            <option value="R">RHP only</option>
            <option value="L">LHP only</option>
          </select>
          <select
            value={ownedMax}
            onChange={(e) => setOwnedMax(e.target.value === "" ? "" : Number(e.target.value))}
            className="bg-field-panel border border-field-line rounded-md px-2 py-1"
          >
            <option value="">Any ownership</option>
            <option value="40">≤ 40% owned</option>
            <option value="25">≤ 25% owned</option>
            <option value="10">≤ 10% owned</option>
            <option value="5">≤ 5% owned</option>
          </select>
          <label className="flex items-center gap-1.5 px-2 py-1 border border-field-line rounded-md">
            <input
              type="checkbox"
              checked={sleepersOnly}
              onChange={(e) => setSleepersOnly(e.target.checked)}
            />
            Sleepers only
          </label>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-field-line/40">
            <tr className="text-left text-field-mute">
              <Th>#</Th>
              <ThSort active={sort === "score"} dir={dir} onClick={() => toggle("score")}>Tier</ThSort>
              <Th>Pitcher</Th>
              <Th>vs</Th>
              <Th>Park</Th>
              <ThSort active={sort === "owned"} dir={dir} onClick={() => toggle("owned")}>Rostered</ThSort>
              <ThSort active={sort === "era"}   dir={dir} onClick={() => toggle("era")}>ERA</ThSort>
              <ThSort active={sort === "whip"}  dir={dir} onClick={() => toggle("whip")}>WHIP</ThSort>
              <ThSort active={sort === "k9"}    dir={dir} onClick={() => toggle("k9")}>K/9</ThSort>
              <Th>Tag</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.pitcher.id} className="border-t border-field-line/60 hover:bg-field-line/20">
                <td className="px-3 py-2 text-field-mute tabular-nums">{i + 1}</td>
                <td className="px-3 py-2">
                  <TierCell color={s.tier_meta.color} letter={s.tier_meta.label} score={s.score} />
                </td>
                <td className="px-3 py-2">
                  <Link className="hover:text-diamond-gold font-medium" to={`/pitcher/${s.pitcher.id}`}>
                    {s.pitcher.name}
                  </Link>
                  <span className="ml-2 text-xs text-field-mute">
                    {s.pitcher.team_abbr} · {s.pitcher.throws}HP
                  </span>
                </td>
                <td className="px-3 py-2 text-field-mute">{s.opponent.team_abbr}</td>
                <td className="px-3 py-2 text-field-mute">{s.park.name}</td>
                <td className="px-3 py-2"><OwnedCell pct={s.ownership.percent_owned} chg={s.ownership.percent_change} /></td>
                <td className="px-3 py-2 tabular-nums">{s.season_stats.era ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums">{s.season_stats.whip ?? "—"}</td>
                <td className="px-3 py-2 tabular-nums">{s.season_stats.so9 ?? "—"}</td>
                <td className="px-3 py-2">
                  {s.sleeper ? (
                    <span
                      className={`pill border ${
                        s.sleeper.tier === "premium"
                          ? "bg-diamond-gold/15 text-diamond-gold border-diamond-gold/40"
                          : "bg-diamond-blue/15 text-diamond-blue border-diamond-blue/40"
                      }`}
                    >
                      {s.sleeper.tag}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-field-mute">No starters match that filter.</div>
        )}
      </div>
    </div>
  );
}

function TierCell({ color, letter, score }: { color: string; letter: string; score: number }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="font-display text-2xl w-8 h-8 flex items-center justify-center rounded"
        style={{
          color,
          background: `${color}15`,
          border: `1px solid ${color}50`,
          boxShadow: letter === "S" ? `0 0 8px ${color}80` : undefined,
        }}
      >
        {letter}
      </span>
      <span className="text-field-mute text-xs tabular-nums">{score.toFixed(0)}</span>
    </div>
  );
}

function OwnedCell({ pct, chg }: { pct: number | null; chg: number | null }) {
  if (pct === null) return <span className="text-field-mute">—</span>;
  let color = "#8aa3c2";
  if (pct < 10) color = "#f5c46b";
  else if (pct < 40) color = "#4aa3ff";
  return (
    <span>
      <span style={{ color }} className="font-medium tabular-nums">{pct.toFixed(0)}%</span>
      {chg !== null && chg !== 0 && (
        <span
          className="ml-1 text-xs tabular-nums"
          style={{ color: chg > 0 ? "#3fd17a" : "#e04e4e" }}
        >
          {chg > 0 ? "▲" : "▼"}{Math.abs(chg).toFixed(1)}
        </span>
      )}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-2 font-medium text-xs uppercase tracking-wider">{children}</th>;
}

function ThSort({
  children, active, dir, onClick,
}: { children: React.ReactNode; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2 font-medium text-xs uppercase tracking-wider cursor-pointer select-none ${
        active ? "text-diamond-gold" : ""
      }`}
    >
      {children} {active ? (dir === "desc" ? "↓" : "↑") : ""}
    </th>
  );
}
