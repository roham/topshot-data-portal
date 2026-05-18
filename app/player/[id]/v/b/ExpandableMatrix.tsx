"use client";

// ExpandableMatrix — Client component for Variant B drill-down.
//
// Renders the (set × tier) matrix with inline-expand sub-rows per cell.
//
// Comparable primary: Basketball-Reference expandable career-stats sections.
//   Signature moves ported:
//   · ▼ caret embedded in parent cell (not full row action area)
//   · Inline <tr> sub-rows below parent set row, shared colspan span
//   · Lighter background on expanded sub-rows (IBKR sub-row pattern)
//   · ×N badge showing count of hidden parallels before expand
//
// URL state (Pillar 4 §1 mandatory):
//   ?expand=<set_id>:<tierAbbr>[,<set_id>:<tierAbbr>...]
//   Managed via nuqs — survives page refresh, multiple cells can be open.

import { Fragment, useTransition } from "react";
import { useQueryState, parseAsString } from "nuqs";
import Link from "next/link";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { NewDropTag } from "@/components/primitives/NewDropTag";

// ── Serializable types (passed from Server Component to this client component) ─

export type VariantBSubRow = {
  edition_id: string;
  parallel_name: string;
  circulation: number;
  listings_count: number;
  low_ask: number | null;
  high_offer: number | null;
};

export type VariantBCellData = {
  /** "C" | "R" | "L" | "F" | "U" — for expand key */
  tierAbbr: string;
  /** "Common" | "Rare" | "Legendary" | "Fandom" | "Ultimate" */
  tier: string;
  /** "MOMENT_TIER_COMMON" etc. — for TierChip */
  tierRaw: string;
  hasEdition: boolean;
  minFloor: number | null;
  maxCirculation: number;
  /** Total editions (parallels) in this (set × tier) group */
  count: number;
  subRows: VariantBSubRow[];
};

export type VariantBRowData = {
  set_id: string;
  set_name: string | null;
  series_number: number | null;
  /** Exactly 5 cells, ordered by TIER_COLS */
  cells: VariantBCellData[];
  setTotalMktCap: number | null;
};

// ── TIER_COLS — fixed tier column order (mirrored from base player page) ─────
const TIER_COLS = [
  { tier: "Common",    abbr: "C", raw: "MOMENT_TIER_COMMON" },
  { tier: "Rare",      abbr: "R", raw: "MOMENT_TIER_RARE" },
  { tier: "Legendary", abbr: "L", raw: "MOMENT_TIER_LEGENDARY" },
  { tier: "Fandom",    abbr: "F", raw: "MOMENT_TIER_FANDOM" },
  { tier: "Ultimate",  abbr: "U", raw: "MOMENT_TIER_ULTIMATE" },
] as const;

interface ExpandableMatrixProps {
  rows: VariantBRowData[];
  playerId: string;
}

// Expand key = "<set_id>:<tierAbbr>" — comma-delimited in URL param
function cellKey(setId: string, tierAbbr: string): string {
  return `${setId}:${tierAbbr}`;
}

export function ExpandableMatrix({ rows, playerId }: ExpandableMatrixProps) {
  const [, startTransition] = useTransition();

  // URL-encoded expand state via nuqs (Pillar 4 §1 mandatory)
  const [expandParam, setExpandParam] = useQueryState(
    "expand",
    parseAsString
      .withDefault("")
      .withOptions({
        history: "push",
        startTransition,
      }),
  );

  // Parse comma-delimited expand param into a Set of keys
  const expandedKeys = new Set<string>(
    expandParam.split(",").filter(Boolean),
  );

  function toggleExpand(setId: string, tierAbbr: string) {
    const key = cellKey(setId, tierAbbr);
    const next = new Set(expandedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    const nextStr = [...next].join(",");
    setExpandParam(nextStr || null);
  }

  function isExpanded(setId: string, tierAbbr: string): boolean {
    return expandedKeys.has(cellKey(setId, tierAbbr));
  }

  return (
    <div className="overflow-x-auto" data-testid="variant-b-matrix-wrapper">
      <table
        className="w-full text-[12px] font-mono border-collapse"
        data-testid="variant-b-matrix"
      >
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            {/* Set column header — sticky left */}
            <th className="text-left py-2 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] min-w-[180px] sticky left-0 bg-[var(--surface-1)]">
              Set
            </th>
            {/* Fixed tier column headers */}
            {TIER_COLS.map((tc) => (
              <th
                key={tc.abbr}
                className="text-center py-2 px-2 min-w-[120px]"
                data-testid={`matrix-col-${tc.abbr}`}
              >
                <TierChip tier={tc.raw} />
              </th>
            ))}
            {/* All tiers total */}
            <th className="text-right py-2 px-3 text-[10px] tracking-data-label uppercase text-[var(--text-dim)] min-w-[100px]">
              All tiers
            </th>
          </tr>
        </thead>
        <tbody data-testid="variant-b-matrix-body">
          {rows.map((row) => {
            // Expanded cells for this row (cells with count > 1 and key in expandedKeys)
            const expandedCells = row.cells.filter(
              (cell) =>
                cell.hasEdition &&
                cell.count > 1 &&
                isExpanded(row.set_id, cell.tierAbbr),
            );

            return (
              <Fragment key={row.set_id}>
                {/* ── Parent row ───────────────────────────────────────────── */}
                <tr
                  className="border-b border-[var(--border-subtle)]/40 hover:bg-[var(--surface-2)]/20 transition-colors align-top"
                  data-testid="variant-b-row"
                  data-set={row.set_id}
                >
                  {/* Set name — sticky left */}
                  <td className="py-2 px-3 sticky left-0 bg-[var(--surface-1)] hover:bg-[var(--surface-2)]/20">
                    <Link
                      href={`/set/${row.set_id}`}
                      className="text-[var(--text)] hover:text-[var(--accent)] font-medium"
                    >
                      {row.set_name ?? "Unnamed set"}
                    </Link>
                    {row.series_number != null && (
                      <span className="block text-[10px] text-[var(--text-faint)] tracking-data-label">
                        S{row.series_number}
                      </span>
                    )}
                  </td>

                  {/* Tier cells — 5 fixed columns */}
                  {row.cells.map((cell) => {
                    if (!cell.hasEdition) {
                      // Blank cell — honest absence (Basketball-Reference sparse move)
                      return (
                        <td
                          key={cell.tierAbbr}
                          className="py-2 px-2 text-center text-[var(--text-faint)]"
                          data-testid="variant-b-cell-empty"
                        />
                      );
                    }

                    const showNewDrop =
                      cell.minFloor === null && cell.maxCirculation > 0;
                    const canExpand = cell.count > 1;
                    const expanded =
                      canExpand && isExpanded(row.set_id, cell.tierAbbr);

                    return (
                      <td
                        key={cell.tierAbbr}
                        className="py-2 px-2 text-right align-top"
                        data-testid="matrix-cell"
                        data-tier={cell.tierAbbr}
                        data-set={row.set_id}
                      >
                        <div className="flex flex-col items-end gap-0.5">
                          {/* Floor price — dominant value (OTM comparable) */}
                          {showNewDrop ? (
                            <NewDropTag />
                          ) : (
                            <span className="text-[13px] font-semibold text-[var(--text)]">
                              <Num value={cell.minFloor} format="usd" />
                            </span>
                          )}

                          {/* ×N badge + ▼ caret — Basketball-Reference expand move */}
                          {canExpand && (
                            <button
                              onClick={() =>
                                toggleExpand(row.set_id, cell.tierAbbr)
                              }
                              className="flex items-center gap-0.5 text-[9px] text-[var(--text-faint)] border border-[var(--border-subtle)] rounded px-1 py-0.5 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                              data-testid="expand-caret"
                              data-set={row.set_id}
                              data-tier={cell.tierAbbr}
                              data-expanded={expanded ? "true" : "false"}
                              aria-expanded={expanded}
                              aria-label={`${expanded ? "Collapse" : "Expand"} ${cell.count} ${cell.tier} parallels`}
                            >
                              <span>×{cell.count}</span>
                              <span aria-hidden="true">
                                {expanded ? "▲" : "▼"}
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* All-tiers market cap total for this set row */}
                  <td className="py-2 px-3 text-right">
                    <Num
                      value={row.setTotalMktCap}
                      format="usdCompact"
                      className="text-[var(--text-dim)]"
                    />
                  </td>
                </tr>

                {/* ── Expanded sub-row containers ──────────────────────────── */}
                {/* One container <tr> per expanded (set × tier) cell.
                    Sub-rows inside span all columns via nested micro-table.
                    Lighter background = IBKR Mosaic sub-row pattern. */}
                {expandedCells.map((cell) => (
                  <tr
                    key={`${row.set_id}-${cell.tierAbbr}-expand`}
                    className="bg-[var(--surface-2)]/50 border-b border-[var(--border-subtle)]/30"
                    data-testid="variant-b-expand-container"
                    data-set={row.set_id}
                    data-tier={cell.tierAbbr}
                  >
                    {/* Indent column (aligns with Set column) */}
                    <td
                      className="py-1 px-3 sticky left-0 bg-[var(--surface-2)]/50 border-r border-[var(--border-subtle)]/20"
                      aria-hidden="true"
                    />
                    {/* Spanning cell with nested per-parallel micro-table */}
                    <td
                      colSpan={6}
                      className="py-1 px-2"
                      data-testid="expand-subrows-container"
                    >
                      {/* Sub-row tier label header — IBKR "fill details" header */}
                      <div className="text-[9px] font-mono text-[var(--text-faint)] tracking-data-label uppercase mb-1 pl-1">
                        {cell.tier} parallels ({cell.count})
                      </div>
                      <table className="w-full text-[11px] font-mono">
                        <thead>
                          <tr className="border-b border-[var(--border-subtle)]/30">
                            <th className="text-left pb-1 px-2 text-[9px] tracking-data-label uppercase text-[var(--text-faint)] min-w-[110px]">
                              Parallel
                            </th>
                            <th className="text-right pb-1 px-2 text-[9px] tracking-data-label uppercase text-[var(--text-faint)]">
                              Circ.
                            </th>
                            <th className="text-right pb-1 px-2 text-[9px] tracking-data-label uppercase text-[var(--text-faint)]">
                              Listed
                            </th>
                            <th className="text-right pb-1 px-2 text-[9px] tracking-data-label uppercase text-[var(--text-faint)]">
                              Low Ask
                            </th>
                            <th className="text-right pb-1 px-2 text-[9px] tracking-data-label uppercase text-[var(--text-faint)]">
                              High Offer
                            </th>
                          </tr>
                        </thead>
                        <tbody data-testid="expand-sub-rows">
                          {cell.subRows.map((sub) => {
                            // NewDropTag: circulation > 0 AND listings_count === 0
                            // (Pillar 5 §2 + features.json empty-rows-positive-framing)
                            const showSubNewDrop =
                              sub.low_ask === null && sub.circulation > 0;
                            return (
                              <tr
                                key={sub.edition_id}
                                className="border-b border-[var(--border-subtle)]/20 hover:bg-[var(--surface-1)]/20 transition-colors"
                                data-testid="expand-sub-row"
                                data-edition={sub.edition_id}
                              >
                                <td className="py-1.5 px-2 text-left text-[var(--text-dim)] font-medium">
                                  {sub.parallel_name}
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                  <Num
                                    value={sub.circulation}
                                    format="int"
                                    className="text-[var(--text-dim)]"
                                  />
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                  <Num
                                    value={sub.listings_count}
                                    format="int"
                                    className="text-[var(--text-faint)]"
                                  />
                                </td>
                                <td
                                  className="py-1.5 px-2 text-right"
                                  data-testid="sub-row-low-ask"
                                >
                                  {showSubNewDrop ? (
                                    <NewDropTag />
                                  ) : (
                                    <Num
                                      value={sub.low_ask}
                                      format="usd"
                                      className="text-[var(--text)]"
                                    />
                                  )}
                                </td>
                                <td
                                  className="py-1.5 px-2 text-right"
                                  data-testid="sub-row-high-offer"
                                >
                                  <Num
                                    value={sub.high_offer}
                                    format="usd"
                                    className="text-[var(--text-faint)]"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
