import type { MarketplaceTransaction } from "@/lib/topshot/types";
import { formatUsd, formatNumber } from "@/lib/utils";

export function MarketStats({ txns }: { txns: MarketplaceTransaction[] }) {
  if (!txns || txns.length === 0) {
    return (
      <div className="border border-[var(--border)] rounded p-3 text-sm text-[var(--text-faint)]">
        No recent sales yet.
      </div>
    );
  }
  let totalVol = 0;
  let topSale: MarketplaceTransaction = txns[0];
  const buyerCounts = new Map<string, number>();
  const sellerCounts = new Map<string, number>();
  const playerCounts = new Map<string, { count: number; volume: number }>();
  for (const t of txns) {
    const p = Number(t.price ?? 0);
    if (isFinite(p)) totalVol += p;
    if (Number(topSale.price ?? 0) < p) topSale = t;
    if (t.buyer?.username) buyerCounts.set(t.buyer.username, (buyerCounts.get(t.buyer.username) ?? 0) + 1);
    if (t.seller?.username) sellerCounts.set(t.seller.username, (sellerCounts.get(t.seller.username) ?? 0) + 1);
    const pl = t.moment?.play?.stats?.playerName;
    if (pl) {
      const e = playerCounts.get(pl) ?? { count: 0, volume: 0 };
      e.count += 1;
      e.volume += p;
      playerCounts.set(pl, e);
    }
  }
  const topBuyer = [...buyerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topSeller = [...sellerCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const hottestPlayer = [...playerCounts.entries()].sort((a, b) => b[1].volume - a[1].volume)[0];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-[var(--border)] rounded overflow-hidden mb-4 text-[12px]">
      <Cell label={`Vol last ${txns.length} sales`} value={formatUsd(totalVol)} hint="sum of MarketplaceTransaction.price" />
      <Cell label="Sale count" value={formatNumber(txns.length)} hint="recent window" />
      <Cell
        label="Top single sale"
        value={formatUsd(Number(topSale.price ?? 0))}
        hint={`${topSale.moment?.play?.stats?.playerName ?? "—"} · #${topSale.moment?.flowSerialNumber ?? "—"}`}
      />
      <Cell
        label="Hot buyer"
        value={topBuyer ? `@${topBuyer[0]}` : "—"}
        hint={topBuyer ? `${topBuyer[1]} buys in window` : ""}
        link={topBuyer ? `/u/${encodeURIComponent(topBuyer[0])}` : undefined}
      />
      <Cell
        label="Hot player"
        value={hottestPlayer ? hottestPlayer[0] : "—"}
        hint={hottestPlayer ? `${hottestPlayer[1].count} sales · ${formatUsd(hottestPlayer[1].volume)} vol` : ""}
      />
    </div>
  );
}

function Cell({ label, value, hint, link }: { label: string; value: string; hint?: string; link?: string }) {
  const body = (
    <div className="bg-[var(--bg-card)] p-2.5 h-full hover:bg-[var(--bg-elev)] transition-colors">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-faint)]">{label}</div>
      <div className="text-base sm:text-lg font-semibold tnum mt-0.5 truncate">{value}</div>
      {hint && <div className="text-[10px] text-[var(--text-faint)] truncate mt-0.5">{hint}</div>}
    </div>
  );
  if (link) {
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    return <a href={link}>{body}</a>;
  }
  return body;
}
