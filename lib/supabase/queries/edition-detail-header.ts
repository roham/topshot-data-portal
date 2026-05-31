// Header facts for an edition detail / price-chart page: card identity, the
// odds-based MSRP anchor, and the current floor.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface EditionHeader {
  edition_id: string;
  player_name: string | null;
  tier_name: string | null;
  mint_count: number | null;
  parallel_id: number | null;
  series_name: string | null;
  msrp: number | null;
  msrp_pack: string | null;
  pull_odds: number | null;
  floor: number | null;
}

async function _get(editionId: string): Promise<EditionHeader | null> {
  const sb = getSupabaseServerAnon();
  if (!sb) return null;
  try {
    const [edRes, msrpRes, floorRes] = await Promise.all([
      sb.from("editions").select("edition_id, player_name, tier_name, mint_count, parallel_id, series_name").eq("edition_id", editionId).limit(1),
      sb.from("mv_edition_msrp_tiered").select("msrp, msrp_pack, pull_odds").eq("edition_id", editionId).limit(1),
      sb.from("market_caps").select("lowest_ask_price").eq("edition_id", editionId).gt("lowest_ask_price", 0).order("date", { ascending: false }).limit(1),
    ]);
    const ed = (edRes.data as Record<string, unknown>[] | null)?.[0];
    if (!ed) return null;
    const msrp = (msrpRes.data as Record<string, unknown>[] | null)?.[0];
    const floor = (floorRes.data as Record<string, unknown>[] | null)?.[0];
    return {
      edition_id: String(ed.edition_id),
      player_name: ed.player_name == null ? null : String(ed.player_name),
      tier_name: ed.tier_name == null ? null : String(ed.tier_name),
      mint_count: ed.mint_count == null ? null : Number(ed.mint_count),
      parallel_id: ed.parallel_id == null ? null : Number(ed.parallel_id),
      series_name: ed.series_name == null ? null : String(ed.series_name),
      msrp: msrp?.msrp == null ? null : Number(msrp.msrp),
      msrp_pack: msrp?.msrp_pack == null ? null : String(msrp.msrp_pack),
      pull_odds: msrp?.pull_odds == null ? null : Number(msrp.pull_odds),
      floor: floor?.lowest_ask_price == null ? null : Number(floor.lowest_ask_price),
    };
  } catch (e) { console.error("[edition-detail-header] threw", e); return null; }
}

export const getEditionHeader = (editionId: string) =>
  unstable_cache(() => _get(editionId), ["edition-header-v1", editionId], {
    revalidate: 600, tags: ["edition-header"],
  })();

export interface SubEd { subedition_id: string | null; n: number; min_sn: number | null; max_sn: number | null; }

async function _subeds(editionId: string): Promise<SubEd[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  try {
    const { data, error } = await sb.rpc("edition_subeditions", { p_edition_id: editionId });
    if (error) { console.error("[edition-subeditions] rpc failed", error); return []; }
    return ((data as Record<string, unknown>[] | null) ?? []).map((r) => ({
      subedition_id: r.subedition_id == null ? null : String(r.subedition_id),
      n: Number(r.n), min_sn: r.min_sn == null ? null : Number(r.min_sn), max_sn: r.max_sn == null ? null : Number(r.max_sn),
    }));
  } catch (e) { console.error("[edition-subeditions] threw", e); return []; }
}
export const getEditionSubeditions = (editionId: string) =>
  unstable_cache(() => _subeds(editionId), ["edition-subeds-v1", editionId], { revalidate: 600, tags: ["edition-subeds"] })();
