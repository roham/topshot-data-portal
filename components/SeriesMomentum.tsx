import type { MarketplaceTransaction } from "@/lib/topshot/types";
import { formatNumber, formatUsd } from "@/lib/utils";

// Group sales by parsed series number (extracted from set.flowName patterns
// where possible; otherwise bucketed via the lib/topshot/queries SetRow lookup
// in the parent). For the lightweight inline version we group by set flowName
// which contains the series implicitly. This is intentionally crude — M5
// momentum is an intra-window count signal, not a price signal.
export function SeriesMomentum({ txns }: { txns: MarketplaceTransaction[] }) {
  const bySetName = new Map<string, { count: number; volume: number }>();
  for (const t of txns) {
    const set = t.moment?.set?.flowName;
    if (!set) continue;
    const e = bySetName.get(set) ?? { count: 0, volume: 0 };
    e.count += 1;
    const p = Number(t.price ?? 0);
    if (isFinite(p)) e.volume += p;
    bySetName.set(set, e);
  }
  const rows = [...bySetName.entries()]
    .map(([set, e]) => ({ set, count: e.count, volume: e.volume, avg: e.count > 0 ? e.volume / e.count : 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  if (!rows.length) return <div className="p-4 text-sm text-[var(--text-faint)]">No set momentum in window.</div>;
  const max = rows[0].count;
  return (
    <div className="divide-y divide-[var(--border)]">
      {rows.map((r) => (
        <div key={r.set} className="px-4 py-2">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="flex-1 truncate font-medium">{r.set}</span>
            <span className="tnum text-xs text-[var(--text-dim)]">{r.count} sales</span>
            <span className="tnum text-xs text-[var(--text-faint)] w-16 text-right">avg {formatUsd(r.avg)}</span>
            <span className="tnum text-xs text-[var(--accent)] w-20 text-right">{formatUsd(r.volume)}</span>
          </div>
          <div className="h-1 bg-[var(--bg-elev)] mt-1 rounded">
            <div className="h-1 bg-[var(--rare)] rounded" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
