import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Tier · directory · coming soon"
      job="Browse editions filtered by tier (Common / Rare / Fandom / Legendary / Ultimate) with the tier's floor-weighted index."
      data="searchEditions(byTier) + the per-tier index from /indices/tier-{slug}."
      status="Scheduled for iter-6+. Per-tier deep dives at /tier/[id] populate before the directory."
    />
  );
}
