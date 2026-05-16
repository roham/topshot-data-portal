// Homepage KPI strip — reads the single-row mv_market_summary_<window>.
//
// Returns `null` when the MV is empty (fresh project / RLS denies read /
// network failure). Callers MUST render an honest-absence state, not 0.
// Never throw — page-level fallback to the existing snapshot path handles it.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import type { TimeWindow } from "@/components/global/window-types";
import { windowToMarketView } from "@/lib/supabase/helpers";

export type HomepageKpis = Tables["mv_market_summary_24h"];

async function _getHomepageKpis(
  window: TimeWindow = "24h",
): Promise<HomepageKpis | null> {
  const view = windowToMarketView(window);
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return null;
    const { data, error } = await sb
      .from(view)
      .select("*")
      .eq("singleton_id", 1)
      .maybeSingle();
    if (error) {
      console.error(`[supabase] ${view} read failed`, error);
      return null;
    }
    return (data as HomepageKpis | null) ?? null;
  } catch (e) {
    console.error(`[supabase] market-summary read threw`, e);
    return null;
  }
}

// Cache key includes the window so each variant gets its own bucket.
export const getHomepageKpis = (window: TimeWindow = "24h") =>
  unstable_cache(
    () => _getHomepageKpis(window),
    ["homepage-kpis", window],
    {
      revalidate: 60,
      tags: ["homepage-kpis", `mv_market_summary_${window}`],
    },
  )();
