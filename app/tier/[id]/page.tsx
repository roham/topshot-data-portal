import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = `tier ${id}`;
  return (
    <ComingSoon
      title="Tier · per-tier deep dive · coming soon"
      scope={scope}
      job="Browse all editions in a tier (common/rare/fandom/legendary/ultimate) with the tier's floor-weighted index headline."
      data="searchEditions filtered by tier + the per-tier index from /indices/tier-{slug}."
      status="Scheduled for iter-6+."
    />
  );
}
