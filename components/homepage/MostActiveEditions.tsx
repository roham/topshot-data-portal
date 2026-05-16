// Server Component leaf — fetches + renders most-active editions for a window.

import Link from "next/link";
import { getMostActiveEditions } from "@/lib/supabase/queries/most-active-editions";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import {
  windowLabel,
  windowToEditionActivityView,
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

export async function MostActiveEditions({ window }: Props) {
  const label = windowLabel(window);
  const minTx = window === "24h" ? 2 : window === "7d" ? 5 : 10;
  const mostActive = await getMostActiveEditions({
    window,
    limit: 20,
    minTxCount: minTx,
  });
  if (mostActive.length === 0) return null;

  return (
    <section aria-labelledby="sb-most-active">
      <div className="flex items-baseline gap-3 mb-2 px-1">
        <h2
          id="sb-most-active"
          className="text-[13px] font-semibold tracking-section-header"
        >
          Most active · editions · {label}
        </h2>
        <span className="text-[10px] text-[var(--text-faint)] font-mono">
          {mostActive.length} editions · $ volume desc · filter: ≥5 trades ·
          from {windowToEditionActivityView(window)}
        </span>
        <Link
          href="/volume"
          className="ml-auto text-[10px] text-[var(--text-dim)] hover:text-[var(--accent)] font-mono"
        >
          see all →
        </Link>
      </div>
      <Card variant="inset">
        <table className="w-full text-[12px]">
          <thead className="bg-[var(--surface-2)]">
            <tr className="text-left">
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-10">
                #
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                Edition
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                {label} $ vol
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                Trades
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                Median
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] w-[110px]">
                Tier
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {mostActive.map((r, i) => (
              <tr
                key={r.edition_id}
                className="hover:bg-[var(--surface-2)] transition-colors"
              >
                <td className="px-3 py-1.5 text-[var(--text-faint)] tnum">
                  {i + 1}
                </td>
                <td className="px-3 py-1.5">
                  <Link
                    href={r.set_id ? `/set/${r.set_id}` : "/volume"}
                    className="text-[var(--text)] hover:text-[var(--accent)]"
                  >
                    {r.player_name ?? "—"}
                    {r.set_name ? (
                      <span className="text-[var(--text-dim)]">
                        {" "}
                        · {r.set_name}
                      </span>
                    ) : null}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-right tnum font-semibold">
                  <Num value={Number(r.volume_usd)} format="usdCompact" />
                </td>
                <td className="px-3 py-1.5 text-right tnum">
                  {Number(r.tx_count).toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-right tnum">
                  <Num
                    value={
                      r.median_price_usd != null
                        ? Number(r.median_price_usd)
                        : null
                    }
                    format="usd"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <TierChip tier={rawTierFromName(r.tier_name)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
