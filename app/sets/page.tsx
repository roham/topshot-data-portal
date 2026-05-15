import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Sets · directory · coming soon"
      job="Browse, search, and filter every Top Shot set by series, release date, current floor, and 7-day volume."
      data="allSets() enriched with getSetPriceHistory (per STAGE-1 UNLOCK-01) and recent-volume rollups from the 1h-warm cron."
      status="Scheduled for iter-5. The /set/[id] page restoration lands first and seeds the link target."
    />
  );
}
