// /market-cap — graph-first landing for Top Shot market cap.
//
// Doctrine: research/doctrine.md v1.1
//   P2: graphs first, density on drill (tables are second-click)
//   P9: scope cut to market cap visualizations only
//   §0.1: landing-page canon = Polymarket + OTM + Card Ladder Pro
//
// Roham 2026-05-17 19:00Z verbatim: "You just load it, and it's just a bunch of graphs."

import type { Metadata } from "next";
import { getMarketCapLanding, type PlayerMcapRow } from "@/lib/supabase/queries/market-cap-landing";
import { getPlayerMovers, parseMoverWindow } from "@/lib/supabase/queries/player-movers";
import { ChartCard } from "@/components/primitives/ChartCard";
import { TopPlayersChart } from "@/components/charts/market-cap/TopPlayersChart";
import { ByTierChart } from "@/components/charts/market-cap/ByTierChart";
import { ByParallelChart } from "@/components/charts/market-cap/ByParallelChart";
import { TopSetsChart } from "@/components/charts/market-cap/TopSetsChart";
import { ByTeamTreemap } from "@/components/charts/market-cap/ByTeamTreemap";
import { TotalOverTimeChart } from "@/components/charts/market-cap/TotalOverTimeChart";
import { TS50IndexHero } from "@/components/TS50IndexHero";
import { MoversCardGrid } from "@/components/charts/market-cap/MoversCardGrid";
import { ConcentrationChart } from "@/components/charts/market-cap/ConcentrationChart";
import { McapFormulaToggle } from "@/components/market-cap/McapFormulaToggle";
import { MoverWindowToggle } from "@/components/market-cap/MoverWindowToggle";
import { parseMcapFormula } from "@/lib/market-cap/mcap-formula";

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

export default async function MarketCapPage({
  searchParams,
}: {
  searchParams: Promise<{ mcap?: string; mw?: string }>;
}) {
  const sp = await searchParams;
  const formula = parseMcapFormula(sp.mcap);
  const moverWindow = parseMoverWindow(sp.mw);
  const [data, movers] = await Promise.all([
    getMarketCapLanding(),
    getPlayerMovers(moverWindow),
  ]);

  // Choose mcap source per formula. Re-rank top players for avg-sale view.
  const topPlayersRanked: PlayerMcapRow[] =
    formula === "avg_sale"
      ? [...data.topPlayers]
          .sort((a, b) => b.avg_sale_market_cap_usd - a.avg_sale_market_cap_usd)
          .slice(0, 20)
      : data.topPlayers.slice(0, 20);

  const topPlayer = topPlayersRanked[0];
  const topTier = data.byTier[0];
  const topSet = data.topSets[0];
  const topTeam = data.byTeam[0];

  const headlineTotal = formula === "avg_sale" ? data.totalAvgSaleMcap : data.totalMcap;
  const headlineConcShare =
    formula === "avg_sale" ? data.top10ShareAvgSalePct : data.top10SharePct;
  const concentrationRows =
    formula === "avg_sale" ? data.concentrationAvgSale : data.concentration;
  const formulaLabel = formula === "avg_sale" ? "avg sale (30d) × circulation" : "lowest ask × circulation";

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
              snapshot as of {data.asOfDate} · {formulaLabel}
            </p>
          )}
        </div>
        <McapFormulaToggle />
      </div>

      {/* TS50 Composite Index hero — doctrine §0.1 CL50 signature move ported.
          365D lookback (will look thin until ETL accumulates more snapshots;
          honest absence handled inside the component). */}
      <div className="mb-4">
        <TS50IndexHero lookbackDays={365} />
      </div>

      {/* KPI strip — 4 tiles, info-dense without being a table. Reactive to formula. */}
      {data.totalMcap > 0 && (
        <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
            <p className="text-[9px] text-[var(--text-faint)] tracking-data-label uppercase">
              {formula === "avg_sale" ? "Avg-sale market cap" : "Floor market cap"}
            </p>
            <p className="text-[18px] font-semibold mt-1 tabular-nums">{fmtUSD(headlineTotal)}</p>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
              {formula === "avg_sale"
                ? `vs ${fmtUSD(data.totalMcap)} on lowest-ask basis`
                : `${fmtUSD(data.playerAttributedMcap)} attributed · ${fmtUSD(data.totalMcap - data.playerAttributedMcap)} unattributed`}
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
            <p className="text-[18px] font-semibold mt-1 tabular-nums">{headlineConcShare.toFixed(1)}%</p>
            <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
              by {formula === "avg_sale" ? "avg-sale" : "floor"} mcap
            </p>
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
          {/* Row 1 — the two info-richest charts: ranking + composition */}
          <ChartCard
            title="Top 20 players"
            subtitle={`ranked by ${formula === "avg_sale" ? "30d avg-sale" : "floor"} market cap`}
            asOf={data.asOfDate ?? undefined}
            testId="chart-top-players"
            href="/players"
            caption={
              topPlayer
                ? `${topPlayer.player_name ?? topPlayer.player_id} leads at ${fmtUSD(formula === "avg_sale" ? topPlayer.avg_sale_market_cap_usd : topPlayer.total_market_cap_usd)} across ${topPlayer.edition_count} editions.`
                : "No player data."
            }
            methodology={
              formula === "avg_sale"
                ? "Avg sale price × total circulation, per player. Sourced from topshot.mv_player_30d_volume joined to mv_player_market_cap. Avoids floor-cap artifacts from vanity 1-of-1 asks; reflects what the market actually transacted at."
                : "topshot.mv_player_market_cap ranked by total_market_cap_usd descending. Floor formula: circulation × lowest_ask per edition. Doctrine canonical. Color gradient = rank."
            }
          >
            <TopPlayersChart rows={topPlayersRanked} formula={formula} />
          </ChartCard>

          <ChartCard
            title="Market cap by tier"
            subtitle="Common / Rare / Legendary / Ultimate / Fandom"
            asOf={data.asOfDate ?? undefined}
            testId="chart-by-tier"
            href="#by-tier-drill"
            caption={
              topTier
                ? `${topTier.tier_name} leads at ${fmtUSD(topTier.total_mcap)} across ${topTier.edition_count.toLocaleString()} editions.`
                : "No tier data."
            }
            methodology="Market cap split by tier on the latest snapshot. Color: Common slate, Rare cyan, Legendary violet, Ultimate coral, Fandom gold."
          >
            <ByTierChart rows={data.byTier} />
          </ChartCard>

          {/* Row 2 — by parallel & top sets */}
          <ChartCard
            title="Market cap by parallel"
            subtitle="Base + 22 named parallels"
            asOf={data.asOfDate ?? undefined}
            testId="chart-by-parallel"
            href="/parallels"
            caption={
              data.byParallel.length > 1 && data.byParallel.some((p) => p.parallel_id != null && p.parallel_id > 0)
                ? `${data.byParallel[0].parallel_name} dominates at ${fmtUSD(data.byParallel[0].total_mcap)}.`
                : `All ${data.totalEditions.toLocaleString()} editions in our DB resolve to Base parallel. Named parallels (Diamond, Anthology, etc.) live in Top Shot as sibling editions our ETL doesn't yet pull — sibling-edition fill is open work.`
            }
            methodology="Market cap split across 22 named parallels plus Base. Each parallel is its own market."
          >
            <ByParallelChart rows={data.byParallel} />
          </ChartCard>

          <ChartCard
            title="Top 20 sets"
            subtitle="by total market cap · color = series"
            asOf={data.asOfDate ?? undefined}
            testId="chart-top-sets"
            href="/sets"
            caption={
              topSet
                ? `${topSet.set_name}${topSet.series_number != null ? ` (Series ${topSet.series_number})` : ""} leads at ${fmtUSD(topSet.total_mcap)}.`
                : "No set data."
            }
            methodology="Top sets by total market cap on the latest snapshot. Color: series 1 violet → series 8 cyan."
          >
            <TopSetsChart rows={data.topSets} />
          </ChartCard>

          {/* Row 3 — full-width treemap: team mcap */}
          <ChartCard
            title="Market cap by team"
            subtitle="top 30 teams · sized proportional to total mcap"
            asOf={data.asOfDate ?? undefined}
            wide
            testId="chart-by-team"
            href="#by-team-drill"
            caption={
              topTeam
                ? `${topTeam.team_name} leads at ${fmtUSD(topTeam.total_mcap)} across ${topTeam.player_count} players.`
                : "No team data."
            }
            methodology="Per-team aggregate market cap. Tile area is proportional to total team mcap."
          >
            <ByTeamTreemap rows={data.byTeam} />
          </ChartCard>

          {/* Row 4 — macro context: total over time + concentration (paired half-widths) */}
          <ChartCard
            title="Total market cap"
            subtitle="across all editions, daily snapshots"
            asOf={data.asOfDate ?? undefined}
            testId="chart-total-over-time"
            href="#total-drill"
            caption={
              data.totalOverTime.length >= 2
                ? `${fmtUSD(data.totalOverTime[data.totalOverTime.length - 1].total_mcap)} across ${data.totalOverTime[data.totalOverTime.length - 1].edition_count.toLocaleString()} editions on ${data.totalOverTime[data.totalOverTime.length - 1].date}.`
                : `${data.totalOverTime.length} day(s) of mcap snapshots — more accrue daily.`
            }
            methodology="Daily total market cap across all editions. History deepens with each refresh."
          >
            <TotalOverTimeChart rows={data.totalOverTime} />
          </ChartCard>

          <ChartCard
            title="Market cap concentration"
            subtitle={`cumulative share · ${formula === "avg_sale" ? "avg-sale" : "floor"} basis · log scale`}
            asOf={data.asOfDate ?? undefined}
            testId="chart-concentration"
            href="/players"
            caption={`Top 10 players hold ${headlineConcShare.toFixed(1)}% of ${formula === "avg_sale" ? "avg-sale" : "floor"}-attributed mcap.`}
            methodology="Sum of top-N mcap divided by total. Log-scale x-axis from 10 to 1000."
          >
            <ConcentrationChart rows={concentrationRows} />
          </ChartCard>

        </div>
      )}

      {/* Row 5 — full-width: meme-coin-style movers section.
          Per Roham 2026-05-17 20:45Z: "top movers section highlighting
          biggest changes over last 15/30/90 days. Color coded the way
          a meme coin tracking site would show." */}
      {data.totalMcap > 0 && (
        <section id="movers" className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-[16px] font-semibold tracking-tight text-[var(--text)]">
                Top movers
              </h2>
              <p className="text-[10px] text-[var(--text-faint)] tracking-data-label uppercase mt-0.5">
                avg sale price · {moverWindow}d recent vs prior · ≥5 tx both windows · {movers.gainers.length + movers.losers.length} players
              </p>
            </div>
            <MoverWindowToggle />
          </div>
          <MoversCardGrid
            gainers={movers.gainers}
            losers={movers.losers}
            window_days={moverWindow}
          />
        </section>
      )}

      {/* Methodology footer — small, signature-move comparable note */}
      <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-[10px] text-[var(--text-faint)] tracking-data-label uppercase mb-2">
          Methodology
        </p>
        <p className="text-[11px] text-[var(--text-dim)] leading-relaxed max-w-[820px]">
          Graph-first landing modeled after <a href="https://polymarket.com" target="_blank" rel="noopener" className="text-[var(--text-dim)] hover:text-[var(--accent)] underline-offset-2 hover:underline">Polymarket</a>, <a href="https://cardladder.com" target="_blank" rel="noopener" className="text-[var(--text-dim)] hover:text-[var(--accent)] underline-offset-2 hover:underline">Card Ladder Pro</a>, and the deceased <span className="text-[var(--text-dim)]">OTM</span> home —
          chart-as-the-card, tables on second click. Per <a href="https://github.com/roham/topshot-data-portal/blob/main/research/doctrine.md" target="_blank" rel="noopener" className="text-[var(--text-dim)] hover:text-[var(--accent)] underline-offset-2 hover:underline">doctrine v1.1</a>: faithful display (vanity 1-of-1 asks counted), parallels first-class, opportunity framing on empty markets, default 30D.
          All reads from <code className="text-[var(--text-faint)]">topshot.*</code> Supabase tables; zero BQ at request time.
        </p>
        <p className="text-[10px] text-[var(--text-faint)] tracking-data-label uppercase mt-4 mb-2">
          Drill into the tables
        </p>
        <div className="flex flex-wrap gap-3 text-[11px]">
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
