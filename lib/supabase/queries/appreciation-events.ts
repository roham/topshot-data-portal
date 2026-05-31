// The three event-driven appreciation lanes (non-line-chart): serial appreciation
// stories, floor-smashed editions, and high-value illiquid moments. Each reads its
// MV; small result sets, one read, cached.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

const S = (v: unknown) => (v == null ? null : String(v));
const N = (v: unknown) => (v == null ? null : Number(v));

export interface StoryRow {
  edition_id: string; serial_number: number | null; player_name: string | null; tier_name: string | null;
  mint_count: number | null; parallel_id: number | null; series_name: string | null; image_url: string | null;
  first_sale: number | null; last_sale: number | null; hi: number | null; n: number; last_at: string | null;
  edition_floor: number | null; mult: number | null;
}
export interface FloorSmashRow {
  edition_id: string; player_name: string | null; tier_name: string | null; mint_count: number | null;
  parallel_id: number | null; series_name: string | null; image_url: string | null;
  floor_before: number | null; floor_now: number | null; jump_mult: number | null;
}
export interface IlliquidRow {
  edition_id: string; player_name: string | null; tier_name: string | null; mint_count: number | null;
  parallel_id: number | null; series_name: string | null; image_url: string | null;
  floor: number | null; sales_90d: number; sales_ever: number | null; last_sale: number | null; last_at: string | null;
  max_sale_ever: number | null; msrp_pack: string | null; pack_msrp: number | null;
}

async function read<T>(table: string, cols: string, order: string, limit: number, map: (r: Record<string, unknown>) => T): Promise<T[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  try {
    const { data, error } = await sb.from(table).select(cols).order(order, { ascending: false, nullsFirst: false }).limit(limit);
    if (error) { console.error(`[appreciation-events] ${table} read failed`, error); return []; }
    return ((data as Record<string, unknown>[] | null) ?? []).map(map);
  } catch (e) { console.error(`[appreciation-events] ${table} threw`, e); return []; }
}

export const getAppreciationStories = (limit = 48) =>
  unstable_cache(() => read<StoryRow>(
    "mv_serial_appreciation",
    "edition_id, serial_number, player_name, tier_name, mint_count, parallel_id, series_name, image_url, first_sale, last_sale, hi, n, last_at, edition_floor, mult",
    "last_sale", limit,
    (r) => ({ edition_id: String(r.edition_id), serial_number: N(r.serial_number), player_name: S(r.player_name), tier_name: S(r.tier_name), mint_count: N(r.mint_count), parallel_id: N(r.parallel_id), series_name: S(r.series_name), image_url: S(r.image_url), first_sale: N(r.first_sale), last_sale: N(r.last_sale), hi: N(r.hi), n: Number(r.n), last_at: S(r.last_at), edition_floor: N(r.edition_floor), mult: N(r.mult) }),
  ), ["appr-stories-v1", String(limit)], { revalidate: 600, tags: ["appreciation-events"] })();

export const getFloorSmash = (limit = 48) =>
  unstable_cache(() => read<FloorSmashRow>(
    "mv_edition_floor_smash",
    "edition_id, player_name, tier_name, mint_count, parallel_id, series_name, image_url, floor_before, floor_now, jump_mult",
    "jump_mult", limit,
    (r) => ({ edition_id: String(r.edition_id), player_name: S(r.player_name), tier_name: S(r.tier_name), mint_count: N(r.mint_count), parallel_id: N(r.parallel_id), series_name: S(r.series_name), image_url: S(r.image_url), floor_before: N(r.floor_before), floor_now: N(r.floor_now), jump_mult: N(r.jump_mult) }),
  ), ["appr-floorsmash-v1", String(limit)], { revalidate: 600, tags: ["appreciation-events"] })();

export const getIlliquidHighValue = (limit = 48) =>
  unstable_cache(() => read<IlliquidRow>(
    "mv_edition_illiquid_highvalue",
    "edition_id, player_name, tier_name, mint_count, parallel_id, series_name, image_url, floor, sales_90d, sales_ever, last_sale, last_at, max_sale_ever, msrp_pack, pack_msrp",
    "floor", limit,
    (r) => ({ edition_id: String(r.edition_id), player_name: S(r.player_name), tier_name: S(r.tier_name), mint_count: N(r.mint_count), parallel_id: N(r.parallel_id), series_name: S(r.series_name), image_url: S(r.image_url), floor: N(r.floor), sales_90d: Number(r.sales_90d), sales_ever: N(r.sales_ever), last_sale: N(r.last_sale), last_at: S(r.last_at), max_sale_ever: N(r.max_sale_ever), msrp_pack: S(r.msrp_pack), pack_msrp: N(r.pack_msrp) }),
  ), ["appr-illiquid-v1", String(limit)], { revalidate: 600, tags: ["appreciation-events"] })();
