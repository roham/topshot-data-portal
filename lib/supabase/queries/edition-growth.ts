// Per-edition 90d realized-price growth + weekly sparkline. The honest "most
// appreciating" — trailing momentum from real sales. Reads mv_edition_growth_90d.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export type GrowthView = "all" | "rookies";

export interface EditionGrowthRow {
  edition_id: string;
  player_name: string | null;
  tier_name: string | null;
  mint_count: number | null;
  parallel_id: number | null;
  series_name: string | null;
  image_url: string | null;
  is_rookie: boolean;
  n_sales: number;
  sparkline: number[];
  price_now: number | null;
  price_prior: number | null;
  growth_pct: number | null;
}

async function _get(view: GrowthView, minSales: number, limit: number): Promise<EditionGrowthRow[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  try {
    let q = sb
      .from("mv_edition_growth_90d")
      .select("edition_id, player_name, tier_name, mint_count, parallel_id, series_name, image_url, is_rookie, n_sales, sparkline, price_now, price_prior, growth_pct")
      .not("growth_pct", "is", null)
      .gte("n_sales", minSales)
      .order("growth_pct", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (view === "rookies") q = q.eq("is_rookie", true);
    const { data, error } = await q;
    if (error) { console.error("[edition-growth] read failed", error); return []; }
    return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
      edition_id: String(r.edition_id),
      player_name: r.player_name == null ? null : String(r.player_name),
      tier_name: r.tier_name == null ? null : String(r.tier_name),
      mint_count: r.mint_count == null ? null : Number(r.mint_count),
      parallel_id: r.parallel_id == null ? null : Number(r.parallel_id),
      series_name: r.series_name == null ? null : String(r.series_name),
      image_url: r.image_url == null ? null : String(r.image_url),
      is_rookie: Boolean(r.is_rookie),
      n_sales: Number(r.n_sales),
      sparkline: Array.isArray(r.sparkline) ? (r.sparkline as unknown[]).map((x) => Number(x)) : [],
      price_now: r.price_now == null ? null : Number(r.price_now),
      price_prior: r.price_prior == null ? null : Number(r.price_prior),
      growth_pct: r.growth_pct == null ? null : Number(r.growth_pct),
    }));
  } catch (e) { console.error("[edition-growth] threw", e); return []; }
}

export const getEditionGrowth = (view: GrowthView, minSales = 12, limit = 60) =>
  unstable_cache(
    () => _get(view, minSales, limit),
    ["edition-growth-v1", view, String(minSales), String(limit)],
    { revalidate: 600, tags: ["edition-growth", "mv_edition_growth_90d"] },
  )();
