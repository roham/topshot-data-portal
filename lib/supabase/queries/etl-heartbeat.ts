// ETL freshness heartbeat. Anon-readable per RLS policy heartbeat_public_read
// in 0006_topshot_etl_cursors.sql. Returns the single-row state; consumers
// classify via lib/supabase/helpers.freshnessBucket.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type EtlHeartbeat = Tables["_etl_heartbeat"];

async function _getEtlHeartbeat(): Promise<EtlHeartbeat | null> {
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return null;
    const { data, error } = await sb
      .from("_etl_heartbeat")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    if (error) {
      console.error("[supabase] _etl_heartbeat read failed", error);
      return null;
    }
    return (data as EtlHeartbeat | null) ?? null;
  } catch (e) {
    console.error("[supabase] _etl_heartbeat threw", e);
    return null;
  }
}

// Freshness badge wants ~1m granularity, so cache at 30s with a quick-revalidate.
export const getEtlHeartbeat = unstable_cache(_getEtlHeartbeat, ["etl-heartbeat"], {
  revalidate: 30,
  tags: ["etl-heartbeat"],
});
