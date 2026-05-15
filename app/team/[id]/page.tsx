import { ComingSoon } from "@/components/primitives/ComingSoon";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scope = `team id ${id}`;
  return (
    <ComingSoon
      title="Team · per-team surface · coming soon"
      scope={scope}
      job="Per-team deep dive — top players by recent volume, team-floor index, recent moments minted from this team's games."
      data="searchMintedMoments(byTeams) + the team-color registry at lib/nba-team-colors.ts; team-floor index from /indices/team-{abbr}."
      status="Scheduled for iter-8+."
    />
  );
}
