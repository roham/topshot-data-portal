// Homepage KPI strip — reads the single-row mv_market_24h_summary.
//
// Returns `null` when the MV is empty (fresh project / RLS denies read /
// network failure). Callers MUST render an honest-absence state, not 0.
// Never throw — page-level fallback to the existing snapshot path handles it.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type HomepageKpis = Tables["mv_market_24h_summary"];

async function _getHomepageKpis(): Promise<HomepageKpis | null> {
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return null;
    const { data, error } = await sb
      .from("mv_market_24h_summary")
      .select("*")
      .eq("singleton_id", 1)
      .maybeSingle();
    if (error) {
      // Surface in server log; never crash the page.
      console.error("[supabase] mv_market_24h_summary read failed", error);
      return null;
    }
    return (data as HomepageKpis | null) ?? null;
  } catch (e) {
    console.error("[supabase] mv_market_24h_summary read threw", e);
    return null;
  }
}

export const getHomepageKpis = unstable_cache(_getHomepageKpis, ["homepage-kpis"], {
  revalidate: 60,
  tags: ["homepage-kpis", "mv_market_24h_summary"],
});
