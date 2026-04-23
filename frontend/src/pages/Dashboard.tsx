import { useEffect, useState } from "react";
import { fetchToday, triggerRefresh, type DailyPayload, type Starter } from "../api";
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

  if (loading) return <LoadingState />;
  if (err) return <ErrorBox msg={err} />;
  if (!data) return null;

  const byTier: Record<string, Starter[]> = { S: [], A: [], B: [], C: [], D: [], F: [] };
  for (const s of data.starters) byTier[s.tier]?.push(s);
  const tierOrder: Array<"S" | "A" | "B" | "C" | "D" | "F"> = ["S", "A", "B", "C", "D", "F"];
  const sleepers = data.sleepers ?? [];

  const slateDate = new Date(data.date).toLocaleDateString(undefined, {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="space-y-12 pb-16">
      {/* Masthead */}
      <section className="border-b border-ink-line pb-8">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <div className="eyebrow mb-2">Daily slate</div>
            <h1 className="display text-[52px] leading-none tracking-tight">
              Today's Board
            </h1>
            <div className="text-sm text-ink-dim mt-3">{slateDate}</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="num display text-[40px] leading-none">{data.starters.length}</div>
              <div className="eyebrow mt-1">Probable starters</div>
            </div>
            <div className="text-right">
              <div className="num display text-[40px] leading-none">{data.games_count}</div>
              <div className="eyebrow mt-1">Games</div>
            </div>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="self-end text-xs text-ink-dim hover:text-ink-text tracking-wider uppercase transition-colors px-3 py-2 border border-ink-line hover:border-accent disabled:opacity-50"
            >
              {refreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Tier distribution strip */}
        <div className="mt-8 flex items-center gap-6 text-sm flex-wrap">
          <span className="eyebrow">Distribution</span>
          {tierOrder.map((t) => (
            <TierPip key={t} letter={t} count={byTier[t].length} color={byTier[t][0]?.tier_meta.color} />
          ))}
        </div>
      </section>

      {sleepers.length > 0 && (
        <section>
          <SectionHead
            overline="Under 40% rostered"
            title="Sleepers"
            sub="Hidden gems and streaming options worth a look"
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sleepers.map((s) => <PitcherCard key={s.pitcher.id} s={s} />)}
          </div>
        </section>
      )}

      {tierOrder.map((t) =>
        byTier[t].length === 0 ? null : (
          <section key={t}>
            <SectionHead
              overline={`${t}-Tier`}
              title={byTier[t][0].tier_meta.name}
              sub={byTier[t][0].tier_meta.desc}
              accent={byTier[t][0].tier_meta.color}
            />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {byTier[t].map((s) => <PitcherCard key={s.pitcher.id} s={s} />)}
            </div>
          </section>
        )
      )}
    </div>
  );
}

function SectionHead({
  overline, title, sub, accent,
}: { overline: string; title: string; sub?: string; accent?: string }) {
  return (
    <div className="flex items-baseline gap-4 mb-6 pb-3 border-b border-ink-line">
      <span
        className="eyebrow"
        style={accent ? { color: accent } : undefined}
      >
        {overline}
      </span>
      <h2 className="display text-[28px] leading-none">{title}</h2>
      {sub && <span className="text-xs text-ink-dim ml-auto">{sub}</span>}
    </div>
  );
}

function TierPip({ letter, count, color }: { letter: string; count: number; color?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className="display text-base leading-none"
        style={{ color: color || "#9b9a94" }}
      >
        {letter}
      </span>
      <span className="num text-sm text-ink-text/80">{count}</span>
    </span>
  );
}

function LoadingState() {
  return (
    <div className="py-24 flex flex-col items-center gap-3">
      <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      <div className="eyebrow">Loading today's slate</div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="panel p-6 border-neg/40">
      <div className="display text-2xl text-neg">Failed to load</div>
      <div className="text-sm text-ink-dim mt-1">{msg}</div>
    </div>
  );
}
