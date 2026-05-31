// Per-team detail. Aggregates mv_player_market_cap by last_known_team_id —
// the players whose most-recent team is this one, ranked by floor market cap.
// Powers /team/[id]. No new MV; PostgREST-native.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface TeamPlayerRow {
  player_id: string;
  player_name: string | null;
  market_cap_usd: number;
  circulation: number;
  edition_count: number;
}

export interface TeamDetail {
  team_id: string;
  team_name: string | null;
  players: TeamPlayerRow[];
  totalCapUsd: number;
  totalCirculation: number;
  playerCount: number;
}

async function _get(teamId: string): Promise<TeamDetail> {
  const empty: TeamDetail = {
    team_id: teamId, team_name: null, players: [], totalCapUsd: 0, totalCirculation: 0, playerCount: 0,
  };
  const sb = getSupabaseServerAnon();
  if (!sb) return empty;
  try {
    const { data, error } = await sb
      .from("mv_player_market_cap")
      .select("player_id,player_name,last_known_team_full_name,total_market_cap_usd,total_moments_in_circulation,edition_count")
      .eq("last_known_team_id", teamId)
      .order("total_market_cap_usd", { ascending: false })
      .limit(200);
    if (error) {
      console.error(`[team-detail] read failed`, error);
      return empty;
    }
    const raw = (data as Record<string, unknown>[] | null) ?? [];
    const players: TeamPlayerRow[] = raw.map((r) => ({
      player_id: String(r.player_id),
      player_name: r.player_name == null ? null : String(r.player_name),
      market_cap_usd: Number(r.total_market_cap_usd) || 0,
      circulation: Number(r.total_moments_in_circulation) || 0,
      edition_count: Number(r.edition_count) || 0,
    }));
    return {
      team_id: teamId,
      team_name: raw[0]?.last_known_team_full_name == null ? null : String(raw[0].last_known_team_full_name),
      players,
      totalCapUsd: players.reduce((s, p) => s + p.market_cap_usd, 0),
      totalCirculation: players.reduce((s, p) => s + p.circulation, 0),
      playerCount: players.length,
    };
  } catch (e) {
    console.error(`[team-detail] threw`, e);
    return empty;
  }
}

export const getTeamDetail = (teamId: string) =>
  unstable_cache(
    () => _get(teamId),
    ["team-detail-v1", teamId],
    { revalidate: 300, tags: ["team-detail", `team-${teamId}`] },
  )();
