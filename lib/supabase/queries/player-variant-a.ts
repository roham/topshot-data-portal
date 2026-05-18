// Player Variant A — three-axis matrix query.
//
// Fetches editions for a player with parallel resolution, listings_count,
// and market_caps (low_ask, circulation). Powers /player/[id]/v/a.
//
// Reuses the parallel name resolution logic from parallels.ts verbatim.
// Reuses the fallback chain from player-detail.ts.
//
// PostgREST-native throughout — never exec_sql
// (gotcha: exec-sql-rpc-is-30x-slower-than-postgrest).
// listing predicate: listing_price_usd IS NOT NULL (NOT moment_status='LISTED').
// nullsFirst omitted on .order("date") (gotcha: nulls-last-qualifier-defeats-partial-index).

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface VariantAEditionRow {
  edition_id: string;
  set_id: string | null;
  set_name: string | null;
  series_number: number | null;
  tier_name: string | null;
  /** Parallel name resolved from parallel_types */
  parallel_name: string;
  /** From market_caps.lowest_ask_price (latest date). */
  low_ask: number | null;
  /** From market_caps.num_moments_in_circulation (latest date). */
  circulation: number;
  /** COUNT of moments WHERE listing_price_usd IS NOT NULL. */
  listings_count: number;
}

export interface VariantAResult {
  rows: VariantAEditionRow[];
  playerName: string | null;
}

const EDITION_SELECT =
  "edition_id, edition_name, tier_name, set_id, player_name, parallel_id";

type EditionRow = {
  edition_id: string;
  edition_name: string | null;
  tier_name: string | null;
  set_id: string | null;
  player_name: string | null;
  parallel_id: string | null;
};

async function _getPlayerVariantAData(playerId: string): Promise<VariantAResult> {
  const empty: VariantAResult = { rows: [], playerName: null };
  if (!playerId || !playerId.trim()) return empty;

  const sb = getSupabaseServerAnon();
  if (!sb) return empty;

  // ── Stage 1: Resolve editions via 3-attempt fallback chain ────────────────
  let editionRows: EditionRow[] = [];

  // Attempt 1: editions.player_id = playerId
  {
    const { data, error } = await sb
      .from("editions")
      .select(EDITION_SELECT)
      .eq("player_id", playerId)
      .limit(500);
    if (!error && data && (data as EditionRow[]).length > 0) {
      editionRows = data as EditionRow[];
    } else if (error) {
      console.error("[variant-a] editions.player_id attempt failed", error?.message);
    }
  }

  // Attempt 2: editions.player_name ilike %playerId%
  if (editionRows.length === 0) {
    const { data, error } = await sb
      .from("editions")
      .select(EDITION_SELECT)
      .ilike("player_name", `%${playerId.trim()}%`)
      .limit(500);
    if (!error && data && (data as EditionRow[]).length > 0) {
      editionRows = data as EditionRow[];
    } else if (error) {
      console.error("[variant-a] editions.player_name ilike fallback failed", error?.message);
    }
  }

  // Attempt 3: resolve via mv_player_market_cap.player_name
  if (editionRows.length === 0) {
    const { data: mcData } = await sb
      .from("mv_player_market_cap")
      .select("player_name")
      .eq("player_id", playerId)
      .maybeSingle();
    const mcName = (mcData as { player_name: string | null } | null)?.player_name;
    if (mcName) {
      const { data, error } = await sb
        .from("editions")
        .select(EDITION_SELECT)
        .eq("player_name", mcName)
        .limit(500);
      if (!error && data && (data as EditionRow[]).length > 0) {
        editionRows = data as EditionRow[];
      } else if (error) {
        console.error("[variant-a] mc player_name fallback failed", error?.message);
      }
    }
  }

  if (editionRows.length === 0) {
    console.warn(`[variant-a] no editions resolved for player_id=${playerId}`);
    return empty;
  }

  const playerName = editionRows[0]?.player_name ?? null;
  const editionIds = editionRows.map((e) => e.edition_id);

  // ── Stage 2: Parallel batch-fetch ─────────────────────────────────────────
  const [mcResult, listedResult, ptResult, setsResult] = await Promise.all([
    // market_caps: circulation, low_ask
    sb
      .from("market_caps")
      .select("edition_id, num_moments_in_circulation, lowest_ask_price, date")
      .in("edition_id", editionIds)
      .order("date", { ascending: false })
      .limit(editionIds.length * 3),

    // Listed moments: listings_count
    // listing_price_usd IS NOT NULL is the canonical listed predicate.
    sb
      .from("moments")
      .select("edition_id")
      .in("edition_id", editionIds)
      .not("listing_price_usd", "is", null)
      .limit(5000),

    // parallel_types: id → name map
    Promise.resolve(
      sb
        .from("parallel_types" as "editions") // cast satisfies type; PostgREST still routes correctly
        .select("id, name")
        .limit(100),
    ).catch(() => ({ data: null, error: null })),

    // sets: set_name, series_number
    (() => {
      const uniqueSetIds = [
        ...new Set(
          editionRows.map((e) => e.set_id).filter((id): id is string => !!id),
        ),
      ];
      return uniqueSetIds.length > 0
        ? sb
            .from("sets")
            .select("set_id, set_name, series_number")
            .in("set_id", uniqueSetIds)
        : Promise.resolve({ data: [], error: null });
    })(),
  ]);

  // ── Process market_caps ──────────────────────────────────────────────────
  const mcFloors: Record<string, { circulation: number; low_ask: number | null }> = {};
  if (mcResult.data) {
    for (const row of mcResult.data as Array<{
      edition_id: string;
      num_moments_in_circulation: number | null;
      lowest_ask_price: number | null;
      date: string;
    }>) {
      if (!(row.edition_id in mcFloors)) {
        mcFloors[row.edition_id] = {
          circulation: row.num_moments_in_circulation ?? 0,
          low_ask: row.lowest_ask_price != null ? Number(row.lowest_ask_price) : null,
        };
      }
    }
  }

  // ── Process listed moments → listings_count ──────────────────────────────
  const listingsCount: Record<string, number> = {};
  if (listedResult.data) {
    for (const m of listedResult.data as Array<{ edition_id: string | null }>) {
      if (!m.edition_id) continue;
      listingsCount[m.edition_id] = (listingsCount[m.edition_id] ?? 0) + 1;
    }
  }

  // ── Process parallel_types ────────────────────────────────────────────────
  const parallelTypeMap: Record<string, string> = {};
  if (ptResult.data) {
    for (const pt of ptResult.data as Array<{ id: unknown; name: unknown }>) {
      if (pt.id != null && pt.name) {
        parallelTypeMap[String(pt.id)] = String(pt.name);
      }
    }
  }

  // ── Process sets ──────────────────────────────────────────────────────────
  const setsMap: Record<string, { set_name: string | null; series_number: number | null }> = {};
  if (setsResult.data) {
    for (const s of setsResult.data as Array<{
      set_id: string;
      set_name: string | null;
      series_number: number | null;
    }>) {
      setsMap[s.set_id] = { set_name: s.set_name, series_number: s.series_number };
    }
  }

  // ── Build result rows ─────────────────────────────────────────────────────
  const rows: VariantAEditionRow[] = editionRows.map((e) => {
    const mc = mcFloors[e.edition_id] ?? { circulation: 0, low_ask: null };
    const setInfo = e.set_id
      ? (setsMap[e.set_id] ?? { set_name: null, series_number: null })
      : { set_name: null, series_number: null };

    // Parallel name resolution (verbatim from parallels.ts):
    // 1. editions.parallel_id → parallel_types.name
    // 2. editions.parallel_id → "(Parallel #N)" fallback
    // 3. "Base" as ultimate fallback (null parallel = original edition)
    const parallelId = e.parallel_id != null ? String(e.parallel_id) : null;
    let parallelName: string;
    if (parallelId && parallelTypeMap[parallelId]) {
      parallelName = parallelTypeMap[parallelId];
    } else if (parallelId) {
      parallelName = `(Parallel #${parallelId})`;
    } else {
      parallelName = "Base";
    }

    return {
      edition_id: e.edition_id,
      set_id: e.set_id,
      set_name: setInfo.set_name,
      series_number: setInfo.series_number,
      tier_name: e.tier_name,
      parallel_name: parallelName,
      low_ask: mc.low_ask,
      circulation: mc.circulation,
      listings_count: listingsCount[e.edition_id] ?? 0,
    };
  });

  return { rows, playerName };
}

// Cached per player_id — multi-stage fetch; 120s revalidate.
export const getPlayerVariantAData = unstable_cache(
  _getPlayerVariantAData,
  ["player-variant-a"],
  { revalidate: 120, tags: ["player-variant-a", "editions", "market-caps"] },
);
