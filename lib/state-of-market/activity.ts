// State of the Market — activity sales feed.
//
// Reads the flat mv_largest_sales_<window> MV (same source as the shipped
// largest-sales surface) — NOT a PostgREST embed. The transactions→moments
// embed fails on the schema cache; this MV is denormalized and reliable.
//
// tier_name was dropped from the 7d/30d/1y/all variants (migration 0007), so we
// don't select it — tier segmentation needs tier back on the MV first.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import { windowToLargestSalesView } from "@/lib/supabase/helpers";
import type { TimeWindow } from "@/components/global/window-types";

export interface ActivitySaleRow {
  transaction_id: string;
  gross_amount_usd: number;
  buyer_safe_name: string | null;
  seller_safe_name: string | null;
  serial_number: number | null;
  player_id: string | null;
  player_name: string | null;
  play_name: string | null;
  set_name: string | null;
  sold_at: string | null;
}

async function _getActivitySales(window: TimeWindow, limit: number): Promise<ActivitySaleRow[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  const view = windowToLargestSalesView(window);
  try {
    const { data, error } = await sb
      .from(view)
      .select(
        "transaction_id,gross_amount_usd,buyer_safe_name,seller_safe_name,serial_number,player_id,player_name,play_name,set_name,sold_at",
      )
      .order("gross_amount_usd", { ascending: false })
      .limit(limit);
    if (error) {
      console.error(`[state-of-market] ${view} read failed`, error);
      return [];
    }
    return ((data as ActivitySaleRow[] | null) ?? []).map((r) => ({
      ...r,
      gross_amount_usd: Number(r.gross_amount_usd),
    }));
  } catch (e) {
    console.error(`[state-of-market] activity sales threw`, e);
    return [];
  }
}

export const getActivitySales = (window: TimeWindow = "30d", limit = 60) =>
  unstable_cache(
    () => _getActivitySales(window, limit),
    ["som-activity-sales", window, String(limit)],
    { revalidate: 120, tags: ["largest-sales", windowToLargestSalesView(window)] },
  )();
