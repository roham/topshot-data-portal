// Server Component leaf — fetches + renders top players for a window.

import Link from "next/link";
import { getTopPlayers } from "@/lib/supabase/queries/top-players";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { windowLabel, windowToPlayerView } from "@/lib/supabase/helpers";
import type { TimeWindow } from "@/components/global/window-types";

interface Props {
  window: TimeWindow;
}

export async function TopPlayers({ window }: Props) {
  const label = windowLabel(window);
  const minTx = window === "24h" ? 2 : window === "7d" ? 5 : 10;
  const topPlayers = await getTopPlayers({ window, limit: 20, minTxCount: minTx });
  if (topPlayers.length === 0) return null;

  return (
    <section aria-labelledby="sb-players">
      <div className="flex items-baseline gap-3 mb-2 px-1">
        <h2
          id="sb-players"
          className="text-[13px] font-semibold tracking-section-header"
        >
          Top players · {label}
        </h2>
        <span className="text-[10px] text-[var(--text-faint)] font-mono">
          {topPlayers.length} players · ranked by $ volume · filter: ≥5 trades ·
          from {windowToPlayerView(window)}
        </span>
        <Link
          href="/movers"
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
                Player
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)]">
                Team
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                $ volume
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                Trades
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                Unique moments
              </th>
              <th className="px-3 py-1.5 text-[10px] tracking-data-label text-[var(--text-faint)] text-right">
                Median
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {topPlayers.map((p, i) => (
              <tr
                key={p.player_id}
                className="hover:bg-[var(--surface-2)] transition-colors"
              >
                <td className="px-3 py-1.5 text-[var(--text-faint)] tnum">
                  {i + 1}
                </td>
                <td className="px-3 py-1.5">
                  <Link
                    href={`/player/${p.player_id}`}
                    className="text-[var(--text)] hover:text-[var(--accent)]"
                  >
                    {p.player_name ?? "—"}
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-[var(--text-dim)]">
                  {p.last_known_team_full_name ?? "—"}
                </td>
                <td className="px-3 py-1.5 text-right tnum font-semibold">
                  <Num value={Number(p.total_volume_usd)} format="usdCompact" />
                </td>
                <td className="px-3 py-1.5 text-right tnum">
                  {Number(p.tx_count).toLocaleString()}
                </td>
                <td className="px-3 py-1.5 text-right tnum">
                  {p.unique_moments_traded != null
                    ? Number(p.unique_moments_traded).toLocaleString()
                    : "—"}
                </td>
                <td className="px-3 py-1.5 text-right tnum">
                  <Num
                    value={
                      p.median_price_usd != null
                        ? Number(p.median_price_usd)
                        : null
                    }
                    format="usd"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
