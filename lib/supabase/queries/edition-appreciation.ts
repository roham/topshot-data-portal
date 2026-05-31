// Per-edition appreciation from MSRP → current floor. Reads mv_edition_appreciation.
// The "physical card" unit: each edition priced from its pack-derived MSRP to its
// floor, with the multiple. Powers the most-appreciating index + rookies-in-$.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export type ApprView = "all" | "rookies";

export interface EditionApprRow {
  edition_id: string;
  player_id: string | null;
  player_name: string | null;
  tier_name: string | null;
  mint_count: number | null;
  parallel_id: number | null;
  series_name: string | null;
  draft_year: string | null;
  is_rookie: boolean;
  msrp: number;
  floor: number | null;
  floor_date: string | null;
  mult: number | null;
}

async function _getEditionAppreciation(view: ApprView, limit: number): Promise<EditionApprRow[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  try {
    let q = sb
      .from("mv_edition_appreciation")
      .select("edition_id, player_id, player_name, tier_name, mint_count, parallel_id, series_name, draft_year, is_rookie, msrp, floor, floor_date, mult")
      .not("floor", "is", null)
      .order("mult", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (view === "rookies") q = q.eq("is_rookie", true);
    const { data, error } = await q;
    if (error) { console.error("[edition-appreciation] read failed", error); return []; }
    return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
      edition_id: String(r.edition_id),
      player_id: r.player_id == null ? null : String(r.player_id),
      player_name: r.player_name == null ? null : String(r.player_name),
      tier_name: r.tier_name == null ? null : String(r.tier_name),
      mint_count: r.mint_count == null ? null : Number(r.mint_count),
      parallel_id: r.parallel_id == null ? null : Number(r.parallel_id),
      series_name: r.series_name == null ? null : String(r.series_name),
      draft_year: r.draft_year == null ? null : String(r.draft_year),
      is_rookie: Boolean(r.is_rookie),
      msrp: Number(r.msrp),
      floor: r.floor == null ? null : Number(r.floor),
      floor_date: r.floor_date == null ? null : String(r.floor_date).slice(0, 10),
      mult: r.mult == null ? null : Number(r.mult),
    }));
  } catch (e) { console.error("[edition-appreciation] threw", e); return []; }
}

export const getEditionAppreciation = (view: ApprView, limit = 200) =>
  unstable_cache(
    () => _getEditionAppreciation(view, limit),
    ["edition-appreciation-v1", view, String(limit)],
    { revalidate: 600, tags: ["edition-appreciation", "mv_edition_appreciation"] },
  )();
