// /appreciating — visual gallery of the most-appreciating editions, ranked by
// real 90d realized-price growth (median sale now vs ~90d ago). Each card shows
// the price trend sparkline + absolute price; click → full StockX price chart.
// No MSRP/odds, no debut-baseline doom — pure trailing momentum from real sales.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getEditionGrowth, type GrowthView } from "@/lib/supabase/queries/edition-growth";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
import { MiniSpark } from "@/components/MiniSpark";

export const metadata: Metadata = { title: "Most Appreciating · TS·PORTAL" };
export const revalidate = 600;

const TABS: { key: GrowthView; label: string }[] = [
  { key: "all", label: "All Editions" },
  { key: "rookies", label: "Rookies" },
];

const UP = "#34d399";
const DOWN = "#f87171";
const fmtPct = (p: number) => `${p >= 0 ? "+" : ""}${p >= 1000 ? `${(p / 100).toFixed(0)}×` : `${Math.round(p)}%`}`;

async function Gallery({ view }: { view: GrowthView }) {
  const rows = await getEditionGrowth(view, 12, 60);
  if (rows.length === 0) {
    return <div className="flex h-[300px] items-center justify-center text-[12px] text-[var(--text-faint)]">No data yet.</div>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => {
        const g = r.growth_pct ?? 0;
        const color = g >= 0 ? UP : DOWN;
        return (
          <Link key={r.edition_id} href={`/edition/${encodeURIComponent(r.edition_id)}`}
            className="group overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] transition-colors hover:border-[var(--border-strong)]">
            <div className="flex items-start gap-3 p-4 pb-2">
              {r.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.image_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[var(--border-subtle)]" />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--surface-2)]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold">{r.player_name ?? "—"}</span>
                  <TierChip tier={r.tier_name} />
                </div>
                <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-faint)]">
                  {r.series_name ?? "—"} · /{r.mint_count?.toLocaleString() ?? "—"}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[18px] font-bold tabular-nums" style={{ color }}>{fmtPct(g)}</div>
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--text-faint)]">90d</div>
              </div>
            </div>

            <div className="px-1">
              <MiniSpark data={r.sparkline} color={color} height={60} />
            </div>

            <div className="flex items-baseline justify-between gap-2 px-4 pb-4 pt-1">
              <div className="text-[20px] font-semibold tabular-nums"><Num value={r.price_now} format="usd" /></div>
              <div className="font-mono text-[10px] text-[var(--text-faint)]">
                <Num value={r.price_prior} format="usd" /> → now · {r.n_sales.toLocaleString()} sales
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default async function AppreciatingPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const view = (sp.view === "rookies" ? "rookies" : "all") as GrowthView;
  return (
    <main className="mx-auto max-w-[1100px] px-[22px] py-6">
      <h1 className="text-[20px] font-semibold tracking-tight">Most Appreciating</h1>
      <p className="mb-4 mt-1 text-[11px] text-[var(--text-faint)]">
        Ranked by real price growth over the last 90 days — median sale now vs ~90 days ago, from actual trades.
        Each card is one edition; click for its full price history.{view === "rookies" ? " Rookies (2024–25 draft)." : ""}
      </p>
      <div className="mb-5 inline-flex gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
        {TABS.map((t) => (
          <Link key={t.key} href={`/appreciating?view=${t.key}`} scroll={false}
            className={`rounded-md px-[12px] py-[6px] font-mono text-[11px] transition-colors ${
              t.key === view ? "bg-[var(--accent)]/15 font-semibold text-[var(--accent)]" : "text-[var(--text-dim)] hover:text-[var(--text)]"
            }`}>
            {t.label}
          </Link>
        ))}
      </div>
      <Suspense key={view} fallback={<div className="h-[600px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}>
        <Gallery view={view} />
      </Suspense>
    </main>
  );
}
