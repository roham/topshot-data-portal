// /appreciating — the most-appreciating editions, priced from MSRP (pack price)
// to current floor. Per edition, like a physical card. Two views: All editions
// and Rookies-in-$ (compare rookies against each other). The multiple is the hero.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getEditionAppreciation, type ApprView } from "@/lib/supabase/queries/edition-appreciation";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";

export const metadata: Metadata = { title: "Most Appreciating · TS·PORTAL" };
export const revalidate = 600;

const TABS: { key: ApprView; label: string }[] = [
  { key: "all", label: "All Editions" },
  { key: "rookies", label: "Rookies in $" },
];

function multColor(m: number): string {
  if (m >= 20) return "var(--tier-legendary)";
  if (m >= 5) return "#34d399";
  if (m >= 2) return "#2dd4bf";
  if (m >= 1) return "var(--text-dim)";
  return "#f87171";
}
const fmtMult = (m: number) => (m >= 10 ? `${Math.round(m)}×` : `${m.toFixed(1)}×`);

async function Index({ view }: { view: ApprView }) {
  const rows = await getEditionAppreciation(view, view === "rookies" ? 200 : 200);
  if (rows.length === 0) {
    return <div className="flex h-[300px] items-center justify-center text-[12px] text-[var(--text-faint)]">No data yet.</div>;
  }
  const maxMult = Math.max(...rows.map((r) => r.mult ?? 0), 1);
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)]">
      {/* header row (desktop) */}
      <div className="hidden grid-cols-[34px_1fr_120px_84px_84px_150px] items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-2.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--text-faint)] md:grid">
        <div>#</div><div>Edition</div><div className="text-right">MSRP → Floor</div><div className="text-right">MSRP</div><div className="text-right">Floor</div><div className="text-right">Appreciation</div>
      </div>
      <ul>
        {rows.map((r, i) => {
          const m = r.mult ?? 0;
          return (
            <li key={r.edition_id} className="grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-0 md:grid-cols-[34px_1fr_120px_84px_84px_150px]">
              <div className="font-mono text-[11px] text-[var(--text-faint)] tabular-nums">{i + 1}</div>

              {/* edition identity */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold">{r.player_name ?? "—"}</span>
                  <TierChip tier={r.tier_name} />
                  {r.parallel_id ? <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[9px] uppercase text-[var(--text-dim)]">Parallel</span> : null}
                </div>
                <div className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-faint)]">
                  {r.series_name ?? "—"} · /{r.mint_count?.toLocaleString() ?? "—"}{r.draft_year ? ` · ${r.draft_year} draft` : ""}
                </div>
              </div>

              {/* mobile multiple (right of identity) */}
              <div className="text-right md:hidden">
                <div className="text-[15px] font-bold tabular-nums" style={{ color: multColor(m) }}>{fmtMult(m)}</div>
                <div className="font-mono text-[10px] text-[var(--text-faint)]">
                  <Num value={r.msrp} format="usd" />→<Num value={r.floor} format="usd" />
                </div>
              </div>

              {/* desktop: comparison bar */}
              <div className="hidden md:block">
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.max((m / maxMult) * 100, 2)}%`, background: multColor(m) }} />
                </div>
              </div>
              <div className="hidden text-right font-mono text-[12px] tabular-nums text-[var(--text-dim)] md:block"><Num value={r.msrp} format="usd" /></div>
              <div className="hidden text-right font-mono text-[12px] tabular-nums md:block"><Num value={r.floor} format="usd" /></div>
              <div className="hidden text-right md:block">
                <span className="text-[17px] font-bold tabular-nums" style={{ color: multColor(m) }}>{fmtMult(m)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function AppreciatingPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const sp = await searchParams;
  const view = (sp.view === "rookies" ? "rookies" : "all") as ApprView;
  return (
    <main className="mx-auto max-w-[1100px] px-[22px] py-6">
      <h1 className="text-[20px] font-semibold tracking-tight">Most Appreciating</h1>
      <p className="mb-4 mt-1 text-[11px] text-[var(--text-faint)]">
        Every edition priced from its <strong className="text-[var(--text-dim)]">MSRP</strong> (pack price ÷ moments per pack) to its current floor — the multiple a collector is up, per edition, like a physical card.
        {view === "rookies" ? " Rookies (2024–25 draft) compared against each other." : ""}
      </p>
      <div className="mb-4 inline-flex gap-0.5 rounded-[9px] bg-[var(--surface-1)] p-1">
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
        <Index view={view} />
      </Suspense>
    </main>
  );
}
