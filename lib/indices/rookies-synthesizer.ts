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

const BASKET_SIZE = 30;
const MAX_LOOKBACK_DAYS = 365;
const ROOKIE_DRAFT_YEARS = ["2025", "2024"] as const;

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

async function fetchRookieIds(sb: NonNullable<ReturnType<typeof getSupabaseServerAnon>>) {
  // Find a draft year that actually has matching editions in market_caps.
  for (const yr of ROOKIE_DRAFT_YEARS) {
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

async function fetchInner(lookbackDays: number): Promise<RookiesIndexResult> {
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

  const { editionIds: rookieEditionIds, draftYear } = await fetchRookieIds(sb);
  if (rookieEditionIds.length === 0) return EMPTY;

  // Top N by mcap among rookie editions
  const candidatePool: { edition_id: string; current_mcap: number }[] = [];
  const CHUNK = 500;
  for (let i = 0; i < rookieEditionIds.length; i += CHUNK) {
    const chunk = rookieEditionIds.slice(i, i + CHUNK);
    const { data: capRows } = await sb
      .from("market_caps")
      .select("edition_id, market_cap")
      .eq("date", asOfDate)
      .in("edition_id", chunk)
      .not("market_cap", "is", null)
      .gt("market_cap", 0)
      .order("market_cap", { ascending: false })
      .limit(BASKET_SIZE);
    for (const r of ((capRows as { edition_id: string; market_cap: number | string }[] | null) ?? [])) {
      candidatePool.push({
        edition_id: r.edition_id,
        current_mcap: Number(r.market_cap) || 0,
      });
    }
  }
  candidatePool.sort((a, b) => b.current_mcap - a.current_mcap);
  const top = candidatePool.slice(0, BASKET_SIZE);
  if (top.length === 0) return { ...EMPTY, draft_year_used: draftYear };

  const basketIds = top.map((t) => t.edition_id);
  const basketMcapTotal = top.reduce((s, t) => s + t.current_mcap, 0);
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

  const { count: histCount, error: countErr } = await baseQuery().select("*", { count: "exact", head: true });
  if (countErr) {
    console.error("[rookies] history count probe failed", countErr);
    throw countErr;
  }
  const pageCount = Math.max(1, Math.ceil((histCount ?? 0) / PAGE));
  const CONCURRENCY = 6;
  for (let batchStart = 0; batchStart < pageCount; batchStart += CONCURRENCY) {
    const batchEnd = Math.min(batchStart + CONCURRENCY, pageCount);
    const promises = [];
    for (let page = batchStart; page < batchEnd; page++) {
      const from = page * PAGE;
      const to = from + PAGE - 1;
      promises.push(baseQuery().range(from, to));
    }
    const results = await Promise.all(promises);
    for (let i = 0; i < results.length; i++) {
      const { data, error } = results[i];
      if (error) {
        const pageNum = batchStart + i;
        console.error(`[rookies] history page ${pageNum} failed`, error);
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
    }
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

  const weights = new Map<string, number>();
  for (const t of top) weights.set(t.edition_id, t.current_mcap / basketMcapTotal);

  // Basket-level normalization (S&P / CL50 standard) — robust to per-edition
  // outliers. See grail-synthesizer.ts for math derivation + bug history.
  const lastKnown = new Map<string, number>();
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
      const useVal = today ?? lastKnown.get(t.edition_id) ?? 0;
      if (today && today > 0) lastKnown.set(t.edition_id, today);
      if (useVal > 0) {
        wSum += w * useVal;
        rawSum += useVal;
      }
    }
    weightedSumByDate.push(wSum);
    rawSumByDate.push(rawSum);
  }
  const startWSum = weightedSumByDate[0] || 0;
  const series: RookiesSeriesPoint[] = dates.map((d, i) => ({
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
    draft_year_used: draftYear,
  };
}

const SYNTHESIZER_VERSION = createHash("sha256")
  .update(fetchInner.toString())
  .digest("hex")
  .slice(0, 8);

export const getRookiesIndex = (lookbackDays = MAX_LOOKBACK_DAYS) =>
  unstable_cache(
    () => fetchInner(lookbackDays),
    ["rookies-index", SYNTHESIZER_VERSION, String(lookbackDays)],
    { revalidate: 60 * 60, tags: ["rookies-index"] }
  )();
