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

  // Daily basket total via the shared capped RPC (replaces the per-edition
  // history fan-out + pivot that timed out for long windows; one row/date,
  // vanity-capped server-side).
  const effLookbackDays = Math.min(lookbackDays, 400);
  const sinceDate = new Date(new Date(asOfDate).getTime() - effLookbackDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const { data: dailyData, error: dailyErr } = await sb.rpc("index_basket_daily", {
    p_edition_ids: basketIds,
    p_since: sinceDate,
  });
  if (dailyErr) console.error("[rookies] index_basket_daily failed", dailyErr);
  const daily = (((dailyData as { d: string; total_usd: number | string }[] | null) ?? [])
    .map((r) => ({ date: r.d, total: Number(r.total_usd) || 0 }))
    .filter((r) => r.total > 0));
  if (daily.length === 0) return { ...EMPTY, draft_year_used: draftYear };
  const seriesStartDate = daily[0].date;
  const isThin = daily.length < 7;
  const baseTotal = daily[0].total;
  const series: RookiesSeriesPoint[] = daily.map((p) => ({
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
      weight: basketMcapTotal > 0 ? capped(t.edition_id, t.current_mcap) / basketMcapTotal : 0,
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
    days_of_history: series.length,
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
    ["rookies-index", "v2-rpc", SYNTHESIZER_VERSION, String(lookbackDays), draftYear],
    { revalidate: 60 * 60, tags: ["rookies-index"] }
  )();
