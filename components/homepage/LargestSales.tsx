// Server Component leaf — fetches + renders largest sales for a window.

import Link from "next/link";
import { getLargestSales } from "@/lib/supabase/queries/largest-sales";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import {
  windowLabel,
  windowToLargestSalesView,
} from "@/lib/supabase/helpers";
import type { TimeWindow } from "@/components/global/window-types";

interface Props {
  window: TimeWindow;
}

const TIER_NAME_TO_RAW: Record<string, string> = {
  Common: "MOMENT_TIER_COMMON",
  Fandom: "MOMENT_TIER_FANDOM",
  Rare: "MOMENT_TIER_RARE",
  Legendary: "MOMENT_TIER_LEGENDARY",
  Ultimate: "MOMENT_TIER_ULTIMATE",
  Anthology: "MOMENT_TIER_ULTIMATE",
};
function rawTierFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  return TIER_NAME_TO_RAW[name] ?? null;
}

export async function LargestSales({ window }: Props) {
  const label = windowLabel(window);
  const largest = await getLargestSales({ window, limit: 20 });
  if (largest.length === 0) return null;

  return (
    <section aria-labelledby="sb-largest">
      <div className="flex items-baseline gap-3 mb-2 px-1">
        <h2
          id="sb-largest"
          className="text-[13px] font-semibold tracking-section-header"
        >
          Largest sales · {label}
        </h2>
        <span className="text-[10px] text-[var(--text-faint)] font-mono">
          {largest.length} sales · price desc · from{" "}
          {windowToLargestSalesView(window)}
        </span>
        <Link
          href="/sales"
          className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono"
        >
          see all →
        </Link>
      </div>
      <Card variant="inset">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--surface-2)]">
            <tr className="text-left">
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right w-[100px]">
                Price
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                Moment
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-[110px]">
                Tier
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                Buyer
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                Seller
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {largest.map((s) => (
              <tr
                key={s.transaction_id}
                className="hover:bg-[var(--surface-2)] transition-colors"
              >
                <td className="px-3 py-1.5 text-right tnum font-semibold text-[var(--up)]">
                  <Num value={Number(s.gross_amount_usd)} format="usd" />
                </td>
                <td className="px-3 py-1.5 text-[var(--text)]">
                  {s.player_name ?? "—"}
                  {s.serial_number != null && (
                    <span className="text-[var(--text-faint)]">
                      {" "}
                      #{s.serial_number}
                    </span>
                  )}
                  {s.set_name && (
                    <span className="text-[var(--text-dim)]">
                      {" "}
                      · {s.set_name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <TierChip tier={rawTierFromName(s.tier_name)} />
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
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
