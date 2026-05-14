import { recentSalesBulk } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";
import { formatUsd, formatNumber, tierLabel } from "@/lib/utils";

export const revalidate = 120;

export default async function TrendsPage() {
  const txns = await recentSalesBulk(200);
  // T2 — tier breakdown
  const byTier = new Map<string, { count: number; volume: number; prices: number[] }>();
  // T3 — series breakdown
  const bySeries = new Map<number, { count: number; volume: number; prices: number[] }>();
  // T1 — per-player aggregate (also on /movement but rendered with deltas here)
  const byPlayer = new Map<string, { count: number; volume: number; prices: number[] }>();
  // Date histogram by hour of day for time-of-day signal
  const byHour = new Map<number, number>();

  for (const t of txns) {
    const price = Number(t.price ?? 0);
    if (!isFinite(price) || price < 0) continue;
    const tier = t.moment?.tier ?? "MOMENT_TIER_COMMON";
    {
      const e = byTier.get(tier) ?? { count: 0, volume: 0, prices: [] };
      e.count += 1;
      e.volume += price;
      e.prices.push(price);
      byTier.set(tier, e);
    }
    const sr = t.moment?.set?.flowName?.match(/^(.+)$/) ? Number((t.moment?.flowSerialNumber ?? 0)) : 0;
    void sr; // series not in transaction-level moment; derive via moment.set lookup if needed
    const player = t.moment?.play?.stats?.playerName;
    if (player) {
      const e = byPlayer.get(player) ?? { count: 0, volume: 0, prices: [] };
      e.count += 1;
      e.volume += price;
      e.prices.push(price);
      byPlayer.set(player, e);
    }
  }
  // Approximate per-series via set.flowSeriesNumber on each moment when the
  // marketplace tx exposes it (it doesn't natively — set sub-object is limited
  // to flowName/flowId). Derive series via the set-flowName prefix when known,
  // otherwise bucket under "unknown".

  function rowsOf(map: Map<string, { count: number; volume: number; prices: number[] }>) {
    return [...map.entries()]
      .map(([k, e]) => {
        const sorted = [...e.prices].sort((a, b) => a - b);
        return {
          key: k,
          count: e.count,
          volume: e.volume,
          median: sorted[Math.floor(sorted.length / 2)] ?? 0,
          mean: e.volume / e.count,
        };
      })
      .sort((a, b) => b.volume - a.volume);
  }

  const tierRows = rowsOf(byTier);
  const playerRows = rowsOf(byPlayer).slice(0, 15);
  const tierMax = tierRows[0]?.volume ?? 1;
  const playerMax = playerRows[0]?.volume ?? 1;

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4 pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
        <p className="text-[var(--text-dim)] text-sm">
          T1 / T2 · {txns.length}-sale window broken down by player and by tier — volume, count, median sale.
        </p>
        <p className="text-[10px] text-[var(--text-faint)] mt-2">
          Data ceiling honesty: <code className="font-mono text-[var(--accent)]">searchMarketplaceTransactions</code> has no
          <code className="font-mono text-[var(--accent)]"> byPlayers</code> filter and no
          <code className="font-mono text-[var(--accent)]"> dateFrom/dateTo</code>; T3/T4/T5 cross-date
          trends would require sampling the recent feed at intervals and reconciling. T5 floor compression
          requires per-edition floor history which the public API does not expose.
        </p>
      </header>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="By tier" subtitle="T2 · volume / count / median in window">
          <div className="divide-y divide-[var(--border)]">
            {tierRows.map((r) => (
              <div key={r.key} className="px-4 py-2">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="flex-1 font-medium">{tierLabel(r.key)}</span>
                  <span className="tnum text-xs text-[var(--text-dim)]">{r.count}</span>
                  <span className="tnum text-xs text-[var(--text-faint)] w-16 text-right">med {formatUsd(r.median)}</span>
                  <span className="tnum text-xs text-[var(--accent)] w-20 text-right">{formatUsd(r.volume)}</span>
                </div>
                <div className="h-1 bg-[var(--bg-elev)] mt-1 rounded">
                  <div className="h-1 bg-[var(--accent)] rounded" style={{ width: `${(r.volume / tierMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="By player" subtitle="T1 · volume / count / median in window">
          <div className="divide-y divide-[var(--border)]">
            {playerRows.map((r) => (
              <div key={r.key} className="px-4 py-2">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="flex-1 truncate font-medium">{r.key}</span>
                  <span className="tnum text-xs text-[var(--text-dim)]">{r.count}</span>
                  <span className="tnum text-xs text-[var(--text-faint)] w-16 text-right">med {formatUsd(r.median)}</span>
                  <span className="tnum text-xs text-[var(--accent)] w-20 text-right">{formatUsd(r.volume)}</span>
                </div>
                <div className="h-1 bg-[var(--bg-elev)] mt-1 rounded">
                  <div className="h-1 bg-[var(--rare)] rounded" style={{ width: `${(r.volume / playerMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
