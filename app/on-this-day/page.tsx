// /on-this-day — date-anchored archive of biggest sales over the past year,
// surfaced from the mv_largest_sales_* materialized views.
//
// Per the Editorial-lane brief: archive view for "what happened today in
// Top Shot history." V1 ships the biggest sales of the past 1Y, sorted DESC;
// the per-day calendar slicing lands once a daily archive table is queued.

import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { getLargestSales } from "@/lib/supabase/queries/largest-sales";

export const revalidate = 600;
export const maxDuration = 30;
export const metadata = { title: "On this day · TS·PORTAL" };

async function ArchiveTable() {
  const rows = await getLargestSales({ window: "1y", limit: 100 });
  if (rows.length === 0) {
    return <div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">No archive data yet.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-[var(--text-faint)] uppercase tracking-data-label text-[9px]">
            <th className="px-3 py-1.5 text-left w-8">#</th>
            <th className="px-3 py-1.5 text-left">Player</th>
            <th className="px-3 py-1.5 text-left">Set</th>
            <th className="px-3 py-1.5 text-left">Tier</th>
            <th className="px-3 py-1.5 text-right">Serial</th>
            <th className="px-3 py-1.5 text-right">Sale</th>
            <th className="px-3 py-1.5 text-left">Buyer</th>
            <th className="px-3 py-1.5 text-left">Seller</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.transaction_id ?? i} className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-2)]">
              <td className="px-3 py-2 text-[var(--text-faint)] tabular-nums">{i + 1}</td>
              <td className="px-3 py-2 text-[var(--text)]">{r.player_name ?? "—"}</td>
              <td className="px-3 py-2 text-[var(--text-dim)]">{r.set_name ?? "—"}</td>
              <td className="px-3 py-2">{r.tier_name ? <TierChip tier={r.tier_name} /> : "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">
                {r.serial_number ? `#${r.serial_number}` : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-[var(--text)]">
                <Num value={Number(r.gross_amount_usd)} format="usd" />
              </td>
              <td className="px-3 py-2 text-[var(--text-dim)]">
                {r.buyer_safe_name ? (
                  <Link href={`/u/${r.buyer_safe_name}`} className="hover:text-[var(--accent)]">
                    {r.buyer_safe_name}
                  </Link>
                ) : (
                  <span className="text-[var(--text-faint)]">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-[var(--text-dim)]">
                {r.seller_safe_name ? (
                  <Link href={`/u/${r.seller_safe_name}`} className="hover:text-[var(--accent)]">
                    {r.seller_safe_name}
                  </Link>
                ) : (
                  <span className="text-[var(--text-faint)]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Page() {
  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-5">
      <header>
        <h1 className="font-mono text-[14px] tracking-section-header">ON THIS DAY · ARCHIVE</h1>
        <p className="text-[11px] text-[var(--text-dim)] font-mono mt-1 max-w-2xl">
          Biggest sales over the past year. Per-day calendar slicing lands when the daily
          archive table is queued in ETL.
        </p>
      </header>

      <Card title="BIGGEST SALES — 1Y" subtitle="Top 100 by gross USD" variant="inset">
        <Suspense fallback={<div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">Loading archive…</div>}>
          <ArchiveTable />
        </Suspense>
      </Card>
    </div>
  );
}
