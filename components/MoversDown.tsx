import Link from "next/link";
import type { MarketplaceTransaction } from "@/lib/topshot/types";
import { formatUsd } from "@/lib/utils";
import { TierPill } from "./Tier";
import { MomentMedia } from "./MomentMedia";

// Given a recent-sales window, find moments that sold significantly BELOW
// the per-player median in the same window. Surfaces relative drops without
// requiring per-moment price-history (which the public API doesn't expose).
export function MoversDown({ txns, limit = 10 }: { txns: MarketplaceTransaction[]; limit?: number }) {
  // Compute per-player median price in window.
  const buckets = new Map<string, number[]>();
  for (const t of txns) {
    const p = t.moment?.play?.stats?.playerName;
    if (!p) continue;
    const price = Number(t.price ?? 0);
    if (!isFinite(price) || price <= 0) continue;
    const arr = buckets.get(p) ?? [];
    arr.push(price);
    buckets.set(p, arr);
  }
  const median: Record<string, number> = {};
  for (const [p, arr] of buckets.entries()) {
    if (arr.length < 3) continue; // need ≥3 comps for a meaningful median
    const sorted = [...arr].sort((a, b) => a - b);
    median[p] = sorted[Math.floor(sorted.length / 2)];
  }
  const scored = txns
    .map((t) => {
      const p = t.moment?.play?.stats?.playerName;
      const price = Number(t.price ?? 0);
      if (!p || !median[p] || !isFinite(price)) return null;
      const med = median[p];
      const delta = price - med;
      const pct = (delta / med) * 100;
      return { t, delta, pct, med };
    })
    .filter((x): x is { t: MarketplaceTransaction; delta: number; pct: number; med: number } => x !== null)
    .filter((x) => x.delta < 0) // movers DOWN
    .sort((a, b) => a.pct - b.pct) // most negative first
    .slice(0, limit);

  if (!scored.length) return <div className="text-sm text-[var(--text-faint)] p-3">No clear movers down in the window — need ≥3 comps per player.</div>;
  return (
    <div className="divide-y divide-[var(--border)]">
      {scored.map((r) => {
        const m = r.t.moment;
        const player = m?.play?.stats?.playerName ?? "—";
        return (
          <Link
            href={m?.flowId ? `/moment/${m.flowId}` : "#"}
            key={r.t.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-elev)]"
          >
            {m?.flowId ? (
              <MomentMedia flowId={m.flowId} type="hero" width={48} className="w-10 h-10 rounded object-cover bg-[var(--bg-elev)]" />
            ) : (
              <div className="w-10 h-10 rounded bg-[var(--bg-elev)]" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{player}</div>
              <div className="text-[10px] text-[var(--text-faint)] flex items-center gap-1 mt-0.5">
                <TierPill tier={m?.tier} />
                <span className="tnum">#{m?.flowSerialNumber}/{m?.edition?.circulationCount ?? "?"}</span>
                <span className="truncate ml-1">vs median {formatUsd(r.med)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="tnum text-sm font-semibold text-[var(--down)]">{formatUsd(Number(r.t.price))}</div>
              <div className="tnum text-[10px] text-[var(--down)]">{r.pct.toFixed(0)}%</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
