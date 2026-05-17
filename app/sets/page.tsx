// /sets — Sets directory with floor + 24h volume per set.
// OTM-parity feature: sets-directory.
//
// Server component: reads ?sort + ?dir + ?series + ?league searchParams,
// fetches cached sets data, applies JS-side filters + re-sorts, renders layout.
//
// Comparable primary: OTM Sets directory with floor + 7d volume.
//   Signature moves ported:
//   · Table-with-filter-rail (Pillar 1 viz kind: table-with-filter-rail)
//   · KPI-strip column shape: floor as dominant right-side metric (green/red
//     tinted by presence of floor data), volume as second-priority column
//   · Series as left-anchor label (Discogs faceted browse signature move)
//   · Every filter selection writes URL param immediately; result count updates
//
// URL state (all four params must survive page refresh together):
//   ?sort=<col> &dir=<asc|desc> &series=<number> &league=<NBA|WNBA>
// (Pillar 4 §1 mandatory URL-encoded filter state for every directory page)
//
// Honest absence: volume column labeled "24h Volume" not "7d Volume" because
// mv_set_7d_activity does not exist in the typed schema (research §5 ceiling).
// Source footnote always visible inline (Pillar 5 §4 honest-absence).

import Link from "next/link";
import type { Metadata } from "next";
import {
  getSetsDirectory,
  type SetDirectoryRow,
} from "@/lib/supabase/queries/sets-directory";
import { Num } from "@/components/primitives/Num";
import { EmptyState } from "@/components/primitives/EmptyState";
import { SetsSortHeader } from "./SetsSortHeader";
import { SetsFilterRail } from "./SetsFilterRail";

export const metadata: Metadata = {
  title: "Sets · TS·PORTAL",
  description:
    "Browse every Top Shot set by series, floor price, and 24h volume.",
};

const VALID_SORT_COLS = [
  "floor",
  "volume",
  "editions",
  "minted",
  "series",
  "set_name",
] as const;
type SortCol = (typeof VALID_SORT_COLS)[number];

function parseSortCol(raw: string | undefined): SortCol {
  return (VALID_SORT_COLS as readonly string[]).includes(raw ?? "")
    ? (raw as SortCol)
    : "floor";
}

function parseStringParam(
  raw: string | string[] | undefined,
): string | undefined {
  if (!raw) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s && s.length > 0 ? s : undefined;
}

function sortRows(
  rows: SetDirectoryRow[],
  col: SortCol,
  dir: "asc" | "desc",
): SetDirectoryRow[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case "floor": {
        // Null floors sort to the end regardless of direction.
        if (a.floor_usd == null && b.floor_usd == null) return 0;
        if (a.floor_usd == null) return 1;
        if (b.floor_usd == null) return -1;
        cmp = a.floor_usd - b.floor_usd;
        break;
      }
      case "volume": {
        if (a.volume_usd == null && b.volume_usd == null) return 0;
        if (a.volume_usd == null) return 1;
        if (b.volume_usd == null) return -1;
        cmp = a.volume_usd - b.volume_usd;
        break;
      }
      case "editions":
        cmp = a.edition_count - b.edition_count;
        break;
      case "minted":
        cmp = (a.total_minted ?? 0) - (b.total_minted ?? 0);
        break;
      case "series":
        cmp = (a.series_number ?? 0) - (b.series_number ?? 0);
        break;
      case "set_name":
        cmp = (a.set_name ?? "").localeCompare(b.set_name ?? "");
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

function filterRows(
  rows: SetDirectoryRow[],
  league: string | undefined,
  series: string | undefined,
): SetDirectoryRow[] {
  return rows.filter((r) => {
    if (league && r.primary_league !== league) return false;
    if (series && String(r.series_number ?? "") !== series) return false;
    return true;
  });
}

export default async function SetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const sortColRaw = parseStringParam(sp.sort);
  const sortDirRaw = parseStringParam(sp.dir) ?? "desc";
  const sortCol = parseSortCol(sortColRaw);
  const sortDir = sortDirRaw === "asc" ? "asc" : "desc";

  const leagueParam = parseStringParam(sp.league);
  const seriesParam = parseStringParam(sp.series);

  const { rows: allRows, volume_label, as_of } = await getSetsDirectory();

  // Derive available filter values from all (unfiltered) rows
  const availableLeagues = [
    ...new Set(
      allRows
        .map((r) => r.primary_league)
        .filter((l): l is string => !!l),
    ),
  ].sort();

  const availableSeries = [
    ...new Set(
      allRows
        .map((r) => r.series_number)
        .filter((n): n is number => n != null),
    ),
  ].sort((a, b) => b - a); // descending (newest first)

  const filteredRows = filterRows(allRows, leagueParam, seriesParam);
  const rows = sortRows(filteredRows, sortCol, sortDir);

  const anyFilterActive = !!leagueParam || !!seriesParam;

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-4">
      {/* Page header */}
      <header className="mb-3">
        <h1 className="text-[18px] font-semibold tracking-tight">
          Sets
          <span className="text-[var(--accent)] mx-1.5">·</span>
          <span className="text-[var(--text-dim)] text-[13px] tracking-normal font-normal">
            directory
          </span>
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-faint)] font-mono">
          <span>
            <span
              className="text-[var(--text)] tnum"
              data-testid="sets-filtered-count"
            >
              {rows.length}
            </span>
            {anyFilterActive && (
              <span className="text-[var(--text-faint)]">
                /{allRows.length}
              </span>
            )}{" "}
            sets
          </span>
          {as_of && (
            <>
              <span>·</span>
              <span data-testid="sets-as-of">
                as of{" "}
                <span className="text-[var(--text-dim)]">{as_of}</span>
              </span>
            </>
          )}
          <span>
            · floor = MIN(lowest_ask_price) across editions ·{" "}
            {volume_label} source:{" "}
            <code className="font-mono">topshot.mv_set_24h_activity</code>
          </span>
        </div>
      </header>

      {/* 2-column layout: filter rail (left, 220px) + table (right) */}
      <div className="flex gap-4 items-start">
        {/* Left filter rail — client component, drives URL state via nuqs */}
        <SetsFilterRail
          availableSeries={availableSeries}
          availableLeagues={availableLeagues}
        />

        {/* Right: table or EmptyState */}
        <div className="flex-1 min-w-0">
          {rows.length === 0 ? (
            <div
              className="border border-[var(--border-subtle)] rounded-md"
              data-testid="sets-empty"
            >
              <EmptyState
                title="No sets match the current filters."
                body="Try removing a filter — or clear all to return to the full directory."
                action={
                  <Link
                    href="/sets"
                    className="text-[11px] text-[var(--accent)] underline"
                  >
                    clear filters
                  </Link>
                }
              />
            </div>
          ) : (
            <SetsTable rows={rows} volumeLabel={volume_label} />
          )}
        </div>
      </div>

      <footer className="mt-6 text-[10px] text-[var(--text-faint)] font-mono leading-relaxed">
        <p>
          Floor = MIN(lowest_ask_price) across all editions in the set, sourced
          from <code>topshot.market_caps</code> (latest date per edition).{" "}
          {volume_label} = <code>topshot.mv_set_24h_activity.volume_usd</code>{" "}
          — accumulated only from ETL launch; window may be partial if ETL
          started recently. Edition count and total minted from{" "}
          <code>topshot.editions</code> aggregated in JS.
        </p>
      </footer>
    </div>
  );
}

function SetsTable({
  rows,
  volumeLabel,
}: {
  rows: SetDirectoryRow[];
  volumeLabel: string;
}) {
  return (
    <div
      className="border border-[var(--border-subtle)] rounded-md overflow-x-auto bg-[var(--surface-1)]/30"
      data-testid="sets-table"
    >
      <table className="w-full text-[12px] font-mono">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            <th className="text-right py-2.5 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] w-10">
              #
            </th>
            <th className="text-left py-2.5 px-3">
              <SetsSortHeader
                label="Set Name"
                column="set_name"
                defaultDir="asc"
                align="left"
                data-testid="th-set-name"
              />
            </th>
            <th className="text-left py-2.5 px-3">
              <SetsSortHeader
                label="Series"
                column="series"
                defaultDir="desc"
                align="left"
                data-testid="th-series"
              />
            </th>
            <th className="text-left py-2.5 px-3 hidden sm:table-cell text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">
              League
            </th>
            <th className="text-right py-2.5 px-3">
              <SetsSortHeader
                label="Editions"
                column="editions"
                defaultDir="desc"
                align="right"
                data-testid="th-editions"
              />
            </th>
            <th className="text-right py-2.5 px-3">
              <SetsSortHeader
                label="Floor"
                column="floor"
                defaultDir="desc"
                align="right"
                data-testid="th-floor"
              />
            </th>
            <th className="text-right py-2.5 px-3">
              <SetsSortHeader
                label={volumeLabel}
                column="volume"
                defaultDir="desc"
                align="right"
                data-testid="th-volume"
              />
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <SetRow key={row.set_id} row={row} rank={idx + 1} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SetRow({ row, rank }: { row: SetDirectoryRow; rank: number }) {
  return (
    <tr
      className="border-b border-[var(--border-subtle)]/40 hover:bg-[var(--surface-1)]/60 transition-colors"
      data-testid="set-row"
    >
      {/* Rank */}
      <td className="py-2 px-3 text-right tnum text-[var(--text-faint)] text-[11px]">
        {rank}
      </td>

      {/* Set Name → /set/[id] */}
      <td className="py-2 px-3 min-w-[200px]">
        <Link
          href={`/set/${row.set_id}`}
          className="text-[var(--text)] hover:text-[var(--accent)] font-medium transition-colors"
          data-testid="set-row-link"
        >
          {row.set_name ?? row.set_id}
        </Link>
      </td>

      {/* Series */}
      <td className="py-2 px-3 text-[var(--text-dim)] text-[11px]">
        {row.series_number != null ? (
          <span>
            <span className="text-[var(--text-faint)]">S</span>
            {row.series_number}
            {row.series_name && (
              <span className="text-[var(--text-faint)] hidden lg:inline">
                {" "}
                · {row.series_name}
              </span>
            )}
          </span>
        ) : (
          <span className="text-[var(--text-faint)]">—</span>
        )}
      </td>

      {/* League */}
      <td className="py-2 px-3 text-[var(--text-dim)] text-[11px] hidden sm:table-cell">
        {row.primary_league ?? (
          <span className="text-[var(--text-faint)]">—</span>
        )}
      </td>

      {/* # Editions */}
      <td className="py-2 px-3 text-right tnum text-[var(--text-dim)]">
        <Num value={row.edition_count} format="int" />
      </td>

      {/* Floor — dominant right-side metric per OTM comparable */}
      <td className="py-2 px-3 text-right">
        <Num
          value={row.floor_usd}
          format="usd"
          className="text-[var(--text)] text-[13px]"
        />
      </td>

      {/* 24h Volume */}
      <td className="py-2 px-3 text-right tnum text-[var(--text-dim)]">
        <Num value={row.volume_usd} format="usdCompact" />
      </td>
    </tr>
  );
}
