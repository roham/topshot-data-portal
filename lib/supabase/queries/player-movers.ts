// Player movers — calls topshot.player_movers(window_days) RPC.
//
// Per Roham 2026-05-17 20:45Z: "top movers section highlighting biggest
// changes over last 15/30/90 days. Color coded the way a meme coin
// tracking site would show."

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export type MoverWindow = 15 | 30 | 90;
export const MOVER_WINDOWS: MoverWindow[] = [15, 30, 90];

export interface PlayerMoverRow {
  player_id: string;
  player_name: string | null;
  team_name: string | null;
  avg_recent_usd: number;
  avg_prior_usd: number;
  pct_change: number;
  tx_count_recent: number;
  tx_count_prior: number;
  volume_recent_usd: number;
}

export interface PlayerMoversResult {
  gainers: PlayerMoverRow[];
  losers: PlayerMoverRow[];
  asOfDate: string;
  window_days: MoverWindow;
}

const MV_FOR_WINDOW: Record<MoverWindow, string> = {
  15: "mv_player_movers_15d",
  30: "mv_player_movers_30d",
  90: "mv_player_movers_90d", // may not exist yet — handled gracefully
};

async function _getPlayerMovers(window: MoverWindow): Promise<PlayerMoversResult> {
  const sb = getSupabaseServerAnon();
  const empty: PlayerMoversResult = {
    gainers: [],
    losers: [],
    asOfDate: new Date().toISOString().slice(0, 10),
    window_days: window,
  };
  if (!sb) return empty;

  try {
    // Top 12 gainers + top 12 losers, two cheap reads from the precomputed MV.
    const mvName = MV_FOR_WINDOW[window];
    const [gRes, lRes] = await Promise.all([
      sb
        .from(mvName)
        .select(
          "player_id, player_name, team_name, avg_recent_usd, avg_prior_usd, pct_change, tx_count_recent, tx_count_prior, volume_recent_usd",
        )
        .gt("pct_change", 0)
        .order("pct_change", { ascending: false })
        .limit(12),
      sb
        .from(mvName)
        .select(
          "player_id, player_name, team_name, avg_recent_usd, avg_prior_usd, pct_change, tx_count_recent, tx_count_prior, volume_recent_usd",
        )
        .lt("pct_change", 0)
        .order("pct_change", { ascending: true })
        .limit(12),
    ]);

    if (gRes.error || lRes.error) {
      // 90d MV may not exist yet — return empty with the window marked
      console.warn(
        `movers MV query failed (window=${window}):`,
        gRes.error?.message ?? lRes.error?.message,
      );
      return empty;
    }

    type Raw = {
      player_id: string;
      player_name: string | null;
      team_name: string | null;
      avg_recent_usd: number | string | null;
      avg_prior_usd: number | string | null;
      pct_change: number | string | null;
      tx_count_recent: number | string | null;
      tx_count_prior: number | string | null;
      volume_recent_usd: number | string | null;
    };
    const toRow = (r: Raw): PlayerMoverRow => ({
      player_id: r.player_id,
      player_name: r.player_name ?? null,
      team_name: r.team_name ?? null,
      avg_recent_usd: Number(r.avg_recent_usd ?? 0),
      avg_prior_usd: Number(r.avg_prior_usd ?? 0),
      pct_change: Number(r.pct_change ?? 0),
      tx_count_recent: Number(r.tx_count_recent ?? 0),
      tx_count_prior: Number(r.tx_count_prior ?? 0),
      volume_recent_usd: Number(r.volume_recent_usd ?? 0),
    });
    const gainers = (gRes.data ?? []).map(toRow as unknown as (r: unknown) => PlayerMoverRow);
    const losers = (lRes.data ?? []).map(toRow as unknown as (r: unknown) => PlayerMoverRow);

    return {
      gainers,
      losers,
      asOfDate: new Date().toISOString().slice(0, 10),
      window_days: window,
    };
  } catch (err) {
    console.error("getPlayerMovers exception:", err);
    return empty;
  }
}

// Cache per-window (different cache keys per window value)
export const getPlayerMovers15d = unstable_cache(
  () => _getPlayerMovers(15),
  ["player-movers", "15"],
  { revalidate: 600, tags: ["player-movers", "player-movers-15"] },
);
export const getPlayerMovers30d = unstable_cache(
  () => _getPlayerMovers(30),
  ["player-movers", "30"],
  { revalidate: 600, tags: ["player-movers", "player-movers-30"] },
);
export const getPlayerMovers90d = unstable_cache(
  () => _getPlayerMovers(90),
  ["player-movers", "90"],
  { revalidate: 1800, tags: ["player-movers", "player-movers-90"] },
);

export function getPlayerMovers(window: MoverWindow): Promise<PlayerMoversResult> {
  if (window === 15) return getPlayerMovers15d();
  if (window === 30) return getPlayerMovers30d();
  return getPlayerMovers90d();
}

export function parseMoverWindow(value: string | undefined | null): MoverWindow {
  if (value === "15") return 15;
  if (value === "90") return 90;
  return 30; // default
}
