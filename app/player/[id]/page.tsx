import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = `player id ${id}`;
  return (
    <ComingSoon
      title="Player · per-player surface · coming soon"
      scope={scope}
      job="Per-player deep dive — every edition, top serials, floor index, game-event markers on a sample edition's price chart."
      data="searchMintedMoments(byPlayers) + balldontlie game data + dateOfMoment overlay (STAGE-1 OQ2: reliable)."
      status="Scheduled for iter-7+."
    />
  );
}
