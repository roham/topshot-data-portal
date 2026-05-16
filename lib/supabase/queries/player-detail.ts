// Player detail surface. Powers /player/[id].
//
// Composition:
//   - players row (header)
//   - mv_player_24h_volume / 7d / 30d (KPI strip)
//   - mv_player_market_cap (leaderboard rank context)
//   - editions for this player joined to set + tier (the editions matrix)

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export interface PlayerDetail {
  player: Tables["players"] | null;
  volume24h: Tables["mv_player_24h_volume"] | null;
  volume7d: Tables["mv_player_7d_volume"] | null;
  volume30d: Tables["mv_player_30d_volume"] | null;
  marketCap: Tables["mv_player_market_cap"] | null;
  // Rank in 30d market cap (1-indexed) when available.
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
}

async function _getPlayerDetail(playerId: string): Promise<PlayerDetail> {
  const empty: PlayerDetail = {
    player: null,
    volume24h: null,
    volume7d: null,
    volume30d: null,
    marketCap: null,
    marketCapRank: null,
    editions: [],
  };
  if (!playerId) return empty;
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return empty;
    const [
      playerRes,
      v24Res,
      v7Res,
      v30Res,
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

    // Rank: cheap server-side count of players with strictly larger cap.
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

    return {
      player: (playerRes.data as Tables["players"] | null) ?? null,
      volume24h:
        (v24Res.data as Tables["mv_player_24h_volume"] | null) ?? null,
      volume7d:
        (v7Res.data as Tables["mv_player_7d_volume"] | null) ?? null,
      volume30d:
        (v30Res.data as Tables["mv_player_30d_volume"] | null) ?? null,
      marketCap:
        (mcRes.data as Tables["mv_player_market_cap"] | null) ?? null,
      marketCapRank,
      editions: editionRows.map((e) => ({
        edition_id: e.edition_id,
        edition_name: e.edition_name,
        tier_name: e.tier_name,
        set_id: e.set_id,
        set_name: e.sets?.set_name ?? null,
        series_number: e.sets?.series_number ?? null,
        mint_count: e.mint_count,
      })),
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
