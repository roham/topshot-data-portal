// Grail Index — Vaultopolis-canonical 184-edition blue-chip basket.
//
// Basket source: research/data-schema/grail-225-with-edition-ids-2026-05-19.csv
// Column 6 of each row is a compound key {set_id}+{play_id}. We parse it,
// dedupe to ~166 unique (set_id, play_id) pairs, resolve each to its
// editions.edition_id, then compute a value-weighted index across those.
//
// Math (identical to ts50-synthesizer):
//   - Weights: w_i = mcap_i(latest) / Σ mcap_j(latest)
//   - Series: I(d) = 100 × Σ w_i × mcap_i(d) / mcap_i(d_0)
//   - Editions missing on date d carry forward last known value (P4 gap-tolerant)
//
// Faithful (P1) — no smoothing, vanity 1-of-1s included. Snapshot-vs-snapshot.

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import { getEditionLastSales } from "@/lib/supabase/queries/edition-last-sale";

const CSV_RELATIVE_PATH = "research/data-schema/grail-225-with-edition-ids-2026-05-19.csv";
// Supplement: 33 grails whose canonical-CSV rows had match_confidence "none"
// (no edition_id — mostly 2025 rookies/WNBA + marquee veterans). Re-resolved
// 2026-05-31 by player → top editions by realized last-sale value (≥$1K),
// excluding the already-matched 166. Recovers LeBron/Wemby/Curry/KD/Tatum/SGA/
// Flagg grails the stale CSV dropped. col 0 = compound edition_id.
const SUPPLEMENT_RELATIVE_PATH = "research/data-schema/grail-supplement-resolved.csv";
const MAX_LOOKBACK_DAYS = 365;

export interface GrailSeriesPoint {
  date: string;
  index_value: number;
  basket_mcap_usd: number;
}

export interface GrailConstituentRow {
  edition_id: string;
  /** Sub-edition (parallel) id; null = Base. Each (edition × subedition) is its own market. */
  subedition_id: string | null;
  player_name: string | null;
  set_name: string | null;
  tier_name: string | null;
  weight: number;
  current_mcap_usd: number;
}

export interface GrailIndexResult {
  series: GrailSeriesPoint[];
  constituents: GrailConstituentRow[];
  as_of_date: string | null;
  series_start_date: string | null;
  basket_mcap_total_usd: number;
  latest_index_value: number;
  series_pct_change: number;
  days_of_history: number;
  /** Total rows in the Vaultopolis canonical CSV (the published target — currently 225). */
  basket_canonical_count: number;
  /** Rows in the canonical CSV that had a non-empty edition_id (match_confidence != "none"). */
  basket_matched_count: number;
  /** Editions parsed from the CSV (deduped on set_id+play_id). Multiple supply tiers can collapse to one entry. */
  basket_target_size: number;
  /** Editions actually resolved against the editions table. */
  basket_resolved_size: number;
  /** Editions in the basket that have ≥ 1 mcap snapshot in the window. */
  basket_active_size: number;
}

const EMPTY: GrailIndexResult = {
  series: [],
  constituents: [],
  as_of_date: null,
  series_start_date: null,
  basket_mcap_total_usd: 0,
  latest_index_value: 100,
  series_pct_change: 0,
  days_of_history: 0,
  basket_canonical_count: 0,
  basket_matched_count: 0,
  basket_target_size: 0,
  basket_resolved_size: 0,
  basket_active_size: 0,
};

interface GrailBasketParse {
  /** Total non-blank rows in the canonical CSV (the published target). */
  canonicalCount: number;
  /** Rows that had a non-empty compound edition_id (match_confidence != "none"). */
  matchedCount: number;
  /** Unique edition_ids after deduplication (multiple supply tiers can collapse to one). */
  uniqueIds: string[];
}

/** Parse the Vaultopolis canonical CSV → counts + deduped edition_ids.
 *  Column 6 of the CSV is the compound {set_id}+{play_id} string, which IS
 *  the editions.edition_id key (verified against schema 2026-05-19).
 *
 *  Returns three counts so the UI can be honest about the gap between the
 *  canonical list size (225) and what we actually resolve (~166):
 *    canonicalCount  → CSV rows total (the Vaultopolis-published target)
 *    matchedCount    → rows with a non-empty edition_id (match_confidence != none)
 *    uniqueIds       → set of distinct edition_ids (matchedCount - same-edition dedup)
 *  Gap: canonicalCount - matchedCount = unresolved-against-editions-table rows
 *       (currently 41: 2025 rookies + specific veteran parallels not yet in the
 *       editions table). Tracked as a follow-up data-engineering task.
 *  Gap: matchedCount - uniqueIds.length = supply-tier collapses (correct behavior —
 *       same edition listed multiple times at different supply rarities).
 */
async function parseGrailBasket(): Promise<GrailBasketParse> {
  const path = join(process.cwd(), CSV_RELATIVE_PATH);
  const text = await readFile(path, "utf-8");
  const lines = text.split("\n").slice(1); // drop header
  const ids = new Set<string>();
  let canonicalCount = 0;
  let matchedCount = 0;
  // Greedy distinct-edition assignment. The matcher resolved several rows to the
  // SAME edition_id (col 5) even though they're distinct editions (e.g. a play's
  // /31 vs /49 supply variants) — their true edition is the SECOND candidate in
  // col 13. Assigning each row the first of its candidates not already taken
  // de-collides them (166 → 171), instead of naively deduping on col 5.
  for (const line of lines) {
    if (!line.trim()) continue;
    canonicalCount += 1;
    const cols = line.split(",");
    const primary = cols[5]?.trim();
    const candidates = (cols[13] ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter((x) => x.includes("+"));
    const pool = candidates.length > 0 ? candidates : (primary && primary.includes("+") ? [primary] : []);
    if (pool.length === 0) continue;
    matchedCount += 1;
    const pick = pool.find((c) => !ids.has(c)) ?? pool[0];
    ids.add(pick);
  }
  // Merge the re-resolved supplement (recovers the marquee grails the canonical
  // CSV failed to map — match_confidence "none"). Each supplement edition_id is
  // a real, priced, last-sale-backed edition. Optional file; absence is fine.
  try {
    const supText = await readFile(join(process.cwd(), SUPPLEMENT_RELATIVE_PATH), "utf-8");
    for (const line of supText.split("\n").slice(1)) {
      if (!line.trim()) continue;
      const eid = line.split(",")[0]?.trim();
      if (eid && eid.includes("+") && !ids.has(eid)) {
        ids.add(eid);
        matchedCount += 1;
      }
    }
  } catch {
    // supplement not present — basket falls back to the 166 canonical matches
  }
  return { canonicalCount, matchedCount, uniqueIds: Array.from(ids) };
}

async function fetchInner(lookbackDays: number): Promise<GrailIndexResult> {
  const sb = getSupabaseServerAnon();
  if (!sb) return EMPTY;

  // 1. Parse canonical basket — column 6 IS the editions.edition_id directly.
  //    Returns three counts: canonicalCount (CSV rows total, the published 225),
  //    matchedCount (rows with non-empty edition_id), uniqueIds (deduped to set+play).
  let parsed: GrailBasketParse;
  try {
    parsed = await parseGrailBasket();
  } catch (err) {
    console.error("[grail] CSV parse failed", err);
    return EMPTY;
  }
  const { canonicalCount, matchedCount, uniqueIds: basketEditionIds } = parsed;
  if (basketEditionIds.length === 0) {
    return { ...EMPTY, basket_canonical_count: canonicalCount, basket_matched_count: matchedCount };
  }

  // 2. Pull edition metadata for those ids (player_name, tier_name) for the
  //    constituents table. set_name lives on the `sets` table; we fetch it
  //    separately if/when needed for the deep view.
  type EdLookup = {
    edition_id: string;
    player_name: string | null;
    tier_name: string | null;
    edition_name: string | null;
  };
  const edLookup: EdLookup[] = [];
  // 100, not 500: a 199-edition basket's compound ids in one .in() exceed
  // Supabase's request-URL length limit (intermittent "fetch failed"). 100
  // compound ids ≈ 7KB URL — comfortably safe. Applies to every .in(editionIds).
  const CHUNK = 100;
  for (let i = 0; i < basketEditionIds.length; i += CHUNK) {
    const chunk = basketEditionIds.slice(i, i + CHUNK);
    const { data } = await sb
      .from("editions")
      .select("edition_id, player_name, tier_name, edition_name")
      .in("edition_id", chunk);
    for (const r of (data as EdLookup[] | null) ?? []) edLookup.push(r);
  }
  const editionIdToMeta = new Map<string, EdLookup>();
  for (const e of edLookup) editionIdToMeta.set(e.edition_id, e);
  const editionIds = basketEditionIds.filter((id) => editionIdToMeta.has(id));
  if (editionIds.length === 0) {
    return {
      ...EMPTY,
      basket_canonical_count: canonicalCount,
      basket_matched_count: matchedCount,
      basket_target_size: basketEditionIds.length,
    };
  }

  // 3. Latest snapshot date
  const { data: latestRow } = await sb
    .from("market_caps")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const asOfDate = (latestRow as { date: string } | null)?.date ?? null;
  if (!asOfDate) {
    return {
      ...EMPTY,
      basket_canonical_count: canonicalCount,
      basket_matched_count: matchedCount,
      basket_target_size: basketEditionIds.length,
      basket_resolved_size: editionIds.length,
    };
  }

  // 4. Current mcap per basket edition on latest date
  const currentMcap = new Map<string, number>();
  const circByEdition = new Map<string, number>();
  for (let i = 0; i < editionIds.length; i += CHUNK) {
    const chunk = editionIds.slice(i, i + CHUNK);
    const { data } = await sb
      .from("market_caps")
      .select("edition_id, market_cap, num_moments_in_circulation")
      .eq("date", asOfDate)
      .in("edition_id", chunk)
      .not("market_cap", "is", null)
      .gt("market_cap", 0);
    for (const r of (data as { edition_id: string; market_cap: number | string; num_moments_in_circulation: number | string }[] | null) ?? []) {
      currentMcap.set(r.edition_id, Number(r.market_cap) || 0);
      circByEdition.set(r.edition_id, Number(r.num_moments_in_circulation) || 0);
    }
  }
  const basketMcapTotal = Array.from(currentMcap.values()).reduce((s, v) => s + v, 0);

  // VANITY-PROOF CAP (2026-05-31). Floor mcap = lowest_ask × circ imputes a single
  // ask across every moment — one $500K vanity ask on a /50 Curry (last REAL sale
  // $4,500) inflated the basket by ~$10M. Cap each edition's displayed value at its
  // last realized sale × circulation (mv_edition_last_sale, 365d window, 157/166
  // grails covered). Editions never sold keep floor. Applied to the $ headline, the
  // $ series, and the constituents table; the index_value weighting keeps its own
  // outlier logic. See research/FINDING-grail-vanity-ask.md.
  const lastSales = await getEditionLastSales(editionIds);
  const capByEdition = new Map<string, number>();
  for (const [eid, ls] of lastSales.entries()) {
    const circ = circByEdition.get(eid) ?? 0;
    if (ls.last_sale_usd > 0 && circ > 0) capByEdition.set(eid, ls.last_sale_usd * circ);
  }
  const capped = (eid: string, v: number): number => {
    const cap = capByEdition.get(eid);
    return cap != null ? Math.min(v, cap) : v;
  };
  if (basketMcapTotal <= 0) {
    return {
      ...EMPTY,
      basket_canonical_count: canonicalCount,
      basket_matched_count: matchedCount,
      basket_target_size: basketEditionIds.length,
      basket_resolved_size: editionIds.length,
      as_of_date: asOfDate,
    };
  }

  // 5. Daily basket total via RPC (server-side SUM GROUP BY date). Replaces the
  //    per-edition history fan-out + JS pivot, which TIMED OUT for 90D/1Y/2Y
  //    windows (the chart silently went empty — "90 days says nothing"). One row
  //    per date is exactly what the series needs; index_basket_daily uses
  //    idx_marketcaps_edition and a 60s statement timeout.
  // Cap the lookback: the daily RPC over the full 880-day history exceeds the
  // statement timeout. 400 days (~13 months) covers the meaningful range and
  // renders in <6s; 'all'/'2y' effectively show the trailing ~13 months.
  const effLookbackDays = Math.min(lookbackDays, 400);
  const sinceDate = new Date(new Date(asOfDate).getTime() - effLookbackDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const { data: dailyData, error: dailyErr } = await sb.rpc("index_basket_daily", {
    p_edition_ids: editionIds,
    p_since: sinceDate,
  });
  if (dailyErr) console.error("[grail] index_basket_daily failed", dailyErr);
  const daily = (((dailyData as { d: string; total_usd: number | string }[] | null) ?? [])
    .map((r) => ({ date: r.d, total: Number(r.total_usd) || 0 }))
    .filter((r) => r.total > 0));
  if (daily.length === 0) {
    return {
      ...EMPTY,
      basket_canonical_count: canonicalCount,
      basket_matched_count: matchedCount,
      basket_target_size: basketEditionIds.length,
      basket_resolved_size: editionIds.length,
      as_of_date: asOfDate,
    };
  }
  const seriesStartDate = daily[0].date;
  const baseTotal = daily[0].total;
  // Raw edition-level series; basket_mcap_usd scaled to parallel-grain below.
  const series: GrailSeriesPoint[] = daily.map((p) => ({
    date: p.date,
    index_value: baseTotal > 0 ? 100 * (p.total / baseTotal) : 100,
    basket_mcap_usd: p.total,
  }));
  const latestDailyRaw = daily[daily.length - 1].total;
  const latestIndexValue = series[series.length - 1].index_value;
  const seriesPctChange =
    series.length >= 2 && series[0].index_value > 0
      ? ((latestIndexValue - series[0].index_value) / series[0].index_value) * 100
      : 0;

  // 10. PARALLEL-GRAIN constituents + headline. Priced per (edition × subedition)
  // from moments (grail-subedition-marketcap.csv) — each parallel its own market
  // (constitution Principle IV), instead of the parallel-blind edition floor. The
  // edition-level series above supplies the daily SHAPE (no sub-edition history
  // exists yet); we scale it to the parallel-grain level so the chart's last point
  // equals the headline. Base tier keeps the last-sale vanity cap; scarce parallels
  // (low circ → low ask-amplification) sit at floor.
  const SUB_PATH = "research/data-schema/grail-subedition-marketcap.csv";
  const subRows: { eid: string; sub: string; circ: number; floor: number }[] = [];
  try {
    const t = await readFile(join(process.cwd(), SUB_PATH), "utf-8");
    for (const line of t.split("\n").slice(1)) {
      if (!line.trim()) continue;
      const p = line.split(",");
      const eid = p[0]?.trim();
      if (!eid || !editionIdToMeta.has(eid)) continue;
      const circ = Number(p[2]);
      const floor = Number(p[3]);
      if (!(circ > 0) || !(floor > 0)) continue;
      subRows.push({ eid, sub: (p[1] ?? "").trim(), circ, floor });
    }
  } catch {
    // snapshot absent — fall back to edition-level constituents below
  }

  let constituents: GrailConstituentRow[];
  let headlineTotal: number;

  if (subRows.length > 0) {
    const priced = subRows.map((r) => {
      const isBase = r.sub === "" || r.sub === "0";
      let mcap = r.floor * r.circ;
      if (isBase) {
        const ls = lastSales.get(r.eid);
        if (ls && ls.last_sale_usd > 0) mcap = Math.min(mcap, ls.last_sale_usd * r.circ);
      }
      return { r, mcap };
    });
    headlineTotal = priced.reduce((s, x) => s + x.mcap, 0);
    constituents = priced
      .map(({ r, mcap }) => {
        const meta = editionIdToMeta.get(r.eid);
        return {
          edition_id: r.eid,
          subedition_id: r.sub === "" || r.sub === "0" ? null : r.sub,
          player_name: meta?.player_name ?? null,
          set_name: null,
          tier_name: meta?.tier_name ?? null,
          weight: headlineTotal > 0 ? mcap / headlineTotal : 0,
          current_mcap_usd: mcap,
        };
      })
      .sort((a, b) => b.current_mcap_usd - a.current_mcap_usd);
  } else {
    // Fallback: parallel snapshot absent → edition-level (capped) constituents.
    const edTotals = Array.from(currentMcap.entries()).map(([eid, mcap]) => ({ eid, mcap: capped(eid, mcap) }));
    headlineTotal = edTotals.reduce((s2, x) => s2 + x.mcap, 0);
    constituents = edTotals
      .map(({ eid, mcap }) => {
        const meta = editionIdToMeta.get(eid);
        return {
          edition_id: eid,
          subedition_id: null,
          player_name: meta?.player_name ?? null,
          set_name: null,
          tier_name: meta?.tier_name ?? null,
          weight: headlineTotal > 0 ? mcap / headlineTotal : 0,
          current_mcap_usd: mcap,
        };
      })
      .sort((a, b) => b.current_mcap_usd - a.current_mcap_usd);
  }

  // Scale the daily $ series to the parallel-grain level (shape preserved).
  const scale = latestDailyRaw > 0 ? headlineTotal / latestDailyRaw : 1;
  const scaledSeries = series.map((p) => ({ ...p, basket_mcap_usd: p.basket_mcap_usd * scale }));

  return {
    series: scaledSeries,
    constituents,
    as_of_date: asOfDate,
    series_start_date: seriesStartDate,
    basket_mcap_total_usd: headlineTotal,
    latest_index_value: latestIndexValue,
    series_pct_change: seriesPctChange,
    days_of_history: series.length,
    basket_canonical_count: canonicalCount,
    basket_matched_count: matchedCount,
    basket_target_size: basketEditionIds.length,
    basket_resolved_size: subRows.length > 0 ? subRows.length : editionIds.length,
    basket_active_size: editionIds.length,
  };
}

// Cache key derived from a hash of the synthesizer source — code change → automatic
// cache invalidation. No more manual v2/v3/v4 bumping.
const SYNTHESIZER_VERSION = createHash("sha256")
  .update(fetchInner.toString())
  .digest("hex")
  .slice(0, 8);

// V9 iter-5 — explicit cache-key suffix to bust stale 7d-on-30d production
// cache entries. The SHA-based SYNTHESIZER_VERSION rotates when fetchInner's
// source changes, BUT prod-minified comments don't affect the toString output —
// only real code changes do. Explicit "v9-iter5" suffix forces a fresh cache
// slot regardless of minifier behavior. Bump on future cache-stuck incidents.
const CACHE_KEY_SUFFIX = "v15-rpc-capped-2026-06-01";
export const getGrailIndex = (lookbackDays = MAX_LOOKBACK_DAYS) =>
  unstable_cache(
    () => fetchInner(lookbackDays),
    ["grail-index", SYNTHESIZER_VERSION, CACHE_KEY_SUFFIX, String(lookbackDays)],
    { revalidate: 60 * 60, tags: ["grail-index"] }
  )();
