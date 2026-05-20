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

const CSV_RELATIVE_PATH = "research/data-schema/grail-225-with-edition-ids-2026-05-19.csv";
const MAX_LOOKBACK_DAYS = 365;

export interface GrailSeriesPoint {
  date: string;
  index_value: number;
  basket_mcap_usd: number;
}

export interface GrailConstituentRow {
  edition_id: string;
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
  for (const line of lines) {
    if (!line.trim()) continue;
    canonicalCount += 1;
    const cols = line.split(",");
    const editionId = cols[5]?.trim();
    if (!editionId || !editionId.includes("+")) continue;
    matchedCount += 1;
    ids.add(editionId);
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
  const CHUNK = 500;
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
  for (let i = 0; i < editionIds.length; i += CHUNK) {
    const chunk = editionIds.slice(i, i + CHUNK);
    const { data } = await sb
      .from("market_caps")
      .select("edition_id, market_cap")
      .eq("date", asOfDate)
      .in("edition_id", chunk)
      .not("market_cap", "is", null)
      .gt("market_cap", 0);
    for (const r of (data as { edition_id: string; market_cap: number | string }[] | null) ?? []) {
      currentMcap.set(r.edition_id, Number(r.market_cap) || 0);
    }
  }
  const basketMcapTotal = Array.from(currentMcap.values()).reduce((s, v) => s + v, 0);
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

  // 5. History fan-out across basket
  const sinceDate = new Date(
    new Date(asOfDate).getTime() - lookbackDays * 86_400_000
  )
    .toISOString()
    .slice(0, 10);

  // V9 iter-5 CORRECTIVE — fetch-until-empty pagination.
  //
  // Prior pattern: probe count via `select("*", { count: "exact", head: true })`
  // then parallel-paginate based on Math.ceil(histCount / PAGE). The probe
  // looks correct locally (returns 4412 / 5 pages for 30D Grail) but in
  // production the count probe can return `null` under serverless function
  // pressure (timeout, cold-start, concurrency limits). The fallback
  // `Math.max(1, Math.ceil(0/PAGE))=1` silently degrades to a single-page
  // fetch — exactly 1000 rows = ~6 days × 166 editions = the 7-day chart
  // truncation Roham observed on prod.
  //
  // New pattern: sequential pagination with break-on-short-page. Each page
  // fetches PAGE rows; if a page returns fewer than PAGE rows, we know that's
  // the last page. Bounded by MAX_PAGES (60) to prevent runaway under data
  // pathology. ~3x slower than count-then-parallel under happy path (~5
  // sequential round-trips vs 1 batched), but correct under all conditions.
  // 30D Grail (~5 pages × ~800ms RTT = ~4s) comfortably under the page's
  // maxDuration=60 budget.
  const allHistory: { date: string; edition_id: string; market_cap: number }[] = [];
  const PAGE = 1000;
  const MAX_PAGES = 60;
  const baseQuery = () =>
    sb
      .from("market_caps")
      .select("date, edition_id, market_cap")
      .in("edition_id", editionIds)
      .gte("date", sinceDate)
      .not("market_cap", "is", null)
      .gt("market_cap", 0)
      .order("date", { ascending: true })
      .order("edition_id", { ascending: true });

  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data, error } = await baseQuery().range(from, to);
    if (error) {
      console.error(`[grail] history page ${page} failed`, error);
      throw error;
    }
    const rows =
      (data as { date: string; edition_id: string; market_cap: number | string }[] | null) ?? [];
    for (const r of rows) {
      allHistory.push({
        date: r.date,
        edition_id: r.edition_id,
        market_cap: Number(r.market_cap) || 0,
      });
    }
    // Break when page returned fewer than PAGE rows — that's the last page.
    if (rows.length < PAGE) break;
  }
  if (allHistory.length >= MAX_PAGES * PAGE) {
    console.warn(`[grail] MAX_PAGES=${MAX_PAGES} hit; series may be truncated. lookbackDays=${lookbackDays}`);
  }
  if (allHistory.length === 0) {
    return {
      ...EMPTY,
      basket_canonical_count: canonicalCount,
      basket_matched_count: matchedCount,
      basket_target_size: basketEditionIds.length,
      basket_resolved_size: editionIds.length,
      as_of_date: asOfDate,
    };
  }

  // 6. Pivot — single forward pass. allHistory comes pre-sorted by
  // (date ASC, edition_id ASC) from the query above.
  const byEdition = new Map<string, Map<string, number>>();
  const dates: string[] = [];
  let prevDate = "";
  for (const h of allHistory) {
    if (h.date !== prevDate) {
      dates.push(h.date);
      prevDate = h.date;
    }
    if (!byEdition.has(h.edition_id)) byEdition.set(h.edition_id, new Map());
    byEdition.get(h.edition_id)!.set(h.date, h.market_cap);
  }
  if (dates.length === 0) {
    return {
      ...EMPTY,
      basket_canonical_count: canonicalCount,
      basket_matched_count: matchedCount,
      basket_target_size: basketEditionIds.length,
      basket_resolved_size: editionIds.length,
      as_of_date: asOfDate,
    };
  }
  const seriesStartDate = dates[0];

  // 7. Robust weighting:
  //    (a) Exclude editions whose current mcap > 5× their median observed mcap
  //        in the window — these are outliers (stuck listings, ETL artifacts).
  //        Example: Stephen Curry Holo MMXX with stuck $500K floor produces
  //        current_mcap=$10M vs window-median ~$134K → 75× → excluded.
  //    (b) Among the remaining editions, cap each weight at 2%.
  //    No redistribution of excess weight; basket sum < 1 is fine (it cancels
  //    in the ratio).
  const MAX_WEIGHT = 0.02;
  const OUTLIER_RATIO = 5;

  // Compute window-median per edition (robust to single-day spikes/drops).
  const medianByEdition = new Map<string, number>();
  for (const [eid, dmap] of byEdition.entries()) {
    const values: number[] = [];
    for (const v of dmap.values()) if (v > 0) values.push(v);
    if (values.length === 0) continue;
    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    medianByEdition.set(
      eid,
      values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid]
    );
  }

  const weights = new Map<string, number>();
  const excluded: string[] = [];
  for (const [eid, m] of currentMcap.entries()) {
    const median = medianByEdition.get(eid);
    if (median && median > 0 && m / median > OUTLIER_RATIO) {
      excluded.push(eid);
      continue;
    }
    const raw = m / basketMcapTotal;
    weights.set(eid, Math.min(raw, MAX_WEIGHT));
  }
  if (excluded.length > 0) {
    console.log(`[grail] excluded ${excluded.length} outlier editions (current > 5× window-median)`);
  }

  // 8. Series — basket-level normalization with BIDIRECTIONAL carry-forward.
  //
  // Math: index_value(d) = 100 × Σ_i w_i × mcap_i(d) / Σ_i w_i × mcap_i(d_0)
  //
  // Outlier handling (basket-level): one edition with a tiny baseline can't
  // blow up the index — the weighted basket sum at d_0 absorbs it.
  //
  // Sparse-coverage handling (bidirectional fill): if edition i has no data
  // at d_0 (e.g., a newer edition that didn't exist yet), its baseline gets
  // the FIRST FORWARD value (back-filled). This keeps the basket fully
  // composed at d_0 — without it, a basket where only 5% of editions had
  // data 30d ago produces index values like 4282 because startWSum is tiny.
  //
  // ETL gaps: standard forward carry-forward (use last known value).
  //
  // This is the practical compromise for retrospective indices on a basket
  // whose composition is fixed today but where individual editions may have
  // entered the market at different historical times.
  const firstObserved = new Map<string, number>(); // first positive mcap per edition
  for (const h of allHistory) {
    if (h.market_cap > 0 && !firstObserved.has(h.edition_id)) {
      firstObserved.set(h.edition_id, h.market_cap);
    }
  }

  // Forward-fill state initialized to first-observed (== backward-fill for dates
  // before each edition's first appearance).
  const lastKnown = new Map<string, number>(firstObserved);
  const weightedSumByDate: number[] = [];
  const rawSumByDate: number[] = [];
  for (const d of dates) {
    let wSum = 0;
    let rawSum = 0;
    for (const eid of editionIds) {
      const w = weights.get(eid) ?? 0;
      if (w === 0) continue;
      const dmap = byEdition.get(eid);
      const today = dmap?.get(d);
      const useVal = today ?? lastKnown.get(eid) ?? 0;
      if (today && today > 0) lastKnown.set(eid, today);
      if (useVal > 0) {
        wSum += w * useVal;
        rawSum += useVal;
      }
    }
    weightedSumByDate.push(wSum);
    rawSumByDate.push(rawSum);
  }
  const startWSum = weightedSumByDate[0] || 0;
  const series: GrailSeriesPoint[] = dates.map((d, i) => ({
    date: d,
    index_value: startWSum > 0 ? 100 * (weightedSumByDate[i] / startWSum) : 0,
    basket_mcap_usd: rawSumByDate[i],
  }));
  const latestIndexValue = series[series.length - 1]?.index_value ?? 100;
  const seriesPctChange =
    series.length >= 2 && series[0].index_value > 0
      ? ((series[series.length - 1].index_value - series[0].index_value) /
          series[0].index_value) *
        100
      : 0;

  // 10. Constituents table — sort by weight descending
  const constituents: GrailConstituentRow[] = Array.from(currentMcap.entries())
    .map(([eid, mcap]) => {
      const meta = editionIdToMeta.get(eid);
      return {
        edition_id: eid,
        player_name: meta?.player_name ?? null,
        set_name: null, // set_name lives on the `sets` table; deep view joins it
        tier_name: meta?.tier_name ?? null,
        weight: weights.get(eid) ?? 0,
        current_mcap_usd: mcap,
      };
    })
    .sort((a, b) => b.weight - a.weight);

  return {
    series,
    constituents,
    as_of_date: asOfDate,
    series_start_date: seriesStartDate,
    basket_mcap_total_usd: basketMcapTotal,
    latest_index_value: latestIndexValue,
    series_pct_change: seriesPctChange,
    days_of_history: dates.length,
    basket_canonical_count: canonicalCount,
    basket_matched_count: matchedCount,
    basket_target_size: basketEditionIds.length,
    basket_resolved_size: editionIds.length,
    basket_active_size: byEdition.size,
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
const CACHE_KEY_SUFFIX = "v9-iter5-2026-05-19";
export const getGrailIndex = (lookbackDays = MAX_LOOKBACK_DAYS) =>
  unstable_cache(
    () => fetchInner(lookbackDays),
    ["grail-index", SYNTHESIZER_VERSION, CACHE_KEY_SUFFIX, String(lookbackDays)],
    { revalidate: 60 * 60, tags: ["grail-index"] }
  )();
