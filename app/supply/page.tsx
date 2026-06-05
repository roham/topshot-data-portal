// /supply — moment supply over time: ever minted, burned (deflation), locked.
// Governing spec: specs/001-supply-timeline/spec.md (FR-4)
//
// Data: topshot.supply_timeline + topshot.supply_snapshot, populated from the
// FULL BigQuery moment history by scripts/etl/bq-refresh-supply-timeline.mjs.
// The Supabase topshot.moments mirror is partial (~8.6M of 52.2M) and cannot
// produce the true curve — that's why supply lives in dedicated aggregate tables.

import type { Metadata } from "next";
import { getSupplyTimeline, rebaseLastMonths } from "@/lib/supabase/queries/supply-timeline";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import { EmptyState } from "@/components/primitives/EmptyState";
import { SupplyCurveChart } from "@/components/charts/supply/SupplyCurveChart";
import { YearlyFlowChart } from "@/components/charts/supply/YearlyFlowChart";
import { DeflationChart } from "@/components/charts/supply/DeflationChart";
import { SupplyWindowToggle } from "@/components/charts/supply/SupplyWindowToggle";

export const metadata: Metadata = {
  title: "Supply Over Time · TS·PORTAL",
  description:
    "Every NBA Top Shot moment ever minted, year by year — plus how many were burned since deflation began, and how many are locked.",
};

export const revalidate = 3600;
export const maxDuration = 60;

function pct(part: number, whole: number): string {
  if (!whole) return "—";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function fmtMonthLabel(month: string | null): string {
  if (!month) return "—";
  const [y, m] = month.split("-");
  const mon = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m)];
  return `${mon} ${y}`;
}

const WINDOW_MONTHS: Record<string, number> = { "3y": 36, "1y": 12 };
const WINDOW_LABEL: Record<string, string> = { "3y": "past 3 years", "1y": "past year" };

export default async function SupplyPage({
  searchParams,
}: {
  searchParams: Promise<{ win?: string }>;
}) {
  const sp = await searchParams;
  const win = sp.win === "3y" ? "3y" : sp.win === "1y" ? "1y" : "all";
  const supply = await getSupplyTimeline();

  if (!supply) {
    return (
      <main className="mx-auto max-w-[1400px] px-4 py-4">
        <h1 className="text-[20px] font-semibold tracking-tight text-[var(--text)]">Supply Over Time</h1>
        <div className="mt-4">
          <EmptyState
            title="Supply timeline not yet populated"
            body="Run scripts/etl/bq-refresh-supply-timeline.mjs to aggregate the BigQuery moment history into Supabase."
          />
        </div>
      </main>
    );
  }

  const { snapshot, monthly, yearly } = supply;
  const asOf = new Date(snapshot.refreshedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // ── Window. When windowed, cumulative curves are REBASED TO ZERO at the
  // window start (start from 0, accumulate from there). All-time keeps absolute
  // levels. The KPI strip stays all-time current state; the windowed flow line
  // below reports the period's own minted/burned/lock activity.
  const months = WINDOW_MONTHS[win];
  const monthlyView = months ? rebaseLastMonths(monthly, months) : monthly;
  const minYear = months ? Number(monthlyView[0]?.month.slice(0, 4) ?? 0) : 0;
  const yearlyView = months ? yearly.filter((y) => y.year >= minYear) : yearly;

  // Period activity (only meaningful when windowed).
  const periodMinted = monthlyView.reduce((a, m) => a + m.minted, 0);
  const periodBurned = monthlyView.reduce((a, m) => a + m.burned, 0);
  // Net locked change over the window = Σ monthly (lockEvents − lockExits),
  // since netLocked is the running sum of that flow.
  const periodLockChange = monthlyView.reduce((a, m) => a + (m.lockEvents - m.lockExits), 0);

  const burnedPct = ((snapshot.totalBurned / snapshot.totalMinted) * 100).toFixed(1);
  const lockedPct = ((snapshot.currentlyLocked / snapshot.totalMinted) * 100).toFixed(1);

  // Reconciliation: BQ mirror total vs the production Spanner anchor.
  const drift =
    snapshot.spannerReportedCount != null
      ? snapshot.spannerReportedCount - snapshot.totalMinted
      : null;
  const driftPct =
    snapshot.spannerReportedCount != null && snapshot.spannerReportedCount > 0
      ? (Math.abs(drift ?? 0) / snapshot.spannerReportedCount) * 100
      : null;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-4">
      {/* Header */}
      <div className="mb-3 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--text)]" data-testid="supply-h1">
            Supply Over Time
          </h1>
          <p className="text-[10px] text-[var(--text-faint)] tracking-data-label uppercase mt-0.5">
            Every moment ever minted · burned since deflation · locked · as of {asOf}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SupplyWindowToggle />
        </div>
      </div>

      {/* Windowed activity line — answers "past N years minted / locked / burned" */}
      {win !== "all" && (
        <p className="mb-3 text-[11px] font-mono text-[var(--text-dim)]" data-testid="supply-window-summary">
          <span className="text-[var(--text-faint)] uppercase tracking-data-label">{WINDOW_LABEL[win]}</span>{" "}
          · minted <span className="text-[var(--text)] tabular-nums">{periodMinted.toLocaleString("en-US")}</span>{" "}
          · burned <span className="text-[var(--text)] tabular-nums">{periodBurned.toLocaleString("en-US")}</span>{" "}
          · net locked <span className="text-[var(--text)] tabular-nums">
            {periodLockChange >= 0 ? "+" : "−"}
            {Math.abs(periodLockChange).toLocaleString("en-US")}
          </span>
        </p>
      )}

      {/* KPI strip */}
      <Card variant="default" className="mb-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4" data-testid="supply-kpis">
          <KPI
            label="EVER MINTED"
            value={snapshot.totalMinted}
            format="int"
            size="xl"
            sub={<span>since {fmtMonthLabel(snapshot.firstMintMonth)}</span>}
          />
          <KPI
            label="BURNED (DEFLATION)"
            value={snapshot.totalBurned}
            format="int"
            size="xl"
            sub={
              <span>
                {pct(snapshot.totalBurned, snapshot.totalMinted)} of mint · since {fmtMonthLabel(snapshot.firstBurnMonth)}
              </span>
            }
          />
          <KPI
            label="CURRENTLY LOCKED"
            value={snapshot.currentlyLocked}
            format="int"
            size="xl"
            sub={
              <span>
                {pct(snapshot.currentlyLocked, snapshot.circulating)} of circulating · since{" "}
                {fmtMonthLabel(snapshot.lockLaunchMonth)}
              </span>
            }
          />
          <KPI
            label="CIRCULATING"
            value={snapshot.circulating}
            format="int"
            size="xl"
            sub={<span>minted − burned ({pct(snapshot.circulating, snapshot.totalMinted)} of mint)</span>}
          />
        </div>
        {snapshot.spannerReportedCount != null && (
          <p className="text-[10px] text-[var(--text-faint)] mt-3 leading-snug font-mono">
            Reconciliation · BigQuery mirror {snapshot.totalMinted.toLocaleString("en-US")} vs production Spanner{" "}
            {snapshot.spannerReportedCount.toLocaleString("en-US")}
            {drift != null && (
              <>
                {" "}
                (Δ {Math.abs(drift).toLocaleString("en-US")}
                {driftPct != null ? `, ${driftPct.toFixed(2)}%` : ""} — replication lag).
              </>
            )}{" "}
            Status partition is exact: burned + locked + live = ever minted.
          </p>
        )}
      </Card>

      {/* Deflation — cumulative burned (permanent) + locked (temporary) */}
      <Card
        title="Deflation"
        subtitle={
          win === "all"
            ? `${burnedPct}% burned (permanent) · ${lockedPct}% locked (temporary)`
            : `${WINDOW_LABEL[win]} · burned ${periodBurned.toLocaleString("en-US")} · net locked ${
                periodLockChange >= 0 ? "+" : "−"
              }${Math.abs(periodLockChange).toLocaleString("en-US")} · from zero`
        }
        className="mb-3"
        methodology="Cumulative moments burned vs locked. Gray = burned — permanent supply destruction, the true deflation (since burns began). Amber = net locked (locks minus unlocks) — temporary; locked moments still exist and return to circulation when unlocked. Kept separate on purpose: burns are deflation, locks are immobilization."
      >
        <DeflationChart
          monthly={monthlyView}
          totalMinted={snapshot.totalMinted}
          firstBurnMonth={win === "all" ? snapshot.firstBurnMonth : null}
        />
      </Card>

      {/* Hero: cumulative stacked supply curve */}
      <Card
        title="Cumulative supply"
        subtitle="live + locked + burned = ever minted"
        className="mb-3"
        methodology="Stacked monthly cumulative. Top edge = total moments ever minted. Gray band = cumulative burned (deflation). Amber = net locked (locks minus unlocks and burns-while-locked). Teal = liquid float. Dashed markers: first burn (deflation) and locking launch."
      >
        <SupplyCurveChart
          monthly={monthlyView}
          firstBurnMonth={win === "all" ? snapshot.firstBurnMonth : null}
          lockLaunchMonth={win === "all" ? snapshot.lockLaunchMonth : null}
        />
      </Card>

      {/* Year by year: minted vs burned */}
      <Card
        title="Year by year"
        subtitle="minted vs burned per calendar year"
        className="mb-3"
        methodology="Moments minted (teal) and burned (gray) per calendar year. The gap is net supply added that year. Minting peaked in 2021; the largest burn years are 2022–2023."
      >
        <YearlyFlowChart yearly={yearlyView} />
      </Card>

      {/* Per-year table — density on drill */}
      <Card title="Detail" subtitle="per-year totals" variant="inset">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] font-mono">
            <thead>
              <tr className="text-[10px] text-[var(--text-faint)] tracking-data-label uppercase border-b border-[var(--border-subtle)]">
                <th className="text-left px-3 py-2">Year</th>
                <th className="text-right px-3 py-2">Minted</th>
                <th className="text-right px-3 py-2">Burned</th>
                <th className="text-right px-3 py-2">Net added</th>
                <th className="text-right px-3 py-2">Ever minted (cum)</th>
                <th className="text-right px-3 py-2">Circulating (EOY)</th>
                <th className="text-right px-3 py-2">Net locked (EOY)</th>
              </tr>
            </thead>
            <tbody>
              {yearlyView.map((y) => {
                const net = y.minted - y.burned;
                return (
                  <tr key={y.year} className="border-b border-[var(--border-subtle)]/40 hover:bg-[var(--surface-2)]/40">
                    <td className="text-left px-3 py-1.5 text-[var(--text)]">{y.year}</td>
                    <td className="text-right px-3 py-1.5 tabular-nums text-[var(--text)]">
                      {y.minted.toLocaleString("en-US")}
                    </td>
                    <td className="text-right px-3 py-1.5 tabular-nums text-[var(--text-dim)]">
                      {y.burned.toLocaleString("en-US")}
                    </td>
                    <td
                      className={`text-right px-3 py-1.5 tabular-nums ${
                        net >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"
                      }`}
                    >
                      {net >= 0 ? "+" : "−"}
                      {Math.abs(net).toLocaleString("en-US")}
                    </td>
                    <td className="text-right px-3 py-1.5 tabular-nums text-[var(--text-dim)]">
                      {y.cumMintedEnd.toLocaleString("en-US")}
                    </td>
                    <td className="text-right px-3 py-1.5 tabular-nums text-[var(--text-dim)]">
                      {y.circulatingEnd.toLocaleString("en-US")}
                    </td>
                    <td className="text-right px-3 py-1.5 tabular-nums text-[var(--text-dim)]">
                      {y.netLockedEnd.toLocaleString("en-US")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
