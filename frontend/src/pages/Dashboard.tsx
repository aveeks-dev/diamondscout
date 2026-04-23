import { useEffect, useState } from "react";
import { fetchToday, triggerRefresh, type DailyPayload } from "../api";
import PitcherCard from "../components/PitcherCard";

export default function Dashboard() {
  const [data, setData] = useState<DailyPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(forceRefresh = false) {
    setLoading(!data);
    setErr(null);
    try {
      if (forceRefresh) {
        setRefreshing(true);
        await triggerRefresh();
      }
      const d = await fetchToday();
      setData(d);
    } catch (e: any) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <Spinner msg="Loading today's starters…" />;
  if (err) return <ErrorBox msg={err} />;
  if (!data) return null;

  const byTier: Record<string, typeof data.starters> = { S: [], A: [], B: [], C: [], D: [], F: [] };
  for (const s of data.starters) byTier[s.tier]?.push(s);
  const tierOrder: Array<"S" | "A" | "B" | "C" | "D" | "F"> = ["S", "A", "B", "C", "D", "F"];
  const sleepers = data.sleepers ?? [];

  return (
    <div className="space-y-10 pb-20">
      <section className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="font-display text-5xl tracking-wide">Today's Board</div>
          <div className="text-field-mute text-sm mt-1">
            {new Date(data.date).toLocaleDateString(undefined, {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
            })} · {data.games_count} games · {data.starters.length} probable starters
          </div>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg bg-field-panel border border-field-line text-sm hover:border-diamond-gold transition-colors disabled:opacity-50"
        >
          {refreshing ? "Refreshing…" : "Refresh data"}
        </button>
      </section>

      {/* Tier distribution strip */}
      <section className="card p-4 flex items-center justify-between flex-wrap gap-3">
        {tierOrder.map((t) => (
          <TierPip key={t} letter={t} count={byTier[t].length} />
        ))}
      </section>

      {sleepers.length > 0 && (
        <section>
          <SectionTitle
            title="Sleepers & Streamers"
            sub="Low-rostered arms worth a look today"
            accent
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sleepers.map((s) => (
              <PitcherCard key={s.pitcher.id} s={s} />
            ))}
          </div>
        </section>
      )}

      {tierOrder.map((t) =>
        byTier[t].length === 0 ? null : (
          <section key={t}>
            <SectionTitle
              title={`${t}-Tier · ${byTier[t][0].tier_meta.name}`}
              sub={byTier[t][0].tier_meta.desc}
              color={byTier[t][0].tier_meta.color}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {byTier[t].map((s) => (
                <PitcherCard key={s.pitcher.id} s={s} />
              ))}
            </div>
          </section>
        )
      )}
    </div>
  );
}

function TierPip({ letter, count }: { letter: string; count: number }) {
  const colors: Record<string, string> = {
    S: "#f5c46b", A: "#3fd17a", B: "#4aa3ff", C: "#c7b56a", D: "#e08c4e", F: "#e04e4e",
  };
  const c = colors[letter];
  return (
    <div className="flex items-center gap-2">
      <span
        className="font-display text-2xl w-9 h-9 flex items-center justify-center rounded-md"
        style={{ color: c, background: `${c}15`, border: `1px solid ${c}55` }}
      >
        {letter}
      </span>
      <span className="text-field-mute text-sm tabular-nums">
        <span className="text-field-chalk font-semibold">{count}</span> {count === 1 ? "pitcher" : "pitchers"}
      </span>
    </div>
  );
}

function SectionTitle({ title, sub, accent, color }: { title: string; sub?: string; accent?: boolean; color?: string }) {
  return (
    <div className="mb-4">
      <div
        className={`font-display text-3xl tracking-wide ${accent ? "text-diamond-gold" : ""}`}
        style={color && !accent ? { color } : undefined}
      >
        {title}
      </div>
      {sub && <div className="text-field-mute text-sm">{sub}</div>}
    </div>
  );
}

function Spinner({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center py-20 text-field-mute gap-3">
      <span className="inline-block w-4 h-4 border-2 border-diamond-gold border-t-transparent rounded-full animate-spin" />
      {msg}
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="card p-6 text-diamond-red border-diamond-red/40">
      <div className="font-display text-2xl">Something broke</div>
      <div className="text-sm mt-1 text-field-mute">{msg}</div>
    </div>
  );
}
