// Sets directory query. Powers /sets.
//
// Multi-stage PostgREST-native fetch (never exec_sql):
//   1. topshot.sets — all non-hidden sets
//   2. topshot.editions — edition rows fetched by set_id IN-clause, aggregated
//      in JS for edition_count + total_minted; also collects edition_ids
//   3. topshot.market_caps — most-recent row per edition_id (DESC date,
//      first-occurrence-wins loop); set floor = MIN(lowest_ask_price) per set
//   4. topshot.mv_set_24h_activity — 24h KPI per set_id
//
// Gotchas honored:
//   · exec_sql RPC omitted entirely — all reads use PostgREST native
//   · nullsFirst omitted from .order() to avoid defeating partial indexes
//
// Cached 5 min. Page component re-sorts + re-filters in JS from cached result
// based on ?sort + ?dir + ?series + ?league URL params (Pillar 4 §1).

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export interface SetDirectoryRow {
  set_id: string;
  set_name: string | null;
  series_number: number | null;
  series_name: string | null;
  /** Normalized: "LEAGUE_NBA" → "NBA" etc. */
  primary_league: string | null;
  set_tier_name: string | null;
  edition_count: number;
  total_minted: number | null;
  /** MIN(lowest_ask_price) across all editions in the set. */
  floor_usd: number | null;
  /** mv_set_24h_activity.volume_usd */
  volume_usd: number | null;
  tx_count: number | null;
}

export interface SetsDirectoryResult {
  rows: SetDirectoryRow[];
  /** Always "24h Volume" — mv_set_7d_activity does not exist in the typed schema. */
  volume_label: string;
  as_of: string | null;
}

// Normalize league values stored in topshot.sets.primary_league.
// DB stores "LEAGUE_NBA" / "LEAGUE_WNBA" (uppercase with optional prefix).
function normalizeLeague(raw: string | null | undefined): string | null {
  if (!raw) return null;
  return raw.replace(/^league[_-]?/i, "").toUpperCase() || raw.toUpperCase();
}

async function _getSetsDirectory(): Promise<SetsDirectoryResult> {
  const empty: SetsDirectoryResult = {
    rows: [],
    volume_label: "24h Volume",
    as_of: null,
  };
  const sb = getSupabaseServerAnon();
  if (!sb) return empty;

  try {
    // ── Stage 1: all non-hidden sets ──────────────────────────────────────
    const { data: setsData, error: setsErr } = await sb
      .from("sets")
      .select(
        "set_id, set_name, series_number, series_name, primary_league, set_tier_name",
      )
      .eq("is_hidden", false)
      .order("series_number", { ascending: false });

    if (setsErr || !setsData) {
      console.error("[sets-directory] sets read failed", setsErr);
      return empty;
    }

    type SetRow = Pick<
      Tables["sets"],
      | "set_id"
      | "set_name"
      | "series_number"
      | "series_name"
      | "primary_league"
      | "set_tier_name"
    >;
    const setRows = setsData as SetRow[];
    if (setRows.length === 0) return empty;

    const setIds = setRows.map((s) => s.set_id);

    // ── Stage 2: editions per set (aggregate in JS) ───────────────────────
    // PostgREST has no GROUP BY — fetch raw rows, aggregate in JS.
    // set_id is a direct column on topshot.editions so one IN-clause suffices.
    const { data: edData, error: edErr } = await sb
      .from("editions")
      .select("edition_id, set_id, mint_count")
      .in("set_id", setIds)
      .limit(10000);

    if (edErr) {
      console.error("[sets-directory] editions read failed", edErr);
    }

    type EdRow = {
      edition_id: string;
      set_id: string | null;
      mint_count: number | null;
    };
    const edRows: EdRow[] = (edData as EdRow[] | null) ?? [];

    // JS-side aggregation
    const editionCountBySet = new Map<string, number>();
    const mintedBySet = new Map<string, number>();
    const editionToSet = new Map<string, string>(); // edition_id → set_id

    for (const e of edRows) {
      if (!e.set_id) continue;
      editionCountBySet.set(
        e.set_id,
        (editionCountBySet.get(e.set_id) ?? 0) + 1,
      );
      mintedBySet.set(
        e.set_id,
        (mintedBySet.get(e.set_id) ?? 0) + (e.mint_count ?? 0),
      );
      editionToSet.set(e.edition_id, e.set_id);
    }

    const allEditionIds = edRows.map((e) => e.edition_id);

    // ── Stage 3: market_caps for floor derivation ─────────────────────────
    // Fetch latest row per edition (DESC date, first-occurrence-wins).
    // Nulls qualifier intentionally omitted — see gotcha:
    // nulls-last-qualifier-defeats-partial-index.
    let mcRows: Array<{
      edition_id: string;
      date: string;
      lowest_ask_price: number | null;
    }> = [];

    if (allEditionIds.length > 0) {
      const { data: mcData, error: mcErr } = await sb
        .from("market_caps")
        .select("edition_id, date, lowest_ask_price")
        .in("edition_id", allEditionIds.slice(0, 3000)) // PostgREST URL-length guard
        .order("date", { ascending: false })
        .limit(15000);

      if (mcErr) {
        console.error("[sets-directory] market_caps read failed", mcErr);
      } else {
        mcRows = (mcData as typeof mcRows | null) ?? [];
      }
    }

    // First-occurrence-wins per edition (rows sorted DESC date).
    const latestAskByEdition = new Map<string, number | null>();
    for (const mc of mcRows) {
      if (!latestAskByEdition.has(mc.edition_id)) {
        latestAskByEdition.set(mc.edition_id, mc.lowest_ask_price);
      }
    }

    // Set floor = MIN(lowest_ask_price) across editions in the set.
    const floorBySet = new Map<string, number>();
    for (const [editionId, ask] of latestAskByEdition) {
      if (ask == null) continue;
      const setId = editionToSet.get(editionId);
      if (!setId) continue;
      const current = floorBySet.get(setId);
      if (current == null || ask < current) {
        floorBySet.set(setId, ask);
      }
    }

    // ── Stage 4: mv_set_24h_activity ─────────────────────────────────────
    const { data: actData, error: actErr } = await sb
      .from("mv_set_24h_activity")
      .select("set_id, volume_usd, tx_count, refreshed_at")
      .in("set_id", setIds);

    if (actErr) {
      console.error("[sets-directory] mv_set_24h_activity read failed", actErr);
    }

    type ActRow = {
      set_id: string;
      volume_usd: number;
      tx_count: number;
      refreshed_at: string;
    };
    const actRows: ActRow[] = (actData as ActRow[] | null) ?? [];
    const actBySet = new Map<string, ActRow>();
    for (const a of actRows) {
      actBySet.set(a.set_id, a);
    }

    const asOf = actRows[0]?.refreshed_at ?? null;

    // ── Build result rows ─────────────────────────────────────────────────
    const rows: SetDirectoryRow[] = setRows.map((s) => ({
      set_id: s.set_id,
      set_name: s.set_name,
      series_number: s.series_number,
      series_name: s.series_name,
      primary_league: normalizeLeague(s.primary_league),
      set_tier_name: s.set_tier_name,
      edition_count: editionCountBySet.get(s.set_id) ?? 0,
      total_minted: mintedBySet.get(s.set_id) !== undefined
        ? (mintedBySet.get(s.set_id) as number)
        : null,
      floor_usd: floorBySet.get(s.set_id) ?? null,
      volume_usd: actBySet.get(s.set_id)?.volume_usd ?? null,
      tx_count: actBySet.get(s.set_id)?.tx_count ?? null,
    }));

    return { rows, volume_label: "24h Volume", as_of: asOf };
  } catch (e) {
    console.error("[sets-directory] threw", e);
    return empty;
  }
}

export const getSetsDirectory = unstable_cache(
  _getSetsDirectory,
  ["sets-directory"],
  { revalidate: 300, tags: ["sets-directory", "mv_set_24h_activity"] },
);
