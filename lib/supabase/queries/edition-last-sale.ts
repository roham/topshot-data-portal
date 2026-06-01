// Batch per-edition last realized sale, from mv_edition_last_sale (all-time).
// Vanity-proof valuation input: last actual transaction price, not a lowest ask.

import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface EditionLastSale {
  last_sale_usd: number;
  last_sale_at: string | null;
  n_sales: number;
}

/** Map of edition_id → last sale, for the given edition ids. Missing ids = never sold. */
export async function getEditionLastSales(editionIds: string[]): Promise<Map<string, EditionLastSale>> {
  const out = new Map<string, EditionLastSale>();
  const sb = getSupabaseServerAnon();
  if (!sb || editionIds.length === 0) return out;
  try {
    for (let i = 0; i < editionIds.length; i += 80) {
      const batch = editionIds.slice(i, i + 80);
      const { data, error } = await sb
        .from("mv_edition_last_sale")
        .select("edition_id,last_sale_usd,last_sale_at,n_sales")
        .in("edition_id", batch);
      if (error) {
        console.error("[edition-last-sale] read failed", error);
        break;
      }
      for (const r of (data as Record<string, unknown>[] | null) ?? []) {
        out.set(String(r.edition_id), {
          last_sale_usd: Number(r.last_sale_usd) || 0,
          last_sale_at: r.last_sale_at == null ? null : String(r.last_sale_at),
          n_sales: Number(r.n_sales) || 0,
        });
      }
    }
  } catch (e) {
    console.error("[edition-last-sale] threw", e);
  }
  return out;
}
