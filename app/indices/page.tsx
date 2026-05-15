import { ComingSoon } from "@/components/primitives/ComingSoon";

export default function Page() {
  return (
    <ComingSoon
      title="Indices · directory · coming soon"
      job="Browse every published index (TS500, per-tier, per-series, per-team) with current value, day delta, and a sparkline."
      data="lib/indices/registry.ts holds the 17-seed definitions; values from getSetPriceHistory per constituent + 30m-market cron."
      status="Scheduled for iter-6+. The homepage index strip currently uses live mean prices as a placeholder until /indices/[slug] computes real series."
    />
  );
}
