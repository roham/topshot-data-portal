import Link from "next/link";
import { FEATURED_PLAYERS } from "@/lib/topshot/teams";
import { Card } from "@/components/Card";
import { recentSalesBulk } from "@/lib/topshot/queries";
import { formatUsd } from "@/lib/utils";

export const revalidate = 120;

export default async function PlayersIndex() {
  const txns = await recentSalesBulk(200);
  const stats = new Map<string, { count: number; volume: number }>();
  for (const t of txns) {
    const p = t.moment?.play?.stats?.playerName;
    if (!p) continue;
    const price = Number(t.price ?? 0);
    const e = stats.get(p) ?? { count: 0, volume: 0 };
    e.count += 1;
    e.volume += isFinite(price) ? price : 0;
    stats.set(p, e);
  }
  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Players</h1>
      <p className="text-[var(--text-dim)] text-sm mb-6">Featured player surfaces — recent mints, score ladder, and per-window sale stats.</p>
      <Card title="Featured" subtitle="window sales + volume joined from /movement-style 200-tx pull">
        <div className="divide-y divide-[var(--border)]">
          {FEATURED_PLAYERS.map((p) => {
            const s = stats.get(p.name);
            return (
              <Link key={p.id} href={`/player/${p.id}`} className="flex items-baseline gap-3 px-4 py-3 hover:bg-[var(--bg-elev)]">
                <span className="text-sm flex-1 truncate">{p.name}</span>
                <span className="tnum text-xs text-[var(--text-dim)] w-16 text-right">
                  {s ? `${s.count} sales` : "—"}
                </span>
                <span className="tnum text-xs text-[var(--accent)] w-20 text-right">
                  {s ? formatUsd(s.volume) : "—"}
                </span>
                <span className="text-xs font-mono text-[var(--text-faint)] w-16 text-right">id {p.id}</span>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
