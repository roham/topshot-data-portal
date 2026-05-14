import type { MarketplaceTransaction } from "@/lib/topshot/types";
import { formatUsd } from "@/lib/utils";

export function PriceHistogram({ txns, playerName }: { txns: MarketplaceTransaction[]; playerName: string }) {
  const prices = txns
    .filter((t) => t.moment?.play?.stats?.playerName === playerName)
    .map((t) => Number(t.price ?? 0))
    .filter((p) => isFinite(p) && p > 0);
  if (prices.length < 3) {
    return (
      <div className="text-sm text-[var(--text-faint)] px-4 py-3">
        Not enough sales in the recent window to render a histogram for {playerName}.
      </div>
    );
  }
  // Log-scale buckets
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const buckets = 10;
  const logMin = Math.log10(min);
  const logMax = Math.log10(Math.max(max, min * 1.01));
  const step = (logMax - logMin) / buckets;
  const counts = new Array(buckets).fill(0);
  const edges = new Array(buckets + 1).fill(0).map((_, i) => 10 ** (logMin + step * i));
  for (const p of prices) {
    const lp = Math.log10(p);
    const idx = Math.min(Math.floor((lp - logMin) / step), buckets - 1);
    counts[idx] += 1;
  }
  const maxCount = Math.max(...counts);
  return (
    <div className="p-3">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mb-2">
        {prices.length} sales · {formatUsd(min)} → {formatUsd(max)} · log-scale buckets
      </div>
      <div className="grid grid-cols-10 gap-px h-32 items-end">
        {counts.map((c, i) => {
          const h = maxCount > 0 ? (c / maxCount) * 100 : 0;
          return (
            <div key={i} className="flex flex-col items-center justify-end" title={`${formatUsd(edges[i])} – ${formatUsd(edges[i + 1])}: ${c}`}>
              <div
                className="w-full bg-[var(--accent)] rounded-t"
                style={{ height: `${h}%` }}
              />
              <div className="text-[8px] text-[var(--text-faint)] mt-0.5 tnum">{c}</div>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-10 gap-px mt-1">
        {edges.slice(0, -1).map((e, i) => (
          <div key={i} className="text-[8px] text-[var(--text-faint)] text-center tnum">{formatUsd(e)}</div>
        ))}
      </div>
    </div>
  );
}
