// /lab/trends — cohort floor-cap trajectories as a normal absolute-$ time-series,
// zoomed with the site-standard window bubbles (24H/7D/30D/90D/6M/1Y/ALL). Pick
// which cohorts to overlay (Highlights / By Tier / By Scarcity); the window bubble
// sets the visible date range. Floor market cap, outlier-guarded, daily. Reads
// mv_cohort_cap_daily.

import { Suspense } from "react";
import type { Metadata } from "next";
import { getCohortDaily } from "@/lib/supabase/queries/cohort-daily";
import { CohortDailyChart } from "@/components/state-of-market/CohortDailyChart";
import { TimeWindowSelector } from "@/components/global/TimeWindowSelector";
import { parseTimeWindow, windowToDays, type TimeWindow } from "@/components/global/window-types";
import Link from "next/link";

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

async function Chart({ view, window }: { view: View; window: TimeWindow }) {
  const cohorts = VIEW_COHORTS[view];
  const sinceDays = window === "all" ? null : windowToDays(window);
  const rows = await getCohortDaily(cohorts, sinceDays);
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-[18px]">
      <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        Floor market cap · absolute $ · daily · outlier-guarded
      </div>
      {rows.length === 0 ? (
        <div className="flex h-[420px] items-center justify-center text-[12px] text-[var(--text-faint)]">
          No data for this window yet.
        </div>
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
        <Link
          key={it.key}
          href={`/lab/trends?view=${it.key}&w=${window}`}
          scroll={false}
          className={`rounded-md px-[10px] py-[5px] font-mono text-[11px] transition-colors ${
            it.key === active
              ? "bg-[var(--accent)]/15 font-semibold text-[var(--accent)]"
              : "text-[var(--text-dim)] hover:text-[var(--text)]"
          }`}
        >
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
      <h1 className="text-[20px] font-semibold tracking-tight">Cohort Trends</h1>
      <p className="mb-4 mt-1 text-[11px] text-[var(--text-faint)]">
        Floor market cap over time, in dollars. Pick the cohorts to overlay; zoom with the window bubbles.
        Thin tiers (Legendary/Ultimate) have genuinely volatile floor cap — few editions, asks list/delist.
      </p>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <ViewPills active={view} window={window} />
        <TimeWindowSelector />
      </div>
      <Suspense
        key={`${view}-${window}`}
        fallback={<div className="h-[460px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}
      >
        <Chart view={view} window={window} />
      </Suspense>
    </main>
  );
}
