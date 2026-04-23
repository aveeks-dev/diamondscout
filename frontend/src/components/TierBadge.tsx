import type { Tier, TierMeta } from "../api";

type Props = {
  tier: TierMeta;
  score: number;
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: { letter: "text-xl",   label: "text-2xs", score: "text-2xs" },
  md: { letter: "text-4xl",  label: "text-2xs", score: "text-xs"  },
  lg: { letter: "text-7xl",  label: "text-xs",  score: "text-sm"  },
};

/**
 * Tier display. Deliberately flat: serif letter, thin color bar, quiet
 * archetype label below. No gradients, no glow, no box background. The
 * letter and the score carry the weight.
 */
export default function TierBadge({ tier, score, size = "md" }: Props) {
  const s = SIZES[size];
  return (
    <div className="shrink-0 text-right">
      <div className={`tier-letter ${s.letter} leading-none`} style={{ color: tier.color }}>
        {tier.label}
      </div>
      <div
        className="h-[2px] w-full mt-1 mb-1.5"
        style={{ background: tier.color, opacity: 0.55 }}
      />
      <div className={`${s.label} tracking-[0.14em] uppercase text-ink-dim`}>
        {tier.name}
      </div>
      <div className={`${s.score} num text-ink-faint mt-0.5`}>
        {score.toFixed(0)}
      </div>
    </div>
  );
}

/** Compact inline tier cell for tables. */
export function TierInline({ tier, score }: { tier: Tier | string; score: number }) {
  const colors: Record<string, string> = {
    S: "#c89c4c", A: "#7ba974", B: "#7d95b5", C: "#a69168", D: "#b07d5c", F: "#a96560",
  };
  const c = colors[tier] || "#9b9a94";
  return (
    <span className="inline-flex items-baseline gap-2">
      <span className="tier-letter text-xl leading-none" style={{ color: c }}>{tier}</span>
      <span className="num text-2xs text-ink-faint">{score.toFixed(0)}</span>
    </span>
  );
}
