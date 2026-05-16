// Top players by volume in a parameterized window. Routes 24h/7d/30d to the
// corresponding mv_player_*_volume MV; 1y / all collapse to 30d with a
// caller-visible hint (caption should disclose).

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { TimeWindow } from "@/components/global/window-types";
import { windowToPlayerVolumeView } from "@/lib/supabase/helpers";
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
  const view = windowToPlayerVolumeView(window);
  try {
    const sb = getSupabaseServerAnon();
    if (!sb) return [];
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
      unique_buyers: Number(r.unique_buyers),
      unique_sellers: Number(r.unique_sellers),
    }));
  } catch (e) {
    console.error(`[supabase] ${view} threw`, e);
    return [];
  }
}

export const getTopPlayers = unstable_cache(_getTopPlayers, ["top-players"], {
  revalidate: 60,
  tags: ["top-players", "mv_player_volume"],
});
