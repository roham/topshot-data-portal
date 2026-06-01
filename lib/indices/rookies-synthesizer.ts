// Rookies Index — current draft class basket.
//
// V1 basket: top 30 editions by current market cap restricted to players
// whose draft_year matches the current rookie cohort (2025 draft class).
// Falls back to 2024 if 2025-draft data hasn't been ingested.
//
// Same compute shape as ts50 / grail: value-weighted, carry-forward, normalized.

import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import { getEditionLastSales } from "@/lib/supabase/queries/edition-last-sale";
import { CURRENT_ROOKIE_YEAR } from "@/lib/indices/rookie-years";

const BASKET_SIZE = 30;
const MAX_LOOKBACK_DAYS = 365;

export interface RookiesSeriesPoint {
  date: string;
  index_value: number;
  basket_mcap_usd: number;
}

export interface RookiesConstituentRow {
  edition_id: string;
  player_name: string | null;
  set_name: string | null;
  tier_name: string | null;
  weight: number;
  current_mcap_usd: number;
}

export interface RookiesIndexResult {
  series: RookiesSeriesPoint[];
  constituents: RookiesConstituentRow[];
  as_of_date: string | null;
  series_start_date: string | null;
  basket_mcap_total_usd: number;
  latest_index_value: number;
  series_pct_change: number;
  days_of_history: number;
  is_thin: boolean;
  draft_year_used: string | null;
}

const EMPTY: RookiesIndexResult = {
  series: [],
  constituents: [],
  as_of_date: null,
  series_start_date: null,
  basket_mcap_total_usd: 0,
  latest_index_value: 100,
  series_pct_change: 0,
  days_of_history: 0,
  is_thin: true,
  draft_year_used: null,
};

async function fetchRookieIds(
  sb: NonNullable<ReturnType<typeof getSupabaseServerAnon>>,
  years: string[],
) {
  // Find a draft year (from the requested list) that has matching editions.
  for (const yr of years) {
    const { data: players } = await sb
      .from("players")
      .select("player_id")
      .eq("draft_year", yr);
    type P = { player_id: string };
    const playerIds = ((players as P[] | null) ?? []).map((p) => p.player_id);
    if (playerIds.length === 0) continue;

    // Find editions for these players (paginate IN if needed)
    const editionIds: string[] = [];
    const CHUNK = 500;
    for (let i = 0; i < playerIds.length; i += CHUNK) {
      const chunk = playerIds.slice(i, i + CHUNK);
      const { data: edRows } = await sb
        .from("editions")
        .select("edition_id")
        .in("player_id", chunk);
      type E = { edition_id: string };
      for (const r of ((edRows as E[] | null) ?? [])) editionIds.push(r.edition_id);
    }
    if (editionIds.length > 0) return { editionIds, draftYear: yr };
  }
  return { editionIds: [] as string[], draftYear: null as string | null };
}

async function fetchInner(lookbackDays: number, requestedYear: string): Promise<RookiesIndexResult> {
  const sb = getSupabaseServerAnon();
  if (!sb) return EMPTY;

  // Latest snapshot date
  const { data: latestRow } = await sb
    .from("market_caps")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const asOfDate = (latestRow as { date: string } | null)?.date ?? null;
  if (!asOfDate) return EMPTY;

  const { editionIds: rookieEditionIds, draftYear } = await fetchRookieIds(sb, [requestedYear]);
  if (rookieEditionIds.length === 0) return { ...EMPTY, draft_year_used: null };

  // Top N by mcap among rookie editions.
  //
  // CHUNK must stay small: edition_id is a compound `uuid+uuid` (~75 chars
  // url-encoded). PostgREST `.in()` serializes to a GET query string, and a
  // chunk of 500 IDs (~37KB) blows past the gateway's URI-length limit — the
  // request fails and supabase-js returns `{ data: null, error }`. The bug
  // this replaces swallowed that error and silently yielded an empty basket
  // (rookies had 279 editions → over the limit → empty; grail's smaller
  // basket squeaked under it, which is why grail worked and rookies didn't).
  // 100 IDs ≈ 7.5KB, comfortably under any reasonable limit. We surface the
  // error instead of swallowing it.
  const candidatePool: { edition_id: string; current_mcap: number; circ: number }[] = [];
  const CHUNK = 100;
  for (let i = 0; i < rookieEditionIds.length; i += CHUNK) {
    const chunk = rookieEditionIds.slice(i, i + CHUNK);
    const { data: capRows, error } = await sb
      .from("market_caps")
      .select("edition_id, market_cap, num_moments_in_circulation")
      .eq("date", asOfDate)
      .in("edition_id", chunk)
      .not("market_cap", "is", null)
      .gt("market_cap", 0)
      .order("market_cap", { ascending: false })
      .limit(BASKET_SIZE);
    if (error) {
      console.error(`[rookies] candidate-pool chunk ${i} failed`, error);
      throw error;
    }
    for (const r of ((capRows as { edition_id: string; market_cap: number | string; num_moments_in_circulation: number | string }[] | null) ?? [])) {
      candidatePool.push({
        edition_id: r.edition_id,
        current_mcap: Number(r.market_cap) || 0,
        circ: Number(r.num_moments_in_circulation) || 0,
      });
    }
  }
  candidatePool.sort((a, b) => b.current_mcap - a.current_mcap);
  const top = candidatePool.slice(0, BASKET_SIZE);
  if (top.length === 0) return { ...EMPTY, draft_year_used: draftYear };

  const basketIds = top.map((t) => t.edition_id);

  // VANITY-PROOF CAP (2026-05-31) — same fix as grail-synthesizer: cap each
  // edition at last realized sale × circ (mv_edition_last_sale) so a lone vanity
  // ask can't inflate the index via lowest_ask × circ. Applied to the headline,
  // both series, and constituents. See research/FINDING-grail-vanity-ask.md.
  const lastSales = await getEditionLastSales(basketIds);
  const capByEdition = new Map<string, number>();
  for (const t of top) {
    const ls = lastSales.get(t.edition_id);
    if (ls && ls.last_sale_usd > 0 && t.circ > 0) capByEdition.set(t.edition_id, ls.last_sale_usd * t.circ);
  }
  const capped = (eid: string, v: number): number => {
    const cap = capByEdition.get(eid);
    return cap != null ? Math.min(v, cap) : v;
  };
  const basketMcapTotal = top.reduce((s, t) => s + capped(t.edition_id, t.current_mcap), 0);
  if (basketMcapTotal <= 0) return { ...EMPTY, draft_year_used: draftYear };

  // History fan-out
  const sinceDate = new Date(
    new Date(asOfDate).getTime() - lookbackDays * 86_400_000
  )
    .toISOString()
    .slice(0, 10);

  // PERF: parallel-paginate + error-bubble (see grail-synthesizer.ts perf notes).
  const allHistory: { date: string; edition_id: string; market_cap: number }[] = [];
  const PAGE = 1000;
  const baseQuery = () =>
    sb
      .from("market_caps")
      .select("date, edition_id, market_cap")
      .in("edition_id", basketIds)
      .gte("date", sinceDate)
      .not("market_cap", "is", null)
      .gt("market_cap", 0)
      .order("date", { ascending: true })
      .order("edition_id", { ascending: true });

  // V9 iter-5 CORRECTIVE — fetch-until-empty pagination (see grail-synthesizer for full
  // diagnosis). The prior count-probe-then-parallel-paginate pattern silently degraded to
  // single-page (1000 rows) when count probe returned null under serverless pressure.
  const MAX_PAGES = 60;
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data, error } = await baseQuery().range(from, to);
    if (error) {
      console.error(`[rookies] history page ${page} failed`, error);
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
    if (rows.length < PAGE) break;
  }
  if (allHistory.length >= MAX_PAGES * PAGE) {
    console.warn(`[rookies] MAX_PAGES=${MAX_PAGES} hit; series may be truncated. lookbackDays=${lookbackDays}`);
  }
  if (allHistory.length === 0) return { ...EMPTY, draft_year_used: draftYear };

  // Single forward pass: pivot + dates.
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
  if (dates.length === 0) return { ...EMPTY, draft_year_used: draftYear };
  const seriesStartDate = dates[0];
  const isThin = dates.length < 7;

  // Robust weighting — see grail-synthesizer.ts for full math derivation.
  // (a) Exclude editions where current_mcap > 5× window-median (outliers).
  // (b) Cap remaining weights at 5% (rookies has fewer editions so cap is laxer).
  const MAX_WEIGHT = 0.05;
  const OUTLIER_RATIO = 5;

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
  for (const t of top) {
    const median = medianByEdition.get(t.edition_id);
    if (median && median > 0 && t.current_mcap / median > OUTLIER_RATIO) continue;
    const raw = t.current_mcap / basketMcapTotal;
    weights.set(t.edition_id, Math.min(raw, MAX_WEIGHT));
  }

  // Basket-level normalization with BIDIRECTIONAL carry-forward.
  // See grail-synthesizer.ts for math derivation + bug history (outliers, sparse-baseline).
  const firstObserved = new Map<string, number>();
  for (const h of allHistory) {
    if (h.market_cap > 0 && !firstObserved.has(h.edition_id)) {
      firstObserved.set(h.edition_id, h.market_cap);
    }
  }
  const lastKnown = new Map<string, number>(firstObserved);
  const weightedSumByDate: number[] = [];
  const rawSumByDate: number[] = [];
  for (const d of dates) {
    let wSum = 0;
    let rawSum = 0;
    for (const t of top) {
      const w = weights.get(t.edition_id) ?? 0;
      if (w === 0) continue;
      const dmap = byEdition.get(t.edition_id);
      const today = dmap?.get(d);
      const useValRaw = today ?? lastKnown.get(t.edition_id) ?? 0;
      if (today && today > 0) lastKnown.set(t.edition_id, today);
      const useVal = capped(t.edition_id, useValRaw);
      if (useVal > 0) {
        wSum += w * useVal;
        rawSum += useVal;
      }
    }
    weightedSumByDate.push(wSum);
    rawSumByDate.push(rawSum);
  }
  // Honest dollar series: daily sum of the basket's actual market cap — raw
  // dollars, NO weighting, NO normalization (that's what broke the index).
  // Per-edition carry-forward of the last-known value across days an edition's
  // snapshot is missing, seeded with its first-observed value so day 0 isn't
  // artificially low. A missing snapshot shouldn't make the basket dip; an
  // edition that traded yesterday still exists today. This is what the hero
  // plots, so a 30d view is exactly the tail of the 6m view and the chart's
  // last point equals the headline. (index_value retained for /indices pages.)
  const firstSeenUsd = new Map<string, number>();
  for (const h of allHistory) {
    if (h.market_cap > 0 && !firstSeenUsd.has(h.edition_id)) firstSeenUsd.set(h.edition_id, h.market_cap);
  }
  const editionIds = [...byEdition.keys()];
  const lastKnownUsd = new Map(firstSeenUsd);
  const dailyRaw = new Map<string, number>();
  for (const d of dates) {
    let sum = 0;
    for (const e of editionIds) {
      const today = byEdition.get(e)?.get(d);
      if (today != null && today > 0) lastKnownUsd.set(e, today);
      const use = lastKnownUsd.get(e);
      if (use && use > 0) sum += capped(e, use);
    }
    dailyRaw.set(d, sum);
  }
  const startWSum = weightedSumByDate[0] || 0;
  const series: RookiesSeriesPoint[] = dates.map((d, i) => ({
    date: d,
    index_value: startWSum > 0 ? 100 * (weightedSumByDate[i] / startWSum) : 0,
    basket_mcap_usd: dailyRaw.get(d) ?? 0,
  }));
  const latestDailyRaw = dailyRaw.get(dates[dates.length - 1]) ?? basketMcapTotal;
  const latestIndexValue = series[series.length - 1]?.index_value ?? 100;
  const seriesPctChange =
    series.length >= 2 && series[0].index_value > 0
      ? ((series[series.length - 1].index_value - series[0].index_value) /
          series[0].index_value) *
        100
      : 0;

  const { data: edata } = await sb
    .from("editions")
    .select("edition_id, player_name, set_name, tier_name")
    .in("edition_id", basketIds);
  type EdRow = {
    edition_id: string;
    player_name: string | null;
    set_name: string | null;
    tier_name: string | null;
  };
  const edMap = new Map<string, EdRow>();
  for (const e of (edata as EdRow[] | null) ?? []) edMap.set(e.edition_id, e);

  const constituents: RookiesConstituentRow[] = top.map((t) => {
    const ed = edMap.get(t.edition_id);
    return {
      edition_id: t.edition_id,
      player_name: ed?.player_name ?? null,
      set_name: ed?.set_name ?? null,
      tier_name: ed?.tier_name ?? null,
      weight: weights.get(t.edition_id) ?? 0,
      current_mcap_usd: capped(t.edition_id, t.current_mcap),
    };
  });

  return {
    series,
    constituents,
    as_of_date: asOfDate,
    series_start_date: seriesStartDate,
    basket_mcap_total_usd: latestDailyRaw,
    latest_index_value: latestIndexValue,
    series_pct_change: seriesPctChange,
    days_of_history: dates.length,
    is_thin: isThin,
    draft_year_used: draftYear,
  };
}

const SYNTHESIZER_VERSION = createHash("sha256")
  .update(fetchInner.toString())
  .digest("hex")
  .slice(0, 8);

export const getRookiesIndex = (
  lookbackDays = MAX_LOOKBACK_DAYS,
  draftYear: string = CURRENT_ROOKIE_YEAR,
) =>
  unstable_cache(
    () => fetchInner(lookbackDays, draftYear),
    ["rookies-index", SYNTHESIZER_VERSION, String(lookbackDays), draftYear],
    { revalidate: 60 * 60, tags: ["rookies-index"] }
  )();
