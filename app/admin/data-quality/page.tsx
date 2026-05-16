// /admin/data-quality — continuous validation dashboard.
//
// Reads:
//   - topshot.v_validation_latest   (one row per check, most-recent run)
//   - topshot._validation_runs      (history — last 50 runs per check for the
//                                    pass/fail timeline)
//
// Unlinked from main nav (admin/* by convention is internal only). Page
// renders entirely server-side; no client interactivity yet beyond the
// `?filter=` search param.
//
// When the BQ value or SB value is an array (e.g. top-players spearman check),
// we render both lists side-by-side so the reader can see the actual diff.

import Link from "next/link";
import { Card } from "@/components/primitives/Card";
import {
  getLatestValidationRuns,
  getValidationHistory,
  type ValidationRow,
} from "@/lib/supabase/queries/validation-runs";

export const metadata = { title: "Data quality · TS·PORTAL" };
export const revalidate = 60;
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function fmtMetric(v: number | null, metric: string): string {
  if (v == null) return "—";
  if (!Number.isFinite(v)) return "∞";
  if (metric === "spearman" || metric === "pct_delta" || metric === "ratio") {
    return v.toFixed(4);
  }
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(4);
}

function fmtThreshold(t: number, metric: string): string {
  if (metric === "abs_delta") return `≤ $${t.toFixed(2)}`;
  if (metric === "pct_delta") return `≤ ${(t * 100).toFixed(1)}%`;
  return `≥ ${t.toFixed(2)}`;
}

function fmtTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
  return `${Math.round(minutes / 1440)}d ago`;
}

function StatusBadge({ passed }: { passed: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${
        passed ? "bg-[var(--up)]" : "bg-[var(--down)]"
      }`}
      aria-label={passed ? "pass" : "fail"}
    />
  );
}

function StatusLabel({ passed }: { passed: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-mono tracking-data-label uppercase ${
        passed ? "text-[var(--up)]" : "text-[var(--down)]"
      }`}
    >
      <StatusBadge passed={passed} />
      {passed ? "pass" : "fail"}
    </span>
  );
}

// Render bq/sb values as either a JSON list (arrays) or single value (scalar).
function ValueCell({ v }: { v: unknown }) {
  if (v == null) return <span className="text-[var(--text-faint)]">null</span>;
  if (Array.isArray(v)) {
    return (
      <ol className="list-decimal pl-4 text-[11px] text-[var(--text)] space-y-0.5">
        {v.slice(0, 10).map((item, i) => (
          <li key={i} className="leading-snug">
            {typeof item === "object" ? JSON.stringify(item) : String(item)}
          </li>
        ))}
        {v.length > 10 && (
          <li className="list-none text-[var(--text-faint)]">…+{v.length - 10}</li>
        )}
      </ol>
    );
  }
  if (typeof v === "object") {
    return <code className="text-[10px] font-mono">{JSON.stringify(v)}</code>;
  }
  // Scalar (number / string)
  return (
    <span className="tnum text-[12px] font-mono">
      {typeof v === "number" ? v.toLocaleString() : String(v)}
    </span>
  );
}

// Historical timeline — last 50 runs, oldest left → newest right.
function HistoryTimeline({ runs }: { runs: ValidationRow[] }) {
  if (!runs.length) {
    return <span className="text-[10px] text-[var(--text-faint)]">no history</span>;
  }
  const oldestToNewest = [...runs].reverse();
  return (
    <div className="flex items-center gap-[1px]">
      {oldestToNewest.map((r) => (
        <span
          key={r.id}
          className={`w-1 h-3 ${
            r.passed ? "bg-[var(--up)]" : "bg-[var(--down)]"
          } opacity-90`}
          title={`${r.passed ? "PASS" : "FAIL"} · ${fmtTimestamp(r.ran_at)} · ${fmtMetric(r.metric_value, r.metric)}`}
        />
      ))}
    </div>
  );
}

export default async function DataQualityPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filterRaw = sp.filter;
  const filter = (Array.isArray(filterRaw) ? filterRaw[0] : filterRaw) ?? "all";

  const latest = await getLatestValidationRuns();
  const filtered =
    filter === "failed"
      ? latest.filter((r) => !r.passed)
      : filter === "passed"
        ? latest.filter((r) => r.passed)
        : latest;

  // Fetch history per check (cap at 50 each).
  const histories = await Promise.all(
    filtered.map((r) =>
      getValidationHistory(r.check_name, 50).then((rows) => [r.check_name, rows] as const),
    ),
  );
  const historyByCheck = Object.fromEntries(histories);

  const totalCount = latest.length;
  const passedCount = latest.filter((r) => r.passed).length;
  const failedCount = totalCount - passedCount;
  const newestRun = latest.reduce<string | null>(
    (acc, r) => (acc == null || r.ran_at > acc ? r.ran_at : acc),
    null,
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">Data quality</h1>
        <p className="text-[12px] text-[var(--text-dim)] mt-1">
          Continuous validation suite. Each check compares a Supabase materialized
          view to BigQuery ground truth. Runs every 30 minutes via{" "}
          <code className="font-mono text-[var(--text)]">scripts/validation/run.mjs</code>;
          rows land in <code className="font-mono text-[var(--text)]">topshot._validation_runs</code>.
        </p>
        <p className="text-[11px] text-[var(--text-faint)] mt-1 tnum">
          {passedCount}/{totalCount} passing · last run {fmtTimestamp(newestRun)}
        </p>
      </header>

      <div className="flex items-center gap-2 text-[11px] font-mono">
        <span className="text-[var(--text-faint)] tracking-data-label">filter:</span>
        <FilterLink current={filter} value="all" label={`all (${totalCount})`} />
        <FilterLink current={filter} value="failed" label={`failed (${failedCount})`} />
        <FilterLink current={filter} value="passed" label={`passed (${passedCount})`} />
      </div>

      {filtered.length === 0 && (
        <Card>
          <p className="text-[12px] text-[var(--text-dim)]">
            No checks match this filter. Try the “all” tab.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((r) => {
          const history = historyByCheck[r.check_name] ?? [];
          return (
            <Card key={r.id}>
              <header className="flex items-baseline gap-3 mb-2">
                <h2 className="text-[13px] font-semibold tracking-section-header text-[var(--text)] font-mono">
                  {r.check_name}
                </h2>
                <span className="text-[10px] font-mono text-[var(--text-faint)] tracking-data-label">
                  {r.metric}
                </span>
                <span className="ml-auto">
                  <StatusLabel passed={r.passed} />
                </span>
              </header>

              <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 mb-3 text-[12px]">
                <span className="text-[var(--text-faint)] tracking-data-label text-[10px]">last run</span>
                <span className="tnum font-mono">{fmtTimestamp(r.ran_at)}</span>

                <span className="text-[var(--text-faint)] tracking-data-label text-[10px]">value</span>
                <span className="tnum font-mono">{fmtMetric(r.metric_value, r.metric)}</span>

                <span className="text-[var(--text-faint)] tracking-data-label text-[10px]">threshold</span>
                <span className="tnum font-mono">{fmtThreshold(r.threshold, r.metric)}</span>

                {r.notes && (
                  <>
                    <span className="text-[var(--text-faint)] tracking-data-label text-[10px]">note</span>
                    <span className="text-[11px] text-[var(--text-dim)]">{r.notes}</span>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-[var(--border-subtle)] rounded p-2">
                  <div className="text-[10px] tracking-data-label text-[var(--text-faint)] mb-1">
                    BQ ground truth
                  </div>
                  <ValueCell v={r.bq_value} />
                </div>
                <div className="border border-[var(--border-subtle)] rounded p-2">
                  <div className="text-[10px] tracking-data-label text-[var(--text-faint)] mb-1">
                    Supabase MV
                  </div>
                  <ValueCell v={r.sb_value} />
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center gap-3">
                <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">
                  history (last {history.length})
                </span>
                <HistoryTimeline runs={history} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <details className="text-[12px] text-[var(--text-dim)]">
          <summary className="cursor-pointer text-[var(--text)] font-semibold">
            About this page
          </summary>
          <div className="mt-2 space-y-2 leading-relaxed">
            <p>
              This dashboard reads from{" "}
              <code className="font-mono text-[var(--text)]">topshot.v_validation_latest</code>{" "}
              (one row per check, most-recent) and{" "}
              <code className="font-mono text-[var(--text)]">topshot._validation_runs</code>{" "}
              (full history). Check definitions live at{" "}
              <code className="font-mono text-[var(--text)]">scripts/validation/checks.mjs</code>.
            </p>
            <p>
              To add a new check: append an entry to the{" "}
              <code className="font-mono text-[var(--text)]">CHECKS</code> array in{" "}
              <code className="font-mono text-[var(--text)]">scripts/validation/checks.mjs</code>{" "}
              with <code className="font-mono">bqSql</code>, <code className="font-mono">sbSql</code>,
              <code className="font-mono">compute()</code>, threshold, and comparator. Next run
              picks it up automatically.
            </p>
            <p>
              Metric kinds: <span className="font-mono">spearman</span> (rank correlation, ≥
              threshold), <span className="font-mono">pct_delta</span> (|sb−bq|/bq, ≤
              threshold), <span className="font-mono">abs_delta</span> (|sb−bq|, ≤ threshold),
              <span className="font-mono">ratio</span> (sb/bq, ≥ threshold).
            </p>
            <p>
              Failed checks are persistent until the next successful run. Investigate by
              opening the row, comparing BQ vs Supabase output, and tracing back to the
              ETL or MV refresh path.
            </p>
          </div>
        </details>
      </Card>
    </div>
  );
}

function FilterLink({
  current,
  value,
  label,
}: {
  current: string;
  value: string;
  label: string;
}) {
  const isActive = current === value;
  return (
    <Link
      href={value === "all" ? "/admin/data-quality" : `/admin/data-quality?filter=${value}`}
      className={`px-2 py-0.5 rounded border ${
        isActive
          ? "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)]"
          : "border-[var(--border-subtle)] text-[var(--text-dim)] hover:text-[var(--text)]"
      }`}
    >
      {label}
    </Link>
  );
}
