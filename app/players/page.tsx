import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Players · directory · coming soon"
      job="Browse every NBA + WNBA player with minted moments, ranked by trader interest in the active window."
      data="allPlayers() + per-player volume rollup from the 30m-player cron; ranks rotate with the TimeWindow."
      status="Scheduled for iter-7+. The V1 directory was port-pending after the design reset."
    />
  );
}
