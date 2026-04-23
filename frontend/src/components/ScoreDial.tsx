type Props = { score: number; grade: string; size?: number };

function colorForScore(score: number): string {
  if (score >= 72) return "#3fd17a";
  if (score >= 54) return "#4aa3ff";
  if (score >= 42) return "#f5c46b";
  return "#e04e4e";
}

export default function ScoreDial({ score, grade, size = 96 }: Props) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = colorForScore(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1a3152" strokeWidth={6} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <div className="font-display text-3xl" style={{ color }}>{grade}</div>
        <div className="text-[10px] tracking-widest text-field-mute mt-0.5">
          {score.toFixed(0)}
        </div>
      </div>
    </div>
  );
}
