import Link from "next/link";
import type { MarketplaceTransaction } from "@/lib/topshot/types";
import { formatUsd, formatNumber, mediaUrl } from "@/lib/utils";

export interface Spotlight {
  username: string;
  flowAddress: string;
  txCount: number;
  spent: number;
  recentBuys: MarketplaceTransaction[];
  profileImageUrl?: string;
}

export function buildSpotlight(txns: MarketplaceTransaction[], profileImageUrl?: string): Spotlight | null {
  const byBuyer = new Map<string, { username: string; flowAddress: string; count: number; spent: number; buys: MarketplaceTransaction[] }>();
  for (const t of txns) {
    const u = t.buyer?.username;
    if (!u) continue;
    const e = byBuyer.get(u) ?? { username: u, flowAddress: t.buyer!.flowAddress, count: 0, spent: 0, buys: [] };
    e.count += 1;
    e.spent += Number(t.price ?? 0);
    e.buys.push(t);
    byBuyer.set(u, e);
  }
  if (!byBuyer.size) return null;
  const top = [...byBuyer.values()].sort((a, b) => b.spent - a.spent)[0];
  return {
    username: top.username,
    flowAddress: top.flowAddress,
    txCount: top.count,
    spent: top.spent,
    recentBuys: top.buys.slice(0, 4),
    profileImageUrl,
  };
}

export function SpotlightCollector({ spotlight }: { spotlight: Spotlight | null }) {
  if (!spotlight) return null;
  return (
    <div className="border border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent)]/8 to-transparent rounded p-3 mb-4 flex flex-col sm:flex-row gap-4 items-start">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {spotlight.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={spotlight.profileImageUrl} alt={spotlight.username} className="w-12 h-12 rounded-full ring-1 ring-[var(--accent)]" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[var(--bg-elev)] flex items-center justify-center text-2xl text-[var(--accent)] font-mono">
            {spotlight.username.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-[var(--accent)]">D5 · Collector spotlight · window</div>
          <Link
            href={`/u/${encodeURIComponent(spotlight.username)}`}
            className="text-lg font-semibold tracking-tight hover:text-[var(--accent)] truncate block"
          >
            @{spotlight.username}
          </Link>
          <div className="text-xs text-[var(--text-dim)] tnum">
            {spotlight.txCount} buys · {formatUsd(spotlight.spent)} spent in window
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {spotlight.recentBuys.map((t) =>
          t.moment?.flowId ? (
            <Link
              key={t.id}
              href={`/moment/${t.moment.flowId}`}
              className="block w-12 h-12 rounded overflow-hidden ring-1 ring-[var(--border)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaUrl(t.moment.flowId, "hero", { width: 96 })}
                alt={t.moment.play?.stats?.playerName ?? ""}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </Link>
          ) : null
        )}
      </div>
    </div>
  );
}
