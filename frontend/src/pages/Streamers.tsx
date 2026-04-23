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
    return <div className="py-20 text-center text-field-mute">Loading streamers…</div>;
  }

  const gems = rows.filter((r) => r.sleeper?.tier === "premium");
  const streams = rows.filter((r) => r.sleeper?.tier === "basic");

  return (
    <div className="space-y-10 pb-20">
      <div>
        <div className="font-display text-4xl tracking-wide">Streaming Board</div>
        <div className="text-field-mute text-sm mt-1 max-w-2xl">
          Every starter below 40% rostered on ESPN. <strong className="text-diamond-gold">Hidden Gems</strong> are
          the premium picks — low ownership <em>and</em> a plus matchup score of 65+.{" "}
          <strong className="text-diamond-blue">Streamers</strong> are the fallback: available on waivers but without
          as much projection upside.
        </div>
      </div>

      {gems.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <div className="font-display text-3xl text-diamond-gold tracking-wide">◆ Hidden Gems</div>
            <div className="text-xs text-field-mute uppercase tracking-widest">
              &lt;40% rostered · score ≥ 65
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {gems.map((s) => <PitcherCard key={s.pitcher.id} s={s} />)}
          </div>
        </section>
      )}

      {streams.length > 0 && (
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <div className="font-display text-3xl text-diamond-blue tracking-wide">◇ Streamers</div>
            <div className="text-xs text-field-mute uppercase tracking-widest">
              &lt;40% rostered · decent board
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {streams.map((s) => <PitcherCard key={s.pitcher.id} s={s} />)}
          </div>
        </section>
      )}

      {rows.length === 0 && (
        <div className="card p-8 text-center text-field-mute">
          No low-rostered starters with a viable matchup today. Check back tomorrow.
        </div>
      )}
    </div>
  );
}
