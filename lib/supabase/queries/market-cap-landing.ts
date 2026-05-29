// Market Cap Viz Landing — all 8 chart datasets for the graph-first /market-cap.
//
// Doctrine reference: research/doctrine.md v1.1 §P9, research/features/market-cap-viz-landing.md.
//
// All aggregation happens server-side in the Postgres RPC `topshot.market_cap_landing()`
// (see supabase/market_cap_landing_rpc.sql). The prior implementation paginated
// ~261K raw market_caps rows over ~250 sequential PostgREST round-trips, which
// took ~120s cold and 504'd in prod (60s serverless ceiling). The RPC does the
// same math in Postgres and returns a small JSONB blob in ~1-2s. This file is
// now a thin caller + numeric coercion; the interfaces below are unchanged so
// every consumer (app/market-cap/page.tsx, charts) keeps working as-is.

import { unstable_cache } from "next/cache";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export interface PlayerMcapRow {
  player_id: string;
  player_name: string | null;
  team_name: string | null;
  /** Floor-based mcap: SUM(circulation × lowest_ask) per edition, doctrine canonical. */
  total_market_cap_usd: number;
  /** Avg-sale based mcap: avg_sale_30d × total_circulation (player-level approximation). */
  avg_sale_market_cap_usd: number;
  /** 30d transaction count for this player. */
  tx_count_30d: number;
  /** Avg sale price across this player's 30d transactions. */
  avg_sale_price_30d: number;
  edition_count: number;
  /** Total moments in circulation across this player's editions. */
  total_circulation: number;
}

export interface TierMcapRow {
  tier_name: string;
  total_mcap: number;
  edition_count: number;
}

export interface ParallelMcapRow {
  parallel_id: number | null;
  parallel_name: string;
  total_mcap: number;
  edition_count: number;
}

export interface SetMcapRow {
  set_id: string;
  set_name: string | null;
  series_number: number | null;
  total_mcap: number;
}

export interface TeamMcapRow {
  team_id: string | null;
  team_name: string;
  total_mcap: number;
  player_count: number;
}

export interface McapOverTimeRow {
  date: string;
  total_mcap: number;
  edition_count: number;
}

export interface MoverRow {
  player_id: string;
  player_name: string;
  earliest_mcap: number;
  latest_mcap: number;
  pct_change: number;
}

export interface ConcentrationRow {
  top_n: number;
  share_pct: number;
}

export interface MarketCapLanding {
  topPlayers: PlayerMcapRow[];
  byTier: TierMcapRow[];
  byParallel: ParallelMcapRow[];
  topSets: SetMcapRow[];
  byTeam: TeamMcapRow[];
  totalOverTime: McapOverTimeRow[];
  gainers: MoverRow[];
  losers: MoverRow[];
  concentration: ConcentrationRow[];
  /** Avg-sale-based concentration (alternative formula). */
  concentrationAvgSale: ConcentrationRow[];
  asOfDate: string | null;
  /** Total floor mcap on latest date (sum of all market_caps.market_cap rows). */
  totalMcap: number;
  /** Total avg-sale-based mcap (sum across players: avg_sale × circulation). */
  totalAvgSaleMcap: number;
  /** Player-attributed mcap (sum across mv_player_market_cap). Subset of totalMcap. */
  playerAttributedMcap: number;
  /** total editions with non-zero mcap on latest date. */
  totalEditions: number;
  /** distinct players with non-zero mcap. */
  playerCount: number;
  /** Top-10-player share of player-attributed floor mcap as %. */
  top10SharePct: number;
  /** Top-10-player share by avg-sale mcap. */
  top10ShareAvgSalePct: number;
}

const EMPTY: MarketCapLanding = {
  topPlayers: [],
  byTier: [],
  byParallel: [],
  topSets: [],
  byTeam: [],
  totalOverTime: [],
  gainers: [],
  losers: [],
  concentration: [],
  concentrationAvgSale: [],
  asOfDate: null,
  totalMcap: 0,
  totalAvgSaleMcap: 0,
  playerAttributedMcap: 0,
  totalEditions: 0,
  playerCount: 0,
  top10SharePct: 0,
  top10ShareAvgSalePct: 0,
};

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const arr = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
const str = (v: unknown): string | null => (v == null ? null : String(v));

async function _getMarketCapLanding(): Promise<MarketCapLanding> {
  const sb = getSupabaseServerAnon();
  if (!sb) return EMPTY;

  try {
    const { data, error } = await sb.rpc("market_cap_landing");
    if (error || !data) {
      console.error("market-cap-landing rpc failed:", error);
      return EMPTY;
    }
    const r = data as Record<string, unknown>;

    const topPlayers: PlayerMcapRow[] = arr(r.topPlayers).map((p) => ({
      player_id: String(p.player_id),
      player_name: str(p.player_name),
      team_name: str(p.team_name),
      total_market_cap_usd: num(p.total_market_cap_usd),
      avg_sale_market_cap_usd: num(p.avg_sale_market_cap_usd),
      tx_count_30d: num(p.tx_count_30d),
      avg_sale_price_30d: num(p.avg_sale_price_30d),
      edition_count: num(p.edition_count),
      total_circulation: num(p.total_circulation),
    }));

    const byTier: TierMcapRow[] = arr(r.byTier).map((t) => ({
      tier_name: String(t.tier_name ?? "Unknown"),
      total_mcap: num(t.total_mcap),
      edition_count: num(t.edition_count),
    }));

    const byParallel: ParallelMcapRow[] = arr(r.byParallel).map((p) => ({
      parallel_id: p.parallel_id == null ? null : num(p.parallel_id),
      parallel_name: String(p.parallel_name ?? "Unknown"),
      total_mcap: num(p.total_mcap),
      edition_count: num(p.edition_count),
    }));

    const topSets: SetMcapRow[] = arr(r.topSets).map((s) => ({
      set_id: String(s.set_id),
      set_name: str(s.set_name),
      series_number: s.series_number == null ? null : num(s.series_number),
      total_mcap: num(s.total_mcap),
    }));

    const byTeam: TeamMcapRow[] = arr(r.byTeam).map((t) => ({
      team_id: str(t.team_id),
      team_name: String(t.team_name ?? "Unknown"),
      total_mcap: num(t.total_mcap),
      player_count: num(t.player_count),
    }));

    const totalOverTime: McapOverTimeRow[] = arr(r.totalOverTime).map((d) => ({
      date: String(d.date),
      total_mcap: num(d.total_mcap),
      edition_count: num(d.edition_count),
    }));

    const mapMover = (m: Record<string, unknown>): MoverRow => ({
      player_id: String(m.player_id),
      player_name: String(m.player_name ?? "Unknown"),
      earliest_mcap: num(m.earliest_mcap),
      latest_mcap: num(m.latest_mcap),
      pct_change: num(m.pct_change),
    });
    const gainers: MoverRow[] = arr(r.gainers).map(mapMover);
    const losers: MoverRow[] = arr(r.losers).map(mapMover);

    const mapConc = (c: Record<string, unknown>): ConcentrationRow => ({
      top_n: num(c.top_n),
      share_pct: num(c.share_pct),
    });
    const concentration: ConcentrationRow[] = arr(r.concentration).map(mapConc);
    const concentrationAvgSale: ConcentrationRow[] = arr(r.concentrationAvgSale).map(mapConc);

    return {
      topPlayers,
      byTier,
      byParallel,
      topSets,
      byTeam,
      totalOverTime,
      gainers,
      losers,
      concentration,
      concentrationAvgSale,
      asOfDate: str(r.asOfDate),
      totalMcap: num(r.totalMcap),
      totalAvgSaleMcap: num(r.totalAvgSaleMcap),
      playerAttributedMcap: num(r.playerAttributedMcap),
      totalEditions: num(r.totalEditions),
      playerCount: num(r.playerCount),
      top10SharePct: num(r.top10SharePct),
      top10ShareAvgSalePct: num(r.top10ShareAvgSalePct),
    };
  } catch (err) {
    console.error("market-cap-landing query failed:", err);
    return EMPTY;
  }
}

export const getMarketCapLanding = unstable_cache(
  _getMarketCapLanding,
  ["market-cap-landing-rpc-v1"],
  { revalidate: 300, tags: ["market-cap-landing"] },
);
