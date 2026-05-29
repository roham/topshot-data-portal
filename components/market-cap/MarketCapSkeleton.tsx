// Loading skeletons for the /market-cap landing. Sized to match the real
// panels so a window change produces ZERO layout shift — the page holds its
// shape and every panel shimmers, making it unmistakable that data is
// recomputing. Shown via window-keyed <Suspense> boundaries in page.tsx.

function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[var(--surface-2)]/60 ${className}`} />;
}

// One chart card frame with a shimmering chart area + header + caption.
export function ChartCardSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className={`rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] flex flex-col ${
        wide ? "col-span-1 md:col-span-2" : ""
      }`}
      aria-busy="true"
    >
      <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2 border-b border-[var(--border-subtle)]/50">
        <div className="min-w-0 space-y-1.5">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-2 w-44 bg-[var(--surface-2)]/40" />
        </div>
        <Shimmer className="h-2 w-16 bg-[var(--surface-2)]/40" />
      </div>
      {/* chart area — matches ChartCard min-h-[260px] */}
      <div className="flex-1 px-2 pt-3 pb-1 min-h-[260px] flex items-end gap-1.5">
        {/* faint bars to read as a chart silhouette while loading */}
        {[38, 62, 50, 78, 44, 90, 56, 70, 48, 84, 60, 74].map((h, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t bg-[var(--surface-2)]/50"
            style={{ height: `${h}%`, animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
      <div className="px-4 py-3 border-t border-[var(--border-subtle)]/50">
        <Shimmer className="h-2.5 w-3/4 bg-[var(--surface-2)]/40" />
      </div>
    </div>
  );
}

function KpiStripSkeleton() {
  return (
    <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3 space-y-2"
        >
          <Shimmer className="h-2 w-24 bg-[var(--surface-2)]/40" />
          <Shimmer className="h-5 w-20" />
          <Shimmer className="h-2 w-28 bg-[var(--surface-2)]/40" />
        </div>
      ))}
    </div>
  );
}

// Full body skeleton: KPI strip + the chart grid (2-col + wide treemap row).
export function MarketCapBodySkeleton() {
  return (
    <div>
      <KpiStripSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        <ChartCardSkeleton />
        <ChartCardSkeleton wide />
        <ChartCardSkeleton />
        <ChartCardSkeleton />
      </div>
    </div>
  );
}
