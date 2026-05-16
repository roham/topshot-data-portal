// Largest sales in a parameterized window. Reads the per-window
// mv_largest_sales_<w> MV; each is already capped at top 50 by
// gross_amount_usd, so SELECT * ORDER BY gross DESC LIMIT N is authoritative.
// The largest_sales family doesn't have a 90d variant — 90d collapses to 30d
// via windowToLargestSalesView.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import type { TimeWindow } from "@/components/global/window-types";
import { windowToLargestSalesView } from "@/lib/supabase/helpers";

export type LargestSaleRow = Tables["mv_largest_sales_24h"];

interface GetLargestSalesOptions {
  window?: TimeWindow;
  limit?: number;
}

async function _getLargestSales({
  window = "24h",
  limit = 10,
}: GetLargestSalesOptions = {}): Promise<LargestSaleRow[]> {
  const view = windowToLargestSalesView(window);
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return [];
    const { data, error } = await sb
      .from(view)
      .select("*")
      .order("gross_amount_usd", { ascending: false })
      .limit(limit);
    if (error) {
      console.error(`[supabase] ${view} read failed`, error);
      return [];
    }
    return ((data as LargestSaleRow[] | null) ?? []).map((r) => ({
      ...r,
      gross_amount_usd: Number(r.gross_amount_usd),
    }));
  } catch (e) {
    console.error(`[supabase] largest-sales read threw`, e);
    return [];
  }
}

export const getLargestSales = (opts: GetLargestSalesOptions = {}) => {
  const window = opts.window ?? "24h";
  return unstable_cache(
    () => _getLargestSales(opts),
    ["largest-sales", window, String(opts.limit ?? 10)],
    {
      revalidate: 60,
      tags: ["largest-sales", windowToLargestSalesView(window)],
    },
  )();
};
