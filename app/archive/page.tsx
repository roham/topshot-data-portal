import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Archive · historical retrospectives · coming soon"
      job="On-this-day moments, all-time biggest sales, per-set retrospectives, per-game retrospectives."
      data="biggestSalesAllTime() + per-set retrospective from getSetPriceHistory + per-game retrospective via dateOfMoment join against the 6h-nba cron."
      status="Scheduled for iter-8+. Sub-routes /archive/on-this-day and /archive/biggest-sales follow."
    />
  );
}
