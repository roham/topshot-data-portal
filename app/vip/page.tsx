// /vip — biggest buyers and sellers in the active window, surfaced from
// mv_largest_sales_*. Honest about what's available: the public API exposes
// no per-edition top-holders aggregate (foundation §3 Ceiling 7), so the V1
// VIP view is per-transaction — collectors who appear repeatedly in the
// largest-sales list ARE the VIP collectors.

import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { TimeWindowSelector } from "@/components/global/TimeWindowSelector";
import { parseTimeWindow, WINDOW_SPECS, type TimeWindow } from "@/components/global/window-types";
import { getLargestSales } from "@/lib/supabase/queries/largest-sales";

export const revalidate = 120;
export const maxDuration = 30;
export const metadata = { title: "VIP · TS·PORTAL" };

interface VipAgg {
  user_name: string;
  side: "buyer" | "seller";
  total_usd: number;
  tx_count: number;
  biggest_sale_usd: number;
}

async function aggregateVips(window: TimeWindow, side: "buyer" | "seller"): Promise<VipAgg[]> {
  const rows = await getLargestSales({ window, limit: 200 });
  const byUser = new Map<string, VipAgg>();
  for (const r of rows) {
    const name = side === "buyer" ? r.buyer_safe_name : r.seller_safe_name;
    if (!name) continue;
    const amount = Number(r.gross_amount_usd) || 0;
    const cur = byUser.get(name) ?? {
      user_name: name,
      side,
      total_usd: 0,
      tx_count: 0,
      biggest_sale_usd: 0,
    };
    cur.total_usd += amount;
    cur.tx_count += 1;
    if (amount > cur.biggest_sale_usd) cur.biggest_sale_usd = amount;
    byUser.set(name, cur);
  }
  return [...byUser.values()].sort((a, b) => b.total_usd - a.total_usd).slice(0, 20);
}

async function VipTable({ window, side, title }: { window: TimeWindow; side: "buyer" | "seller"; title: string }) {
  const rows = await aggregateVips(window, side);
  if (rows.length === 0) {
    return <div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">No {side}s found in the {title} window.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-[var(--text-faint)] uppercase tracking-data-label text-[9px]">
            <th className="px-3 py-1.5 text-left w-8">#</th>
            <th className="px-3 py-1.5 text-left">Collector</th>
            <th className="px-3 py-1.5 text-right">Total {side === "buyer" ? "Bought" : "Sold"}</th>
            <th className="px-3 py-1.5 text-right">Biggest single</th>
            <th className="px-3 py-1.5 text-right">{side === "buyer" ? "Buys" : "Sells"}</th>
            <th className="px-3 py-1.5 text-right w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w, i) => (
            <tr key={w.user_name} className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-2)]">
              <td className="px-3 py-2 text-[var(--text-faint)] tabular-nums">{i + 1}</td>
              <td className="px-3 py-2">
                <Link href={`/u/${w.user_name}`} className="text-[var(--text)] hover:text-[var(--accent)]">
                  {w.user_name}
                </Link>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">
                <Num value={w.total_usd} format="usdCompact" />
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">
                <Num value={w.biggest_sale_usd} format="usd" />
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">
                {w.tx_count.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right">
                <Link href={`/u/${w.user_name}`} className="text-[var(--text-faint)] hover:text-[var(--accent)]">→</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ w?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const { window } = parseTimeWindow(sp.w, "7d");
  const label = WINDOW_SPECS[window].label;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-5">
      <header className="flex items-baseline gap-4">
        <h1 className="font-mono text-[14px] tracking-section-header">VIP COLLECTORS · {label}</h1>
        <p className="text-[11px] text-[var(--text-dim)] font-mono">
          Collectors with the most USD volume in the largest-sales view.
        </p>
        <div className="ml-auto"><TimeWindowSelector /></div>
      </header>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title={`TOP BUYERS — ${label}`} subtitle="Aggregated from largest sales" variant="inset">
          <Suspense fallback={<div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">Loading…</div>}>
            <VipTable window={window} side="buyer" title={label} />
          </Suspense>
        </Card>
        <Card title={`TOP SELLERS — ${label}`} subtitle="Aggregated from largest sales" variant="inset">
          <Suspense fallback={<div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">Loading…</div>}>
            <VipTable window={window} side="seller" title={label} />
          </Suspense>
        </Card>
      </div>

      <p className="text-[10px] text-[var(--text-faint)] font-mono leading-relaxed max-w-2xl">
        Honest disclosure: per-edition top-holders aggregate is not exposed by Top Shot&apos;s public
        API (Ceiling 7 in <Link href="/methodology" className="hover:text-[var(--text)] underline decoration-dotted">/methodology</Link>).
        The VIP view here is reconstructed from the largest-sales MV by aggregating per-buyer / per-seller volume.
        A true holder-concentration surface lands when the ownership backfill completes.
      </p>
    </div>
  );
}
