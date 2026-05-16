// Skeleton fallbacks for the homepage <Suspense> boundaries.
//
// Each skeleton mirrors the dimensions of its resolved counterpart so the page
// doesn't jump when a streamed section paints. Built from Tailwind primitives;
// no external deps. `animate-pulse` is the shimmer; reduce-motion users see
// a steady dim block.

import { Card } from "@/components/primitives/Card";

const ROW_SKELETON_HEIGHT = "h-[26px]";

export function KpiStripSkeleton() {
  return (
    <Card variant="inset">
      <div className="px-3 py-2 flex items-baseline gap-3 border-b border-[var(--border-subtle)]">
        <div className="h-[13px] w-[140px] bg-[var(--surface-2)] rounded animate-pulse" />
        <div className="ml-auto h-[10px] w-[100px] bg-[var(--surface-2)] rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} data-skeleton="kpi-cell" className="p-3">
            <div className="h-[10px] w-[80px] bg-[var(--surface-2)] rounded animate-pulse mb-2" />
            <div className="h-[22px] w-[100px] bg-[var(--surface-2)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </Card>
  );
}

interface TableSkeletonProps {
  rows: number;
  rowAttr: string;
  columns: number;
}

function TableSkeleton({ rows, rowAttr, columns }: TableSkeletonProps) {
  return (
    <Card variant="inset">
      <div className="bg-[var(--surface-2)] h-[28px] border-b border-[var(--border-subtle)]" />
      <div className="divide-y divide-[var(--border-subtle)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            data-skeleton={rowAttr}
            className={`flex items-center gap-3 px-3 ${ROW_SKELETON_HEIGHT}`}
          >
            {Array.from({ length: columns }).map((__, c) => (
              <div
                key={c}
                className={`h-[10px] bg-[var(--surface-2)] rounded animate-pulse ${
                  c === 0 ? "w-[20px]" : c === 1 ? "flex-1" : "w-[60px]"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function TopPlayersSkeleton() {
  return (
    <section aria-labelledby="sb-players-skel">
      <div className="flex items-baseline gap-3 mb-2 px-1">
        <div
          id="sb-players-skel"
          className="h-[13px] w-[160px] bg-[var(--surface-2)] rounded animate-pulse"
        />
        <div className="h-[10px] w-[220px] bg-[var(--surface-2)] rounded animate-pulse" />
      </div>
      <TableSkeleton rows={20} rowAttr="player-row" columns={7} />
    </section>
  );
}

export function MostActiveEditionsSkeleton() {
  return (
    <section aria-labelledby="sb-active-skel">
      <div className="flex items-baseline gap-3 mb-2 px-1">
        <div
          id="sb-active-skel"
          className="h-[13px] w-[200px] bg-[var(--surface-2)] rounded animate-pulse"
        />
        <div className="h-[10px] w-[260px] bg-[var(--surface-2)] rounded animate-pulse" />
      </div>
      <TableSkeleton rows={20} rowAttr="edition-row" columns={6} />
    </section>
  );
}

export function LargestSalesSkeleton() {
  return (
    <section aria-labelledby="sb-largest-skel">
      <div className="flex items-baseline gap-3 mb-2 px-1">
        <div
          id="sb-largest-skel"
          className="h-[13px] w-[160px] bg-[var(--surface-2)] rounded animate-pulse"
        />
        <div className="h-[10px] w-[180px] bg-[var(--surface-2)] rounded animate-pulse" />
      </div>
      <TableSkeleton rows={20} rowAttr="sale-row" columns={5} />
    </section>
  );
}

export function LegacyCascadeSkeleton() {
  return (
    <div data-skeleton="legacy-cascade" className="space-y-5">
      {/* Aggregate economy strip */}
      <Card variant="inset">
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3">
              <div className="h-[10px] w-[80px] bg-[var(--surface-2)] rounded animate-pulse mb-2" />
              <div className="h-[22px] w-[100px] bg-[var(--surface-2)] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </Card>
      {/* Indices block */}
      <Card variant="inset">
        <div className="h-[200px] bg-[var(--surface-2)] animate-pulse" />
      </Card>
      {/* Five legacy blocks: top movers, most active, largest, hot collectors, set momentum */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-baseline gap-3 px-1">
            <div className="h-[13px] w-[180px] bg-[var(--surface-2)] rounded animate-pulse" />
            <div className="h-[10px] w-[220px] bg-[var(--surface-2)] rounded animate-pulse" />
          </div>
          <Card variant="inset">
            <div className="h-[280px] bg-[var(--surface-2)] animate-pulse" />
          </Card>
        </div>
      ))}
    </div>
  );
}
