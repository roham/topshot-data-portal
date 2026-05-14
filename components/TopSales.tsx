import Link from "next/link";
import type { MarketplaceTransaction } from "@/lib/topshot/types";
import { formatUsd } from "@/lib/utils";
import { TierPill } from "./Tier";
import { MomentMedia } from "./MomentMedia";

export function TopSales({ txns, limit = 5 }: { txns: MarketplaceTransaction[]; limit?: number }) {
  const top = [...txns]
    .sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0))
    .slice(0, limit);
  if (!top.length) {
    return <div className="text-sm text-[var(--text-faint)] p-3">No sales in window.</div>;
  }
  return (
    <div className="divide-y divide-[var(--border)]">
      {top.map((t, i) => {
        const m = t.moment;
        const player = m?.play?.stats?.playerName ?? "—";
        return (
          <Link
            href={m?.flowId ? `/moment/${m.flowId}` : "#"}
            key={t.id}
            className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--bg-elev)]"
          >
            <div className="tnum text-xs text-[var(--text-faint)] w-4">{i + 1}</div>
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
                <span className="truncate ml-1">{m?.set?.flowName ?? ""}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tnum text-[var(--accent)]">{formatUsd(Number(t.price))}</div>
              <div className="text-[10px] text-[var(--text-faint)] truncate">
                {t.buyer?.username ? `@${t.buyer.username}` : "—"}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
