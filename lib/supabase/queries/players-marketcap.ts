// Players market cap leaderboard. Powers /players.
//
// Three-stage PostgREST-native fetch (never exec_sql):
//   1. mv_player_market_cap — pre-aggregated player market caps (MV)
//   2. topshot.editions — player_id + edition_id + mint_count for JS-side GROUP BY
//   3. topshot.market_caps — 7-day daily totals per player for sparklines + 24h Δ%
//
// Sort index: idx_mv_player_market_cap_total (DESC NULLS LAST). Omit nullsFirst
// option to let the planner use it without the redundant qualifier that defeats
// the partial index (gotcha: nulls-last-qualifier-defeats-partial-index).
//
// Cached 5 min (revalidate: 300). The page component re-sorts in JS from
// the cached result based on ?sort + ?dir URL params.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export interface PlayerMarketCapRow {
  player_id: string;
  player_name: string | null;
  team_name: string | null;
  edition_count: number;
  total_minted: number | null;         // SUM(editions.mint_count)
  total_in_circulation: number;        // mv_player_market_cap.total_moments_in_circulation
  circ_pct: number | null;             // (circulation / minted) × 100
  market_cap_usd: number;
  delta_pct_24h: number | null;        // null when prior-day snapshot absent (honest absence)
  sparkline: number[];                 // 7-day market cap totals, oldest→newest
  as_of_date: string | null;
  // Stage 4 additions — from topshot.players (filter rail)
  league: string | null;
  last_play_date: string | null;       // ISO date; null = draft-only/historical player
}

export interface PlayersMarketCapResult {
  rows: PlayerMarketCapRow[];   // market_cap_usd DESC (DB order from MV)
  as_of_date: string | null;
}

// 200 players → ~1 000 editions → market_caps batch comfortably under the
// PostgREST IN-clause URL-length ceiling (~4 000 ids per moments-grid.ts note).
const PLAYER_LIMIT = 200;

async function _getPlayersMarketCap(): Promise<PlayersMarketCapResult> {
  const empty: PlayersMarketCapResult = { rows: [], as_of_date: null };
  const sb = getSupabaseServerAnon();
  if (!sb) return empty;

  try {
    // ── Stage 1: primary MV read ──────────────────────────────────────────
    const { data: mvData, error: mvErr } = await sb
      .from("mv_player_market_cap")
      .select(
        "player_id, player_name, last_known_team_full_name, edition_count, total_moments_in_circulation, total_market_cap_usd, as_of_date",
      )
      .order("total_market_cap_usd", { ascending: false }) // nullsFirst intentionally omitted
      .limit(PLAYER_LIMIT);

    if (mvErr || !mvData) {
      console.error("[players-marketcap] MV read failed", mvErr);
      return empty;
    }

    type MvRow = Pick<
      Tables["mv_player_market_cap"],
      | "player_id"
      | "player_name"
      | "last_known_team_full_name"
      | "edition_count"
      | "total_moments_in_circulation"
      | "total_market_cap_usd"
      | "as_of_date"
    >;
    const mvRows = mvData as MvRow[];
    if (mvRows.length === 0) return empty;

    const playerIds = mvRows.map((r) => r.player_id);
    const asOfDate = mvRows[0]?.as_of_date ?? null;

    // ── Stage 2: total_minted from topshot.editions ───────────────────────
    // PostgREST has no GROUP BY; fetch raw rows, aggregate in JS.
    // 200 players × ~5 editions avg ≈ 1 000 rows; well within limits.
    const { data: edData, error: edErr } = await sb
      .from("editions")
      .select("player_id, edition_id, mint_count")
      .in("player_id", playerIds)
      .limit(4000); // matches MAX_EDITION_IDS from moments-grid.ts

    if (edErr) {
      console.error("[players-marketcap] editions read failed", edErr);
    }

    type EdRow = { player_id: string; edition_id: string; mint_count: number | null };
    const edRows: EdRow[] = (edData as EdRow[] | null) ?? [];

    // JS-side aggregation
    const mintedByPlayer = new Map<string, number>();
    const editionToPlayer = new Map<string, string>(); // edition_id → player_id
    for (const e of edRows) {
      mintedByPlayer.set(
        e.player_id,
        (mintedByPlayer.get(e.player_id) ?? 0) + (e.mint_count ?? 0),
      );
      editionToPlayer.set(e.edition_id, e.player_id);
    }
    const allEditionIds = edRows.map((e) => e.edition_id);

    // ── Stage 3: market_caps for sparklines + 24h Δ% ─────────────────────
    // ~1 000 editions × 8 dates ≈ 8 000 rows. Fetch ordered DESC so the first
    // rows are the most recent dates (used for delta); sparkline takes the
    // last 7 distinct dates reversed.
    let marketCapRows: Array<{
      edition_id: string;
      date: string;
      market_cap: number | null;
    }> = [];

    if (allEditionIds.length > 0) {
      const { data: mcData, error: mcErr } = await sb
        .from("market_caps")
        .select("edition_id, date, market_cap")
        .in("edition_id", allEditionIds.slice(0, 3000)) // PostgREST URL-length guard
        .order("date", { ascending: false })
        .limit(12000);

      if (mcErr) {
        console.error("[players-marketcap] market_caps read failed", mcErr);
      } else {
        marketCapRows = (mcData as typeof marketCapRows | null) ?? [];
      }
    }

    // Distinct dates DESC (most recent first)
    const distinctDates = [
      ...new Set(marketCapRows.map((r) => r.date)),
    ].sort((a, b) => b.localeCompare(a));

    // (player_id + NUL + date) → summed market_cap
    const playerDateCap = new Map<string, number>();
    for (const mc of marketCapRows) {
      const pid = editionToPlayer.get(mc.edition_id);
      if (!pid) continue;
      const key = `${pid}\x00${mc.date}`;
      playerDateCap.set(key, (playerDateCap.get(key) ?? 0) + (mc.market_cap ?? 0));
    }

    const sparklineDates = distinctDates.slice(0, 7).reverse(); // oldest first
    const latestDate = distinctDates[0] ?? null;
    const prevDate = distinctDates[1] ?? null;

    // ── Stage 4: league + date_of_last_play from topshot.players ─────────
    // Native PostgREST filter — never exec_sql (gotcha: exec-sql-rpc-is-30x-slower).
    // ≤ 200 rows; completes in < 100ms.
    let playerMetaRows: Array<{
      player_id: string;
      league: string | null;
      date_of_last_play: string | null;
    }> = [];

    if (playerIds.length > 0) {
      const { data: pmData, error: pmErr } = await sb
        .from("players")
        .select("player_id, league, date_of_last_play")
        .in("player_id", playerIds);

      if (pmErr) {
        console.error("[players-marketcap] players meta read failed", pmErr);
      } else {
        playerMetaRows =
          (pmData as typeof playerMetaRows | null) ?? [];
      }
    }

    const leagueByPlayer = new Map<string, string | null>();
    const lastPlayByPlayer = new Map<string, string | null>();
    for (const pm of playerMetaRows) {
      leagueByPlayer.set(pm.player_id, pm.league);
      lastPlayByPlayer.set(pm.player_id, pm.date_of_last_play ?? null);
    }

    // ── Build result rows ─────────────────────────────────────────────────
    const rows: PlayerMarketCapRow[] = mvRows.map((mv) => {
      const totalMinted = mintedByPlayer.get(mv.player_id) ?? null;
      const circ = Number(mv.total_moments_in_circulation);
      const circPct =
        totalMinted && totalMinted > 0 ? (circ / totalMinted) * 100 : null;

      let deltaPct: number | null = null;
      if (latestDate && prevDate) {
        const todayCap =
          playerDateCap.get(`${mv.player_id}\x00${latestDate}`) ?? null;
        const prevCap =
          playerDateCap.get(`${mv.player_id}\x00${prevDate}`) ?? null;
        if (todayCap != null && prevCap != null && prevCap > 0) {
          deltaPct = ((todayCap - prevCap) / prevCap) * 100;
        }
      }

      const sparkline = sparklineDates.map(
        (d) => playerDateCap.get(`${mv.player_id}\x00${d}`) ?? 0,
      );

      return {
        player_id: mv.player_id,
        player_name: mv.player_name,
        team_name: mv.last_known_team_full_name,
        edition_count: Number(mv.edition_count),
        total_minted: totalMinted,
        total_in_circulation: circ,
        circ_pct: circPct,
        market_cap_usd: Number(mv.total_market_cap_usd),
        delta_pct_24h: deltaPct,
        sparkline,
        as_of_date: mv.as_of_date,
        league: leagueByPlayer.get(mv.player_id) ?? null,
        last_play_date: lastPlayByPlayer.get(mv.player_id) ?? null,
      };
    });

    return { rows, as_of_date: asOfDate };
  } catch (e) {
    console.error("[players-marketcap] threw", e);
    return empty;
  }
}

export const getPlayersMarketCap = unstable_cache(
  _getPlayersMarketCap,
  ["players-marketcap"],
  { revalidate: 300, tags: ["players-marketcap", "mv_player_market_cap"] },
);
