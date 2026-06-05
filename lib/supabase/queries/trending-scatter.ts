// Trending — StockX-style: editions with MANY cleared sales, each rendered as a
// scatter of individual sales. Prioritizes liquid, non-trivial editions (lots of
// sale dots + real dollar range), not $2 commons. Reads mv_edition_growth_90d for
// the roster and the edition_sales RPC (migration 0038) for the raw dots.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface SaleDot {
  t: number; // unix ms
  price: number;
  serial: number | null;
  type: string | null; // P2P / OFFER / DIRECT …
}

export interface TrendingEdition {
  edition_id: string;
  player_name: string | null;
  tier_name: string | null;
  mint_count: number | null;
  parallel_id: number | null;
  series_name: string | null;
  image_url: string | null;
  n_sales: number;
  price_now: number | null;
  growth_pct: number | null;
  sales: SaleDot[]; // individual cleared sales (most-recent-first from RPC)
}

const MIN_PRICE = 20; // skip $2-common noise — the scatter needs a real dollar range
const SINCE_DAYS = 365;
const SALE_CAP = 400;

async function _trending(view: "all" | "rookies", count: number): Promise<TrendingEdition[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  try {
    // Roster: most sales first among editions with a non-trivial price — these
    // are the StockX-worthy ones (deep sale history + dollar range).
    let q = sb
      .from("mv_edition_growth_90d")
      .select("edition_id, player_name, tier_name, mint_count, parallel_id, series_name, image_url, n_sales, price_now, growth_pct, is_rookie")
      .gte("price_now", MIN_PRICE)
      .order("n_sales", { ascending: false, nullsFirst: false })
      .limit(count * 2); // headroom: drop any that return too few dots
    if (view === "rookies") q = q.eq("is_rookie", true);
    const { data, error } = await q;
    if (error) { console.error("[trending-scatter] roster read failed", error); return []; }
    const roster = (data as Record<string, unknown>[] | null) ?? [];

    // Fetch the individual sale dots per edition from the precomputed MV
    // (indexed on edition_id, completed_at — fast; the live join is 6–18s).
    void SINCE_DAYS;
    const enriched = await Promise.all(
      roster.map(async (r) => {
        const editionId = String(r.edition_id);
        const { data: sales } = await sb
          .from("trending_edition_sales")
          .select("completed_at, price, serial_number, tx_type")
          .eq("edition_id", editionId)
          .order("completed_at", { ascending: false })
          .limit(SALE_CAP);
        const dots: SaleDot[] = ((sales as Record<string, unknown>[] | null) ?? []).map((s) => ({
          t: new Date(String(s.completed_at)).getTime(),
          price: Number(s.price),
          serial: s.serial_number == null ? null : Number(s.serial_number),
          type: s.tx_type == null ? null : String(s.tx_type),
        }));
        return {
          edition_id: editionId,
          player_name: r.player_name == null ? null : String(r.player_name),
          tier_name: r.tier_name == null ? null : String(r.tier_name),
          mint_count: r.mint_count == null ? null : Number(r.mint_count),
          parallel_id: r.parallel_id == null ? null : Number(r.parallel_id),
          series_name: r.series_name == null ? null : String(r.series_name),
          image_url: r.image_url == null ? null : String(r.image_url),
          n_sales: Number(r.n_sales),
          price_now: r.price_now == null ? null : Number(r.price_now),
          growth_pct: r.growth_pct == null ? null : Number(r.growth_pct),
          sales: dots,
        } as TrendingEdition;
      }),
    );

    // Keep only editions whose scatter is actually rich (≥ 20 dots in window),
    // then take the requested count.
    return enriched.filter((e) => e.sales.length >= 20).slice(0, count);
  } catch (e) {
    console.error("[trending-scatter] threw", e);
    return [];
  }
}

export const getTrendingScatter = (view: "all" | "rookies" = "all", count = 9) =>
  unstable_cache(() => _trending(view, count), ["trending-scatter-v1", view, String(count)], {
    revalidate: 600,
    tags: ["edition-growth", "edition-sales"],
  })();
