// /volume — graph-first trading-volume surface. Who is actually trading, how
// much, and at what price. Window-driven (?w=) off mv_player_<w>_volume.
// Replaces the old ComingSoon: the TimeWindow infra it was gated on has shipped.

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getPlayerVolume } from "@/lib/supabase/queries/player-volume";
import { ChartCard } from "@/components/primitives/ChartCard";
import { TopVolumeBar, VolumeScatter } from "@/components/charts/volume/VolumeCharts";
import { TimeWindowSelector } from "@/components/global/TimeWindowSelector";
import { ExportCSV } from "@/components/global/ExportCSV";
import { parseTimeWindow, WINDOW_SPECS, type TimeWindow } from "@/components/global/window-types";

export const metadata: Metadata = {
  title: "Volume · TS·PORTAL",
  description: "Graph-first NBA Top Shot trading volume — top players by traded USD, liquidity shape, and a ranked table, over the selected window.",
};
export const revalidate = 300;
export const maxDuration = 60;

function fmtUSD(n: number): string {
  if (!n) return "$0";
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

const Kpi = ({ label, value, sub }: { label: string; value: string; sub: string }) => (
  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-3">
    <p className="text-[9px] text-[var(--text-faint)] tracking-data-label uppercase">{label}</p>
    <p className="text-[18px] font-semibold mt-1 tabular-nums">{value}</p>
    <p className="text-[10px] text-[var(--text-dim)] mt-0.5">{sub}</p>
  </div>
);

async function VolumeBody({ window }: { window: TimeWindow }) {
  const v = await getPlayerVolume(window);
  const label = WINDOW_SPECS[window].label;

  if (v.rows.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-12 text-center">
        <p className="text-[14px] text-[var(--text-dim)]">No trading volume in the {label} window.</p>
        <p className="text-[11px] text-[var(--text-faint)] mt-2">A shorter or longer window may have activity.</p>
      </div>
    );
  }

  const top = v.rows[0];
  const blendedAvg = v.totalTx > 0 ? v.totalVolumeUsd / v.totalTx : 0;

  return (
    <div className="panel-fade-in space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label={`Volume · ${label}`} value={fmtUSD(v.totalVolumeUsd)} sub={`top ${v.playerCount} players`} />
        <Kpi label="Trades" value={v.totalTx.toLocaleString()} sub="cleared transactions" />
        <Kpi label="Blended avg price" value={fmtUSD(blendedAvg)} sub="volume ÷ trades" />
        <Kpi label="Biggest single sale" value={fmtUSD(v.biggestSaleUsd)} sub="max in window" />
      </div>

      <ChartCard
        title={`Top players by volume · ${label}`}
        subtitle="traded USD volume in the window · color = rank"
        wide
        testId="chart-top-volume"
        href="/players"
        caption={top ? `${top.player_name ?? top.player_id} leads at ${fmtUSD(top.total_volume_usd)} across ${top.tx_count.toLocaleString()} trades.` : "No data."}
        methodology={`mv_player_${window === "6m" ? "1y" : window === "2y" || window === "all" ? "all_time" : window}_volume ranked by total_volume_usd. Volume = sum of cleared sale prices attributed to the player's moments.`}
      >
        <TopVolumeBar rows={v.rows} />
      </ChartCard>

      <ChartCard
        title="Liquidity shape — volume × avg price"
        subtitle="bubble = unique moments traded · log–log"
        wide
        testId="chart-volume-scatter"
        href="/players"
        caption="Right = high-volume churn; top = expensive typical sale. Bubble size = number of trades. Most stars sit low-median, high-volume (common-tier churn)."
        methodology="x = total traded volume, y = median sale price (both log). Bubble area = trade count. Top 200 players by volume."
      >
        <VolumeScatter rows={v.rows} />
      </ChartCard>

      <ChartCard
        title={`Ranked — top 50 by volume · ${label}`}
        subtitle="volume · trades · avg price · unique moments"
        testId="table-volume"
        wide
        href="/players"
        caption={`${v.playerCount} players traded in the ${label} window; top 50 shown.`}
      >
        <div className="flex justify-end px-3 pt-2">
          <ExportCSV
            filename={`topshot-volume-${window}.csv`}
            headers={["Player", "Team", "Volume USD", "Trades", "Median price USD", "Max sale USD"]}
            rows={v.rows.map((r) => [
              r.player_name ?? r.player_id,
              r.team_name ?? "",
              r.total_volume_usd.toFixed(2),
              r.tx_count,
              r.median_price_usd ?? "",
              r.max_price_usd ?? "",
            ])}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-[var(--surface-2)]">
              <tr className="text-left text-[10px] tracking-data-label text-[var(--text-faint)] uppercase">
                <th className="px-3 py-1.5 w-8 text-right">#</th>
                <th className="px-3 py-1.5">Player</th>
                <th className="px-3 py-1.5 text-right">Volume</th>
                <th className="px-3 py-1.5 text-right">Trades</th>
                <th className="px-3 py-1.5 text-right">Median price</th>
                <th className="px-3 py-1.5 text-right">Max sale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {v.rows.slice(0, 50).map((r, i) => (
                <tr key={r.player_id} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-faint)]">{i + 1}</td>
                  <td className="px-3 py-1.5 text-[var(--text)]">
                    <Link href={`/player/${r.player_id}`} className="hover:text-[var(--accent)]">{r.player_name ?? r.player_id}</Link>
                    {r.team_name && <span className="text-[var(--text-dim)]"> · {r.team_name}</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-[var(--up)]">{fmtUSD(r.total_volume_usd)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-dim)]">{r.tx_count.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-dim)]">{r.median_price_usd != null ? fmtUSD(r.median_price_usd) : "—"}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--text-dim)]">{r.max_price_usd != null ? fmtUSD(r.max_price_usd) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

export default async function VolumePage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const sp = await searchParams;
  const { window } = parseTimeWindow(sp.w);
  const label = WINDOW_SPECS[window].label;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-4">
      <div className="mb-3 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--text)]" data-testid="volume-h1">Volume</h1>
          <p className="text-[11px] text-[var(--text-faint)] mt-0.5">Trading volume by player over the {label} window — who&apos;s moving the market.</p>
        </div>
        <TimeWindowSelector />
      </div>
      <Suspense key={window} fallback={<div className="h-[600px] animate-pulse rounded-[14px] bg-[var(--surface-2)]" />}>
        <VolumeBody window={window} />
      </Suspense>
    </main>
  );
}
