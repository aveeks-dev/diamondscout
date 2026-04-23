type Props = {
  components: {
    pitcher_skill: number;
    opponent: number;
    recent_form: number;
    environment: number;
  };
};

const LABELS: Array<[keyof Props["components"], string]> = [
  ["pitcher_skill", "Pitcher"],
  ["opponent", "Opponent"],
  ["recent_form", "Form"],
  ["environment", "Env"],
];

function color(score: number): string {
  if (score >= 72) return "#7ba974";
  if (score >= 54) return "#7d95b5";
  if (score >= 42) return "#c89c4c";
  return "#c87670";
}

export default function ComponentBars({ components }: Props) {
  return (
    <div className="grid grid-cols-2 gap-x-5 gap-y-2">
      {LABELS.map(([k, label]) => {
        const v = components[k];
        return (
          <div key={k} className="flex items-center gap-2">
            <span className="eyebrow w-16 shrink-0">{label}</span>
            <div className="h-[3px] flex-1 bg-ink-line rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: color(v) }}
              />
            </div>
            <span className="num text-2xs text-ink-dim w-6 text-right">{v.toFixed(0)}</span>
          </div>
        );
      })}
    </div>
  );
}
