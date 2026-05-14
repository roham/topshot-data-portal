import Link from "next/link";
import type { MarketplaceTransaction } from "@/lib/topshot/types";
import { formatNumber, formatUsd } from "@/lib/utils";

// Surface the most-traded players + sets in a recent-sales window.
// Two views: top players by count, top sets by count.
export function TrendingNow({ txns }: { txns: MarketplaceTransaction[] }) {
  const players = new Map<string, { count: number; volume: number; id?: string }>();
  const sets = new Map<string, { count: number; volume: number }>();
  for (const t of txns) {
    const price = Number(t.price ?? 0);
    const p = t.moment?.play?.stats?.playerName;
    if (p) {
      const e = players.get(p) ?? { count: 0, volume: 0 };
      e.count += 1;
      e.volume += isFinite(price) ? price : 0;
      players.set(p, e);
    }
    const s = t.moment?.set?.flowName;
    if (s) {
      const e = sets.get(s) ?? { count: 0, volume: 0 };
      e.count += 1;
      e.volume += isFinite(price) ? price : 0;
      sets.set(s, e);
    }
  }
  const topPlayers = [...players.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  const topSets = [...sets.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  const maxP = topPlayers[0]?.[1].count ?? 1;
  const maxS = topSets[0]?.[1].count ?? 1;
  return (
    <div className="grid sm:grid-cols-2 divide-x divide-[var(--border)]">
      <div className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mb-2">Players · last {txns.length} sales</div>
        <div className="space-y-1.5">
          {topPlayers.map(([p, e]) => (
            <div key={p}>
              <div className="flex items-baseline gap-2 text-sm">
                <span className="flex-1 truncate">{p}</span>
                <span className="tnum text-xs text-[var(--text-dim)]">{e.count}</span>
                <span className="tnum text-xs text-[var(--text-faint)]">{formatUsd(e.volume)}</span>
              </div>
              <div className="h-1 bg-[var(--bg-elev)] mt-0.5 rounded">
                <div className="h-1 bg-[var(--accent)] rounded" style={{ width: `${(e.count / maxP) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-3">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)] mb-2">Sets · last {txns.length} sales</div>
        <div className="space-y-1.5">
          {topSets.map(([s, e]) => (
            <div key={s}>
              <div className="flex items-baseline gap-2 text-sm">
                <span className="flex-1 truncate">{s}</span>
                <span className="tnum text-xs text-[var(--text-dim)]">{e.count}</span>
                <span className="tnum text-xs text-[var(--text-faint)]">{formatUsd(e.volume)}</span>
              </div>
              <div className="h-1 bg-[var(--bg-elev)] mt-0.5 rounded">
                <div className="h-1 bg-[var(--rare)] rounded" style={{ width: `${(e.count / maxS) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
