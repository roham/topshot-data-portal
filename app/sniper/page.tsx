// /sniper — minimal V1 mispricing feed. Surfaces editions where the current
// floor (lowest_ask) sits meaningfully below recent transaction prices in the
// active window. The full per-listing version (OTM Sniper port) requires
// editionListedSerials + valuation engine and lands in a later iter.
//
// Math: gap_pct = (avg_recent_sale - current_floor) / avg_recent_sale.
// Higher = better "buy below the market" signal.

import Link from "next/link";
import { Suspense } from "react";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { TimeWindowSelector } from "@/components/global/TimeWindowSelector";
import { parseTimeWindow, WINDOW_SPECS, type TimeWindow } from "@/components/global/window-types";
import { getMostActiveEditions } from "@/lib/supabase/queries/most-active-editions";
import { getSupabaseServerAnon } from "@/lib/supabase/server";

export const revalidate = 120;
export const maxDuration = 30;
export const metadata = { title: "Sniper · TS·PORTAL" };

interface SniperRow {
  edition_id: string;
  player_name: string | null;
  set_name: string | null;
  tier_name: string | null;
  floor_usd: number | null;
  avg_recent_sale_usd: number;
  tx_count: number;
  gap_pct: number;
}

async function fetchSniperFeed(window: TimeWindow): Promise<SniperRow[]> {
  // 1. Active editions in the window (have recent transactions)
  const minTx = window === "24h" ? 2 : 5;
  const active = await getMostActiveEditions({ window, limit: 200, minTxCount: minTx });
  if (active.length === 0) return [];

  // 2. Pull current floor from market_caps for those editions
  const sb = getSupabaseServerAnon();
  if (!sb) return [];
  const { data: latestRow } = await sb
    .from("market_caps")
    .select("date")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const asOf = (latestRow as { date: string } | null)?.date ?? null;
  if (!asOf) return [];

  const editionIds = active.map((e) => e.edition_id).filter((id): id is string => !!id);
  const floors = new Map<string, number>();
  const CHUNK = 200;
  for (let i = 0; i < editionIds.length; i += CHUNK) {
    const chunk = editionIds.slice(i, i + CHUNK);
    const { data } = await sb
      .from("market_caps")
      .select("edition_id, lowest_ask_price")
      .eq("date", asOf)
      .in("edition_id", chunk);
    for (const r of (data as { edition_id: string; lowest_ask_price: number | string | null }[] | null) ?? []) {
      const v = r.lowest_ask_price === null ? null : Number(r.lowest_ask_price);
      if (v && Number.isFinite(v)) floors.set(r.edition_id, v);
    }
  }

  // 3. Build sniper rows. avg_sale = total_volume / tx_count (rough proxy)
  const out: SniperRow[] = [];
  for (const e of active) {
    if (!e.edition_id) continue;
    const floor = floors.get(e.edition_id) ?? null;
    const totalVol = Number(e.volume_usd ?? 0);
    const txCount = Number(e.tx_count ?? 0);
    if (txCount === 0 || totalVol <= 0) continue;
    const avgSale = totalVol / txCount;
    if (!floor || floor <= 0 || avgSale <= 0) continue;
    const gap = (avgSale - floor) / avgSale;
    if (gap < 0.05) continue; // floor must be ≥ 5% below avg to surface
    out.push({
      edition_id: e.edition_id,
      player_name: e.player_name ?? null,
      set_name: e.set_name ?? null,
      tier_name: e.tier_name ?? null,
      floor_usd: floor,
      avg_recent_sale_usd: avgSale,
      tx_count: txCount,
      gap_pct: gap * 100,
    });
  }
  out.sort((a, b) => b.gap_pct - a.gap_pct);
  return out.slice(0, 50);
}

async function SniperTable({ window }: { window: TimeWindow }) {
  const rows = await fetchSniperFeed(window);
  if (rows.length === 0) {
    return (
      <div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">
        No editions where the floor sits ≥ 5% below recent average sale in this window.
      </div>
    );
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
            <th className="px-3 py-1.5 text-right">Floor</th>
            <th className="px-3 py-1.5 text-right">Avg sale</th>
            <th className="px-3 py-1.5 text-right">Trades</th>
            <th className="px-3 py-1.5 text-right">Gap</th>
            <th className="px-3 py-1.5 text-right w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const editionHref = r.edition_id.includes("+") ? `/edition/${r.edition_id.replace("+", "-")}` : null;
            return (
              <tr key={r.edition_id} className="border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-2)]">
                <td className="px-3 py-2 text-[var(--text-faint)] tabular-nums">{i + 1}</td>
                <td className="px-3 py-2">
                  {editionHref ? (
                    <Link href={editionHref} className="text-[var(--text)] hover:text-[var(--accent)]">{r.player_name ?? "—"}</Link>
                  ) : (
                    <span className="text-[var(--text)]">{r.player_name ?? "—"}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-[var(--text-dim)]">{r.set_name ?? "—"}</td>
                <td className="px-3 py-2">{r.tier_name ? <TierChip tier={r.tier_name} /> : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]"><Num value={r.floor_usd ?? 0} format="usd" /></td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]"><Num value={r.avg_recent_sale_usd} format="usd" /></td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--text-dim)]">{r.tx_count.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums text-[var(--up)] font-semibold">{r.gap_pct.toFixed(1)}%</td>
                <td className="px-3 py-2 text-right">
                  {editionHref && <Link href={editionHref} className="text-[var(--text-faint)] hover:text-[var(--accent)]">→</Link>}
                </td>
              </tr>
            );
          })}
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
  const { window } = parseTimeWindow(sp.w, "30d");
  const label = WINDOW_SPECS[window].label;

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6 space-y-5">
      <header className="flex items-baseline gap-4">
        <h1 className="font-mono text-[14px] tracking-section-header">SNIPER · {label}</h1>
        <p className="text-[11px] text-[var(--text-dim)] font-mono">
          Editions where the current floor sits ≥ 5% below recent avg sale. Buy-below-the-market signal.
        </p>
        <div className="ml-auto"><TimeWindowSelector /></div>
      </header>

      <Card
        title={`MISPRICING FEED — ${label}`}
        subtitle="Edition-level gap: (avg_sale − floor) ÷ avg_sale. Sorted descending."
        methodology="V1 surfaces edition-level mispricing using market_caps.lowest_ask_price and mv_edition_*_activity total_volume_usd ÷ tx_count. Full per-serial sniper requires editionListedSerials + valueMoment() from the valuation engine — landing in a follow-up."
        variant="inset"
      >
        <Suspense fallback={<div className="p-6 text-[12px] text-[var(--text-dim)] font-mono">Loading sniper feed…</div>}>
          <SniperTable window={window} />
        </Suspense>
      </Card>
    </div>
  );
}
