// /parallels — Per-edition market metrics for a player, broken down by parallel type.
//
// Three-stage PostgREST-native query (never exec_sql —
// see research/wiki/gotchas/exec-sql-rpc-is-30x-slower-than-postgrest.md).
//
// Stage 1: Resolve editions for player via fallback chain (mirrors player-detail.ts)
// Stage 2: Parallel batch-fetch —
//     market_caps (circulation, low_ask, high_offer)
//     listed moments (listings_count + subedition_id fallback)
//     parallel_types → Map<id, name>
//     sets → Map<set_id, {set_name, series_number}>
// Stage 3: avg_sale_30d via moments → transactions (best-effort)
//
// Listing predicate: listing_price_usd IS NOT NULL (NOT moment_status='LISTED').
// Sort: .order() without nullsFirst (defeats partial index; see gotcha).
// Parallels never aggregated: each edition_id = one (player × set × tier × parallel) row.

import { unstable_cache } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface ParallelRow {
  edition_id: string;
  set_id: string | null;
  set_name: string | null;
  series_number: number | null;
  tier_name: string | null;
  /** From editions.parallel_id (may be null until migration-0012 backfill completes). */
  parallel_id: string | null;
  /** Human name: parallel_types.name, or "(Parallel #N)" fallback. */
  parallel_name: string;
  /** Dominant subedition_id from listed moments (fallback label source). */
  subedition_id: string | null;
  /** From market_caps.num_moments_in_circulation (hard count, latest date). */
  circulation: number;
  /** COUNT of moments WHERE listing_price_usd IS NOT NULL. */
  listings_count: number;
  /** From market_caps.lowest_ask_price (latest date). */
  low_ask: number | null;
  /** From market_caps.highest_offer_price (latest date). */
  high_offer: number | null;
  /** AVG(gross_amount_usd) from SUCCEEDED transactions in last 30d (best-effort). */
  avg_sale_30d: number | null;
}

export interface ParallelsResult {
  rows: ParallelRow[];
  playerName: string | null;
  /** All parallel types in the dataset — for filter rail chips. */
  parallelTypes: Array<{ id: string; name: string }>;
  totalEditions: number;
  totalCirculation: number;
  totalListings: number;
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

async function _getParallelsData(playerId: string): Promise<ParallelsResult> {
  const empty: ParallelsResult = {
    rows: [],
    playerName: null,
    parallelTypes: [],
    totalEditions: 0,
    totalCirculation: 0,
    totalListings: 0,
  };

  if (!playerId || !playerId.trim()) return empty;

  let admin;
  try {
    admin = supabaseAdmin();
  } catch {
    return empty;
  }

  // ── Stage 1: Resolve editions for player ──────────────────────────────────
  // Attempt 1: editions.player_id = playerId (NBA player_id format)
  let editionRows: EditionRow[] = [];

  {
    const { data, error } = await admin
      .from("editions")
      .select(EDITION_SELECT)
      .eq("player_id", playerId)
      .limit(500);
    if (!error && data && (data as EditionRow[]).length > 0) {
      editionRows = data as EditionRow[];
    } else if (error) {
      // Column might not be selected correctly; log and continue to fallbacks
      console.error("[parallels] editions.player_id attempt failed", error?.message);
    }
  }

  // Attempt 2: editions.player_name ilike %playerId%
  // Handles name-based lookup (WNBA players, newer players without NBA ID match)
  if (editionRows.length === 0) {
    const { data, error } = await admin
      .from("editions")
      .select(EDITION_SELECT)
      .ilike("player_name", `%${playerId.trim()}%`)
      .limit(500);
    if (!error && data && (data as EditionRow[]).length > 0) {
      editionRows = data as EditionRow[];
    } else if (error) {
      console.error("[parallels] editions.player_name fallback failed", error?.message);
    }
  }

  if (editionRows.length === 0) {
    console.warn(`[parallels] no editions resolved for player=${playerId}`);
    return empty;
  }

  const playerName = editionRows[0]?.player_name ?? null;
  const editionIds = editionRows.map((e) => e.edition_id);

  // ── Stage 2: Parallel batch-fetch ─────────────────────────────────────────
  // All four queries run in parallel after editionIds are resolved.
  const [mcResult, listedResult, ptResult, setsResult] = await Promise.all([
    // market_caps: circulation, low_ask, high_offer
    admin
      .from("market_caps")
      .select(
        "edition_id, num_moments_in_circulation, lowest_ask_price, highest_offer_price, date",
      )
      .in("edition_id", editionIds)
      .order("date", { ascending: false })
      .limit(editionIds.length * 3),

    // Listed moments: listings_count + subedition_id (fallback parallel label)
    // Only listed moments — far smaller set than all moments.
    // listing_price_usd IS NOT NULL is the canonical listed predicate (NOT moment_status).
    admin
      .from("moments")
      .select("edition_id, subedition_id")
      .in("edition_id", editionIds)
      .not("listing_price_usd", "is", null)
      .limit(5000),

    // parallel_types: id → name map.
    // Migration 0012 added topshot.parallel_types; handle schema-cache-not-found.
    // Wrap in Promise.resolve() so .catch() is available (supabase returns PromiseLike).
    Promise.resolve(
      admin
        .from("parallel_types" as "editions") // cast to satisfy type; PostgREST still routes correctly
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
        ? admin
            .from("sets")
            .select("set_id, set_name, series_number")
            .in("set_id", uniqueSetIds)
        : Promise.resolve({ data: [], error: null });
    })(),
  ]);

  // ── Process market_caps ──────────────────────────────────────────────────
  const mcFloors: Record<
    string,
    { circulation: number; low_ask: number | null; high_offer: number | null }
  > = {};
  if (mcResult.data) {
    for (const row of mcResult.data as Array<{
      edition_id: string;
      num_moments_in_circulation: number | null;
      lowest_ask_price: number | null;
      highest_offer_price: number | null;
      date: string;
    }>) {
      if (!(row.edition_id in mcFloors)) {
        mcFloors[row.edition_id] = {
          circulation: row.num_moments_in_circulation ?? 0,
          low_ask: row.lowest_ask_price != null ? Number(row.lowest_ask_price) : null,
          high_offer: row.highest_offer_price != null ? Number(row.highest_offer_price) : null,
        };
      }
    }
  }

  // ── Process listed moments → listings_count + subedition_id ──────────────
  const listingsByEdition: Record<
    string,
    { count: number; subedition_id: string | null }
  > = {};
  if (listedResult.data) {
    for (const m of listedResult.data as Array<{
      edition_id: string | null;
      subedition_id: string | null;
    }>) {
      if (!m.edition_id) continue;
      if (!listingsByEdition[m.edition_id]) {
        listingsByEdition[m.edition_id] = {
          count: 0,
          subedition_id: m.subedition_id,
        };
      }
      listingsByEdition[m.edition_id].count++;
      if (!listingsByEdition[m.edition_id].subedition_id && m.subedition_id) {
        listingsByEdition[m.edition_id].subedition_id = m.subedition_id;
      }
    }
  }

  // ── Process parallel_types ────────────────────────────────────────────────
  const parallelTypeMap: Record<string, string> = {};
  const parallelTypesForRail: Array<{ id: string; name: string }> = [];
  if (ptResult.data) {
    for (const pt of ptResult.data as Array<{ id: unknown; name: unknown }>) {
      if (pt.id != null && pt.name) {
        const idStr = String(pt.id);
        parallelTypeMap[idStr] = String(pt.name);
        parallelTypesForRail.push({ id: idStr, name: String(pt.name) });
      }
    }
  }

  // ── Process sets ──────────────────────────────────────────────────────────
  const setsMap: Record<
    string,
    { set_name: string | null; series_number: number | null }
  > = {};
  if (setsResult.data) {
    for (const s of setsResult.data as Array<{
      set_id: string;
      set_name: string | null;
      series_number: number | null;
    }>) {
      setsMap[s.set_id] = {
        set_name: s.set_name,
        series_number: s.series_number,
      };
    }
  }

  // ── Stage 3: avg_sale_30d via moments → transactions (best-effort) ────────
  // Step 3a: get moment_ids for all editions (limit 3000 to avoid OOM)
  const avgSale30dByEdition: Record<string, number | null> = {};

  const { data: momentIdData } = await admin
    .from("moments")
    .select("moment_id, edition_id")
    .in("edition_id", editionIds)
    .limit(3000);

  if (momentIdData && (momentIdData as Array<{ moment_id: string; edition_id: string | null }>).length > 0) {
    const momentEditionMap: Record<string, string> = {};
    const allMomentIds: string[] = [];

    for (const m of momentIdData as Array<{
      moment_id: string;
      edition_id: string | null;
    }>) {
      if (m.edition_id) {
        momentEditionMap[m.moment_id] = m.edition_id;
        allMomentIds.push(m.moment_id);
      }
    }

    if (allMomentIds.length > 0) {
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();

      // Step 3b: SUCCEEDED transactions in last 30d for those moments
      const { data: txData } = await admin
        .from("transactions")
        .select("moment_id, gross_amount_usd")
        .in("moment_id", allMomentIds)
        .eq("transaction_state_id", "SUCCEEDED")
        .gte("completed_at", thirtyDaysAgo)
        .not("gross_amount_usd", "is", null)
        .limit(5000);

      if (txData) {
        const sumByEdition: Record<string, number> = {};
        const countByEdition: Record<string, number> = {};

        for (const tx of txData as Array<{
          moment_id: string | null;
          gross_amount_usd: number | null;
        }>) {
          if (!tx.moment_id || tx.gross_amount_usd == null) continue;
          const eid = momentEditionMap[tx.moment_id];
          if (!eid) continue;
          sumByEdition[eid] = (sumByEdition[eid] ?? 0) + Number(tx.gross_amount_usd);
          countByEdition[eid] = (countByEdition[eid] ?? 0) + 1;
        }

        for (const eid of editionIds) {
          const cnt = countByEdition[eid];
          if (cnt && cnt > 0) {
            avgSale30dByEdition[eid] = sumByEdition[eid] / cnt;
          }
        }
      }
    }
  }

  // ── Build result rows ─────────────────────────────────────────────────────
  const rows: ParallelRow[] = editionRows.map((e) => {
    const mc = mcFloors[e.edition_id] ?? {
      circulation: 0,
      low_ask: null,
      high_offer: null,
    };
    const listed = listingsByEdition[e.edition_id] ?? {
      count: 0,
      subedition_id: null,
    };
    const setInfo = e.set_id
      ? (setsMap[e.set_id] ?? { set_name: null, series_number: null })
      : { set_name: null, series_number: null };

    // Parallel name resolution:
    // 1. editions.parallel_id → parallel_types.name
    // 2. listed.subedition_id → parallel_types.name
    // 3. editions.parallel_id → "(Parallel #N)" fallback
    // 4. "Base" as ultimate fallback (null parallel = original un-paralleled edition)
    const parallelId = e.parallel_id != null ? String(e.parallel_id) : null;
    let parallelName: string;
    if (parallelId && parallelTypeMap[parallelId]) {
      parallelName = parallelTypeMap[parallelId];
    } else if (listed.subedition_id && parallelTypeMap[listed.subedition_id]) {
      parallelName = parallelTypeMap[listed.subedition_id];
    } else if (listed.subedition_id) {
      parallelName = `(Parallel #${listed.subedition_id})`;
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
      parallel_id: parallelId,
      parallel_name: parallelName,
      subedition_id: listed.subedition_id,
      circulation: mc.circulation,
      listings_count: listed.count,
      low_ask: mc.low_ask,
      high_offer: mc.high_offer,
      avg_sale_30d: avgSale30dByEdition[e.edition_id] ?? null,
    };
  });

  const totalCirculation = rows.reduce((s, r) => s + r.circulation, 0);
  const totalListings = rows.reduce((s, r) => s + r.listings_count, 0);

  return {
    rows,
    playerName,
    parallelTypes: parallelTypesForRail,
    totalEditions: rows.length,
    totalCirculation,
    totalListings,
  };
}

// Cached per player_id — expensive multi-stage fetch; 120s revalidate.
export const getParallelsData = unstable_cache(
  _getParallelsData,
  ["parallels-data"],
  { revalidate: 120, tags: ["parallels", "editions", "market-caps"] },
);
