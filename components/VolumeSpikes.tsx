import Link from "next/link";
import type { MarketplaceTransaction } from "@/lib/topshot/types";
import { formatUsd, formatNumber } from "@/lib/utils";

export function VolumeSpikes({ txns }: { txns: MarketplaceTransaction[] }) {
  // Group sales by player, compute count + sum volume + median price.
  const byPlayer = new Map<
    string,
    { count: number; volume: number; prices: number[]; lastSale: MarketplaceTransaction | null }
  >();
  for (const t of txns) {
    const p = t.moment?.play?.stats?.playerName;
    if (!p) continue;
    const price = Number(t.price ?? 0);
    if (!isFinite(price)) continue;
    const e = byPlayer.get(p) ?? { count: 0, volume: 0, prices: [], lastSale: null };
    e.count += 1;
    e.volume += price;
    e.prices.push(price);
    if (!e.lastSale) e.lastSale = t;
    byPlayer.set(p, e);
  }
  const rows = [...byPlayer.entries()]
    .map(([player, e]) => {
      const sorted = [...e.prices].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      return { player, count: e.count, volume: e.volume, median, last: e.lastSale };
    })
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 10);
  const maxVol = rows[0]?.volume ?? 1;
  if (rows.length === 0) return <div className="text-sm text-[var(--text-faint)] p-3">No volume signal in window.</div>;
  return (
    <div className="divide-y divide-[var(--border)]">
      {rows.map((r) => {
        const pct = (r.volume / maxVol) * 100;
        return (
          <div key={r.player} className="px-4 py-2">
            <div className="flex items-baseline gap-2 text-sm">
              <span className="flex-1 truncate font-medium">{r.player}</span>
              <span className="tnum text-xs text-[var(--text-dim)]">{r.count} sales</span>
              <span className="tnum text-xs text-[var(--text-faint)] w-14 text-right">med {formatUsd(r.median)}</span>
              <span className="tnum text-sm text-[var(--accent)] w-20 text-right">{formatUsd(r.volume)}</span>
            </div>
            <div className="h-1 bg-[var(--bg-elev)] mt-1 rounded">
              <div className="h-1 bg-[var(--accent)] rounded" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
