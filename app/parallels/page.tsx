// /parallels — exhaustive per-subedition browse with player picker.
//
// Feature: parallels-route-v1 (features.json priority 3, beyond_otm: true).
//
// Comparable primary: Tensor parallel-aware collection page.
//   Signature moves ported:
//   · One row per (set × tier × parallel): each (edition_id) is its own market
//   · Left rail: tier chips + parallel-type chips (Tensor trait-value rail)
//   · Every column header sortable (Tensor collection page sort)
//   · URL-encoded filter state via nuqs (Pillar 4 §1 mandatory)
//   · EXPORT button → /api/parallels/export (Pillar 4 §6)
//
// Cross-domain comparables also honored:
//   · StockX size-keyed ladder: column density — ask+bid+last sale all visible
//   · PSA Set Registry per-grade pop table: tier = "grade", parallel = "sub-grade"
//
// Parallels NEVER aggregated (Pillar 5 §6):
//   · Each edition_id = one (player × set × tier × parallel) cell
//   · circulation, listings_count, low_ask, high_offer are per-edition
//
// Data source:
//   · topshot.editions (player editions, parallel_id)
//   · topshot.market_caps (circulation, low_ask, high_offer)
//   · topshot.moments (listings_count, subedition_id fallback)
//   · topshot.parallel_types (parallel name)
//   · topshot.sets (set_name, series_number)
//   · topshot.transactions (avg_sale_30d)
//
// URL state:
//   ?player=<id_or_name>  default 201939 (Stephen Curry)
//   ?tiers=Common,Rare    tier multi-select (comma-separated via nuqs)
//   ?parallel=0,16        parallel_id multi-select
//   ?sort=<col>           sort column key
//   ?dir=<asc|desc>       sort direction

import Link from "next/link";
import type { Metadata } from "next";
import { getParallelsData, type ParallelRow } from "@/lib/supabase/queries/parallels";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
import { EmptyState } from "@/components/primitives/EmptyState";
import { KPI } from "@/components/primitives/KPI";
import { NewDropTag } from "@/components/primitives/NewDropTag";
import { ParallelsFilterRail } from "./ParallelsFilterRail";
import { ParallelsSortHeader } from "./ParallelsSortHeader";

export const metadata: Metadata = {
  title: "Parallels · TS·PORTAL",
  description:
    "Per-parallel market table for NBA Top Shot — circulation, listings, low ask, and avg 30d sale by player and parallel type.",
};

// Prevent static pre-render — page is query-param driven.
export const dynamic = "force-dynamic";

const DEFAULT_PLAYER = "201939"; // Stephen Curry

type SortCol =
  | "set_name"
  | "tier"
  | "parallel"
  | "circulation"
  | "listings"
  | "low_ask"
  | "high_offer"
  | "avg_sale_30d";

const VALID_SORT_COLS: SortCol[] = [
  "set_name",
  "tier",
  "parallel",
  "circulation",
  "listings",
  "low_ask",
  "high_offer",
  "avg_sale_30d",
];

function parseSortCol(raw: string | undefined): SortCol {
  return (VALID_SORT_COLS as string[]).includes(raw ?? "")
    ? (raw as SortCol)
    : "set_name";
}

function parseStringParam(
  raw: string | string[] | undefined,
): string | undefined {
  if (!raw) return undefined;
  const s = Array.isArray(raw) ? raw[0] : raw;
  return s && s.length > 0 ? s : undefined;
}

function parseArrayParam(
  raw: string | string[] | undefined,
): string[] {
  const s = parseStringParam(raw);
  if (!s) return [];
  return s.split(",").map((v) => v.trim()).filter(Boolean);
}

function sortRows(
  rows: ParallelRow[],
  col: SortCol,
  dir: "asc" | "desc",
): ParallelRow[] {
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (col) {
      case "set_name":
        cmp = (a.set_name ?? "").localeCompare(b.set_name ?? "");
        break;
      case "tier":
        cmp = (a.tier_name ?? "").localeCompare(b.tier_name ?? "");
        break;
      case "parallel":
        cmp = a.parallel_name.localeCompare(b.parallel_name);
        break;
      case "circulation":
        cmp = a.circulation - b.circulation;
        break;
      case "listings":
        cmp = a.listings_count - b.listings_count;
        break;
      case "low_ask":
        if (a.low_ask == null && b.low_ask == null) return 0;
        if (a.low_ask == null) return 1;
        if (b.low_ask == null) return -1;
        cmp = a.low_ask - b.low_ask;
        break;
      case "high_offer":
        if (a.high_offer == null && b.high_offer == null) return 0;
        if (a.high_offer == null) return 1;
        if (b.high_offer == null) return -1;
        cmp = a.high_offer - b.high_offer;
        break;
      case "avg_sale_30d":
        if (a.avg_sale_30d == null && b.avg_sale_30d == null) return 0;
        if (a.avg_sale_30d == null) return 1;
        if (b.avg_sale_30d == null) return -1;
        cmp = a.avg_sale_30d - b.avg_sale_30d;
        break;
    }
    return dir === "asc" ? cmp : -cmp;
  });
}

export default async function ParallelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // ── Parse URL params ──────────────────────────────────────────────────────
  const player = parseStringParam(sp.player) ?? DEFAULT_PLAYER;
  const tierFilter = parseArrayParam(sp.tiers);
  const parallelFilter = parseArrayParam(sp.parallel);
  const sortColRaw = parseStringParam(sp.sort);
  const sortDirRaw = parseStringParam(sp.dir) ?? "asc";
  const sortCol = parseSortCol(sortColRaw);
  const sortDir = sortDirRaw === "desc" ? "desc" : "asc";

  // ── Fetch data (cached per player_id, 120s revalidate) ───────────────────
  const {
    rows: allRows,
    playerName,
    parallelTypes,
    totalEditions,
    totalCirculation,
    totalListings,
  } = await getParallelsData(player);

  // ── JS-side filter ────────────────────────────────────────────────────────
  let filteredRows = allRows;

  if (tierFilter.length > 0) {
    filteredRows = filteredRows.filter(
      (r) => r.tier_name && tierFilter.includes(r.tier_name),
    );
  }

  if (parallelFilter.length > 0) {
    filteredRows = filteredRows.filter(
      (r) => r.parallel_id && parallelFilter.includes(r.parallel_id),
    );
  }

  // ── Sort ──────────────────────────────────────────────────────────────────
  const rows = sortRows(filteredRows, sortCol, sortDir);

  // ── Export URL: carry current filter state ────────────────────────────────
  const exportParams = new URLSearchParams();
  exportParams.set("player", player);
  if (tierFilter.length > 0) exportParams.set("tiers", tierFilter.join(","));
  if (parallelFilter.length > 0) exportParams.set("parallel", parallelFilter.join(","));
  exportParams.set("sort", sortCol);
  exportParams.set("dir", sortDir);

  const displayName = playerName ?? player;

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-8">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="text-[10px] tracking-data-label uppercase text-[var(--text-faint)] mb-1">
          Parallels
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">
          {displayName} — All Parallels
        </h1>
        <p className="text-[12px] text-[var(--text-dim)] mt-1">
          One row per (set × tier × parallel). Each parallel is its own market — never
          aggregated. Source:{" "}
          <code className="font-mono text-[10px]">topshot.market_caps + topshot.moments</code>
        </p>
      </div>

      {/* ── KPI strip ────────────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-3 gap-3 mb-6"
        data-testid="parallels-kpi-strip"
      >
        <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded px-3 py-2.5">
          <KPI
            label="Editions in view"
            value={rows.length}
            format="int"
            hint={totalEditions !== rows.length ? `of ${totalEditions} total` : undefined}
          />
        </div>
        <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded px-3 py-2.5">
          <KPI
            label="Total Circulation"
            value={totalCirculation}
            format="int"
            hint="all editions, all parallels"
          />
        </div>
        <div className="bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded px-3 py-2.5">
          <KPI
            label="Active Listings"
            value={totalListings}
            format="int"
            hint="listing_price_usd IS NOT NULL"
          />
        </div>
      </div>

      {/* ── Body: filter rail + table ─────────────────────────────────────── */}
      <div className="flex gap-5">
        {/* Filter rail (client component) */}
        <ParallelsFilterRail
          parallelTypes={parallelTypes}
          currentPlayer={player}
          visibleRowCount={rows.length}
        />

        {/* Table region */}
        <div className="flex-1 min-w-0">
          {/* Table actions bar */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-[var(--text-dim)] tnum">
              {rows.length.toLocaleString()} of {totalEditions.toLocaleString()} editions
            </span>
            <a
              href={`/api/parallels/export?${exportParams.toString()}`}
              className="text-[10px] tracking-data-label uppercase text-[var(--text-dim)] hover:text-[var(--text)] border border-[var(--border-subtle)] rounded px-2 py-1 hover:border-[var(--text-faint)] transition-colors"
              data-testid="parallels-export-csv"
            >
              Export CSV
            </a>
          </div>

          {/* Table */}
          {rows.length === 0 ? (
            <EmptyState
              title="No editions match your filters"
              body={
                tierFilter.length > 0 || parallelFilter.length > 0
                  ? `${displayName} has no editions for the selected tier/parallel combination.`
                  : `No editions found for player "${player}". Try a different player.`
              }
              action={
                (tierFilter.length > 0 || parallelFilter.length > 0) ? (
                  <Link
                    href={`/parallels?player=${encodeURIComponent(player)}`}
                    className="text-[11px] text-[var(--accent)] hover:underline"
                  >
                    Clear filters
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div
              className="overflow-x-auto rounded border border-[var(--border-subtle)]"
              data-testid="parallels-table-wrapper"
            >
              <table
                className="w-full text-[11px] border-collapse"
                data-testid="parallels-table"
              >
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-1)]">
                    <th className="px-3 py-2 text-left">
                      <ParallelsSortHeader
                        label="Set"
                        column="set_name"
                        defaultDir="asc"
                        align="left"
                        data-testid="sort-header-set"
                      />
                    </th>
                    <th className="px-3 py-2 text-right w-[60px]">
                      <span className="text-[10px] tracking-data-label uppercase text-[var(--text-dim)]">
                        Ser.
                      </span>
                    </th>
                    <th className="px-3 py-2 text-left w-[100px]">
                      <ParallelsSortHeader
                        label="Tier"
                        column="tier"
                        defaultDir="asc"
                        align="left"
                        data-testid="sort-header-tier"
                      />
                    </th>
                    <th className="px-3 py-2 text-left w-[120px]">
                      <ParallelsSortHeader
                        label="Parallel"
                        column="parallel"
                        defaultDir="asc"
                        align="left"
                        data-testid="sort-header-parallel"
                      />
                    </th>
                    <th className="px-3 py-2 text-right w-[90px]">
                      <ParallelsSortHeader
                        label="Circulation"
                        column="circulation"
                        defaultDir="desc"
                        align="right"
                        data-testid="sort-header-circulation"
                      />
                    </th>
                    <th className="px-3 py-2 text-right w-[80px]">
                      <ParallelsSortHeader
                        label="Listed"
                        column="listings"
                        defaultDir="desc"
                        align="right"
                        data-testid="sort-header-listings"
                      />
                    </th>
                    <th className="px-3 py-2 text-right w-[100px]">
                      <ParallelsSortHeader
                        label="Low Ask"
                        column="low_ask"
                        defaultDir="asc"
                        align="right"
                        data-testid="sort-header-low-ask"
                      />
                    </th>
                    <th className="px-3 py-2 text-right w-[100px]">
                      <ParallelsSortHeader
                        label="High Offer"
                        column="high_offer"
                        defaultDir="desc"
                        align="right"
                        data-testid="sort-header-high-offer"
                      />
                    </th>
                    <th className="px-3 py-2 text-right w-[100px]">
                      <ParallelsSortHeader
                        label="Avg Sale 30D"
                        column="avg_sale_30d"
                        defaultDir="desc"
                        align="right"
                        data-testid="sort-header-avg-sale"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody data-testid="parallels-table-body">
                  {rows.map((row, idx) => (
                    <tr
                      key={row.edition_id}
                      data-testid="parallels-row"
                      className={
                        idx % 2 === 0
                          ? "bg-[var(--surface-0)] hover:bg-[var(--surface-1)]"
                          : "bg-[var(--surface-1)]/40 hover:bg-[var(--surface-1)]"
                      }
                    >
                      {/* Set name */}
                      <td className="px-3 py-2 text-[var(--text)]">
                        {row.set_id ? (
                          <Link
                            href={`/set/${row.set_id}`}
                            className="hover:text-[var(--accent)] transition-colors"
                          >
                            {row.set_name ?? "(Unknown Set)"}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-dim)]">
                            {row.set_name ?? "(Unknown Set)"}
                          </span>
                        )}
                      </td>

                      {/* Series */}
                      <td className="px-3 py-2 text-right text-[var(--text-dim)] tnum">
                        {row.series_number != null ? `S${row.series_number}` : "—"}
                      </td>

                      {/* Tier chip */}
                      <td className="px-3 py-2">
                        <TierChip tier={row.tier_name} />
                      </td>

                      {/* Parallel name — must NOT be a UUID or raw integer */}
                      <td
                        className="px-3 py-2 text-[var(--text-dim)]"
                        data-col="parallel-name"
                        data-testid="parallel-name-cell"
                      >
                        {row.parallel_name}
                      </td>

                      {/* Circulation */}
                      <td className="px-3 py-2 text-right">
                        <Num value={row.circulation} format="int" />
                      </td>

                      {/* Listings */}
                      <td className="px-3 py-2 text-right">
                        <Num value={row.listings_count} format="int" />
                      </td>

                      {/* Low Ask — NEW DROP tag when circulation > 0 but no listings */}
                      <td className="px-3 py-2 text-right">
                        {row.low_ask != null ? (
                          <Num value={row.low_ask} format="usd" />
                        ) : row.circulation > 0 && row.listings_count === 0 ? (
                          <NewDropTag />
                        ) : (
                          <span className="text-[var(--text-faint)]">—</span>
                        )}
                      </td>

                      {/* High Offer */}
                      <td className="px-3 py-2 text-right">
                        <Num value={row.high_offer} format="usd" />
                      </td>

                      {/* Avg Sale 30D */}
                      <td className="px-3 py-2 text-right">
                        <Num value={row.avg_sale_30d} format="usd" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Methodology footnote — Pillar 5 §4 honest-absence */}
          <p className="mt-2 text-[10px] text-[var(--text-faint)] leading-tight">
            Circulation and floor from{" "}
            <code className="font-mono">topshot.market_caps</code> (latest date per
            edition). Listings count from{" "}
            <code className="font-mono">topshot.moments WHERE listing_price_usd IS NOT NULL</code>.
            Avg Sale 30D from{" "}
            <code className="font-mono">topshot.transactions</code> (SUCCEEDED state,
            last 30 calendar days). Parallel names from{" "}
            <code className="font-mono">topshot.parallel_types</code> (backfill via
            migration 0012).
          </p>
        </div>
      </div>
    </div>
  );
}
