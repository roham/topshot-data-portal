import { recentSalesBulk } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";
import { formatUsd } from "@/lib/utils";

export const revalidate = 120;

export default async function AnomaliesPage() {
  const txns = await recentSalesBulk(300);
  const byPlayer = new Map<string, number[]>();
  for (const t of txns) {
    const p = t.moment?.play?.stats?.playerName;
    if (!p) continue;
    const price = Number(t.price ?? 0);
    if (!isFinite(price) || price <= 0) continue;
    const arr = byPlayer.get(p) ?? [];
    arr.push(price);
    byPlayer.set(p, arr);
  }
  const rows = [...byPlayer.entries()]
    .filter(([, prices]) => prices.length >= 4)
    .map(([player, prices]) => {
      const mean = prices.reduce((s, x) => s + x, 0) / prices.length;
      const sq = prices.reduce((s, x) => s + (x - mean) ** 2, 0);
      const sd = Math.sqrt(sq / prices.length);
      const cv = mean > 0 ? sd / mean : 0;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return { player, count: prices.length, mean, sd, cv, min, max };
    })
    .sort((a, b) => b.cv - a.cv)
    .slice(0, 20);

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4 pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl font-semibold tracking-tight">Anomalies</h1>
        <p className="text-[var(--text-dim)] text-sm">
          Competitive · Players with the highest price variance (coefficient of variation) in the {txns.length}-sale window.
          High CV = wide price dispersion = potential under/overpriced serials hiding in the same edition.
        </p>
      </header>
      <Card title="Top 20 by variance" subtitle="≥4 comps required · sorted by CV desc">
        <div className="divide-y divide-[var(--border)]">
          <div className="grid grid-cols-[minmax(0,1fr)_50px_70px_70px_70px_70px] gap-2 px-4 py-2 text-[10px] text-[var(--text-faint)] uppercase tracking-wider border-b border-[var(--border)]">
            <span>Player</span>
            <span className="text-right">Comps</span>
            <span className="text-right">Min</span>
            <span className="text-right">Mean</span>
            <span className="text-right">Max</span>
            <span className="text-right">CV</span>
          </div>
          {rows.map((r) => (
            <div key={r.player} className="grid grid-cols-[minmax(0,1fr)_50px_70px_70px_70px_70px] gap-2 px-4 py-1.5 text-sm">
              <span className="truncate">{r.player}</span>
              <span className="tnum text-right text-[var(--text-dim)]">{r.count}</span>
              <span className="tnum text-right text-[var(--text-faint)]">{formatUsd(r.min)}</span>
              <span className="tnum text-right">{formatUsd(r.mean)}</span>
              <span className="tnum text-right">{formatUsd(r.max)}</span>
              <span className="tnum text-right text-[var(--accent)] font-semibold">{(r.cv * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
