// Largest sales (24h) — reads mv_largest_sales_24h. MV is already top-50
// by gross_amount_usd, so a simple SELECT * ORDER BY price DESC LIMIT N is
// authoritative.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type LargestSaleRow = Tables["mv_largest_sales_24h"];

interface GetLargestSalesOptions {
  limit?: number;
}

async function _getLargestSales({
  limit = 10,
}: GetLargestSalesOptions = {}): Promise<LargestSaleRow[]> {
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return [];
    const { data, error } = await sb
      .from("mv_largest_sales_24h")
      .select("*")
      .order("gross_amount_usd", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[supabase] mv_largest_sales_24h read failed", error);
      return [];
    }
    return ((data as LargestSaleRow[] | null) ?? []).map((r) => ({
      ...r,
      gross_amount_usd: Number(r.gross_amount_usd),
    }));
  } catch (e) {
    console.error("[supabase] mv_largest_sales_24h threw", e);
    return [];
  }
}

export const getLargestSales = unstable_cache(_getLargestSales, ["largest-sales"], {
  revalidate: 60,
  tags: ["largest-sales", "mv_largest_sales_24h"],
});
