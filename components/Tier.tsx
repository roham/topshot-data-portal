import { tierLabel } from "@/lib/utils";

const cls: Record<string, string> = {
  COMMON: "tier-common",
  FANDOM: "tier-fandom",
  RARE: "tier-rare",
  LEGENDARY: "tier-legendary",
  ULTIMATE: "tier-ultimate",
};

export function TierPill({ tier }: { tier?: string | null }) {
  if (!tier) return null;
  const short = tier.replace("MOMENT_TIER_", "");
  return <span className={`tier-pill ${cls[short] ?? "tier-common"}`}>{tierLabel(tier)}</span>;
}
