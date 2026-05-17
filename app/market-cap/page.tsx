// /market-cap — graph-first landing for Top Shot market cap.
//
// Doctrine: research/doctrine.md v1.1
//   P2: graphs first, density on drill (tables are second-click)
//   P9: scope cut to market cap visualizations only
//   §0.1: landing-page canon = Polymarket + OTM + Card Ladder Pro
//
// Roham 2026-05-17 19:00Z verbatim: "You just load it, and it's just a bunch of graphs."

import type { Metadata } from "next";
import { getMarketCapLanding } from "@/lib/supabase/queries/market-cap-landing";
import { ChartCard } from "@/components/primitives/ChartCard";
import { TopPlayersChart } from "@/components/charts/market-cap/TopPlayersChart";
import { ByTierChart } from "@/components/charts/market-cap/ByTierChart";
import { ByParallelChart } from "@/components/charts/market-cap/ByParallelChart";
import { TopSetsChart } from "@/components/charts/market-cap/TopSetsChart";
import { ByTeamTreemap } from "@/components/charts/market-cap/ByTeamTreemap";
import { TotalOverTimeChart } from "@/components/charts/market-cap/TotalOverTimeChart";
import { MoversChart } from "@/components/charts/market-cap/MoversChart";
import { ConcentrationChart } from "@/components/charts/market-cap/ConcentrationChart";

export const metadata: Metadata = {
  title: "Market Cap · TS·PORTAL",
  description:
    "Graph-first market cap visualizations for NBA Top Shot — players, tiers, parallels, sets, teams, movers, concentration.",
};

export const revalidate = 300;

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default async function MarketCapPage() {
  const data = await getMarketCapLanding();

  const topPlayer = data.topPlayers[0];
  const topTier = data.byTier[0];
  const topSet = data.topSets[0];
  const topTeam = data.byTeam[0];
  const top10Share = data.concentration.find((c) => c.top_n === 10)?.share_pct;

  return (
    <main className="mx-auto max-w-[1700px] px-4 py-4">
      {/* Header strip — tight, no marketing copy, no hero */}
      <div className="mb-3 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-[20px] font-semibold tracking-tight text-[var(--text)]"
            data-testid="market-cap-h1"
          >
            Market Cap
          </h1>
          {data.asOfDate && (
            <p className="text-[10px] text-[var(--text-faint)] tracking-data-label uppercase mt-0.5">
              snapshot as of {data.asOfDate}
            </p>
          )}
        </div>
      </div>

      {/* KPI strip — 4 tiles, info-dense without being a table */}
      {data.totalMcap > 0 && (
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
            <p className="text-[9px] text-[var(--text-faint)] tracking-data-label uppercase">Total market cap</p>
            <p className="text-[18px] font-semibold mt-1 tabular-nums">{fmtUSD(data.totalMcap)}</p>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
              {fmtUSD(data.playerAttributedMcap)} attributed · {fmtUSD(data.totalMcap - data.playerAttributedMcap)} unattributed
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
            <p className="text-[9px] text-[var(--text-faint)] tracking-data-label uppercase">Active editions</p>
            <p className="text-[18px] font-semibold mt-1 tabular-nums">{data.totalEditions.toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">non-zero mcap on {data.asOfDate}</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
            <p className="text-[9px] text-[var(--text-faint)] tracking-data-label uppercase">Players</p>
            <p className="text-[18px] font-semibold mt-1 tabular-nums">{data.playerCount.toLocaleString()}</p>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">with attributable market cap</p>
          </div>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
            <p className="text-[9px] text-[var(--text-faint)] tracking-data-label uppercase">Top-10 concentration</p>
            <p className="text-[18px] font-semibold mt-1 tabular-nums">{data.top10SharePct.toFixed(1)}%</p>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">of player-attributed mcap</p>
          </div>
        </div>
      )}

      {data.totalMcap === 0 ? (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-12 text-center">
          <p className="text-[14px] text-[var(--text-dim)]">
            No market cap data available.
          </p>
          <p className="text-[11px] text-[var(--text-faint)] mt-2">
            topshot.market_caps is empty for the latest date. ETL may be running.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Row 1 — full-width hero chart: total mcap over time */}
          <ChartCard
            title="Total market cap"
            subtitle="across all players, all editions"
            asOf={data.asOfDate ?? undefined}
            wide
            testId="chart-total-over-time"
            href="#total-over-time"
            caption={
              data.totalOverTime.length >= 2
                ? `${fmtUSD(data.totalOverTime[data.totalOverTime.length - 1].total_mcap)} across ${data.totalOverTime[data.totalOverTime.length - 1].edition_count.toLocaleString()} editions on ${data.totalOverTime[data.totalOverTime.length - 1].date}.`
                : `${data.totalOverTime.length} day(s) of mcap snapshots — more accrue daily.`
            }
            methodology="Sum of edition-level market_cap from topshot.market_caps per day. Last 30 days of available snapshots."
          >
            <TotalOverTimeChart rows={data.totalOverTime} />
          </ChartCard>

          {/* Row 2 — top players & by tier */}
          <ChartCard
            title="Top 20 players"
            subtitle="by total market cap"
            asOf={data.asOfDate ?? undefined}
            testId="chart-top-players"
            href="/players"
            caption={
              topPlayer
                ? `${topPlayer.player_name ?? topPlayer.player_id} leads at ${fmtUSD(topPlayer.total_market_cap_usd)} across ${topPlayer.edition_count} editions.`
                : "No player data."
            }
            methodology="topshot.mv_player_market_cap ranked by total_market_cap_usd descending."
          >
            <TopPlayersChart rows={data.topPlayers} />
          </ChartCard>

          <ChartCard
            title="Market cap by tier"
            subtitle="Common / Rare / Legendary / Ultimate / Fandom"
            asOf={data.asOfDate ?? undefined}
            testId="chart-by-tier"
            href="/tier"
            caption={
              topTier
                ? `${topTier.tier_name} leads at ${fmtUSD(topTier.total_mcap)} across ${topTier.edition_count.toLocaleString()} editions.`
                : "No tier data."
            }
            methodology="Aggregated from topshot.market_caps joined to topshot.editions on the latest date."
          >
            <ByTierChart rows={data.byTier} />
          </ChartCard>

          {/* Row 3 — by parallel & top sets */}
          <ChartCard
            title="Market cap by parallel"
            subtitle="Base + 22 named parallels"
            asOf={data.asOfDate ?? undefined}
            testId="chart-by-parallel"
            href="/parallels"
            caption={
              data.byParallel.length > 1
                ? `${data.byParallel[0].parallel_name} dominates at ${fmtUSD(data.byParallel[0].total_mcap)}.`
                : "Parallel backfill in progress — most editions classified as 'Unknown' until topshot.editions.parallel_id fills."
            }
            methodology="Parallel taxonomy: topshot.parallel_types (22 named + Base sentinel, sourced from Top Shot GraphQL 2026-05-17). Edition→parallel mapping backfilled from Top Shot getMintedMoment lookups (partial coverage)."
          >
            <ByParallelChart rows={data.byParallel} />
          </ChartCard>

          <ChartCard
            title="Top 20 sets"
            subtitle="by total market cap"
            asOf={data.asOfDate ?? undefined}
            testId="chart-top-sets"
            href="/sets"
            caption={
              topSet
                ? `${topSet.set_name}${topSet.series_number != null ? ` (S${topSet.series_number})` : ""} leads at ${fmtUSD(topSet.total_mcap)}.`
                : "No set data."
            }
            methodology="Aggregated from market_caps joined to editions to sets on latest date. Color gradient = series."
          >
            <TopSetsChart rows={data.topSets} />
          </ChartCard>

          {/* Row 4 — full-width treemap: team mcap */}
          <ChartCard
            title="Market cap by team"
            subtitle="top 30 teams · sized proportional to total mcap"
            asOf={data.asOfDate ?? undefined}
            wide
            testId="chart-by-team"
            href="/teams"
            caption={
              topTeam
                ? `${topTeam.team_name} leads at ${fmtUSD(topTeam.total_mcap)} across ${topTeam.player_count} players.`
                : "No team data."
            }
            methodology="players.last_known_team_full_name joined to editions on player_id, aggregated against market_caps on latest date."
          >
            <ByTeamTreemap rows={data.byTeam} />
          </ChartCard>

          {/* Row 5 — movers & concentration */}
          <ChartCard
            title="Mcap movers"
            subtitle="biggest gainers + losers since 2026-05-13"
            asOf={data.asOfDate ?? undefined}
            testId="chart-movers"
            href="/movers"
            caption={
              data.gainers.length > 0
                ? `Top gainer: ${data.gainers[0].player_name} at ${data.gainers[0].pct_change > 0 ? "+" : ""}${data.gainers[0].pct_change.toFixed(1)}%. Window is short — 4 days of mcap snapshots.`
                : "Mcap-change window thin (≥2 daily snapshots required). Time-series populates as ETL accrues."
            }
            methodology="Per-player delta between earliest and latest date in 30d window. Filter: latest_mcap > $1K to suppress noise. Will deepen as ETL accumulates more snapshots."
          >
            <MoversChart gainers={data.gainers} losers={data.losers} />
          </ChartCard>

          <ChartCard
            title="Market cap concentration"
            subtitle="cumulative share by top-N players"
            asOf={data.asOfDate ?? undefined}
            testId="chart-concentration"
            href="/players"
            caption={
              top10Share != null
                ? `Top 10 players hold ${top10Share.toFixed(1)}% of total market cap.`
                : "Concentration data not available."
            }
            methodology="Sum of top-N mcap divided by sum of all 2,000 mv_player_market_cap rows. Log-scale x-axis."
          >
            <ConcentrationChart rows={data.concentration} />
          </ChartCard>
        </div>
      )}

      {/* Drill-down nav at the bottom */}
      <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-[10px] text-[var(--text-faint)] tracking-data-label uppercase">
          Drill into the tables
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
          <a href="/players" className="text-[var(--accent)] hover:underline">/players →</a>
          <a href="/moments" className="text-[var(--accent)] hover:underline">/moments →</a>
          <a href="/sets" className="text-[var(--accent)] hover:underline">/sets →</a>
          <a href="/parallels" className="text-[var(--accent)] hover:underline">/parallels →</a>
          <a href="/methodology" className="text-[var(--text-dim)] hover:underline">/methodology →</a>
        </div>
      </div>
    </main>
  );
}
