import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchToday, type Starter } from "../api";
import WeatherChip from "../components/WeatherChip";
import { TierInline } from "../components/TierBadge";

type SortKey = "score" | "era" | "whip" | "k9" | "owned";
type SortDir = "asc" | "desc";

export default function Rankings() {
  const [rows, setRows] = useState<Starter[]>([]);
  const [loading, setLoading] = useState(true);
  const [throws, setThrows] = useState<"" | "L" | "R">("");
  const [sleepersOnly, setSleepersOnly] = useState(false);
  const [ownedMax, setOwnedMax] = useState<number | "">("");
  const [query, setQuery] = useState("");
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
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter((s) =>
        s.pitcher.name.toLowerCase().includes(q) ||
        s.pitcher.team_abbr.toLowerCase().includes(q) ||
        s.opponent.team_abbr.toLowerCase().includes(q)
      );
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
    return [...r].sort((a, b) => (dir === "desc" ? get(b) - get(a) : get(a) - get(b)));
  }, [rows, throws, sleepersOnly, ownedMax, query, sort, dir]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <div className="eyebrow">Loading rankings</div>
      </div>
    );
  }

  const toggle = (k: SortKey) => {
    if (sort === k) setDir(dir === "desc" ? "asc" : "desc");
    else { setSort(k); setDir(k === "score" || k === "k9" ? "desc" : "asc"); }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-end justify-between flex-wrap gap-4 pb-4 border-b border-ink-line">
        <div>
          <div className="eyebrow mb-1">Daily</div>
          <h1 className="display text-[44px] leading-none">Rankings</h1>
          <div className="text-sm text-ink-dim mt-2">
            Every probable starter on the slate, sortable and filterable.
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            placeholder="Search pitcher or team"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-ink-panel border border-ink-line px-3 py-2 text-sm w-56 placeholder:text-ink-faint"
          />
          <Select value={throws} onChange={(v) => setThrows(v as any)}>
            <option value="">All hands</option>
            <option value="R">RHP</option>
            <option value="L">LHP</option>
          </Select>
          <Select
            value={ownedMax === "" ? "" : String(ownedMax)}
            onChange={(v) => setOwnedMax(v === "" ? "" : Number(v))}
          >
            <option value="">Any ownership</option>
            <option value="40">≤ 40%</option>
            <option value="25">≤ 25%</option>
            <option value="10">≤ 10%</option>
            <option value="5">≤ 5%</option>
          </Select>
          <label className="flex items-center gap-2 text-xs text-ink-dim px-3 py-2 border border-ink-line">
            <input
              type="checkbox"
              checked={sleepersOnly}
              onChange={(e) => setSleepersOnly(e.target.checked)}
              className="accent-accent"
            />
            Sleepers only
          </label>
        </div>
      </div>

      <div className="overflow-x-auto panel">
        <table className="data">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th>Tier</th>
              <th>Pitcher</th>
              <th>Opp</th>
              <th>Weather</th>
              <th className="num cursor-pointer select-none" onClick={() => toggle("owned")}>
                Rostered {sort === "owned" && (dir === "desc" ? "↓" : "↑")}
              </th>
              <th className="num cursor-pointer select-none" onClick={() => toggle("era")}>
                ERA {sort === "era" && (dir === "desc" ? "↓" : "↑")}
              </th>
              <th className="num cursor-pointer select-none" onClick={() => toggle("whip")}>
                WHIP {sort === "whip" && (dir === "desc" ? "↓" : "↑")}
              </th>
              <th className="num cursor-pointer select-none" onClick={() => toggle("k9")}>
                K/9 {sort === "k9" && (dir === "desc" ? "↓" : "↑")}
              </th>
              <th>Tag</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.pitcher.id}>
                <td className="num text-ink-faint">{i + 1}</td>
                <td><TierInline tier={s.tier} score={s.score} /></td>
                <td>
                  <Link
                    to={`/pitcher/${s.pitcher.id}`}
                    className="hover:text-accent transition-colors"
                  >
                    {s.pitcher.name}
                  </Link>
                  <span className="ml-2 num text-2xs text-ink-faint">
                    {s.pitcher.team_abbr} · {s.pitcher.throws}HP
                  </span>
                </td>
                <td className="num text-ink-dim">{s.opponent.team_abbr}</td>
                <td><WeatherChip weather={s.weather} /></td>
                <td className="num"><OwnedCell pct={s.ownership.percent_owned} chg={s.ownership.percent_change} /></td>
                <td className="num">{s.season_stats.era ?? "—"}</td>
                <td className="num">{s.season_stats.whip ?? "—"}</td>
                <td className="num">{s.season_stats.so9 ?? "—"}</td>
                <td className="text-2xs tracking-wider uppercase">
                  {s.sleeper && (
                    <span style={{ color: s.sleeper.tier === "premium" ? "#c89c4c" : "#7d95b5" }}>
                      {s.sleeper.tag}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-8 text-center text-ink-dim text-sm">No starters match.</div>
        )}
      </div>
    </div>
  );
}

function Select({
  value, onChange, children,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-ink-panel border border-ink-line px-2.5 py-2 text-sm text-ink-text"
    >
      {children}
    </select>
  );
}

function OwnedCell({ pct, chg }: { pct: number | null; chg: number | null }) {
  if (pct === null) return <span className="text-ink-faint">—</span>;
  return (
    <span>
      <span className="text-ink-text">{pct.toFixed(0)}%</span>
      {chg !== null && chg !== 0 && (
        <span
          className="ml-1.5 text-2xs"
          style={{ color: chg > 0 ? "#7ba974" : "#c87670" }}
        >
          {chg > 0 ? "↑" : "↓"}{Math.abs(chg).toFixed(1)}
        </span>
      )}
    </span>
  );
}
