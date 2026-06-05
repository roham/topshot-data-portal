// Trending card — graph-forward (StockX style): every individual sale plotted,
// with a trend line, the edition's growth/liquidity context, AND the named
// collector who holds its crown-jewel serial (proud-making, social). The chart
// stays interactive (tooltips), so the player name + @username are the links —
// not a covering anchor.

import Link from "next/link";
import { TierChip } from "@/components/primitives/TierChip";
import { StockXScatter } from "@/components/appreciation/StockXScatter";
import { OwnerCredit } from "@/components/appreciation/OwnerCredit";
import type { TrendingEdition } from "@/lib/supabase/queries/trending-scatter";

const UP = "#34d399";
const DOWN = "#f87171";

function fmtUsd(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1000) return `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`;
  return `$${Math.round(v)}`;
}
function fmtPct(p: number | null): string {
  if (p == null) return "—";
  return `${p >= 0 ? "+" : ""}${p >= 1000 ? `${(p / 100).toFixed(0)}×` : `${Math.round(p)}%`}`;
}

function Header({ e, big }: { e: TrendingEdition; big?: boolean }) {
  const g = e.growth_pct ?? 0;
  const color = g >= 0 ? UP : DOWN;
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/edition/${encodeURIComponent(e.edition_id)}`} className={`truncate font-semibold hover:underline ${big ? "text-[18px]" : "text-[14px]"}`}>{e.player_name ?? "—"}</Link>
          <TierChip tier={e.tier_name} />
        </div>
        <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--text-faint)]">
          {e.series_name ?? ""} · /{e.mint_count?.toLocaleString() ?? "—"} · {e.n_sales.toLocaleString()} sales
        </div>
        <OwnerCredit serial={e.owner_serial} username={e.owner_username} flow={e.owner_flow_address} tone="dark" />
      </div>
      <div className="shrink-0 text-right">
        <div className={`font-bold tabular-nums ${big ? "text-[20px]" : "text-[16px]"}`} style={{ color }}>{fmtPct(e.growth_pct)}</div>
        <div className="font-mono text-[10px] tabular-nums text-[var(--text-dim)]">{fmtUsd(e.price_now)}</div>
      </div>
    </div>
  );
}

export function TrendingScatterCard({ e }: { e: TrendingEdition }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface-1)] transition-colors hover:border-[var(--border-strong)]">
      <Header e={e} />
      <div className="px-1 pb-2 pt-2"><StockXScatter sales={e.sales} height={180} /></div>
    </div>
  );
}

export function TrendingScatterHero({ e }: { e: TrendingEdition }) {
  return (
    <div className="mb-4 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-1)]">
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--text-faint)]">Most traded · trending</span>
      </div>
      <Header e={e} big />
      <div className="px-2 pb-3 pt-3"><StockXScatter sales={e.sales} height={320} /></div>
    </div>
  );
}
