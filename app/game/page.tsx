import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Game · directory · coming soon"
      job="Browse NBA games by date with the moments minted from each + price moves attributable to game events."
      data="6h-nba cron (balldontlie.io games) + dateOfMoment field on plays (STAGE-1 OQ2: 100% populated on recent sample)."
      status="Scheduled for iter-13+. Gated on a dateOfMoment-to-game-id resolution lib."
    />
  );
}
