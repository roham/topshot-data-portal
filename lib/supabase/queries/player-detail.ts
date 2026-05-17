// Player detail surface. Powers /player/[id].
//
// Composition:
//   - players row (header)
//   - mv_player_24h_volume / 7d / 30d / 1y / all_time (career volume table)
//   - mv_player_market_cap (leaderboard rank context)
//   - editions for this player joined to set + tier (the editions matrix)
//   - market_caps batch per edition_id (floor + market cap per cell)
//
// PostgREST-native throughout — never exec_sql
// (gotcha: exec-sql-rpc-is-30x-slower-than-postgrest).
// nullsFirst omitted on .order("date") because market_caps.date is non-nullable
// (gotcha: nulls-last-qualifier-defeats-partial-index).

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export interface PlayerDetail {
  player: Tables["players"] | null;
  volume24h: Tables["mv_player_24h_volume"] | null;
  volume7d: Tables["mv_player_7d_volume"] | null;
  volume30d: Tables["mv_player_30d_volume"] | null;
  /** Fetched from mv_player_1y_volume. Null when player has no 1y data. */
  volume1y: Tables["mv_player_1y_volume"] | null;
  /** Fetched from mv_player_all_time_volume. Null when player has no all-time data. */
  volumeAllTime: Tables["mv_player_all_time_volume"] | null;
  marketCap: Tables["mv_player_market_cap"] | null;
  // Rank in market cap leaderboard (1-indexed) when available.
  marketCapRank: number | null;
  editions: Array<{
    edition_id: string;
    edition_name: string | null;
    tier_name: string | null;
    set_id: string | null;
    set_name: string | null;
    series_number: number | null;
    mint_count: number | null;
  }>;
  /**
   * Per-edition floor + market cap from market_caps (latest date per edition).
   * Keyed by edition_id. Built via PostgREST .in("edition_id", ...) pattern
   * matching players-marketcap.ts Stage 3. JS-side dedup to first (most-recent)
   * row per edition_id after ordering by date DESC.
   */
  editionFloors: Record<string, { floor: number | null; marketCap: number | null }>;
}

async function _getPlayerDetail(playerId: string): Promise<PlayerDetail> {
  const empty: PlayerDetail = {
    player: null,
    volume24h: null,
    volume7d: null,
    volume30d: null,
    volume1y: null,
    volumeAllTime: null,
    marketCap: null,
    marketCapRank: null,
    editions: [],
    editionFloors: {},
  };
  if (!playerId) return empty;
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return empty;

    // ── Stage 1-6: parallel fetch — player, volumes (5 windows), market cap, editions ──
    const [
      playerRes,
      v24Res,
      v7Res,
      v30Res,
      v1yRes,
      vAllRes,
      mcRes,
      editionsRes,
    ] = await Promise.all([
      sb.from("players").select("*").eq("player_id", playerId).maybeSingle(),
      sb
        .from("mv_player_24h_volume")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle(),
      sb
        .from("mv_player_7d_volume")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle(),
      sb
        .from("mv_player_30d_volume")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle(),
      // 1y and all_time were previously omitted — add them per research §5.
      sb
        .from("mv_player_1y_volume")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle(),
      sb
        .from("mv_player_all_time_volume")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle(),
      sb
        .from("mv_player_market_cap")
        .select("*")
        .eq("player_id", playerId)
        .maybeSingle(),
      sb
        .from("editions")
        .select(
          `edition_id, edition_name, tier_name, set_id, mint_count,
           sets(set_name, series_number)`,
        )
        .eq("player_id", playerId),
    ]);

    // ── Market cap rank: count of players with strictly larger cap ────────
    let marketCapRank: number | null = null;
    const ownCap = (mcRes.data as Tables["mv_player_market_cap"] | null)
      ?.total_market_cap_usd;
    if (ownCap != null && ownCap > 0) {
      const { count: aboveCount, error: rankErr } = await sb
        .from("mv_player_market_cap")
        .select("player_id", { count: "exact", head: true })
        .gt("total_market_cap_usd", ownCap);
      if (!rankErr && aboveCount != null) marketCapRank = aboveCount + 1;
    }

    const editionRows =
      (editionsRes.data as Array<{
        edition_id: string;
        edition_name: string | null;
        tier_name: string | null;
        set_id: string | null;
        mint_count: number | null;
        sets: { set_name: string | null; series_number: number | null } | null;
      }> | null) ?? [];

    const editions = editionRows.map((e) => ({
      edition_id: e.edition_id,
      edition_name: e.edition_name,
      tier_name: e.tier_name,
      set_id: e.set_id,
      set_name: e.sets?.set_name ?? null,
      series_number: e.sets?.series_number ?? null,
      mint_count: e.mint_count,
    }));

    // ── Stage extra: batch-fetch market_caps for all edition IDs ──────────
    // Pattern mirrors players-marketcap.ts Stage 3 (lines ~119-139).
    // order("date", { ascending: false }) — nullsFirst intentionally omitted
    // (gotcha: nulls-last-qualifier-defeats-partial-index).
    // limit = editionIds.length × 2: gets latest 2 date-rows per edition
    // so JS-side dedup has at least the most-recent row.
    const editionIds = editions.map((e) => e.edition_id);
    const editionFloors: Record<string, { floor: number | null; marketCap: number | null }> = {};

    if (editionIds.length > 0) {
      const { data: mcData, error: mcErr } = await sb
        .from("market_caps")
        .select("edition_id, lowest_ask_price, market_cap, date")
        .in("edition_id", editionIds)
        .order("date", { ascending: false })
        .limit(editionIds.length * 2);

      if (mcErr) {
        console.error("[player-detail] market_caps batch fetch failed", mcErr);
      } else if (mcData) {
        // JS-side dedup: keep only first (most-recent date) row per edition_id
        for (const row of mcData as Array<{
          edition_id: string;
          lowest_ask_price: number | null;
          market_cap: number | null;
          date: string;
        }>) {
          if (!(row.edition_id in editionFloors)) {
            editionFloors[row.edition_id] = {
              floor: row.lowest_ask_price,
              marketCap: row.market_cap,
            };
          }
        }
      }
    }

    return {
      player: (playerRes.data as Tables["players"] | null) ?? null,
      volume24h:
        (v24Res.data as Tables["mv_player_24h_volume"] | null) ?? null,
      volume7d:
        (v7Res.data as Tables["mv_player_7d_volume"] | null) ?? null,
      volume30d:
        (v30Res.data as Tables["mv_player_30d_volume"] | null) ?? null,
      volume1y:
        (v1yRes.data as Tables["mv_player_1y_volume"] | null) ?? null,
      volumeAllTime:
        (vAllRes.data as Tables["mv_player_all_time_volume"] | null) ?? null,
      marketCap:
        (mcRes.data as Tables["mv_player_market_cap"] | null) ?? null,
      marketCapRank,
      editions,
      editionFloors,
    };
  } catch (e) {
    console.error("[supabase] player-detail threw", e);
    return empty;
  }
}

export const getPlayerDetail = unstable_cache(
  _getPlayerDetail,
  ["player-detail"],
  { revalidate: 60, tags: ["player-detail"] },
);
