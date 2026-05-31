// Homepage hero — leads with the MSRP→floor appreciation story (per edition,
// odds-based MSRP), each card linking to that edition's StockX-style price chart.
// Server component; one read of mv_edition_appreciation.

import Link from "next/link";
import { getEditionAppreciation } from "@/lib/supabase/queries/edition-appreciation";
import { TierChip } from "@/components/primitives/TierChip";
import { Num } from "@/components/primitives/Num";

function multColor(m: number): string {
  if (m >= 20) return "var(--tier-legendary)";
  if (m >= 5) return "#34d399";
  if (m >= 2) return "#2dd4bf";
  if (m >= 1) return "var(--text-dim)";
  return "#f87171";
}
const fmtMult = (m: number) => (m >= 10 ? `${Math.round(m)}×` : `${m.toFixed(1)}×`);

export async function MostAppreciatingHero() {
  const rows = await getEditionAppreciation("all", 6);
  if (rows.length === 0) return null;
  return (
    <section className="pt-4 pb-2" aria-label="Most appreciating editions">
      <div className="mb-2 flex flex-wrap items-baseline gap-3 px-1">
        <h2 className="text-[13px] font-semibold tracking-section-header">Most appreciating · MSRP → floor · per edition</h2>
        <span className="font-mono text-[10px] text-[var(--text-faint)]">odds-based MSRP · click a card for its price chart</span>
        <Link href="/appreciating" className="ml-auto font-mono text-[10px] text-[var(--accent)] hover:underline">view full index →</Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const m = r.mult ?? 0;
          return (
            <Link key={r.edition_id} href={`/edition/${encodeURIComponent(r.edition_id)}`}
              className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[13px] font-semibold">{r.player_name ?? "—"}</span>
                  <TierChip tier={r.tier_name} />
                </div>
                <span className="shrink-0 text-[18px] font-bold tabular-nums" style={{ color: multColor(m) }}>{fmtMult(m)}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-2 font-mono text-[11px] text-[var(--text-dim)]">
                <Num value={r.msrp} format="usd" />
                <span className="text-[var(--text-faint)]">→</span>
                <span className="text-[var(--text)]"><Num value={r.floor} format="usd" /></span>
                <span className="ml-auto truncate text-[10px] text-[var(--text-faint)]">{r.series_name ?? ""} · /{r.mint_count?.toLocaleString() ?? "—"}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
