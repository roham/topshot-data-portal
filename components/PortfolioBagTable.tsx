"use client";

import { useMemo, useRef, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { Num } from "./primitives/Num";
import { TierChip } from "./primitives/TierChip";

export interface BagRow {
  flowId: string;
  serial: number;
  circulation: number;
  playerName: string;
  setFlowName: string;
  setSeries: number | null;
  tier: string;
  parallelID: number;
  lowAskUsd: number | null;
  lastPurchaseUsd: number | null;
  acquiredAt: string | null;
  forSale: boolean;
}

interface PortfolioBagTableProps {
  rows: BagRow[];
}

// TanStack Table + TanStack Virtual. Sticky header, sortable, 28px rows.
// No pagination — virtualization is the answer for big bags.
export function PortfolioBagTable({ rows }: PortfolioBagTableProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "lowAskUsd", desc: true }]);

  const columns = useMemo<ColumnDef<BagRow>[]>(
    () => [
      {
        id: "player",
        header: "Player",
        accessorKey: "playerName",
        cell: (info) => (
          <Link
            href={`/moment/${info.row.original.flowId}`}
            className="text-[var(--text)] hover:text-[var(--accent)]"
            data-testid="bag-row-link"
          >
            {info.row.original.playerName}
          </Link>
        ),
        size: 180,
      },
      {
        id: "set",
        header: "Set",
        accessorFn: (r) => r.setFlowName,
        cell: (info) => <span className="text-[var(--text-dim)] truncate inline-block max-w-[200px]">{info.row.original.setFlowName}</span>,
        size: 220,
      },
      {
        id: "tier",
        header: "Tier",
        accessorKey: "tier",
        cell: (info) => <TierChip tier={info.row.original.tier} />,
        size: 100,
      },
      {
        id: "parallel",
        header: "Par.",
        accessorKey: "parallelID",
        cell: (info) => (info.row.original.parallelID > 0 ? `#${info.row.original.parallelID}` : "—"),
        size: 60,
      },
      {
        id: "serial",
        header: "Serial",
        accessorFn: (r) => r.serial,
        cell: (info) => (
          <span className="tnum text-[11px]">
            #{info.row.original.serial}/{info.row.original.circulation}
          </span>
        ),
        size: 100,
      },
      {
        id: "lowAskUsd",
        header: "Floor",
        accessorKey: "lowAskUsd",
        cell: (info) => (info.row.original.lowAskUsd != null ? <Num value={info.row.original.lowAskUsd} format="usd" /> : <span className="text-[var(--text-faint)]">—</span>),
        size: 90,
      },
      {
        id: "lastPurchaseUsd",
        header: "Last buy",
        accessorKey: "lastPurchaseUsd",
        cell: (info) => (info.row.original.lastPurchaseUsd != null ? <Num value={info.row.original.lastPurchaseUsd} format="usd" /> : <span className="text-[var(--text-faint)]">—</span>),
        size: 90,
      },
      {
        id: "acquiredAt",
        header: () => <span data-testid="bag-col-acquired">Acquired</span>,
        accessorKey: "acquiredAt",
        cell: (info) => {
          const v = info.row.original.acquiredAt;
          if (!v) return <span className="text-[var(--text-faint)]" data-testid="bag-cell-acquired">—</span>;
          const d = new Date(v);
          const fmt = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
          return <span className="tnum text-[11px]" data-testid="bag-cell-acquired">{fmt}</span>;
        },
        size: 100,
      },
      {
        id: "pnl",
        header: "P&L",
        accessorFn: (r) => (r.lowAskUsd != null && r.lastPurchaseUsd != null ? r.lowAskUsd - r.lastPurchaseUsd : null),
        cell: (info) => {
          const r = info.row.original;
          const v = r.lowAskUsd != null && r.lastPurchaseUsd != null ? r.lowAskUsd - r.lastPurchaseUsd : null;
          if (v == null) return <span className="text-[var(--text-faint)]">—</span>;
          return <Num value={v} format="delta" colorize />;
        },
        size: 100,
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (r) => r.forSale,
        cell: (info) => (
          info.row.original.forSale ? <span className="text-[10px] text-[var(--up)] tracking-data-label">listed</span> : <span className="text-[10px] text-[var(--text-faint)] tracking-data-label">held</span>
        ),
        size: 80,
      },
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const parentRef = useRef<HTMLDivElement | null>(null);
  const { rows: sortedRows } = table.getRowModel();
  const virtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 12,
  });

  if (!rows.length) return null;

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows[0]?.start ?? 0;
  const paddingBottom = virtualRows.length ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0) : 0;

  return (
    <div className="overflow-hidden" data-testid="bag-table" data-count={sortedRows.length}>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-[var(--surface-2)] sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="text-left">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    onClick={h.column.getToggleSortingHandler()}
                    className="px-2 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] cursor-pointer select-none border-b border-[var(--border-subtle)]"
                    style={{ width: h.getSize() }}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    {h.column.getIsSorted() === "desc" && " ▼"}
                    {h.column.getIsSorted() === "asc" && " ▲"}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
        </table>
        <div ref={parentRef} className="max-h-[560px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <tbody>
              {paddingTop > 0 && <tr style={{ height: paddingTop }} />}
              {virtualRows.map((vr) => {
                const row = sortedRows[vr.index];
                return (
                  <tr
                    key={row.id}
                    data-testid="bag-row"
                    className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-2)] transition-colors"
                    style={{ height: 28 }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-2 align-middle"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {paddingBottom > 0 && <tr style={{ height: paddingBottom }} />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
