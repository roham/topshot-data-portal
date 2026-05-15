import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Teams · directory · coming soon"
      job="Browse all 30 NBA franchises (plus WNBA where minted) with team-floor index and collector-concentration metrics per team."
      data="Per-team rollup via searchMintedMoments(byTeams) + the team-color registry at lib/nba-team-colors.ts."
      status="Scheduled for iter-8+. Per-team pages at /team/[id] populate before the directory does."
    />
  );
}
