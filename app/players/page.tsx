// /players — Market cap leaderboard. OTM parity feature players-marketcap.
//
// Server component: reads ?sort + ?dir searchParams, fetches cached player
// data, re-sorts in JS, renders the table.
//
// Comparable primary: OTM Players view with MARKET CAP column + 24h Δ%
//   Signature moves ported:
//   · Ranked table with MARKET CAP as dominant right-side column
//   · Green/red background-tinted 24h Δ% cell (TradingView Screener move)
//   · Active sort column header brightens + shows sort-caret beneath text
//   · 7-day sparkline per row (Pillar 1 viz vocab: sparkline)
//
// URL state: ?sort=<column>&dir=<asc|desc>  — nuqs, survives page refresh
// (Pillar 4 §1 mandatory URL-encoded filter state).

import Link from "next/link";
import type { Metadata } from "next";
import {
  getPlayersMarketCap,
  type PlayerMarketCapRow,
} from "@/lib/supabase/queries/players-marketcap";
import { Num } from "@/components/primitives/Num";
import { Sparkline } from "@/components/primitives/Sparkline";
import { EmptyState } from "@/components/primitives/EmptyState";
import { PlayersSortHeader } from "./PlayersSortHeader";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Players · TS·PORTAL",
  description:
    "NBA Top Shot player leaderboard ranked by market cap — sum of floor × circulation across all editions.",
};

// searchParams makes the page dynamic; Next.js infers force-dynamic.
// Data is cached in the query layer (revalidate: 300).

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
        if (a.delta_pct_24h == null && b.delta_pct_24h == null) return 0;
        if (a.delta_pct_24h == null) return 1; // nulls last
        if (b.delta_pct_24h == null) return -1;
        cmp = a.delta_pct_24h - b.delta_pct_24h;
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

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sortColRaw = parseStringParam(sp.sort);
  const sortDirRaw = parseStringParam(sp.dir) ?? "desc";
  const sortCol = parseSortCol(sortColRaw);
  const sortDir = sortDirRaw === "asc" ? "asc" : "desc";

  const { rows: allRows, as_of_date } = await getPlayersMarketCap();

  // Re-sort from cached data based on URL params.
  // Default (market_cap + desc) replicates DB order — trivial stable no-op.
  const rows =
    sortCol === "market_cap" && sortDir === "desc"
      ? allRows
      : sortRows(allRows, sortCol, sortDir);

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
            <span className="text-[var(--text)] tnum">{rows.length}</span>{" "}
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
            · market cap = sum of floor × circulation across all editions ·
            source:{" "}
            <code className="font-mono">topshot.mv_player_market_cap</code>
          </span>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="border border-[var(--border-subtle)] rounded-md">
          <EmptyState
            title="No player market cap data available."
            body="The mv_player_market_cap materialized view has not yet been populated. The ETL cron refreshes it every 24 hours."
          />
        </div>
      ) : (
        <PlayersTable rows={rows} />
      )}

      <footer className="mt-6 text-[10px] text-[var(--text-faint)] font-mono leading-relaxed">
        <p>
          Market cap = SUM(floor_price × moments_in_circulation) across all
          editions for each player, sourced from{" "}
          <code>topshot.mv_player_market_cap</code>. 24h Δ% derived from{" "}
          <code>topshot.market_caps</code> daily snapshots. Circ % ={" "}
          circulation ÷ total minted. Sparkline: 7-day market cap trend.
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
    row.delta_pct_24h != null && row.delta_pct_24h > 0;
  const deltaNegative =
    row.delta_pct_24h != null && row.delta_pct_24h < 0;

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
        <Num value={row.delta_pct_24h} format="deltaPct" colorize={true} />
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
