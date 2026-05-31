// /trends — the macro market trend, shown straight. Leads with the realized story
// (actual cleared-trade dollar volume, which is UP off the bottom and YoY) because
// floor/ask quotes hide it. Below: cohort floor-cap trajectories as a normal
// absolute-$ time-series you zoom with the site-standard window bubbles.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getRealizedMonthly } from "@/lib/supabase/queries/realized-economics";
import { getCohortDaily } from "@/lib/supabase/queries/cohort-daily";
import { RealizedTrendChart } from "@/components/state-of-market/RealizedTrendChart";
import { CohortDailyChart } from "@/components/state-of-market/CohortDailyChart";
import { TimeWindowSelector } from "@/components/global/TimeWindowSelector";
import { parseTimeWindow, windowToDays, type TimeWindow } from "@/components/global/window-types";
import { Num } from "@/components/primitives/Num";

export const metadata: Metadata = { title: "Trends · TS·PORTAL" };
export const revalidate = 600;

type View = "highlights" | "tiers" | "scarcity";
const VIEW_COHORTS: Record<View, string[]> = {
  highlights: ["Rookies (24-25)", "Tier · Legendary", "Tier · Common", "Market (all)"],
  tiers: ["Tier · Common", "Tier · Rare", "Tier · Fandom", "Tier · Legendary", "Tier · Ultimate"],
  scarcity: ["Scarcity · 1-of-1", "Scarcity · /25", "Scarcity · /99", "Scarcity · /499", "Scarcity · /4,999", "Scarcity · 5,000+"],
};
const VIEWS: { key: View; label: string }[] = [
  { key: "highlights", label: "Highlights" }, { key: "tiers", label: "By Tier" }, { key: "scarcity", label: "By Scarcity" },
];

// ── Realized macro hero (the good-light story) ──────────────────────────────
async function RealizedHero() {
  const rows = await getRealizedMonthly();
  // Exclude the in-progress month — a half-month vs full months reads as a fake crash.
  const curMonth = new Date().toISOString().slice(0, 7);
  const complete = rows.filter((r) => r.month.slice(0, 7) < curMonth);
  const last = complete[complete.length - 1];
  const yearAgo = complete[complete.length - 13];
  const bottom = complete.reduce<typeof last | undefined>((m, r) => (!m || r.gmv < m.gmv ? r : m), undefined);
  const pct = (a?: number, b?: number) => (a != null && b ? ((a - b) / b) * 100 : null);
  const kpis = [
    { label: `Realized GMV · ${last?.month.slice(0, 7) ?? "—"}`, value: last?.gmv, fmt: "usdCompact" as const },
    { label: "GMV vs 1yr ago", value: pct(last?.gmv, yearAgo?.gmv), fmt: "deltaPct" as const },
    { label: `vs bottom (${bottom?.month.slice(2, 7) ?? "—"})`, value: pct(last?.gmv, bottom?.gmv), fmt: "deltaPct" as const },
    { label: "Median sale", value: last?.median_usd, fmt: "usd" as const },
  ];
  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">{k.label}</div>
            <div className="mt-1 text-[22px] font-semibold tabular-nums">
              <Num value={k.value} format={k.fmt} colorize={k.fmt === "deltaPct"} precision={1} />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-[18px]">
        <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
          Realized GMV (teal, left) · median sale price (amber, right) · by month · final month partial
        </div>
        <RealizedTrendChart rows={rows} />
      </div>
    </>
  );
}

// ── Cohort floor-cap detail (zoomable, windowed) ────────────────────────────
async function CohortDetail({ view, window }: { view: View; window: TimeWindow }) {
  const cohorts = VIEW_COHORTS[view];
  const sinceDays = window === "all" ? null : windowToDays(window);
  const rows = await getCohortDaily(cohorts, sinceDays);
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-[18px]">
      <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        Floor market cap · absolute $ · daily · outlier-guarded
      </div>
      {rows.length === 0 ? (
        <div className="flex h-[420px] items-center justify-center text-[12px] text-[var(--text-faint)]">No data for this window yet.</div>
      ) : (
        <CohortDailyChart rows={rows} cohorts={cohorts} />
      )}
    </div>
  );
}

function ViewPills({ active, window }: { active: View; window: TimeWindow }) {
  return (
    <div className="inline-flex gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
      {VIEWS.map((it) => (
        <Link key={it.key} href={`/trends?view=${it.key}&w=${window}`} scroll={false}
          className={`rounded-md px-[10px] py-[5px] font-mono text-[11px] transition-colors ${
            it.key === active ? "bg-[var(--accent)]/15 font-semibold text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"
          }`}>
          {it.label}
        </Link>
      ))}
    </div>
  );
}

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ view?: string; w?: string }> }) {
  const sp = await searchParams;
  const view = (["highlights", "tiers", "scarcity"].includes(sp.view ?? "") ? sp.view : "highlights") as View;
  const { window } = parseTimeWindow(sp.w);
  return (
    <main className="mx-auto max-w-[1100px] px-[22px] py-6">
      <h1 className="text-[20px] font-semibold tracking-tight">Market Trends</h1>
      <p className="mb-5 mt-1 text-[11px] text-[var(--text-faint)]">
        Actual cleared-trade dollar volume — up off the bottom and year-over-year — the story floor/ask quotes hide.
        Cohort floor-cap trajectories below, zoomable by window.
      </p>
      <Suspense fallback={<div className="mb-6 h-[480px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}>
        <RealizedHero />
      </Suspense>

      <div className="mb-4 mt-8 flex flex-wrap items-center gap-3">
        <ViewPills active={view} window={window} />
        <TimeWindowSelector />
      </div>
      <Suspense key={`${view}-${window}`} fallback={<div className="h-[460px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}>
        <CohortDetail view={view} window={window} />
      </Suspense>
    </main>
  );
}
