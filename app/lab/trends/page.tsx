// /lab/trends — overlaid cohort time-series. One line per cohort over ~13 months;
// indexed (100 = each line's start, to compare trajectories regardless of size)
// or absolute $. The dense, comparable view: see rookies climb while commons sit
// flat and thin tiers swing. Floor market cap, outlier-guarded.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getCohortMonthly } from "@/lib/supabase/queries/cohort-monthly";
import { CohortLineChart } from "@/components/state-of-market/CohortLineChart";

export const metadata: Metadata = { title: "Trends · TS·PORTAL" };
export const revalidate = 600;

type View = "tiers" | "scarcity" | "highlights";
const VIEW_COHORTS: Record<View, string[]> = {
  tiers: ["Tier · Common", "Tier · Rare", "Tier · Fandom", "Tier · Legendary", "Tier · Ultimate"],
  scarcity: ["Scarcity · 1-of-1", "Scarcity · /25", "Scarcity · /99", "Scarcity · /499", "Scarcity · /4,999", "Scarcity · 5,000+"],
  highlights: ["Rookies (24-25)", "Tier · Legendary", "Tier · Common", "Market (all)"],
};
const VIEWS: { key: View; label: string }[] = [
  { key: "highlights", label: "Highlights" }, { key: "tiers", label: "By Tier" }, { key: "scarcity", label: "By Scarcity" },
];

async function Chart({ view, mode }: { view: View; mode: "indexed" | "absolute" }) {
  const rows = await getCohortMonthly();
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-[18px]">
      <div className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">
        Floor market cap · {mode === "indexed" ? "indexed (100 = each line's first month)" : "absolute $"} · monthly · outlier-guarded
      </div>
      <CohortLineChart rows={rows} cohorts={VIEW_COHORTS[view]} mode={mode} />
    </div>
  );
}

function Pills({ items, active, build }: { items: { key: string; label: string }[]; active: string; build: (k: string) => string }) {
  return (
    <div className="inline-flex gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
      {items.map((it) => (
        <Link key={it.key} href={build(it.key)} scroll={false}
          className={`rounded-md px-[10px] py-[5px] font-mono text-[11px] transition-colors ${it.key === active ? "bg-[var(--accent)]/15 font-semibold text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"}`}>
          {it.label}
        </Link>
      ))}
    </div>
  );
}

export default async function TrendsPage({ searchParams }: { searchParams: Promise<{ view?: string; mode?: string }> }) {
  const sp = await searchParams;
  const view = (["tiers", "scarcity", "highlights"].includes(sp.view ?? "") ? sp.view : "highlights") as View;
  const mode = (sp.mode === "absolute" ? "absolute" : "indexed") as "indexed" | "absolute";
  return (
    <main className="mx-auto max-w-[1100px] px-[22px] py-6">
      <h1 className="text-[20px] font-semibold tracking-tight">Cohort Trends</h1>
      <p className="mb-4 mt-1 text-[11px] text-[var(--text-faint)]">
        Overlaid monthly trajectories. Indexed = compare growth regardless of size. Note: thin tiers
        (Legendary/Ultimate) have genuinely volatile floor cap — few editions, asks list/delist.
      </p>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Pills items={VIEWS} active={view} build={(k) => `/lab/trends?view=${k}&mode=${mode}`} />
        <Pills items={[{ key: "indexed", label: "Indexed" }, { key: "absolute", label: "Absolute $" }]} active={mode} build={(k) => `/lab/trends?view=${view}&mode=${k}`} />
      </div>
      <Suspense key={`${view}-${mode}`} fallback={<div className="h-[460px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}>
        <Chart view={view} mode={mode} />
      </Suspense>
    </main>
  );
}
