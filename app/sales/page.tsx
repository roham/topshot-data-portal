// /sales — Top Sales flagship. Leads with the positive: the genuine standout
// sales in the window, podium for the top 3 (real NBA headshots, never
// synthesized), then a ranked table. The homepage "Largest sales · see all →"
// deep-links here. Default window 30D per the constitution time-window standard
// (90D/6M collapse to the 30D MV; selector offers 24H/7D/30D/1Y/All).

import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import { TimeWindowSelector } from "@/components/global/TimeWindowSelector";
import { parseTimeWindow, WINDOW_SPECS, type TimeWindow } from "@/components/global/window-types";
import { getTopSales } from "@/lib/supabase/queries/largest-sales";
import { NBA_HEADSHOT } from "@/lib/nba-team-colors";
import { windowToLargestSalesView } from "@/lib/supabase/helpers";

export const revalidate = 120;
export const maxDuration = 30;
export const metadata = { title: "Top Sales · TS·PORTAL" };

const TIER_NAME_TO_RAW: Record<string, string> = {
  Common: "MOMENT_TIER_COMMON",
  Fandom: "MOMENT_TIER_FANDOM",
  Rare: "MOMENT_TIER_RARE",
  Legendary: "MOMENT_TIER_LEGENDARY",
  Ultimate: "MOMENT_TIER_ULTIMATE",
  Anthology: "MOMENT_TIER_ULTIMATE",
};
function rawTier(name: string | null | undefined): string | null {
  return name ? (TIER_NAME_TO_RAW[name] ?? null) : null;
}

function soldDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!isFinite(t)) return "—";
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function editionHref(editionId: string | null | undefined): string | null {
  return editionId ? `/edition/${editionId}` : null;
}

function PodiumCard({
  rank,
  sale,
}: {
  rank: number;
  sale: Awaited<ReturnType<typeof getTopSales>>[number];
}) {
  const href = editionHref(sale.edition_id);
  const medal = rank === 1 ? "text-[var(--accent)]" : "text-[var(--text-dim)]";
  const inner = (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-[var(--surface-2)] border border-[var(--border-subtle)]">
        {sale.player_id ? (
          <Image
            src={NBA_HEADSHOT(sale.player_id)}
            alt={sale.player_name ?? "player"}
            fill
            sizes="56px"
            className="object-cover object-top"
            unoptimized
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={`font-mono text-[16px] font-semibold tabular-nums ${medal}`}>#{rank}</span>
          <span className="font-mono text-[18px] font-semibold tabular-nums text-[var(--up)]">
            <Num value={Number(sale.gross_amount_usd)} format="usd" />
          </span>
        </div>
        <div className="truncate text-[13px] text-[var(--text)] mt-0.5">
          {sale.player_name ?? "—"}
          {sale.serial_number != null && (
            <span className="text-[var(--text-faint)]"> #{sale.serial_number}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <TierChip tier={rawTier(sale.tier_name)} />
          <span className="truncate text-[11px] text-[var(--text-dim)] font-mono">
            {sale.set_name ?? sale.edition_name ?? "—"}
          </span>
        </div>
        <div className="text-[10px] text-[var(--text-faint)] font-mono mt-1">{soldDate(sale.sold_at)}</div>
      </div>
    </div>
  );
  return (
    <Card variant="inset">
      <div className="p-3">
        {href ? (
          <Link href={href} className="block hover:opacity-90 transition-opacity">
            {inner}
          </Link>
        ) : (
          inner
        )}
      </div>
    </Card>
  );
}

async function TopSales({ window }: { window: TimeWindow }) {
  const sales = await getTopSales({ window, limit: 50 });
  const label = WINDOW_SPECS[window].label;

  if (sales.length === 0) {
    return (
      <div className="p-8 text-center text-[12px] text-[var(--text-dim)] font-mono">
        No sales recorded in the {label} window yet.
      </div>
    );
  }

  const podium = sales.slice(0, 3);
  const rest = sales.slice(3);

  return (
    <div className="space-y-5">
      {/* Lead with the positive: the three biggest sales of the window. */}
      <div className="grid md:grid-cols-3 gap-3">
        {podium.map((s, i) => (
          <PodiumCard key={s.transaction_id} rank={i + 1} sale={s} />
        ))}
      </div>

      {rest.length > 0 && (
        <Card variant="inset">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--surface-2)]">
                <tr className="text-left text-[10px] tracking-data-label text-[var(--text-faint)] uppercase">
                  <th className="px-3 py-1.5 w-8 text-right">#</th>
                  <th className="px-3 py-1.5 text-right w-[110px]">Price</th>
                  <th className="px-3 py-1.5">Moment</th>
                  <th className="px-3 py-1.5 w-[110px]">Tier</th>
                  <th className="px-3 py-1.5">Buyer</th>
                  <th className="px-3 py-1.5">Seller</th>
                  <th className="px-3 py-1.5 text-right w-[90px]">Sold</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {rest.map((s, i) => {
                  const href = editionHref(s.edition_id);
                  return (
                    <tr key={s.transaction_id} className="hover:bg-[var(--surface-2)] transition-colors">
                      <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-faint)]">{i + 4}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-[var(--up)]">
                        <Num value={Number(s.gross_amount_usd)} format="usd" />
                      </td>
                      <td className="px-3 py-1.5 text-[var(--text)]">
                        {href ? (
                          <Link href={href} className="hover:text-[var(--accent)]">
                            {s.player_name ?? "—"}
                            {s.serial_number != null && (
                              <span className="text-[var(--text-faint)]"> #{s.serial_number}</span>
                            )}
                            {s.set_name && <span className="text-[var(--text-dim)]"> · {s.set_name}</span>}
                          </Link>
                        ) : (
                          <>
                            {s.player_name ?? "—"}
                            {s.serial_number != null && (
                              <span className="text-[var(--text-faint)]"> #{s.serial_number}</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <TierChip tier={rawTier(s.tier_name)} />
                      </td>
                      <td className="px-3 py-1.5">
                        {s.buyer_safe_name ? (
                          <Link
                            href={`/u/${encodeURIComponent(s.buyer_safe_name)}`}
                            className="text-[var(--text-dim)] hover:text-[var(--accent)]"
                          >
                            {s.buyer_safe_name}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-faint)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        {s.seller_safe_name ? (
                          <Link
                            href={`/u/${encodeURIComponent(s.seller_safe_name)}`}
                            className="text-[var(--text-dim)] hover:text-[var(--accent)]"
                          >
                            {s.seller_safe_name}
                          </Link>
                        ) : (
                          <span className="text-[var(--text-faint)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-faint)] font-mono text-[11px]">
                        {soldDate(s.sold_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="text-[10px] text-[var(--text-faint)] font-mono leading-relaxed max-w-2xl">
        Real, settled sales — price descending — from{" "}
        <span className="text-[var(--text-dim)]">{windowToLargestSalesView(window)}</span>. Headshots are
        official NBA marks (cdn.nba.com). Click any row to open the edition&apos;s price history.
      </p>
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
        <h1 className="font-mono text-[14px] tracking-section-header">TOP SALES · {label}</h1>
        <p className="text-[11px] text-[var(--text-dim)] font-mono">
          The biggest settled sales in the window — the best of the market.
        </p>
        <div className="ml-auto">
          <TimeWindowSelector />
        </div>
      </header>

      <Suspense
        key={window}
        fallback={<div className="p-8 text-[12px] text-[var(--text-dim)] font-mono">Loading top sales…</div>}
      >
        <TopSales window={window} />
      </Suspense>
    </div>
  );
}
