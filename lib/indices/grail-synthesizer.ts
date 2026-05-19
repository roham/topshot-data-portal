// Grail Index — the blue-chip basket.
//
// V1 basket definition: top 50 editions by current market cap restricted to
// the two scarcest tiers (Legendary + Ultimate). This is a pragmatic stand-in
// for the canonical 184-edition Vaultopolis-sourced list — the CSV-backed
// definition lands in a follow-up that joins editions on (set_id, play_id).
//
// Same compute shape as ts50: value-weighted, carry-forward on ETL gaps,
// normalized so the first snapshot = 100. Cache 1hr.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

const BASKET_SIZE = 50;
const MAX_LOOKBACK_DAYS = 365;
const ELITE_TIERS = ["Legendary", "Ultimate"] as const;

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
  is_thin: boolean;
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
  is_thin: true,
};

async function fetchInner(lookbackDays: number): Promise<GrailIndexResult> {
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

  // Resolve edition_ids in the elite tiers
  const { data: eliteEditions } = await sb
    .from("editions")
    .select("edition_id, tier_name")
    .in("tier_name", [...ELITE_TIERS]);
  const eliteSet = new Set(
    ((eliteEditions as { edition_id: string; tier_name: string }[] | null) ?? []).map(
      (e) => e.edition_id
    )
  );
  if (eliteSet.size === 0) return EMPTY;

  // Top N editions by mcap on the latest date, restricted to elite tiers via .in()
  // Supabase .in() caps around 1000 items — we paginate the elite list if larger.
  const eliteIds = Array.from(eliteSet);
  const candidatePool: { edition_id: string; current_mcap: number }[] = [];
  const CHUNK = 500;
  for (let i = 0; i < eliteIds.length; i += CHUNK) {
    const chunk = eliteIds.slice(i, i + CHUNK);
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
  if (top.length === 0) return EMPTY;

  const basketIds = top.map((t) => t.edition_id);
  const basketMcapTotal = top.reduce((s, t) => s + t.current_mcap, 0);
  if (basketMcapTotal <= 0) return EMPTY;

  // History fan-out
  const sinceDate = new Date(
    new Date(asOfDate).getTime() - lookbackDays * 86_400_000
  )
    .toISOString()
    .slice(0, 10);

  const allHistory: { date: string; edition_id: string; market_cap: number }[] = [];
  const PAGE = 1000;
  for (let page = 0; page < 200; page++) {
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data } = await sb
      .from("market_caps")
      .select("date, edition_id, market_cap")
      .in("edition_id", basketIds)
      .gte("date", sinceDate)
      .not("market_cap", "is", null)
      .gt("market_cap", 0)
      .order("date", { ascending: true })
      .order("edition_id", { ascending: true })
      .range(from, to);
    const rows =
      (data as { date: string; edition_id: string; market_cap: number | string }[] | null) ??
      [];
    if (rows.length === 0) break;
    for (const r of rows) {
      allHistory.push({ date: r.date, edition_id: r.edition_id, market_cap: Number(r.market_cap) || 0 });
    }
    if (rows.length < PAGE) break;
  }
  if (allHistory.length === 0) return EMPTY;

  // Pivot
  const byEdition = new Map<string, Map<string, number>>();
  for (const h of allHistory) {
    if (!byEdition.has(h.edition_id)) byEdition.set(h.edition_id, new Map());
    byEdition.get(h.edition_id)!.set(h.date, h.market_cap);
  }
  const dateSet = new Set<string>();
  for (const h of allHistory) dateSet.add(h.date);
  const dates = Array.from(dateSet).sort();
  if (dates.length === 0) return EMPTY;
  const seriesStartDate = dates[0];
  const isThin = dates.length < 7;

  // Baseline per edition
  const baseline = new Map<string, number>();
  for (const [eid, dmap] of byEdition.entries()) {
    const sortedDates = Array.from(dmap.keys()).sort();
    for (const d of sortedDates) {
      const v = dmap.get(d) ?? 0;
      if (v > 0) {
        baseline.set(eid, v);
        break;
      }
    }
  }

  // Weights
  const weights = new Map<string, number>();
  for (const t of top) weights.set(t.edition_id, t.current_mcap / basketMcapTotal);

  // Series with carry-forward
  const series: GrailSeriesPoint[] = [];
  const lastKnown = new Map<string, number>(baseline);
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
    const adjusted = includedWeight > 0 ? weightedRatio / includedWeight : 0;
    series.push({ date: d, index_value: 100 * adjusted, basket_mcap_usd: basketSum });
  }
  const latestIndexValue = series[series.length - 1]?.index_value ?? 100;
  const seriesPctChange =
    series.length >= 2
      ? ((series[series.length - 1].index_value - series[0].index_value) / series[0].index_value) *
        100
      : 0;

  // Constituent metadata
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

  const constituents: GrailConstituentRow[] = top.map((t) => {
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
  };
}

export const getGrailIndex = (lookbackDays = MAX_LOOKBACK_DAYS) =>
  unstable_cache(
    () => fetchInner(lookbackDays),
    ["grail-index", String(lookbackDays)],
    { revalidate: 60 * 60, tags: ["grail-index"] }
  )();
