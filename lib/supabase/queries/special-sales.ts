// Special-serial sales — the showcase data layer for /sales.
//
// Reads topshot.mv_special_sales (migration 0034): every real settled sale that
// tells a "special serial" story — serial #1, a serial matching the player's
// jersey number, a premium parallel (Omega / Galactic), or a low serial (#2–10).
// Parallels are first-class (Principle IV): the parallel is moments.subedition_id,
// resolved to a name via parallel_types (21=Galactic, 22=Omega).
//
// Each category is a small, indexed PostgREST read (rows + exact count) run in
// parallel. The MV is ~7.5k rows so every query is sub-100ms. Sales are shown
// AS-IS — no vanity cap (these are settled marks, per the constitution).

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import { WINDOW_SPECS, type TimeWindow } from "@/components/global/window-types";

export interface SpecialSaleRow {
  transaction_id: string;
  gross_amount_usd: number;
  completed_at: string | null;
  buyer_safe_name: string | null;
  seller_safe_name: string | null;
  moment_id: string | null;
  moment_flow_id: string | null;
  serial_number: number | null;
  subedition_id: string | null;
  edition_id: string | null;
  edition_name: string | null;
  set_name: string | null;
  series_number: number | null;
  play_name: string | null;
  player_id: string | null;
  player_name: string | null;
  jersey_number: string | null;
  tier_name: string | null;
  circulation: number | null;
  team_id: string | null;
  parallel_name: string | null;
  is_serial_one: boolean;
  is_omega: boolean;
  is_galactic: boolean;
  is_jersey_match: boolean;
  is_low_serial: boolean;
  is_last_serial: boolean;
}

export type SpecialCategory =
  | "serial_one"
  | "jersey"
  | "omega"
  | "galactic"
  | "low_serial";

const CATEGORY_FLAG: Record<SpecialCategory, keyof SpecialSaleRow> = {
  serial_one: "is_serial_one",
  jersey: "is_jersey_match",
  omega: "is_omega",
  galactic: "is_galactic",
  low_serial: "is_low_serial",
};

const SELECT =
  "transaction_id,gross_amount_usd,completed_at,buyer_safe_name,seller_safe_name," +
  "moment_id,moment_flow_id,serial_number,subedition_id,edition_id,edition_name," +
  "set_name,series_number,play_name,player_id,player_name,jersey_number,tier_name," +
  "circulation,team_id,parallel_name,is_serial_one,is_omega,is_galactic," +
  "is_jersey_match,is_low_serial,is_last_serial";

export interface SpecialCategoryResult {
  rows: SpecialSaleRow[];
  count: number;
}

export interface SpecialSalesData {
  hero: SpecialSaleRow[];
  serial_one: SpecialCategoryResult;
  jersey: SpecialCategoryResult;
  omega: SpecialCategoryResult;
  galactic: SpecialCategoryResult;
  low_serial: SpecialCategoryResult;
  windowLabel: string;
}

function cutoffFor(window: TimeWindow): string | null {
  const ms = WINDOW_SPECS[window].ms;
  if (ms == null) return null;
  return new Date(Date.now() - ms).toISOString();
}

const EMPTY: SpecialCategoryResult = { rows: [], count: 0 };

function coerce(rows: unknown): SpecialSaleRow[] {
  return ((rows as SpecialSaleRow[] | null) ?? []).map((r) => ({
    ...r,
    gross_amount_usd: Number(r.gross_amount_usd),
  }));
}

async function _getSpecialSales(window: TimeWindow): Promise<SpecialSalesData> {
  const windowLabel = WINDOW_SPECS[window].label;
  const empty: SpecialSalesData = {
    hero: [],
    serial_one: EMPTY,
    jersey: EMPTY,
    omega: EMPTY,
    galactic: EMPTY,
    low_serial: EMPTY,
    windowLabel,
  };

  const sb = getSupabaseServerAnon();
  if (!sb) return empty;
  const cutoff = cutoffFor(window);

  const view = "mv_special_sales";

  // Rows for one category: top-N by price, optionally windowed.
  const categoryRows = async (cat: SpecialCategory, limit: number) => {
    let q = sb
      .from(view)
      .select(SELECT)
      .eq(CATEGORY_FLAG[cat] as string, true)
      .order("gross_amount_usd", { ascending: false })
      .limit(limit);
    if (cutoff) q = q.gte("completed_at", cutoff);
    const { data, error } = await q;
    if (error) {
      console.error(`[special-sales] ${cat} rows failed`, error.message);
      return [];
    }
    return coerce(data);
  };

  // Exact count for one category (head request — no rows over the wire).
  const categoryCount = async (cat: SpecialCategory) => {
    let q = sb
      .from(view)
      .select(CATEGORY_FLAG[cat] as string, { count: "exact", head: true })
      .eq(CATEGORY_FLAG[cat] as string, true);
    if (cutoff) q = q.gte("completed_at", cutoff);
    const { count, error } = await q;
    if (error) {
      console.error(`[special-sales] ${cat} count failed`, error.message);
      return 0;
    }
    return count ?? 0;
  };

  // Hero = the biggest special sales overall in the window.
  const heroQuery = (async () => {
    let q = sb
      .from(view)
      .select(SELECT)
      .order("gross_amount_usd", { ascending: false })
      .limit(3);
    if (cutoff) q = q.gte("completed_at", cutoff);
    const { data, error } = await q;
    if (error) {
      console.error(`[special-sales] hero failed`, error.message);
      return [];
    }
    return coerce(data);
  })();

  const [
    hero,
    s1Rows, s1Count,
    jRows, jCount,
    oRows, oCount,
    gRows, gCount,
    lRows, lCount,
  ] = await Promise.all([
    heroQuery,
    categoryRows("serial_one", 12), categoryCount("serial_one"),
    categoryRows("jersey", 12), categoryCount("jersey"),
    categoryRows("omega", 12), categoryCount("omega"),
    categoryRows("galactic", 12), categoryCount("galactic"),
    categoryRows("low_serial", 12), categoryCount("low_serial"),
  ]);

  return {
    hero,
    serial_one: { rows: s1Rows, count: s1Count },
    jersey: { rows: jRows, count: jCount },
    omega: { rows: oRows, count: oCount },
    galactic: { rows: gRows, count: gCount },
    low_serial: { rows: lRows, count: lCount },
    windowLabel,
  };
}

export const getSpecialSales = (window: TimeWindow) =>
  unstable_cache(
    () => _getSpecialSales(window),
    ["special-sales", window],
    { revalidate: 120, tags: ["special-sales", "largest-sales"] },
  )();
