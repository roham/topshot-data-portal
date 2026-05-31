// Player trading volume per window. Reads mv_player_<w>_volume (24h/7d/30d/90d/
// 1y/all_time). Powers /volume — who's actually trading and how much. No new MV;
// PostgREST-native (never exec_sql).
//
// Real MV columns (verified 2026-05-31): player_id, player_name,
// last_known_team_full_name, tx_count, total_volume_usd, median_price_usd,
// min_price_usd, max_price_usd, unique_buyers, unique_sellers, refreshed_at.
// (No avg_price_usd — blended avg is derived volume÷trades. unique_buyers/
// sellers are currently unpopulated, so we don't surface them.)

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";
import type { TimeWindow } from "@/components/global/window-types";

type VolumeView =
  | "mv_player_24h_volume"
  | "mv_player_7d_volume"
  | "mv_player_30d_volume"
  | "mv_player_90d_volume"
  | "mv_player_1y_volume"
  | "mv_player_all_time_volume";

// Map the global TimeWindow → nearest available volume MV. 6M collapses up to
// 1Y; 2Y/ALL collapse to all-time (no dedicated 6m/2y volume MV).
function windowToVolumeView(w: TimeWindow): VolumeView {
  switch (w) {
    case "24h": return "mv_player_24h_volume";
    case "7d": return "mv_player_7d_volume";
    case "30d": return "mv_player_30d_volume";
    case "90d": return "mv_player_90d_volume";
    case "6m":
    case "1y": return "mv_player_1y_volume";
    case "2y":
    case "all": return "mv_player_all_time_volume";
  }
}

export interface PlayerVolumeRow {
  player_id: string;
  player_name: string | null;
  team_name: string | null;
  tx_count: number;
  total_volume_usd: number;
  /** Derived: total_volume_usd / tx_count. */
  blended_avg_usd: number;
  median_price_usd: number | null;
  max_price_usd: number | null;
}

export interface PlayerVolumeResult {
  rows: PlayerVolumeRow[];
  totalVolumeUsd: number;
  totalTx: number;
  biggestSaleUsd: number;
  playerCount: number;
  view: VolumeView;
}

const LIMIT = 200;

async function _get(window: TimeWindow): Promise<PlayerVolumeResult> {
  const view = windowToVolumeView(window);
  const empty: PlayerVolumeResult = {
    rows: [], totalVolumeUsd: 0, totalTx: 0, biggestSaleUsd: 0, playerCount: 0, view,
  };
  const sb = getSupabaseServerAnon();
  if (!sb) return empty;
  try {
    const { data, error } = await sb
      .from(view)
      .select(
        "player_id,player_name,last_known_team_full_name,tx_count,total_volume_usd,median_price_usd,max_price_usd",
      )
      .order("total_volume_usd", { ascending: false })
      .limit(LIMIT);
    if (error) {
      console.error(`[player-volume] ${view} read failed`, error);
      return empty;
    }
    const rows: PlayerVolumeRow[] = ((data as Record<string, unknown>[] | null) ?? []).map((r) => {
      const tx = Number(r.tx_count) || 0;
      const vol = Number(r.total_volume_usd) || 0;
      return {
        player_id: String(r.player_id),
        player_name: r.player_name == null ? null : String(r.player_name),
        team_name: r.last_known_team_full_name == null ? null : String(r.last_known_team_full_name),
        tx_count: tx,
        total_volume_usd: vol,
        blended_avg_usd: tx > 0 ? vol / tx : 0,
        median_price_usd: r.median_price_usd == null ? null : Number(r.median_price_usd),
        max_price_usd: r.max_price_usd == null ? null : Number(r.max_price_usd),
      };
    });
    return {
      rows,
      totalVolumeUsd: rows.reduce((s, r) => s + r.total_volume_usd, 0),
      totalTx: rows.reduce((s, r) => s + r.tx_count, 0),
      biggestSaleUsd: rows.reduce((m, r) => Math.max(m, r.max_price_usd ?? 0), 0),
      playerCount: rows.length,
      view,
    };
  } catch (e) {
    console.error(`[player-volume] threw`, e);
    return empty;
  }
}

export const getPlayerVolume = (window: TimeWindow) =>
  unstable_cache(
    () => _get(window),
    ["player-volume-v2", window],
    { revalidate: 300, tags: ["player-volume", windowToVolumeView(window)] },
  )();
