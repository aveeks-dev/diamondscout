import { useEffect, useState } from "react";
import { fetchSleepers, type Starter } from "../api";
import PitcherCard from "../components/PitcherCard";

export default function Streamers() {
  const [rows, setRows] = useState<Starter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSleepers().then((d) => {
      setRows(d.rows);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <div className="eyebrow">Loading streamers</div>
      </div>
    );
  }

  const gems = rows.filter((r) => r.sleeper?.tier === "premium");
  const streams = rows.filter((r) => r.sleeper?.tier === "basic");

  return (
    <div className="space-y-10 pb-16">
      <header className="border-b border-ink-line pb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="eyebrow mb-1">Under 40% rostered</div>
          <h1 className="display text-[44px] leading-none">Streaming Board</h1>
          <p className="text-sm text-ink-dim mt-3 max-w-2xl">
            Starters available on most waivers today. <span className="text-accent">Hidden Gems</span> have
            a matchup score of 65 or better. <span className="text-tier-B">Streamers</span> are the
            fallback: low ownership without the same projection upside.
          </p>
        </div>
        <div className="flex items-baseline gap-6">
          <div className="text-right">
            <div className="num display text-[40px] leading-none text-accent">{gems.length}</div>
            <div className="eyebrow mt-1">Hidden Gems</div>
          </div>
          <div className="text-right">
            <div className="num display text-[40px] leading-none text-tier-B">{streams.length}</div>
            <div className="eyebrow mt-1">Streamers</div>
          </div>
        </div>
      </header>

      {gems.length > 0 && (
        <section>
          <div className="flex items-baseline gap-4 mb-6 pb-3 border-b border-ink-line">
            <span className="eyebrow text-accent">Premium</span>
            <h2 className="display text-[28px] leading-none">Hidden Gems</h2>
            <span className="text-xs text-ink-dim ml-auto">&lt; 40% rostered · score ≥ 65</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {gems.map((s) => <PitcherCard key={s.pitcher.id} s={s} />)}
          </div>
        </section>
      )}

      {streams.length > 0 && (
        <section>
          <div className="flex items-baseline gap-4 mb-6 pb-3 border-b border-ink-line">
            <span className="eyebrow text-tier-B">Basic</span>
            <h2 className="display text-[28px] leading-none">Streamers</h2>
            <span className="text-xs text-ink-dim ml-auto">&lt; 40% rostered · decent board</span>
          </div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {streams.map((s) => <PitcherCard key={s.pitcher.id} s={s} />)}
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div className="panel p-10 text-center">
          <div className="display text-xl">No streamers today</div>
          <div className="text-sm text-ink-dim mt-2">
            No low-rostered starter has a viable matchup. Check back tomorrow.
          </div>
        </div>
      )}
    </div>
  );
}
