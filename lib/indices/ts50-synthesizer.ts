// TS50 Composite Index — Top Shot's CL50 equivalent.
//
// Doctrine §0.1 comparable: Card Ladder Pro CL50 (signature move: index chart
// at top of home, top movers below). Doctrine §0.2 comparable for the math:
// TradingView equity-index (value-weighted, daily-grain, normalized to 100).
//
// Index definition (P1-compliant — faithful, never smoothed):
//   - Basket: top 50 editions by market_cap on the latest available snapshot
//     date in topshot.market_caps. Vanity 1-of-1s included (P1 — we never
//     "fix" the metric by anomaly-suppression).
//   - Weights: w_i = mcap_i(d_latest) / sum_j(mcap_j(d_latest)). Pure value-
//     weighted; no float-adjustment, no committee-decided weights.
//   - Series value: I(d) = 100 × sum_i(w_i × mcap_i(d) / mcap_i(d_0))
//     where d_0 is the FIRST snapshot date in the series, d_latest is the
//     LAST. The 100 normalization is the standard equity-index convention.
//
// Honest-absence per P4: if topshot.market_caps has fewer than 2 distinct
// dates, the series collapses to a single point and the chart will render
// an honest "Index is still accumulating snapshots" empty state.
//
// Cache: unstable_cache 1hr — index value is daily-grain so hourly is
// over-fresh, but keeps things responsive when ETL lands new snapshots.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface TS50SeriesPoint {
  /** ISO date string YYYY-MM-DD */
  date: string;
  /** Composite index value, normalized so the first point = 100 */
  index_value: number;
  /** Sum of constituent mcap on this date in USD (for hover detail) */
  basket_mcap_usd: number;
}

export interface TS50ConstituentRow {
  edition_id: string;
  player_name: string | null;
  set_name: string | null;
  tier_name: string | null;
  parallel_id: number | null;
  weight: number;
  current_mcap_usd: number;
}

export interface TS50IndexResult {
  series: TS50SeriesPoint[];
  constituents: TS50ConstituentRow[];
  /** Latest snapshot date in the data */
  as_of_date: string | null;
  /** First snapshot date in the series */
  series_start_date: string | null;
  /** Sum of all constituents' current mcap (the basket's nominal value) */
  basket_mcap_total_usd: number;
  /** Latest index value (always 100 × something; first point = 100 by construction) */
  latest_index_value: number;
  /** Change in index value over the full series, in % */
  series_pct_change: number;
  /** Days of history actually available */
  days_of_history: number;
  /** Did we hit a data sparsity wall? */
  is_thin: boolean;
}

const EMPTY_RESULT: TS50IndexResult = {
  series: [],
  constituents: [],
  as_of_date: null,
  series_start_date: null,
  basket_mcap_total_usd: 0,
  latest_index_value: 100,
  series_pct_change: 0,
  days_of_history: 0,
  is_thin: true,
};

// Cap on lookback days. Cards Ladder Pro CL50 shows up to 1y by default.
// We default to 365 but cap so the query stays cheap even when ETL has
// accumulated months of daily snapshots.
const MAX_LOOKBACK_DAYS = 365;
const BASKET_SIZE = 50;

async function fetchTS50Inner(lookbackDays: number): Promise<TS50IndexResult> {
  const sb = getSupabaseServerAnon();
  if (!sb) return EMPTY_RESULT;

  // ── Step 1: latest snapshot date ─────────────────────────────────────────
  const { data: latestRow, error: latestErr } = await sb
    .from("market_caps")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestErr || !latestRow) return EMPTY_RESULT;
  const asOfDate = (latestRow as { date: string }).date;

  // ── Step 2: top 50 editions by mcap on the latest date ───────────────────
  const { data: topRows, error: topErr } = await sb
    .from("market_caps")
    .select("edition_id, market_cap, num_moments_in_circulation, lowest_ask_price")
    .eq("date", asOfDate)
    .not("market_cap", "is", null)
    .gt("market_cap", 0)
    .order("market_cap", { ascending: false })
    .limit(BASKET_SIZE);
  if (topErr || !topRows || topRows.length === 0) return EMPTY_RESULT;

  type TopRow = { edition_id: string; market_cap: number | string };
  const top = (topRows as TopRow[]).map((r) => ({
    edition_id: r.edition_id,
    current_mcap: Number(r.market_cap) || 0,
  }));
  const basketIds = top.map((t) => t.edition_id);
  const basketMcapTotal = top.reduce((sum, t) => sum + t.current_mcap, 0);
  if (basketMcapTotal <= 0) return EMPTY_RESULT;

  // ── Step 3: daily mcap history for the basket ────────────────────────────
  const sinceDate = new Date(
    new Date(asOfDate).getTime() - lookbackDays * 86_400_000,
  )
    .toISOString()
    .slice(0, 10);

  // PostgREST 1000-row cap means at 50 editions × N days we paginate when
  // N > 20. Use range pagination.
  const allHistory: { date: string; edition_id: string; market_cap: number }[] = [];
  const PAGE = 1000;
  for (let page = 0; page < 100; page++) {
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data, error } = await sb
      .from("market_caps")
      .select("date, edition_id, market_cap")
      .in("edition_id", basketIds)
      .gte("date", sinceDate)
      .not("market_cap", "is", null)
      .gt("market_cap", 0)
      .order("date", { ascending: true })
      .order("edition_id", { ascending: true })
      .range(from, to);
    if (error) {
      console.error("[ts50] history page error", error);
      break;
    }
    type HistoryRow = { date: string; edition_id: string; market_cap: number | string };
    const rows = (data as HistoryRow[] | null) ?? [];
    if (rows.length === 0) break;
    for (const r of rows) {
      allHistory.push({
        date: r.date,
        edition_id: r.edition_id,
        market_cap: Number(r.market_cap) || 0,
      });
    }
    if (rows.length < PAGE) break;
  }
  if (allHistory.length === 0) return EMPTY_RESULT;

  // ── Step 4: pivot history into per-edition series ────────────────────────
  // Map<edition_id, Map<date, mcap>>
  const byEdition = new Map<string, Map<string, number>>();
  for (const h of allHistory) {
    if (!byEdition.has(h.edition_id)) byEdition.set(h.edition_id, new Map());
    byEdition.get(h.edition_id)!.set(h.date, h.market_cap);
  }
  // Distinct sorted dates across the full history
  const dateSet = new Set<string>();
  for (const h of allHistory) dateSet.add(h.date);
  const dates = Array.from(dateSet).sort();
  if (dates.length === 0) return EMPTY_RESULT;
  const seriesStartDate = dates[0];
  const isThin = dates.length < 7;

  // ── Step 5: compute per-edition baseline (first available mcap >= startDate) ─
  const baseline = new Map<string, number>();
  for (const [eid, dmap] of byEdition.entries()) {
    // Earliest date for which we have a mcap on this edition
    const sortedDates = Array.from(dmap.keys()).sort();
    for (const d of sortedDates) {
      const v = dmap.get(d) ?? 0;
      if (v > 0) {
        baseline.set(eid, v);
        break;
      }
    }
  }

  // ── Step 6: compute weights from latest mcap ────────────────────────────
  const weights = new Map<string, number>();
  for (const t of top) {
    weights.set(t.edition_id, t.current_mcap / basketMcapTotal);
  }

  // ── Step 7: compute index series ─────────────────────────────────────────
  // I(d) = 100 × sum_i(w_i × mcap_i(d) / baseline_i)
  // Editions missing a value on date d carry forward from the prior known
  // value (gap-tolerant, honest about ETL holes). Editions with no baseline
  // (no data anywhere in the window) are excluded from that day's sum.
  const series: TS50SeriesPoint[] = [];
  const lastKnown = new Map<string, number>(baseline); // start at baseline for carry-forward
  for (const d of dates) {
    let weightedRatio = 0;
    let basketSum = 0;
    let includedWeight = 0;
    for (const t of top) {
      const w = weights.get(t.edition_id) ?? 0;
      const base = baseline.get(t.edition_id);
      if (!base || base <= 0) continue;
      const dmap = byEdition.get(t.edition_id);
      const today = dmap?.get(d);
      const useVal = today ?? lastKnown.get(t.edition_id) ?? 0;
      if (today && today > 0) lastKnown.set(t.edition_id, today);
      if (useVal > 0) {
        weightedRatio += w * (useVal / base);
        basketSum += useVal;
        includedWeight += w;
      }
    }
    // Re-normalize by includedWeight so a single missing edition doesn't drag
    // the whole index down.
    const adjusted = includedWeight > 0 ? weightedRatio / includedWeight : 0;
    series.push({
      date: d,
      index_value: 100 * adjusted,
      basket_mcap_usd: basketSum,
    });
  }
  const latestIndexValue = series[series.length - 1]?.index_value ?? 100;
  const seriesPctChange =
    series.length >= 2
      ? ((series[series.length - 1].index_value - series[0].index_value) /
          series[0].index_value) * 100
      : 0;

  // ── Step 8: build constituent rows for the table render ─────────────────
  // Fetch edition metadata in batch.
  const { data: edata } = await sb
    .from("editions")
    .select("edition_id, player_name, set_name, tier_name, parallel_id")
    .in("edition_id", basketIds);
  type EdRow = {
    edition_id: string;
    player_name: string | null;
    set_name: string | null;
    tier_name: string | null;
    parallel_id: number | null;
  };
  const edMap = new Map<string, EdRow>();
  for (const e of (edata as EdRow[] | null) ?? []) edMap.set(e.edition_id, e);

  const constituents: TS50ConstituentRow[] = top.map((t) => {
    const ed = edMap.get(t.edition_id);
    return {
      edition_id: t.edition_id,
      player_name: ed?.player_name ?? null,
      set_name: ed?.set_name ?? null,
      tier_name: ed?.tier_name ?? null,
      parallel_id: ed?.parallel_id ?? null,
      weight: weights.get(t.edition_id) ?? 0,
      current_mcap_usd: t.current_mcap,
    };
  });

  return {
    series,
    constituents,
    as_of_date: asOfDate,
    series_start_date: seriesStartDate,
    basket_mcap_total_usd: basketMcapTotal,
    latest_index_value: latestIndexValue,
    series_pct_change: seriesPctChange,
    days_of_history: dates.length,
    is_thin: isThin,
  };
}

export const getTS50Index = (lookbackDays = MAX_LOOKBACK_DAYS) =>
  unstable_cache(
    () => fetchTS50Inner(lookbackDays),
    ["ts50-index", String(lookbackDays)],
    { revalidate: 60 * 60, tags: ["ts50-index"] },
  )();
