import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = `game id ${id}`;
  return (
    <ComingSoon
      title="Game · per-game retrospective · coming soon"
      scope={scope}
      job="Per-game retrospective — moments minted from this game, who bought first, what the trailing-7d avg did the night of the game."
      data="balldontlie game lookup (6h-nba cron) + dateOfMoment-to-game resolution + tx feed replay around the game window."
      status="Scheduled for iter-13+. Gated on the dateOfMoment-to-game-id resolution lib."
    />
  );
}
