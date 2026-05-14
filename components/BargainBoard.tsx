import Link from "next/link";
import type { MarketplaceTransaction } from "@/lib/topshot/types";
import { formatUsd } from "@/lib/utils";
import { TierPill } from "./Tier";
import { MomentMedia } from "./MomentMedia";

// Bargain = sale price < 50% of tier median in window
export function BargainBoard({ txns, limit = 10 }: { txns: MarketplaceTransaction[]; limit?: number }) {
  const byTier = new Map<string, number[]>();
  for (const t of txns) {
    const tier = t.moment?.tier;
    const price = Number(t.price ?? 0);
    if (!tier || !isFinite(price) || price <= 0) continue;
    const arr = byTier.get(tier) ?? [];
    arr.push(price);
    byTier.set(tier, arr);
  }
  const median: Record<string, number> = {};
  for (const [t, arr] of byTier.entries()) {
    const sorted = [...arr].sort((a, b) => a - b);
    median[t] = sorted[Math.floor(sorted.length / 2)] ?? 0;
  }
  const bargains = txns
    .map((t) => {
      const tier = t.moment?.tier;
      const price = Number(t.price ?? 0);
      if (!tier || !median[tier] || price <= 0) return null;
      const ratio = price / median[tier];
      return { t, ratio, tierMedian: median[tier] };
    })
    .filter((x): x is { t: MarketplaceTransaction; ratio: number; tierMedian: number } => x !== null)
    .filter((x) => x.ratio < 0.5)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit);

  if (!bargains.length) return <div className="text-sm text-[var(--text-faint)] p-3">No sales below half-tier-median in window.</div>;

  return (
    <div className="divide-y divide-[var(--border)]">
      {bargains.map((r) => {
        const m = r.t.moment;
        return (
          <Link
            href={m?.flowId ? `/moment/${m.flowId}` : "#"}
            key={r.t.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-elev)]"
          >
            {m?.flowId ? (
              <MomentMedia flowId={m.flowId} type="hero" width={40} className="w-9 h-9 rounded object-cover bg-[var(--bg-elev)]" />
            ) : (
              <div className="w-9 h-9 rounded bg-[var(--bg-elev)]" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{m?.play?.stats?.playerName ?? "—"}</div>
              <div className="text-[10px] text-[var(--text-faint)] flex items-center gap-1">
                <TierPill tier={m?.tier} />
                <span className="tnum">#{m?.flowSerialNumber}/{m?.edition?.circulationCount}</span>
                <span className="ml-2">tier med {formatUsd(r.tierMedian)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="tnum text-sm font-semibold text-[var(--up)]">{formatUsd(Number(r.t.price))}</div>
              <div className="tnum text-[10px] text-[var(--up)]">{((1 - r.ratio) * 100).toFixed(0)}% off</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
