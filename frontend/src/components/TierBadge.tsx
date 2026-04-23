import type { TierMeta } from "../api";

type Props = {
  tier: TierMeta;
  score: number;
  size?: "sm" | "md" | "lg";
};

// S-tier gets an extra glow to feel genuinely premium.
const GLOW: Record<string, string> = {
  S: "0 0 18px rgba(245,196,107,0.45), inset 0 0 10px rgba(245,196,107,0.15)",
  A: "0 0 10px rgba(63,209,122,0.25)",
  B: "",
  C: "",
  D: "",
  F: "",
};

const SIZES = {
  sm: { box: 56,  letter: "text-2xl",  name: "text-[9px]",  score: "text-[10px]" },
  md: { box: 88,  letter: "text-5xl",  name: "text-[10px]", score: "text-xs"   },
  lg: { box: 128, letter: "text-7xl",  name: "text-xs",     score: "text-sm"   },
};

export default function TierBadge({ tier, score, size = "md" }: Props) {
  const s = SIZES[size];
  const glow = GLOW[tier.label] || "";
  return (
    <div
      className="relative shrink-0 rounded-xl flex flex-col items-center justify-center"
      style={{
        width: s.box,
        height: s.box,
        background: `linear-gradient(160deg, ${tier.color}22 0%, ${tier.color}08 100%)`,
        border: `1.5px solid ${tier.color}80`,
        boxShadow: glow,
      }}
    >
      <div
        className={`font-display ${s.letter} leading-none`}
        style={{ color: tier.color, textShadow: tier.label === "S" ? `0 0 12px ${tier.color}` : undefined }}
      >
        {tier.label}
      </div>
      <div className={`${s.name} uppercase tracking-[0.15em] mt-0.5`} style={{ color: tier.color }}>
        {tier.name}
      </div>
      <div className={`${s.score} text-field-mute tabular-nums mt-0.5`}>
        {score.toFixed(0)}
      </div>
    </div>
  );
}
