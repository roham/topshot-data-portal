// /players — Market cap leaderboard with filter rail.
// OTM parity features: players-marketcap (base) + players-directory (filter rail).
//
// Server component: reads ?sort + ?dir + ?league + ?team + ?active searchParams,
// fetches cached player data, applies JS-side filters + re-sorts, renders layout.
//
// Comparable primary: OTM Players directory with persistent left filter rail.
//   Signature moves ported:
//   · Ranked table with MARKET CAP as dominant right-side column
//   · Green/red background-tinted 24h Δ% cell (TradingView Screener move)
//   · Active sort column header brightens + shows sort-caret beneath text
//   · 7-day sparkline per row (Pillar 1 viz vocab: sparkline)
//   · Persistent left filter rail: League radio, Status toggle, Team multi-select
//   · Selected teams as dismissable chips (ESPN player browser signature move)
//   · Team accordion cascades by league (Basketball-Reference faceted browse move)
//
// URL state (all five params must survive page refresh together):
//   ?sort=<col> &dir=<asc|desc> &league=<NBA|WNBA>
//   &team=<comma-sep teams> &active=<1|0>
// (Pillar 4 §1 mandatory URL-encoded filter state for every directory page)

import Link from "next/link";
import type { Metadata } from "next";
import {
  getPlayersMarketCap,
  type PlayerMarketCapRow,
} from "@/lib/supabase/queries/players-marketcap";
import {
  getMarketCapLanding,
  type PlayerMcapRow,
} from "@/lib/supabase/queries/market-cap-landing";
import { getPlayerMovers, parseMoverWindow } from "@/lib/supabase/queries/player-movers";
import { parseMcapFormula } from "@/lib/market-cap/mcap-formula";
import { Num } from "@/components/primitives/Num";
import { Sparkline } from "@/components/primitives/Sparkline";
import { EmptyState } from "@/components/primitives/EmptyState";
import { ChartCard } from "@/components/primitives/ChartCard";
import { TopPlayersChart } from "@/components/charts/market-cap/TopPlayersChart";
import { MoversCardGrid } from "@/components/charts/market-cap/MoversCardGrid";
import { ByTeamTreemap } from "@/components/charts/market-cap/ByTeamTreemap";
import { McapFormulaToggle } from "@/components/market-cap/McapFormulaToggle";
import { MoverWindowToggle } from "@/components/market-cap/MoverWindowToggle";
import { PlayersSortHeader } from "./PlayersSortHeader";
import { PlayersFilterRail } from "./FilterRail";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Players · TS·PORTAL",
  description:
    "NBA Top Shot player leaderboard ranked by market cap — filter by league, team, and active status.",
};

// searchParams makes the page dynamic; Next.js infers force-dynamic.
// Data is cached in the query layer (revalidate: 300).

// Active player cutoff — heuristic for 2025-26 season window.
// Cited in the FilterRail footnote per Pillar 5 §4 honest-absence.
const ACTIVE_CUTOFF = "2025-10-01";

function parseStringParam(
  raw: string | string[] | undefined,
): string | undefined {
  if (!raw) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s && s.length > 0 ? s : undefined;
}

const VALID_SORT_COLS = [
  "market_cap",
  "delta",
  "editions",
  "minted",
  "circ_pct",
  "player",
  "team",
] as const;
type SortCol = (typeof VALID_SORT_COLS)[number];

function parseSortCol(raw: string | undefined): SortCol {
  return (VALID_SORT_COLS as readonly string[]).includes(raw ?? "")
    ? (raw as SortCol)
    : "market_cap";
}

function sortRows(
  rows: PlayerMarketCapRow[],
  col: SortCol,
  dir: string,
): PlayerMarketCapRow[] {
  const asc = dir === "asc";
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case "market_cap":
        cmp = a.market_cap_usd - b.market_cap_usd;
        break;
      case "delta": {
        if (a.delta_pct_30d == null && b.delta_pct_30d == null) return 0;
        if (a.delta_pct_30d == null) return 1; // nulls last
        if (b.delta_pct_30d == null) return -1;
        cmp = a.delta_pct_30d - b.delta_pct_30d;
        break;
      }
      case "editions":
        cmp = a.edition_count - b.edition_count;
        break;
      case "minted":
        cmp = (a.total_minted ?? 0) - (b.total_minted ?? 0);
        break;
      case "circ_pct":
        cmp = (a.circ_pct ?? 0) - (b.circ_pct ?? 0);
        break;
      case "player":
        cmp = (a.player_name ?? "").localeCompare(b.player_name ?? "");
        break;
      case "team":
        cmp = (a.team_name ?? "").localeCompare(b.team_name ?? "");
        break;
    }
    return asc ? cmp : -cmp;
  });
}

// Normalize league values stored in topshot.players.
// The DB stores "LEAGUE_NBA" / "LEAGUE_WNBA" (uppercase with prefix).
// We normalize to "NBA" / "WNBA" for display, URL params, and testids.
function normalizeLeague(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Strip common prefix variants and uppercase
  return raw.replace(/^league[_-]?/i, "").toUpperCase() || raw.toUpperCase();
}

// ── Client-side filter logic (no extra DB round-trips — works on cached rows) ─
function filterRows(
  rows: PlayerMarketCapRow[],
  league: string | undefined,    // URL param — already normalized (e.g., "NBA")
  selectedTeams: string[],
  activeFilter: string | undefined,
): PlayerMarketCapRow[] {
  return rows.filter((r) => {
    // League filter — compare normalized league from DB against URL param
    if (league) {
      if (normalizeLeague(r.league) !== league) return false;
    }
    // Team filter (multi-select OR — any of the selected teams)
    if (selectedTeams.length > 0) {
      if (!r.team_name || !selectedTeams.includes(r.team_name)) return false;
    }
    // Active/Retired filter
    if (activeFilter === "1") {
      // Active = date_of_last_play >= ACTIVE_CUTOFF
      if (!r.last_play_date) return false;          // null → retired/unknown
      if (r.last_play_date < ACTIVE_CUTOFF) return false;
    } else if (activeFilter === "0") {
      // Retired = date_of_last_play < ACTIVE_CUTOFF OR null
      if (r.last_play_date && r.last_play_date >= ACTIVE_CUTOFF) return false;
    }
    return true;
  });
}

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // ── Sort params ───────────────────────────────────────────────────────────
  const sortColRaw = parseStringParam(sp.sort);
  const sortDirRaw = parseStringParam(sp.dir) ?? "desc";
  const sortCol = parseSortCol(sortColRaw);
  const sortDir = sortDirRaw === "asc" ? "asc" : "desc";

  // ── Filter params ─────────────────────────────────────────────────────────
  const leagueParam = parseStringParam(sp.league);
  const teamRaw = parseStringParam(sp.team);
  // nuqs parseAsArrayOf(parseAsString) serializes as comma-separated
  const selectedTeams = teamRaw ? teamRaw.split(",").filter(Boolean) : [];
  const activeParam = parseStringParam(sp.active); // "1" = active, "0" = retired, undefined = all
  const moverWindow = parseMoverWindow(parseStringParam(sp.mw));
  const formula = parseMcapFormula(parseStringParam(sp.mcap));

  // ── Fetch (cached 5 min). Three queries in parallel: existing table data +
  // /market-cap landing chart data + player movers for top strip. ───────────
  const [{ rows: allRows, as_of_date }, mcapLanding, movers] = await Promise.all([
    getPlayersMarketCap(),
    getMarketCapLanding(),
    getPlayerMovers(moverWindow),
  ]);

  // Re-rank top players for avg-sale formula (clones /market-cap §56-61 pattern)
  const topPlayersRanked: PlayerMcapRow[] =
    formula === "avg_sale"
      ? [...mcapLanding.topPlayers]
          .sort((a, b) => b.avg_sale_market_cap_usd - a.avg_sale_market_cap_usd)
          .slice(0, 10)
      : mcapLanding.topPlayers.slice(0, 10);

  // ── Derive available leagues (normalized: "LEAGUE_NBA" → "NBA") ──────────
  const availableLeagues = [
    ...new Set(
      allRows
        .map((r) => normalizeLeague(r.league))
        .filter((l): l is string => !!l),
    ),
  ].sort();

  // ── Derive available teams (cascade: if league is selected, narrow to that league) ──
  // Use normalized league comparison so "LEAGUE_NBA" matches URL param "NBA"
  const leagueBaseRows = leagueParam
    ? allRows.filter((r) => normalizeLeague(r.league) === leagueParam)
    : allRows;
  const availableTeams = [
    ...new Set(
      leagueBaseRows
        .map((r) => r.team_name)
        .filter((t): t is string => !!t),
    ),
  ].sort();

  // ── Apply filters on cached array (no extra DB call) ─────────────────────
  const filteredRows = filterRows(allRows, leagueParam, selectedTeams, activeParam);

  // ── Re-sort the filtered rows ─────────────────────────────────────────────
  const rows =
    sortCol === "market_cap" && sortDir === "desc"
      ? filteredRows
      : sortRows(filteredRows, sortCol, sortDir);

  const anyFilterActive =
    !!leagueParam || selectedTeams.length > 0 || activeParam != null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-4">
      {/* Page header */}
      <header className="mb-3">
        <h1 className="text-[18px] font-semibold tracking-tight">
          Players
          <span className="text-[var(--accent)] mx-1.5">·</span>
          <span className="text-[var(--text-dim)] text-[13px] tracking-normal font-normal">
            market cap leaderboard
          </span>
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-faint)] font-mono">
          <span>
            <span className="text-[var(--text)] tnum" data-testid="players-filtered-count">
              {rows.length}
            </span>
            {anyFilterActive && (
              <span className="text-[var(--text-faint)]">
                /{allRows.length}
              </span>
            )}{" "}
            players
          </span>
          {as_of_date && (
            <>
              <span>·</span>
              <span data-testid="players-as-of">
                as of{" "}
                <span className="text-[var(--text-dim)]">{as_of_date}</span>
              </span>
            </>
          )}
          <span className="text-[var(--text-faint)]">
            · market cap = sum of floor × circulation across all editions
          </span>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-3" aria-label="Players overview charts">
        <div className="lg:col-span-2">
          <ChartCard
            title={`Top players · ${formula === "avg_sale" ? "avg sale" : "floor"} mcap`}
            subtitle="Top 10"
            caption="Player ranked by total market cap across all editions."
            href="#players-leaderboard"
            testId="chart-top-players"
            headerRight={<McapFormulaToggle />}
          >
            <TopPlayersChart rows={topPlayersRanked} formula={formula} />
          </ChartCard>
        </div>
        <ChartCard
          title="By team"
          subtitle="Aggregate market cap"
          caption="Total floor mcap of all players on each franchise."
          href="#players-leaderboard"
          testId="chart-by-team"
        >
          <ByTeamTreemap rows={mcapLanding.byTeam} />
        </ChartCard>
        <div className="lg:col-span-3">
          <ChartCard
            title={`Top movers · ${moverWindow}D`}
            subtitle="Biggest gainers and losers"
            caption="Players sorted by % change in market cap over the selected window."
            href="#players-leaderboard"
            testId="chart-movers"
            headerRight={<MoverWindowToggle />}
          >
            <MoversCardGrid
              gainers={movers.gainers}
              losers={movers.losers}
              window_days={movers.window_days}
            />
          </ChartCard>
        </div>
      </section>

      <div id="players-leaderboard" />

      {/* 2-column layout: filter rail (left, 220px sticky) + table (right) */}
      <div className="flex gap-4 items-start">
        {/* Left filter rail — client component, drives URL state via nuqs */}
        <PlayersFilterRail
          availableTeams={availableTeams}
          availableLeagues={availableLeagues}
        />

        {/* Right: table (or EmptyState) */}
        <div className="flex-1 min-w-0">
          {rows.length === 0 ? (
            <div className="border border-[var(--border-subtle)] rounded-md">
              <EmptyState
                title={
                  anyFilterActive
                    ? "No players match the current filters."
                    : "No player market cap data available."
                }
                body={
                  anyFilterActive
                    ? "Try removing a filter — or clear all to return to the full leaderboard."
                    : "Player market cap data is being refreshed. Check back in a few hours."
                }
                action={
                  anyFilterActive ? (
                    <Link
                      href="/players"
                      className="text-[11px] text-[var(--accent)] underline"
                    >
                      clear all filters
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <PlayersTable rows={rows} />
          )}
        </div>
      </div>

      <footer className="mt-6 text-[10px] text-[var(--text-faint)] font-mono leading-relaxed">
        <p>
          Market cap = floor price × moments in circulation, summed across all editions per player.
          24h Δ% derived from daily snapshots. Circ % = circulation ÷ total minted.
          Sparkline shows the 7-day market cap trend. Active filter: played since {ACTIVE_CUTOFF}.
        </p>
      </footer>
    </div>
  );
}

function PlayersTable({ rows }: { rows: PlayerMarketCapRow[] }) {
  return (
    <div
      className="border border-[var(--border-subtle)] rounded-md overflow-x-auto bg-[var(--surface-1)]/30"
      data-testid="players-table"
    >
      <table className="w-full text-[12px] font-mono">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            {/* # — rank column, no sort (position is implicit in current sort) */}
            <th className="text-right py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] w-10">
              #
            </th>
            {/* Player */}
            <th className="text-left py-2.5 px-3">
              <PlayersSortHeader
                label="Player"
                column="player"
                defaultDir="asc"
                align="left"
                data-testid="th-player"
              />
            </th>
            {/* Team */}
            <th className="text-left py-2.5 px-3">
              <PlayersSortHeader
                label="Team"
                column="team"
                defaultDir="asc"
                align="left"
                data-testid="th-team"
              />
            </th>
            {/* # Editions */}
            <th className="text-right py-2.5 px-3">
              <PlayersSortHeader
                label="# Editions"
                column="editions"
                defaultDir="desc"
                align="right"
                data-testid="th-editions"
              />
            </th>
            {/* Total Minted */}
            <th className="text-right py-2.5 px-3">
              <PlayersSortHeader
                label="Total Minted"
                column="minted"
                defaultDir="desc"
                align="right"
                data-testid="th-minted"
              />
            </th>
            {/* Circ % */}
            <th className="text-right py-2.5 px-3">
              <PlayersSortHeader
                label="Circ %"
                column="circ_pct"
                defaultDir="desc"
                align="right"
                data-testid="th-circ-pct"
              />
            </th>
            {/* Market Cap — default sort */}
            <th className="text-right py-2.5 px-3">
              <PlayersSortHeader
                label="Market Cap"
                column="market_cap"
                defaultDir="desc"
                align="right"
                data-testid="th-market-cap"
              />
            </th>
            {/* 24h Δ% */}
            <th className="text-right py-2.5 px-3">
              <PlayersSortHeader
                label="24h Δ%"
                column="delta"
                defaultDir="desc"
                align="right"
                data-testid="th-delta"
              />
            </th>
            {/* Trend — sparkline, no sort */}
            <th className="text-right py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] w-20">
              Trend
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <PlayerRow key={row.player_id} row={row} rank={idx + 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlayerRow({
  row,
  rank,
}: {
  row: PlayerMarketCapRow;
  rank: number;
}) {
  const deltaPositive =
    row.delta_pct_30d != null && row.delta_pct_30d > 0;
  const deltaNegative =
    row.delta_pct_30d != null && row.delta_pct_30d < 0;

  return (
    <tr
      className="border-b border-[var(--border-subtle)]/40 hover:bg-[var(--surface-1)]/60 transition-colors"
      data-testid="player-row"
    >
      {/* Rank */}
      <td className="py-2 px-3 text-right tnum text-[var(--text-faint)] text-[11px]">
        {rank}
      </td>

      {/* Player name → /player/[id] */}
      <td className="py-2 px-3 min-w-[160px]">
        <Link
          href={`/player/${row.player_id}`}
          className="text-[var(--text)] hover:text-[var(--accent)] font-medium transition-colors"
          data-testid="player-row-link"
        >
          {row.player_name ?? "—"}
        </Link>
      </td>

      {/* Team */}
      <td className="py-2 px-3 text-[var(--text-dim)] max-w-[180px] truncate">
        {row.team_name ?? <span className="text-[var(--text-faint)]">—</span>}
      </td>

      {/* # Editions */}
      <td className="py-2 px-3 text-right tnum text-[var(--text-dim)]">
        <Num value={row.edition_count} format="int" />
      </td>

      {/* Total Minted */}
      <td className="py-2 px-3 text-right tnum text-[var(--text-dim)]">
        <Num value={row.total_minted} format="int" />
      </td>

      {/* Circ % */}
      <td className="py-2 px-3 text-right tnum text-[var(--text-dim)]">
        <Num value={row.circ_pct} format="pct" precision={1} />
      </td>

      {/* Market Cap — dominant right-side column per OTM comparable */}
      <td className="py-2 px-3 text-right">
        <Num
          value={row.market_cap_usd}
          format="usdCompact"
          className="text-[var(--text)] text-[13px]"
        />
      </td>

      {/* 24h Δ% — background-tinted per TradingView Screener signature move */}
      <td
        className={cn(
          "py-2 px-3 text-right tnum text-[11px] transition-colors",
          deltaPositive ? "bg-[var(--up)]/[0.06]" : "",
          deltaNegative ? "bg-[var(--down)]/[0.06]" : "",
        )}
      >
        <Num value={row.delta_pct_30d} format="deltaPct" colorize={true} />
      </td>

      {/* Trend — 7-day sparkline */}
      <td className="py-2 px-3 text-right">
        <div className="flex justify-end">
          <Sparkline data={row.sparkline} width={72} height={20} />
        </div>
      </td>
    </tr>
  );
}
