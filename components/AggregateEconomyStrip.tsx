// V4-iter-1 — aggregate-economy strip.
//
// Server component. Mounts at DOM order 0 in `app/page.tsx`, strictly before
// any `<section data-block="...">`. The strip answers the Pro Trader's first
// question on `/`: "is the marketplace alive right now?" — four cells:
// 24h $ vol, 24h sales, 24h buyers, active listings.
//
// Contract bindings (see iter/v4-iter-1/spec.md acceptance §):
//   - data-kpi-strip="aggregate-economy" on root
//   - data-kpi-cell on each cell
//   - data-kpi in {vol-24h-usd, sales-24h-count, buyers-24h-count, listings-active-count}
//   - data-kpi-num on the primary number
//   - data-kpi-delta on the Δ span (present iff renderable)
//   - data-kpi-spark on the sparkline (present iff renderable)
//   - data-kpi-caption on the honest-absence caption (present iff a caption is rendered)
//
// Voice register (binding, per design.md "Voice notes"): no "Welcome",
// "Discover", "video", "copy", "Sign up", "Subscribe". Captions are 10px
// Inter `--text-faint`, inline below the affected element.

import type {
  AggregateEconomyResult,
  CellState,
  ListingsState,
} from "@/lib/aggregate-economy";
import { SparkLine } from "@/components/SparkLine";

// ---- formatters local to the strip -----------------------------------------
// We keep these local rather than touch lib/utils.ts. formatUsdCompact gives
// `$2.4M` / `$847k` style; formatCompactInt gives `8.3k` / `64,281`.

function formatUsdCompact(n: number): string {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

function formatCompactInt(n: number): string {
  if (!isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return n.toLocaleString();
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toLocaleString();
}

function formatPct(p: number): string {
  if (!isFinite(p)) return "0.00%";
  const sign = p > 0 ? "+" : p < 0 ? "" : "";
  return `${sign}${p.toFixed(2)}%`;
}

function deltaClass(p: number): string {
  if (p > 0) return "text-[var(--up)]";
  if (p < 0) return "text-[var(--down)]";
  return "text-[var(--text-faint)]";
}

// ---- captions (verbatim per design.md "Honest-absence treatment" §) ----------

function backfillCaption(nextCronIso: string): string {
  return `First snapshot stored on next 2h cron run; Δ available ${nextCronIso}`;
}

// D010 (V4-iter-5): one snapshot stored, awaiting next cron tick for honest Δ.
function firstSnapshotPendingCaption(captionISO: string): string {
  return `First snapshot stored on next 2h cron run; Δ available ${captionISO}`;
}

function absentCaption(nextPopulatedIso: string): string {
  return `Snapshot history accumulating — first populated ${nextPopulatedIso}`;
}

// ---- cell render -------------------------------------------------------------

interface KpiCellProps {
  kpi: "vol-24h-usd" | "sales-24h-count" | "buyers-24h-count" | "listings-active-count";
  label: string;
  state: CellState;
  /** Formats the primary number from a CellState's `value`. */
  format: (v: number) => string;
}

function KpiCell({ kpi, label, state, format }: KpiCellProps) {
  return (
    <div
      data-kpi-cell=""
      data-kpi={kpi}
      data-kpi-state={state.kind}
      className="flex flex-col gap-0.5 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md px-3 py-2"
    >
      <div className="text-[10px] tracking-data-label text-[var(--text-faint)] uppercase">
        {label}
      </div>
      <CellBody state={state} format={format} />
    </div>
  );
}

function CellBody({
  state,
  format,
}: {
  state: CellState;
  format: (v: number) => string;
}) {
  if (state.kind === "absent") {
    return (
      <div
        data-kpi-caption=""
        className="text-[10px] leading-[1.4] text-[var(--text-faint)] mt-1"
      >
        {absentCaption(state.nextPopulatedIso)}
      </div>
    );
  }
  if (state.kind === "backfill") {
    return (
      <>
        <div className="flex items-baseline gap-2">
          <span
            data-kpi-num=""
            className="text-[22px] font-semibold font-mono tnum text-[var(--text)]"
          >
            {format(state.value)}
          </span>
        </div>
        <div
          data-kpi-caption=""
          className="text-[10px] leading-[1.4] text-[var(--text-faint)]"
        >
          {backfillCaption(state.nextCronIso)}
        </div>
      </>
    );
  }
  if (state.kind === "first-snapshot-pending") {
    // D010: no data-kpi-delta in this state — caption replaces delta channel.
    return (
      <>
        <div className="flex items-baseline gap-2">
          <span
            data-kpi-num=""
            className="text-[22px] font-semibold font-mono tnum text-[var(--text)]"
          >
            {format(state.value)}
          </span>
        </div>
        <div
          data-kpi-caption=""
          className="text-[10px] leading-[1.4] text-[var(--text-faint)]"
        >
          {firstSnapshotPendingCaption(state.captionISO)}
        </div>
      </>
    );
  }
  if (state.kind === "single") {
    return (
      <div className="flex items-baseline gap-2">
        <span
          data-kpi-num=""
          className="text-[22px] font-semibold font-mono tnum text-[var(--text)]"
        >
          {format(state.value)}
        </span>
        <span
          data-kpi-delta=""
          className={`text-[11px] font-mono tnum ${deltaClass(state.deltaPct)}`}
        >
          {formatPct(state.deltaPct)}
        </span>
      </div>
    );
  }
  if (state.kind === "partial") {
    return (
      <>
        <div className="flex items-baseline gap-2">
          <span
            data-kpi-num=""
            className="text-[22px] font-semibold font-mono tnum text-[var(--text)]"
          >
            {format(state.value)}
          </span>
          <span
            data-kpi-delta=""
            className={`text-[11px] font-mono tnum ${deltaClass(state.deltaPct)}`}
          >
            {formatPct(state.deltaPct)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <div data-kpi-spark="">
            {/* Desktop: 64×24 1px. Mobile thicker stroke applied via a second
                instance below (sm:hidden / hidden sm:block). Keep both inline
                so SSR renders both — CSS picks the right one. */}
            <span className="hidden sm:inline-block">
              <SparkLine data={state.spark} variant="degraded" width={64} height={24} />
            </span>
            <span className="inline-block sm:hidden">
              <SparkLine data={state.spark} variant="degraded" width={80} height={20} strokeWidth={2} />
            </span>
          </div>
          <span
            data-kpi-caption=""
            className="text-[10px] text-[var(--text-faint)]"
          >
            {state.ticks}/12 ticks
          </span>
        </div>
      </>
    );
  }
  // full
  return (
    <>
      <div className="flex items-baseline gap-2">
        <span
          data-kpi-num=""
          className="text-[22px] font-semibold font-mono tnum text-[var(--text)]"
        >
          {format(state.value)}
        </span>
        <span
          data-kpi-delta=""
          className={`text-[11px] font-mono tnum ${deltaClass(state.deltaPct)}`}
        >
          {formatPct(state.deltaPct)}
        </span>
      </div>
      <div data-kpi-spark="" className="mt-1">
        <span className="hidden sm:inline-block">
          <SparkLine data={state.spark} variant="full" width={64} height={24} />
        </span>
        <span className="inline-block sm:hidden">
          <SparkLine data={state.spark} variant="full" width={80} height={20} strokeWidth={2} />
        </span>
      </div>
    </>
  );
}

// Cell 4 — structural Δ absence per design.md "Cell 4" §.
function ListingsCell({ state }: { state: ListingsState }) {
  return (
    <div
      data-kpi-cell=""
      data-kpi="listings-active-count"
      data-kpi-state={state.kind}
      className="flex flex-col gap-0.5 bg-[var(--surface-1)] border border-[var(--border-subtle)] rounded-md px-3 py-2"
    >
      <div className="text-[10px] tracking-data-label text-[var(--text-faint)] uppercase">
        Active listings
      </div>
      {state.kind === "live" ? (
        <>
          <div className="flex items-baseline gap-2">
            <span
              data-kpi-num=""
              className="text-[22px] font-semibold font-mono tnum text-[var(--text)]"
            >
              {formatCompactInt(state.value)}
            </span>
            {/* Δ slot intentionally empty whitespace — design.md residual-risk #1 */}
          </div>
          <div
            data-kpi-caption=""
            className="text-[10px] leading-[1.4] text-[var(--text-faint)] mt-1"
          >
            Live count · listing-history accumulator on V4-iter-2 roadmap
          </div>
        </>
      ) : (
        <div
          data-kpi-caption=""
          className="text-[10px] leading-[1.4] text-[var(--text-faint)] mt-1"
        >
          Live listings count temporarily unreachable — retry in 10m
        </div>
      )}
    </div>
  );
}

// ---- public entry -----------------------------------------------------------

export function AggregateEconomyStrip({ data }: { data: AggregateEconomyResult }) {
  return (
    <section
      data-kpi-strip="aggregate-economy"
      aria-label="24h marketplace vitality"
      className="grid grid-cols-2 sm:grid-cols-4 gap-2"
    >
      <KpiCell
        kpi="vol-24h-usd"
        label="24h $ vol"
        state={data.volUsd}
        format={formatUsdCompact}
      />
      <KpiCell
        kpi="sales-24h-count"
        label="24h sales"
        state={data.salesCount}
        format={formatCompactInt}
      />
      <KpiCell
        kpi="buyers-24h-count"
        label="24h buyers"
        state={data.buyersCount}
        format={formatCompactInt}
      />
      <ListingsCell state={data.listings} />
    </section>
  );
}
