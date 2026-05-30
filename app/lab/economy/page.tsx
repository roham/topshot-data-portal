// /lab/economy — realized economics. The actual cleared-trade story (GMV +
// median sale price) that the floor/ask quotes hide: dollar volume recovered off
// the Sep-Oct'25 bottom (+130%, +30% YoY) while unit prices fell. Reads the
// precomputed mv_realized_monthly.

import { Suspense } from "react";
import type { Metadata } from "next";
import { getRealizedMonthly } from "@/lib/supabase/queries/realized-economics";
import { RealizedTrendChart } from "@/components/state-of-market/RealizedTrendChart";
import { Num } from "@/components/primitives/Num";

export const metadata: Metadata = { title: "Economy · TS·PORTAL" };
export const revalidate = 600;

async function Trend() {
  const rows = await getRealizedMonthly();
  // Exclude the current calendar month — it's partial (data lands mid-month) and
  // comparing a half-month to full months reads as a fake crash.
  const curMonth = new Date().toISOString().slice(0, 7);
  const complete = rows.filter((r) => r.month.slice(0, 7) < curMonth);
  const last = complete[complete.length - 1];
  const sixAgo = complete[complete.length - 7];
  const bottom = complete.reduce<typeof last | undefined>((m, r) => (!m || r.gmv < m.gmv ? r : m), undefined);
  const pct = (a?: number, b?: number) => (a != null && b ? ((a - b) / b) * 100 : null);
  const kpis = [
    { label: `GMV · ${last?.month.slice(0, 7) ?? "—"}`, value: last?.gmv, fmt: "usdCompact" as const },
    { label: "GMV vs 6mo ago", value: pct(last?.gmv, sixAgo?.gmv), fmt: "deltaPct" as const },
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
          Realized GMV (teal, left) · median sale price (amber, right) · by month · final month partial (data lands mid-month)
        </div>
        <RealizedTrendChart rows={rows} />
      </div>
    </>
  );
}

export default function EconomyPage() {
  return (
    <main className="mx-auto max-w-[1100px] px-[22px] py-6">
      <h1 className="text-[20px] font-semibold tracking-tight">The Economy — Realized</h1>
      <p className="mb-5 mt-1 text-[11px] text-[var(--text-faint)]">
        Actual cleared trades, not floor/ask quotes. Dollar volume is up off the bottom even as unit
        prices fell — the story the floor hides.
      </p>
      <Suspense fallback={<div className="h-[440px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}>
        <Trend />
      </Suspense>
    </main>
  );
}
