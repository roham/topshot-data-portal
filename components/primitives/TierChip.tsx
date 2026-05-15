import { cn } from "@/lib/cn";

const TIER_LABEL: Record<string, string> = {
  MOMENT_TIER_COMMON: "Common",
  MOMENT_TIER_FANDOM: "Fandom",
  MOMENT_TIER_RARE: "Rare",
  MOMENT_TIER_LEGENDARY: "Legendary",
  MOMENT_TIER_ULTIMATE: "Ultimate",
};

const TIER_COLOR: Record<string, string> = {
  MOMENT_TIER_COMMON: "var(--tier-common)",
  MOMENT_TIER_FANDOM: "var(--tier-fandom)",
  MOMENT_TIER_RARE: "var(--tier-rare)",
  MOMENT_TIER_LEGENDARY: "var(--tier-legendary)",
  MOMENT_TIER_ULTIMATE: "var(--tier-ultimate)",
};

interface TierChipProps {
  tier: string | null | undefined;
  className?: string;
}

// Per design/00 §2.7: tier shown as a chip — 1px border at 40% alpha,
// text in full tier color, var(--surface-1) fill. Always paired with
// the tier name (non-color disambiguator).
export function TierChip({ tier, className }: TierChipProps) {
  if (!tier) return null;
  const label = TIER_LABEL[tier] ?? tier;
  const color = TIER_COLOR[tier] ?? "var(--text-dim)";
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] tracking-data-label font-mono",
        className,
      )}
      style={{ color, borderColor: color, borderWidth: 1, opacity: 0.95, backgroundColor: "var(--surface-1)" }}
    >
      {label}
    </span>
  );
}
