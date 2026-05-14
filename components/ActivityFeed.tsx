import Link from "next/link";
import type { MarketplaceTransaction } from "@/lib/topshot/types";
import { formatUsd, shortAddr } from "@/lib/utils";
import { TierPill } from "./Tier";
import { MomentMedia } from "./MomentMedia";

export function ActivityFeed({ txns, dense = false }: { txns: MarketplaceTransaction[]; dense?: boolean }) {
  if (!txns?.length) {
    return <div className="text-sm text-[var(--text-faint)] py-4">No recent sales returned.</div>;
  }
  return (
    <div className="font-mono text-[12px]">
      {/* Header */}
      <div className="grid grid-cols-[44px_minmax(0,1fr)_70px_60px_minmax(0,1fr)_minmax(0,1fr)] gap-2 text-[10px] text-[var(--text-faint)] uppercase tracking-wider px-2 py-1 border-b border-[var(--border)]">
        <span></span>
        <span>Moment</span>
        <span className="text-right">Serial</span>
        <span className="text-right">Price</span>
        <span className="truncate">Buyer</span>
        <span className="truncate">Seller</span>
      </div>
      <div>
        {txns.map((t) => {
          const m = t.moment;
          const player = m?.play?.stats?.playerName ?? "—";
          const jersey = m?.play?.stats?.jerseyNumber;
          const serial = Number(m?.flowSerialNumber ?? 0);
          const jerseyMatch = jersey && Number(jersey) === serial;
          return (
            <Link
              href={m?.flowId ? `/moment/${m.flowId}` : "#"}
              key={t.id}
              className="grid grid-cols-[44px_minmax(0,1fr)_70px_60px_minmax(0,1fr)_minmax(0,1fr)] gap-2 px-2 py-1.5 bloomberg-row items-center hover:bg-[var(--bg-elev)] transition-colors"
            >
              {m?.flowId ? (
                <MomentMedia flowId={m.flowId} type="hero" width={40} className="rounded w-9 h-9 object-cover bg-[var(--bg-elev)]" />
              ) : (
                <div className="w-9 h-9 rounded bg-[var(--bg-elev)]" />
              )}
              <div className="truncate">
                <div className="text-[var(--text)] truncate font-medium">{player}</div>
                {!dense && (
                  <div className="text-[10px] text-[var(--text-faint)] truncate flex items-center gap-1">
                    <TierPill tier={m?.tier} />
                    <span>{m?.set?.flowName ?? "—"}</span>
                    {m?.edition?.parallelID && m.edition.parallelID > 0 ? (
                      <span className="text-[var(--accent)]">·P{m.edition.parallelID}</span>
                    ) : null}
                  </div>
                )}
              </div>
              <div className="tnum text-right">
                <span className={jerseyMatch ? "text-[var(--accent)] font-semibold" : ""}>#{serial}</span>
                {m?.edition?.circulationCount ? (
                  <span className="text-[var(--text-faint)]">/{m.edition.circulationCount}</span>
                ) : null}
              </div>
              <div className="tnum text-right text-[var(--text)] font-semibold">{formatUsd(Number(t.price))}</div>
              <div className="truncate text-[var(--text-dim)]">
                {t.buyer?.username ? (
                  <Link href={`/u/${encodeURIComponent(t.buyer.username)}`} className="hover:text-[var(--accent)]">
                    {t.buyer.username}
                  </Link>
                ) : (
                  <span>{shortAddr(t.buyer?.flowAddress)}</span>
                )}
              </div>
              <div className="truncate text-[var(--text-dim)]">
                {t.seller?.username ? (
                  <Link href={`/u/${encodeURIComponent(t.seller.username)}`} className="hover:text-[var(--accent)]">
                    {t.seller.username}
                  </Link>
                ) : (
                  <span>{shortAddr(t.seller?.flowAddress)}</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
