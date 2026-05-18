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
   * Per-edition floor + market cap + circulation from market_caps (latest date per edition).
   * Keyed by edition_id. Built via PostgREST .in("edition_id", ...) pattern
   * matching players-marketcap.ts Stage 3. JS-side dedup to first (most-recent)
   * row per edition_id after ordering by date DESC.
   * `circulation` = num_moments_in_circulation; used by NewDropTag condition.
   */
  editionFloors: Record<string, { floor: number | null; marketCap: number | null; circulation: number | null }>;
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
      // Flat select — no embedded relation (PGRST200 on sets join).
      // Sets data fetched separately after edition resolution.
      sb
        .from("editions")
        .select(`edition_id, edition_name, tier_name, set_id, mint_count`)
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

    // Editions are fetched FLAT — no PostgREST embedded relation.
    // The FK between editions and sets is not in the PostgREST schema cache
    // (PGRST200 error on `sets(set_name, series_number)`), so we fetch editions
    // flat and join sets separately via a second .in("set_id", ...) query.
    type EditionQueryRow = {
      edition_id: string;
      edition_name: string | null;
      tier_name: string | null;
      set_id: string | null;
      mint_count: number | null;
    };

    // Flat select — no embedded relation.
    const EDITIONS_SELECT = `edition_id, edition_name, tier_name, set_id, mint_count`;

    let editionRows: EditionQueryRow[] =
      (editionsRes.data as EditionQueryRow[] | null) ?? [];

    // ── Fallback chain: editions.player_id uses a different format than ───
    // players.player_id in the BQ seed (observed in prod: all top-200 market-cap
    // players return 0 editions via player_id eq query).
    // Mirrors moments-grid.ts player_name resolution pattern.
    if (editionRows.length === 0) {
      // Attempt 1 — exact match on mv_player_market_cap.player_name
      // (derived from same BQ seed as editions.player_name, should match exactly)
      const mcPlayerName =
        (mcRes.data as Tables["mv_player_market_cap"] | null)?.player_name ??
        null;
      if (mcPlayerName) {
        const { data: fb1, error: fb1Err } = await sb
          .from("editions")
          .select(EDITIONS_SELECT)
          .eq("player_name", mcPlayerName)
          .limit(500);
        if (!fb1Err && fb1 && (fb1 as EditionQueryRow[]).length > 0) {
          editionRows = fb1 as EditionQueryRow[];
        } else if (fb1Err) {
          console.error(
            "[player-detail] fallback 1 (mc player_name) failed",
            fb1Err,
          );
        }
      }
    }

    if (editionRows.length === 0) {
      // Attempt 2 — exact match on players.full_name
      const fullName =
        (playerRes.data as Tables["players"] | null)?.full_name ?? null;
      if (fullName) {
        const { data: fb2, error: fb2Err } = await sb
          .from("editions")
          .select(EDITIONS_SELECT)
          .eq("player_name", fullName)
          .limit(500);
        if (!fb2Err && fb2 && (fb2 as EditionQueryRow[]).length > 0) {
          editionRows = fb2 as EditionQueryRow[];
        } else if (fb2Err) {
          console.error(
            "[player-detail] fallback 2 (full_name eq) failed",
            fb2Err,
          );
        }
      }
    }

    if (editionRows.length === 0) {
      // Attempt 3 — case-insensitive exact match on players.full_name
      // (ilike without wildcards = case-insensitive eq, handles accented chars)
      const fullName =
        (playerRes.data as Tables["players"] | null)?.full_name ?? null;
      if (fullName) {
        const { data: fb3, error: fb3Err } = await sb
          .from("editions")
          .select(EDITIONS_SELECT)
          .ilike("player_name", fullName)
          .limit(500);
        if (!fb3Err && fb3 && (fb3 as EditionQueryRow[]).length > 0) {
          editionRows = fb3 as EditionQueryRow[];
        } else if (fb3Err) {
          console.error(
            "[player-detail] fallback 3 (full_name ilike) failed",
            fb3Err,
          );
        }
      }
    }

    if (editionRows.length === 0) {
      console.warn(
        `[player-detail] no editions resolved for player_id=${playerId} via any fallback`,
      );
    }

    // ── Stage extra-a: batch-fetch sets data for unique set_ids ───────────
    // PostgREST embedded relation `sets(...)` fails (PGRST200 — no FK in schema
    // cache), so we fetch sets separately and join in JS.
    const uniqueSetIds = [
      ...new Set(
        editionRows.map((e) => e.set_id).filter((id): id is string => id != null),
      ),
    ];
    const setsMap: Record<
      string,
      { set_name: string | null; series_number: number | null }
    > = {};
    if (uniqueSetIds.length > 0) {
      const { data: setsData, error: setsErr } = await sb
        .from("sets")
        .select("set_id, set_name, series_number")
        .in("set_id", uniqueSetIds);
      if (setsErr) {
        console.error("[player-detail] sets batch fetch failed", setsErr);
      } else if (setsData) {
        for (const s of setsData as Array<{
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
    }

    const editions = editionRows.map((e) => ({
      edition_id: e.edition_id,
      edition_name: e.edition_name,
      tier_name: e.tier_name,
      set_id: e.set_id,
      set_name: e.set_id ? (setsMap[e.set_id]?.set_name ?? null) : null,
      series_number: e.set_id ? (setsMap[e.set_id]?.series_number ?? null) : null,
      mint_count: e.mint_count,
    }));

    // ── Stage extra: batch-fetch market_caps for all edition IDs ──────────
    // Pattern mirrors players-marketcap.ts Stage 3 (lines ~119-139).
    // order("date", { ascending: false }) — nullsFirst intentionally omitted
    // (gotcha: nulls-last-qualifier-defeats-partial-index).
    // limit = editionIds.length × 2: gets latest 2 date-rows per edition
    // so JS-side dedup has at least the most-recent row.
    const editionIds = editions.map((e) => e.edition_id);
    const editionFloors: Record<string, { floor: number | null; marketCap: number | null; circulation: number | null }> = {};

    if (editionIds.length > 0) {
      const { data: mcData, error: mcErr } = await sb
        .from("market_caps")
        .select("edition_id, lowest_ask_price, market_cap, num_moments_in_circulation, date")
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
          num_moments_in_circulation: number | null;
          date: string;
        }>) {
          if (!(row.edition_id in editionFloors)) {
            editionFloors[row.edition_id] = {
              floor: row.lowest_ask_price,
              marketCap: row.market_cap,
              circulation: row.num_moments_in_circulation,
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
