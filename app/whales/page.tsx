import Link from "next/link";
import { recentSalesBulk } from "@/lib/topshot/queries";
import { Card } from "@/components/Card";
import { formatUsd, formatNumber } from "@/lib/utils";

export const revalidate = 60;

export default async function WhalesPage() {
  const txns = await recentSalesBulk(300);
  const buyers = new Map<string, { count: number; spent: number; avgPrice: number; flowAddress: string }>();
  const sellers = new Map<string, { count: number; received: number; avgPrice: number; flowAddress: string }>();
  for (const t of txns) {
    const price = Number(t.price ?? 0);
    if (!isFinite(price)) continue;
    if (t.buyer?.username) {
      const e = buyers.get(t.buyer.username) ?? { count: 0, spent: 0, avgPrice: 0, flowAddress: t.buyer.flowAddress };
      e.count += 1;
      e.spent += price;
      buyers.set(t.buyer.username, e);
    }
    if (t.seller?.username) {
      const e = sellers.get(t.seller.username) ?? { count: 0, received: 0, avgPrice: 0, flowAddress: t.seller.flowAddress };
      e.count += 1;
      e.received += price;
      sellers.set(t.seller.username, e);
    }
  }
  for (const e of buyers.values()) e.avgPrice = e.count > 0 ? e.spent / e.count : 0;
  for (const e of sellers.values()) e.avgPrice = e.count > 0 ? e.received / e.count : 0;
  const topBuyers = [...buyers.entries()].sort((a, b) => b[1].spent - a[1].spent).slice(0, 20);
  const topSellers = [...sellers.entries()].sort((a, b) => b[1].received - a[1].received).slice(0, 20);

  return (
    <div className="max-w-portal mx-auto px-3 sm:px-6 py-6">
      <header className="mb-4 pb-4 border-b border-[var(--border)]">
        <h1 className="text-2xl font-semibold tracking-tight">Whales</h1>
        <p className="text-[var(--text-dim)] text-sm">
          M4 · Biggest spenders and sellers in the recent {txns.length}-sale window, ranked by dollar volume.
        </p>
      </header>
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Top buyers" subtitle="ranked by $ spent in window">
          <Table rows={topBuyers} side="buyer" />
        </Card>
        <Card title="Top sellers" subtitle="ranked by $ received in window">
          <Table rows={topSellers} side="seller" />
        </Card>
      </div>
    </div>
  );
}

function Table({ rows, side }: { rows: Array<[string, { count: number; spent?: number; received?: number; avgPrice: number; flowAddress: string }]>; side: "buyer" | "seller" }) {
  const maxVol = rows[0]?.[1] ? (side === "buyer" ? (rows[0][1].spent ?? 0) : (rows[0][1].received ?? 0)) : 1;
  return (
    <div className="divide-y divide-[var(--border)]">
      <div className="grid grid-cols-[24px_minmax(0,1fr)_60px_70px_80px] gap-2 px-3 py-1.5 text-[10px] text-[var(--text-faint)] uppercase tracking-wider">
        <span>#</span>
        <span>{side === "buyer" ? "Buyer" : "Seller"}</span>
        <span className="text-right">Txns</span>
        <span className="text-right">Avg</span>
        <span className="text-right">Total</span>
      </div>
      {rows.map(([username, e], i) => {
        const vol = side === "buyer" ? (e.spent ?? 0) : (e.received ?? 0);
        const pct = (vol / (maxVol || 1)) * 100;
        return (
          <Link
            key={username}
            href={`/u/${encodeURIComponent(username)}`}
            className="block px-3 py-1.5 hover:bg-[var(--bg-elev)]"
          >
            <div className="grid grid-cols-[24px_minmax(0,1fr)_60px_70px_80px] gap-2 items-baseline text-sm">
              <span className="tnum text-xs text-[var(--text-faint)]">{i + 1}</span>
              <span className="truncate">{username}</span>
              <span className="tnum text-xs text-right text-[var(--text-dim)]">{e.count}</span>
              <span className="tnum text-xs text-right text-[var(--text-faint)]">{formatUsd(e.avgPrice)}</span>
              <span className="tnum text-right text-[var(--accent)] font-semibold">{formatUsd(vol)}</span>
            </div>
            <div className="h-0.5 bg-[var(--bg-elev)] mt-1 rounded">
              <div className="h-0.5 bg-[var(--accent)] rounded" style={{ width: `${pct}%` }} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
