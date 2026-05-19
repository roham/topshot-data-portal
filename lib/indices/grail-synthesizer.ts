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
  /** Editions parsed from the CSV (deduped on set_id+play_id) */
  basket_target_size: number;
  /** Editions actually resolved against the editions table */
  basket_resolved_size: number;
  /** Editions in the basket that have ≥ 1 mcap snapshot in the window */
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
  basket_target_size: 0,
  basket_resolved_size: 0,
  basket_active_size: 0,
};

/** Parse the Vaultopolis canonical CSV → deduped (set_id, play_id) pairs. */
async function parseGrailBasket(): Promise<{ set_id: string; play_id: string }[]> {
  const path = join(process.cwd(), CSV_RELATIVE_PATH);
  const text = await readFile(path, "utf-8");
  const lines = text.split("\n").slice(1); // drop header
  const pairs = new Set<string>(); // serialized "set_id+play_id" for dedupe
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = line.split(",");
    const compound = cols[5]?.trim();
    if (!compound) continue;
    const [setId, playId] = compound.split("+");
    if (!setId || !playId) continue;
    pairs.add(`${setId}+${playId}`);
  }
  return Array.from(pairs).map((s) => {
    const [set_id, play_id] = s.split("+");
    return { set_id, play_id };
  });
}

async function fetchInner(lookbackDays: number): Promise<GrailIndexResult> {
  const sb = getSupabaseServerAnon();
  if (!sb) return EMPTY;

  // 1. Parse canonical basket
  let basketPairs: { set_id: string; play_id: string }[] = [];
  try {
    basketPairs = await parseGrailBasket();
  } catch (err) {
    console.error("[grail] CSV parse failed", err);
    return EMPTY;
  }
  if (basketPairs.length === 0) return EMPTY;

  // 2. Resolve to edition_ids via editions table.
  // Query editions with all relevant set_ids OR play_ids in IN-clauses, then
  // filter cartesian on the client side to the exact (set_id, play_id) pairs.
  const setIds = Array.from(new Set(basketPairs.map((p) => p.set_id)));
  const playIds = Array.from(new Set(basketPairs.map((p) => p.play_id)));
  const wanted = new Set(basketPairs.map((p) => `${p.set_id}+${p.play_id}`));

  type EdLookup = {
    edition_id: string;
    set_id: string | null;
    play_id: string | null;
    player_name: string | null;
    set_name: string | null;
    tier_name: string | null;
  };
  const edLookup: EdLookup[] = [];
  const CHUNK = 500;
  // Paginate over set_ids; for each chunk, also constrain to the play_ids we want
  // to bound result size. play_id IN over up to 166 ids is fine on PostgREST.
  for (let i = 0; i < setIds.length; i += CHUNK) {
    const setChunk = setIds.slice(i, i + CHUNK);
    for (let j = 0; j < playIds.length; j += CHUNK) {
      const playChunk = playIds.slice(j, j + CHUNK);
      const { data } = await sb
        .from("editions")
        .select("edition_id, set_id, play_id, player_name, set_name, tier_name")
        .in("set_id", setChunk)
        .in("play_id", playChunk);
      for (const r of (data as EdLookup[] | null) ?? []) edLookup.push(r);
    }
  }
  const resolved = edLookup.filter(
    (e) => e.set_id && e.play_id && wanted.has(`${e.set_id}+${e.play_id}`),
  );
  if (resolved.length === 0) return { ...EMPTY, basket_target_size: basketPairs.length };

  const editionIdToMeta = new Map<string, EdLookup>();
  for (const e of resolved) editionIdToMeta.set(e.edition_id, e);
  const editionIds = Array.from(editionIdToMeta.keys());

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
      basket_target_size: basketPairs.length,
      basket_resolved_size: resolved.length,
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
      basket_target_size: basketPairs.length,
      basket_resolved_size: resolved.length,
      as_of_date: asOfDate,
    };
  }

  // 5. History fan-out across basket
  const sinceDate = new Date(
    new Date(asOfDate).getTime() - lookbackDays * 86_400_000
  )
    .toISOString()
    .slice(0, 10);

  const allHistory: { date: string; edition_id: string; market_cap: number }[] = [];
  const PAGE = 1000;
  for (let page = 0; page < 500; page++) {
    const from = page * PAGE;
    const to = from + PAGE - 1;
    const { data } = await sb
      .from("market_caps")
      .select("date, edition_id, market_cap")
      .in("edition_id", editionIds)
      .gte("date", sinceDate)
      .not("market_cap", "is", null)
      .gt("market_cap", 0)
      .order("date", { ascending: true })
      .order("edition_id", { ascending: true })
      .range(from, to);
    const rows =
      (data as { date: string; edition_id: string; market_cap: number | string }[] | null) ?? [];
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
  if (allHistory.length === 0) {
    return {
      ...EMPTY,
      basket_target_size: basketPairs.length,
      basket_resolved_size: resolved.length,
      as_of_date: asOfDate,
    };
  }

  // 6. Pivot
  const byEdition = new Map<string, Map<string, number>>();
  for (const h of allHistory) {
    if (!byEdition.has(h.edition_id)) byEdition.set(h.edition_id, new Map());
    byEdition.get(h.edition_id)!.set(h.date, h.market_cap);
  }
  const dateSet = new Set<string>();
  for (const h of allHistory) dateSet.add(h.date);
  const dates = Array.from(dateSet).sort();
  if (dates.length === 0) {
    return {
      ...EMPTY,
      basket_target_size: basketPairs.length,
      basket_resolved_size: resolved.length,
      as_of_date: asOfDate,
    };
  }
  const seriesStartDate = dates[0];

  // 7. Per-edition baseline (first observed positive mcap in the window)
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

  // 8. Value-weighted weights from latest mcap
  const weights = new Map<string, number>();
  for (const [eid, m] of currentMcap.entries()) weights.set(eid, m / basketMcapTotal);

  // 9. Series with carry-forward
  const series: GrailSeriesPoint[] = [];
  const lastKnown = new Map<string, number>(baseline);
  for (const d of dates) {
    let weightedRatio = 0;
    let basketSum = 0;
    let includedWeight = 0;
    for (const eid of editionIds) {
      const w = weights.get(eid) ?? 0;
      if (w === 0) continue;
      const base = baseline.get(eid);
      if (!base || base <= 0) continue;
      const dmap = byEdition.get(eid);
      const today = dmap?.get(d);
      const useVal = today ?? lastKnown.get(eid) ?? 0;
      if (today && today > 0) lastKnown.set(eid, today);
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
        set_name: meta?.set_name ?? null,
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
    basket_target_size: basketPairs.length,
    basket_resolved_size: resolved.length,
    basket_active_size: byEdition.size,
  };
}

export const getGrailIndex = (lookbackDays = MAX_LOOKBACK_DAYS) =>
  unstable_cache(
    () => fetchInner(lookbackDays),
    ["grail-index-v2-canonical", String(lookbackDays)],
    { revalidate: 60 * 60, tags: ["grail-index"] }
  )();
