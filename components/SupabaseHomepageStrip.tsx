// Composer for the Supabase-backed homepage strip.
//
// This is a thin wrapper that mounts each section as a leaf RSC inside its
// own <Suspense> boundary. Each leaf does its own fetch — the page shell +
// nav render in <300ms and individual sections paint as their data arrives.
//
// Data path (per leaf):
//   - KpiStrip                  → mv_market_summary_<w> + _etl_heartbeat
//   - TopPlayers                → mv_player_<w>_volume
//   - MostActiveEditions        → mv_edition_<w>_activity (tx_count >= 5 gate)
//   - LargestSales              → mv_largest_sales_<w>
//
// Each leaf caches with `unstable_cache` at 60s per window/limit/threshold.

import { Suspense } from "react";
import { parseWindow } from "@/lib/supabase/helpers";
import { KpiStrip } from "@/components/homepage/KpiStrip";
import { TopPlayers } from "@/components/homepage/TopPlayers";
import { MostActiveEditions } from "@/components/homepage/MostActiveEditions";
import { LargestSales } from "@/components/homepage/LargestSales";
import {
  KpiStripSkeleton,
  TopPlayersSkeleton,
  MostActiveEditionsSkeleton,
  LargestSalesSkeleton,
} from "@/components/HomepageSkeletons";

interface Props {
  rawWindow?: string | string[];
}

export function SupabaseHomepageStrip({ rawWindow }: Props) {
  const window = parseWindow(rawWindow);
  return (
    <section className="space-y-5" data-source="supabase" data-window={window}>
      <Suspense fallback={<KpiStripSkeleton />}>
        <KpiStrip window={window} />
      </Suspense>
      <Suspense fallback={<TopPlayersSkeleton />}>
        <TopPlayers window={window} />
      </Suspense>
      <Suspense fallback={<MostActiveEditionsSkeleton />}>
        <MostActiveEditions window={window} />
      </Suspense>
      <Suspense fallback={<LargestSalesSkeleton />}>
        <LargestSales window={window} />
      </Suspense>
    </section>
  );
}
