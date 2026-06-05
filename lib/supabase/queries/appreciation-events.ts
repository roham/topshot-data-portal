// The three event-driven appreciation lanes (non-line-chart): serial appreciation
// stories, floor-smashed editions, and high-value illiquid moments. Each reads its
// MV; small result sets, one read, cached.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

const S = (v: unknown) => (v == null ? null : String(v));
const N = (v: unknown) => (v == null ? null : Number(v));

export interface StoryRow {
  moment_id: string;
  edition_id: string; subedition_id: string | null; serial_number: number | null; player_name: string | null; tier_name: string | null;
  edition_mint: number | null; subed_mint: number | null; parallel_id: number | null; series_name: string | null; image_url: string | null;
  first_sale: number | null; last_sale: number | null; hi: number | null; n: number; last_at: string | null;
  edition_floor: number | null; mult: number | null;
  is_one: boolean; is_jersey: boolean; is_low: boolean;
  score: number;
}
export type SerialClass = "all" | "normal" | "special";
export type StorySort = "hot" | "gain" | "mult" | "recent";

/**
 * Transparent "story score": balances the climb multiple, the dollar magnitude,
 * conviction (number of cleared sales), and recency. A $10 floor on the first
 * sale kills $1→$X penny-flip noise that pure-multiple sorting surfaces. Special
 * serials (#1 / jersey-match / low) get a small bump. This is the default order
 * — the page also exposes gain / multiple / recent so the order is never a
 * mystery.
 */
export function storyScore(r: { first_sale: number | null; last_sale: number | null; n: number; last_at: string | null; is_one: boolean; is_jersey: boolean; is_low: boolean }): number {
  const last = r.last_sale ?? 0;
  const first = r.first_sale ?? 0;
  if (last <= 0) return 0;
  const effFirst = Math.max(first, 10);
  const effMult = last / effFirst;
  const days = r.last_at ? (Date.now() - new Date(r.last_at).getTime()) / 86_400_000 : 999;
  const recency = Math.exp(-days / 240); // ~8-month soft decay
  const conviction = 0.5 + (Math.min(r.n, 8) / 8) * 0.5; // 0.5..1
  const special = r.is_one ? 1.25 : r.is_jersey ? 1.2 : r.is_low ? 1.1 : 1;
  return Math.log10(last + 1) * Math.log2(effMult + 1) * recency * conviction * special;
}

/** One cleared sale of a single serial, time-ordered. */
export interface SalePoint { t: number; price: number }
export interface FloorSmashRow {
  edition_id: string; player_name: string | null; tier_name: string | null; mint_count: number | null;
  parallel_id: number | null; series_name: string | null; image_url: string | null;
  floor_before: number | null; floor_now: number | null; jump_mult: number | null;
  n_sub: number | null; scarcest_sub: number | null;
}
export interface IlliquidRow {
  edition_id: string; player_name: string | null; tier_name: string | null; mint_count: number | null;
  parallel_id: number | null; series_name: string | null; image_url: string | null;
  floor: number | null; sales_90d: number; sales_ever: number | null; last_sale: number | null; last_at: string | null;
  max_sale_ever: number | null; msrp_pack: string | null; pack_msrp: number | null;
  n_sub: number | null; scarcest_sub: number | null;
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

const SORT_CMP: Record<StorySort, (a: StoryRow, b: StoryRow) => number> = {
  hot: (a, b) => b.score - a.score,
  gain: (a, b) => (b.last_sale ?? 0) - (b.first_sale ?? 0) - ((a.last_sale ?? 0) - (a.first_sale ?? 0)),
  mult: (a, b) => (b.mult ?? 0) - (a.mult ?? 0),
  recent: (a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""),
};

async function _stories(cls: SerialClass, sort: StorySort, limit: number): Promise<StoryRow[]> {
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  try {
    // Pull the full qualifying set (small — ~200 rows), score + sort in JS, then
    // slice. last_sale order is just to bound the fetch deterministically.
    let q = sb.from("mv_serial_appreciation")
      .select("moment_id, edition_id, subedition_id, serial_number, player_name, tier_name, edition_mint, subed_mint, parallel_id, series_name, image_url, first_sale, last_sale, hi, n, last_at, edition_floor, mult, is_one, is_jersey, is_low")
      .order("last_sale", { ascending: false, nullsFirst: false }).limit(500);
    // Special = #1 / jersey-match / low serial; Normal = none of those (like-for-like).
    if (cls === "special") q = q.or("is_one.eq.true,is_jersey.eq.true,is_low.eq.true");
    else if (cls === "normal") q = q.eq("is_one", false).eq("is_jersey", false).eq("is_low", false);
    const { data, error } = await q;
    if (error) { console.error("[appreciation-events] stories read failed", error); return []; }
    const rows: StoryRow[] = ((data as Record<string, unknown>[] | null) ?? []).map((r) => {
      const base = {
        first_sale: N(r.first_sale), last_sale: N(r.last_sale), n: Number(r.n), last_at: S(r.last_at),
        is_one: Boolean(r.is_one), is_jersey: Boolean(r.is_jersey), is_low: Boolean(r.is_low),
      };
      return {
        moment_id: String(r.moment_id),
        edition_id: String(r.edition_id), subedition_id: S(r.subedition_id), serial_number: N(r.serial_number), player_name: S(r.player_name), tier_name: S(r.tier_name),
        edition_mint: N(r.edition_mint), subed_mint: N(r.subed_mint), parallel_id: N(r.parallel_id), series_name: S(r.series_name), image_url: S(r.image_url),
        hi: N(r.hi), edition_floor: N(r.edition_floor), mult: N(r.mult),
        ...base, score: storyScore(base),
      };
    });
    rows.sort(SORT_CMP[sort] ?? SORT_CMP.hot);
    return rows.slice(0, limit);
  } catch (e) { console.error("[appreciation-events] stories threw", e); return []; }
}
export const getAppreciationStories = (cls: SerialClass = "all", sort: StorySort = "hot", limit = 48) =>
  unstable_cache(() => _stories(cls, sort, limit), ["appr-stories-v3", cls, sort, String(limit)], { revalidate: 600, tags: ["appreciation-events"] })();

/** Real cleared-sale price paths (time-ordered) for the given serials, in ONE query. */
async function _storyPaths(momentIds: string[]): Promise<Record<string, SalePoint[]>> {
  if (momentIds.length === 0) return {};
  const sb = getSupabaseServerAnon();
  if (!sb) return {};
  try {
    const { data, error } = await sb.from("transactions")
      .select("moment_id, gross_amount_usd, completed_at")
      .in("moment_id", momentIds)
      .gt("gross_amount_usd", 0)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true })
      .limit(2000);
    if (error) { console.error("[appreciation-events] story paths read failed", error); return {}; }
    const out: Record<string, SalePoint[]> = {};
    for (const r of (data as Record<string, unknown>[] | null) ?? []) {
      const id = String(r.moment_id);
      (out[id] ??= []).push({ t: new Date(String(r.completed_at)).getTime(), price: Number(r.gross_amount_usd) });
    }
    return out;
  } catch (e) { console.error("[appreciation-events] story paths threw", e); return {}; }
}
export const getStorySalePaths = (momentIds: string[]) =>
  unstable_cache(() => _storyPaths(momentIds), ["appr-story-paths-v1", ...momentIds.slice(0, 60).sort()], { revalidate: 600, tags: ["appreciation-events"] })();

export const getFloorSmash = (limit = 48) =>
  unstable_cache(() => read<FloorSmashRow>(
    "mv_edition_floor_smash",
    "edition_id, player_name, tier_name, mint_count, parallel_id, series_name, image_url, floor_before, floor_now, jump_mult, n_sub, scarcest_sub",
    "jump_mult", limit,
    (r) => ({ edition_id: String(r.edition_id), player_name: S(r.player_name), tier_name: S(r.tier_name), mint_count: N(r.mint_count), parallel_id: N(r.parallel_id), series_name: S(r.series_name), image_url: S(r.image_url), floor_before: N(r.floor_before), floor_now: N(r.floor_now), jump_mult: N(r.jump_mult), n_sub: N(r.n_sub), scarcest_sub: N(r.scarcest_sub) }),
  ), ["appr-floorsmash-v1", String(limit)], { revalidate: 600, tags: ["appreciation-events"] })();

export const getIlliquidHighValue = (limit = 48) =>
  unstable_cache(() => read<IlliquidRow>(
    "mv_edition_illiquid_highvalue",
    "edition_id, player_name, tier_name, mint_count, parallel_id, series_name, image_url, floor, sales_90d, sales_ever, last_sale, last_at, max_sale_ever, msrp_pack, pack_msrp, n_sub, scarcest_sub",
    "floor", limit,
    (r) => ({ edition_id: String(r.edition_id), player_name: S(r.player_name), tier_name: S(r.tier_name), mint_count: N(r.mint_count), parallel_id: N(r.parallel_id), series_name: S(r.series_name), image_url: S(r.image_url), floor: N(r.floor), sales_90d: Number(r.sales_90d), sales_ever: N(r.sales_ever), last_sale: N(r.last_sale), last_at: S(r.last_at), max_sale_ever: N(r.max_sale_ever), msrp_pack: S(r.msrp_pack), pack_msrp: N(r.pack_msrp), n_sub: N(r.n_sub), scarcest_sub: N(r.scarcest_sub) }),
  ), ["appr-illiquid-v1", String(limit)], { revalidate: 600, tags: ["appreciation-events"] })();
