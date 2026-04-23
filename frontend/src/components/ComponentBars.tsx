type Props = {
  components: {
    pitcher_skill: number;
    opponent: number;
    recent_form: number;
    environment: number;
  };
};

const LABELS: Array<[keyof Props["components"], string]> = [
  ["pitcher_skill", "Pitcher skill"],
  ["opponent", "Opponent"],
  ["recent_form", "Recent form"],
  ["environment", "Park / home"],
];

function color(score: number): string {
  if (score >= 72) return "bg-diamond-green";
  if (score >= 54) return "bg-diamond-blue";
  if (score >= 42) return "bg-diamond-gold";
  return "bg-diamond-red";
}

export default function ComponentBars({ components }: Props) {
  return (
    <div className="space-y-2">
      {LABELS.map(([k, label]) => {
        const v = components[k];
        return (
          <div key={k}>
            <div className="flex justify-between text-[11px] text-field-mute">
              <span>{label}</span>
              <span className="tabular-nums">{v.toFixed(0)}</span>
            </div>
            <div className="h-1.5 bg-field-line rounded-full overflow-hidden">
              <div
                className={`h-full ${color(v)}`}
                style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
