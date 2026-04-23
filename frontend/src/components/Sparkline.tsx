type Props = {
  values: Array<number | null | undefined>;
  width?: number;
  height?: number;
  invert?: boolean;  // true for ERA-like stats where lower is better
};

/**
 * Minimal sparkline. Renders a thin polyline of the provided values with a
 * baseline reference, no axis, no labels. Deliberate: a sparkline's job is
 * to show shape, not precise values. The invert flag flips the good/bad
 * color direction for stats like ERA where lower is better.
 */
export default function Sparkline({ values, width = 80, height = 22, invert = true }: Props) {
  const nums = values
    .map((v) => (v === null || v === undefined ? NaN : Number(v)))
    .filter((v) => Number.isFinite(v)) as number[];

  if (nums.length < 2) {
    return <div className="h-[22px] w-20 text-ink-faint text-2xs tracking-wider">—</div>;
  }

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;

  const step = width / (nums.length - 1);
  const pts = nums.map((v, i) => {
    const x = i * step;
    // For inverted stats (ERA), lower values should trend up visually
    const normalized = invert ? (max - v) / range : (v - min) / range;
    const y = height - normalized * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Direction of the most recent move
  const last = nums[nums.length - 1];
  const prev = nums[nums.length - 2];
  const recentGood = invert ? last < prev : last > prev;
  const stroke = recentGood ? "#7ba974" : "#c87670";

  return (
    <svg width={width} height={height} className="block">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* end cap */}
      <circle
        cx={(nums.length - 1) * step}
        cy={height - (invert ? (max - last) / range : (last - min) / range) * (height - 2) - 1}
        r={1.75}
        fill={stroke}
      />
    </svg>
  );
}
