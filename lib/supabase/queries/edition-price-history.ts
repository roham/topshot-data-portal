// Per-edition price history (StockX / Card-Ladder style) via the
// edition_price_history RPC (PostgREST aggregates are disabled, so a SECURITY
// DEFINER function does the daily roll-up).

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface PricePoint { d: string; n: number; median: number; lo: number; hi: number; avg: number; }

async function _get(editionId: string, sinceDays: number | null): Promise<PricePoint[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  try {
    const { data, error } = await sb.rpc("edition_price_history", {
      p_edition_id: editionId,
      p_since_days: sinceDays,
    });
    if (error) { console.error("[edition-price-history] rpc failed", error); return []; }
    return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
      d: String(r.d).slice(0, 10),
      n: Number(r.n),
      median: Number(r.median),
      lo: Number(r.lo),
      hi: Number(r.hi),
      avg: Number(r.avg_usd),
    }));
  } catch (e) { console.error("[edition-price-history] threw", e); return []; }
}

export const getEditionPriceHistory = (editionId: string, sinceDays: number | null) =>
  unstable_cache(
    () => _get(editionId, sinceDays),
    ["edition-price-history-v1", editionId, String(sinceDays)],
    { revalidate: 600, tags: ["edition-price-history"] },
  )();
