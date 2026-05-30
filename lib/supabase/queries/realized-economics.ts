// Realized economics — reads the precomputed mv_realized_monthly (actual cleared
// trades: GMV / median / avg per month). No client-side aggregation (PostgREST
// aggregates are disabled); the MV does the math, this just selects it.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface RealizedMonth {
  month: string; // YYYY-MM-DD (first of month)
  trades: number;
  gmv: number;
  median_usd: number;
  avg_usd: number;
}

async function _getRealizedMonthly(): Promise<RealizedMonth[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("mv_realized_monthly")
      .select("month, trades, gmv, median_usd, avg_usd")
      .order("month", { ascending: true });
    if (error) {
      console.error("[realized-economics] mv_realized_monthly read failed", error);
      return [];
    }
    return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
      month: String(r.month),
      trades: Number(r.trades),
      gmv: Number(r.gmv),
      median_usd: Number(r.median_usd),
      avg_usd: Number(r.avg_usd),
    }));
  } catch (e) {
    console.error("[realized-economics] threw", e);
    return [];
  }
}

export const getRealizedMonthly = () =>
  unstable_cache(_getRealizedMonthly, ["realized-monthly-v1"], {
    revalidate: 600,
    tags: ["realized-economics", "mv_realized_monthly"],
  })();
