// Slice Lab — exploratory. Renders market-cap % move across many dimensions so we
// can see which cuts have signal (vs the all-negative player blob). Throwaway/
// internal: a layout of candidate slices to pick the interesting ones from.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getSliceMoves, type Slice, type Metric } from "@/lib/state-of-market/slice-moves";
import { Num } from "@/components/primitives/Num";
import { parseTimeWindow, type TimeWindow, windowToDays } from "@/components/global/window-types";

export const metadata: Metadata = { title: "Slice Lab · TS·PORTAL" };
export const revalidate = 300;
export const maxDuration = 120;

const WINDOWS: TimeWindow[] = ["7d", "30d", "90d", "1y"];
const MAX_PCT = 30; // bar scale: ±30% spans the half-width

function DivergingBar({ pct }: { pct: number }) {
  const mag = Math.min(Math.abs(pct) / MAX_PCT, 1) * 50;
  const up = pct >= 0;
  return (
    <div className="relative h-[14px] flex-1 rounded bg-[var(--surface-2)]">
      <div className="absolute left-1/2 top-0 h-full w-px bg-[var(--border-subtle)]" />
      <div
        className="absolute top-0 h-full rounded"
        style={{
          [up ? "left" : "right"]: "50%",
          width: `${mag}%`,
          background: up ? "var(--up)" : "var(--down)",
          opacity: 0.55 + (Math.min(Math.abs(pct) / MAX_PCT, 1)) * 0.45,
        }}
      />
    </div>
  );
}

function SliceCard({ title, hint, slices }: { title: string; hint: string; slices: Slice[] }) {
  return (
    <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-[18px]">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-[14px] font-semibold">{title}</h3>
        <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)]">{hint}</span>
      </div>
      {slices.length === 0 && <p className="py-6 text-center text-[11px] text-[var(--text-faint)]">no data</p>}
      <div className="mt-3 space-y-2">
        {slices.map((s) => (
          <div key={s.label} className="grid grid-cols-[92px_1fr_58px_64px] items-center gap-2.5">
            <span className="truncate text-[12px] text-[var(--text-dim)]">{s.label}</span>
            <DivergingBar pct={s.pct} />
            <span className="text-right font-mono text-[12px] font-semibold">
              <Num value={s.pct} format="deltaPct" colorize precision={1} />
            </span>
            <span className="text-right font-mono text-[11px] text-[var(--text-faint)]">
              <Num value={s.cap_now} format="usdCompact" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

async function Lab({ window, metric }: { window: TimeWindow; metric: Metric }) {
  const s = await getSliceMoves(windowToDays(window), metric);
  const m = metric === "bid" ? "bid" : "ask";
  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
      <SliceCard title="By Tier" hint={`${m} move · ${window.toUpperCase()}`} slices={s.byTier} />
      <SliceCard title="By Price Band" hint="per-moment cap bucket" slices={s.byPriceBand} />
      <SliceCard title="By Scarcity" hint="edition mint size" slices={s.byScarcity} />
      <SliceCard title="By Series" hint="vintage → recent" slices={s.bySeries} />
      <div className="lg:col-span-2">
        <SliceCard title="By Team" hint="top 12 by cap" slices={s.byTeam} />
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[220px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />
      ))}
    </div>
  );
}

export default async function SliceLabPage({ searchParams }: { searchParams: Promise<{ w?: string; m?: string }> }) {
  const sp = await searchParams;
  const { window } = parseTimeWindow(sp.w);
  const metric: Metric = sp.m === "bid" ? "bid" : "ask";
  const metrics: { key: Metric; label: string }[] = [
    { key: "ask", label: "ASK (floor)" },
    { key: "bid", label: "BID (demand)" },
  ];
  return (
    <main className="mx-auto max-w-[1200px] px-[22px] py-6">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-[20px] font-semibold tracking-tight">Slice Lab</h1>
        <div className="flex gap-2">
          <div className="inline-flex gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
            {metrics.map((mm) => (
              <Link
                key={mm.key}
                href={`/lab/slices?w=${window}&m=${mm.key}`}
                scroll={false}
                className={`rounded-md px-[10px] py-[5px] font-mono text-[11px] transition-colors ${
                  mm.key === metric ? "bg-[var(--accent)]/15 font-semibold text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
              >
                {mm.label}
              </Link>
            ))}
          </div>
          <div className="inline-flex gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
            {WINDOWS.map((w) => (
              <Link
                key={w}
                href={`/lab/slices?w=${w}&m=${metric}`}
                scroll={false}
                className={`rounded-md px-[9px] py-[5px] font-mono text-[11px] transition-colors ${
                  w === window ? "bg-[#2dd4bf]/15 font-semibold text-[#2dd4bf]" : "text-[var(--text-dim)] hover:text-[var(--text)]"
                }`}
              >
                {w.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <p className="mb-5 text-[11px] text-[var(--text-faint)]">
        Cap-weighted % move by slice (top-player universe). <b>ASK</b> = floor (sellers); <b>BID</b> = top offer (demand).
        Green = up, red = down. The ask-vs-bid gap is itself the signal.
      </p>
      <Suspense key={`${window}-${metric}`} fallback={<Skeleton />}>
        <Lab window={window} metric={metric} />
      </Suspense>
    </main>
  );
}
