import { recentSalesBulk, allSets } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";
import { formatUsd, formatNumber, tierLabel } from "@/lib/utils";

export const revalidate = 120;

export default async function TrendsPage() {
  const [txns, setsCatalog] = await Promise.all([recentSalesBulk(200), allSets(300)]);
  const seriesBySetName = new Map<string, number>();
  for (const s of setsCatalog) {
    if (s.flowSeriesNumber != null) seriesBySetName.set(s.flowName, s.flowSeriesNumber);
  }
  // T2 — tier breakdown
  const byTier = new Map<string, { count: number; volume: number; prices: number[] }>();
  // T3 — series breakdown (joined via setName→series cache)
  const bySeries = new Map<number, { count: number; volume: number; prices: number[]; setNames: Set<string> }>();
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
    const setName = t.moment?.set?.flowName;
    const series = setName ? seriesBySetName.get(setName) : undefined;
    if (series != null) {
      const e = bySeries.get(series) ?? { count: 0, volume: 0, prices: [], setNames: new Set<string>() };
      e.count += 1;
      e.volume += price;
      e.prices.push(price);
      if (setName) e.setNames.add(setName);
      bySeries.set(series, e);
    }
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
  // T-cross — tier × series matrix
  const cross = new Map<string, number>(); // key: tier|series
  const tierKeys = new Set<string>();
  const seriesKeys = new Set<number>();
  for (const t of txns) {
    const tier = t.moment?.tier;
    const set = t.moment?.set?.flowName;
    const sr = set ? seriesBySetName.get(set) : undefined;
    if (!tier || sr == null) continue;
    tierKeys.add(tier);
    seriesKeys.add(sr);
    const k = `${tier}|${sr}`;
    cross.set(k, (cross.get(k) ?? 0) + 1);
  }
  const tierList = [...tierKeys].sort();
  const seriesList = [...seriesKeys].sort((a, b) => b - a);

  const seriesRows = [...bySeries.entries()]
    .map(([sr, e]) => {
      const sorted = [...e.prices].sort((a, b) => a - b);
      return {
        series: sr,
        count: e.count,
        volume: e.volume,
        median: sorted[Math.floor(sorted.length / 2)] ?? 0,
        sets: e.setNames.size,
      };
    })
    .sort((a, b) => b.series - a.series);
  const seriesMax = Math.max(...seriesRows.map((r) => r.volume), 1);

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
      <div className="mb-4">
        <Card title="Tier × series matrix" subtitle="sale count cross-tab from window">
          <div className="overflow-x-auto">
            <table className="text-[12px] font-mono w-full">
              <thead>
                <tr className="text-[var(--text-faint)]">
                  <th className="px-3 py-1 text-left">tier ↓ / series →</th>
                  {seriesList.map((s) => <th key={s} className="px-3 py-1 text-right tnum">S{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {tierList.map((t) => (
                  <tr key={t} className="border-t border-[var(--border)]">
                    <td className="px-3 py-1">{tierLabel(t)}</td>
                    {seriesList.map((s) => {
                      const v = cross.get(`${t}|${s}`) ?? 0;
                      return <td key={s} className={`px-3 py-1 text-right tnum ${v > 0 ? "text-[var(--text)]" : "text-[var(--text-faint)]"}`}>{v || "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <Card title="By series" subtitle="T3 · across all sets in series">
          <div className="divide-y divide-[var(--border)]">
            {seriesRows.map((r) => (
              <div key={r.series} className="px-4 py-2">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="flex-1 font-medium">Series {r.series}</span>
                  <span className="tnum text-xs text-[var(--text-dim)]">{r.count}</span>
                  <span className="tnum text-xs text-[var(--text-faint)] w-14 text-right">{r.sets} sets</span>
                  <span className="tnum text-xs text-[var(--accent)] w-20 text-right">{formatUsd(r.volume)}</span>
                </div>
                <div className="h-1 bg-[var(--bg-elev)] mt-1 rounded">
                  <div className="h-1 bg-[var(--legendary)] rounded" style={{ width: `${(r.volume / seriesMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
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
