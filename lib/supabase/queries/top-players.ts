// Top players by volume in a parameterized window. Routes each TimeWindow to
// the corresponding mv_player_*_volume MV — all six windows (24h / 7d / 30d /
// 90d / 1y / all_time) have a backing MV after migration 0007.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { TimeWindow } from "@/components/global/window-types";
import { windowToPlayerView } from "@/lib/supabase/helpers";
import type { Tables } from "@/lib/supabase/database.types";

export type TopPlayerRow = Tables["mv_player_24h_volume"];

interface GetTopPlayersOptions {
  window?: TimeWindow;
  limit?: number;
  minTxCount?: number;
}

async function _getTopPlayers({
  window = "24h",
  limit = 20,
  minTxCount = 5,
}: GetTopPlayersOptions = {}): Promise<TopPlayerRow[]> {
  const view = windowToPlayerView(window);
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return [];
    // Reverts to select("*") — the per-window player MVs have heterogeneous
    // column sets (24h/7d/30d expose unique_buyers / last_known_team_full_name;
    // 90d/1y/all_time expose unique_moments_traded / avg_price_usd). A trimmed
    // intersection-only select would drop columns the renderer reads on the
    // window where that column exists, so the wider payload is worth it here.
    const { data, error } = await sb
      .from(view)
      .select("*")
      .gte("tx_count", minTxCount)
      .order("total_volume_usd", { ascending: false })
      .limit(limit);
    if (error) {
      console.error(`[supabase] ${view} read failed`, error);
      return [];
    }
    return ((data as TopPlayerRow[] | null) ?? []).map((r) => ({
      ...r,
      tx_count: Number(r.tx_count),
      total_volume_usd: Number(r.total_volume_usd),
    }));
  } catch (e) {
    console.error(`[supabase] player-volume read threw`, e);
    return [];
  }
}

export const getTopPlayers = (opts: GetTopPlayersOptions = {}) => {
  const window = opts.window ?? "24h";
  return unstable_cache(
    () => _getTopPlayers(opts),
    ["top-players", window, String(opts.limit ?? 20), String(opts.minTxCount ?? 5)],
    {
      revalidate: 60,
      tags: ["top-players", `mv_player_${window}_volume`],
    },
  )();
};
