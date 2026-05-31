// Homepage hero — leads with the most-appreciating editions by real 90d sale
// growth, each a visual card (sparkline + price) linking to its full price chart.

import Link from "next/link";
import { getEditionGrowth } from "@/lib/supabase/queries/edition-growth";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";
import { MiniSpark } from "@/components/MiniSpark";

const UP = "#34d399";
const DOWN = "#f87171";
const fmtPct = (p: number) => `${p >= 0 ? "+" : ""}${p >= 1000 ? `${(p / 100).toFixed(0)}×` : `${Math.round(p)}%`}`;

export async function MostAppreciatingHero() {
  const rows = await getEditionGrowth("all", 12, 6);
  if (rows.length === 0) return null;
  return (
    <section className="pt-4 pb-1" aria-label="Most appreciating editions">
      <div className="mb-2 flex flex-wrap items-baseline gap-3 px-1">
        <h2 className="text-[13px] font-semibold tracking-section-header">Most appreciating · 90d price growth · per edition</h2>
        <span className="font-mono text-[10px] text-[var(--text-faint)]">real sales · click a card for its price chart</span>
        <Link href="/appreciating" className="ml-auto font-mono text-[10px] text-[var(--accent)] hover:underline">view full gallery →</Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const g = r.growth_pct ?? 0;
          const color = g >= 0 ? UP : DOWN;
          return (
            <Link key={r.edition_id} href={`/edition/${encodeURIComponent(r.edition_id)}`}
              className="overflow-hidden rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-1)] transition-colors hover:border-[var(--border-strong)]">
              <div className="flex items-center justify-between gap-2 px-4 pt-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[13px] font-semibold">{r.player_name ?? "—"}</span>
                  <TierChip tier={r.tier_name} />
                </div>
                <span className="shrink-0 text-[16px] font-bold tabular-nums" style={{ color }}>{fmtPct(g)}</span>
              </div>
              <div className="px-1 pt-1"><MiniSpark data={r.sparkline} color={color} height={42} /></div>
              <div className="flex items-baseline justify-between gap-2 px-4 pb-3">
                <span className="text-[16px] font-semibold tabular-nums"><Num value={r.price_now} format="usd" /></span>
                <span className="font-mono text-[9px] text-[var(--text-faint)]">{r.series_name ?? ""} · /{r.mint_count?.toLocaleString() ?? "—"}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
