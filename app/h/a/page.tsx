import { recentSales, recentSalesBulk, biggestSalesAllTime } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { KPI } from "@/components/primitives/KPI";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import Link from "next/link";

export const revalidate = 30;
export const metadata = { title: "Variant A · Market state · TS·PORTAL" };

interface VariantData {
  windowSize: number;
  txCount: number;
  uniqueBuyers: number;
  uniqueSellers: number;
  medianUsd: number;
  meanUsd: number;
  biggestSale: { price: number; playerName: string; setFlowName: string; serial: string; flowId: string | null; tier: string | null } | null;
  hotEditionCount: number;
  topSet: { flowName: string; count: number; medianUsd: number } | null;
  topPlayer: { playerName: string; count: number; medianUsd: number } | null;
  biggestSinglesAllTime: Array<{ price: number; playerName: string; setFlowName: string; serial: string; flowId: string | null }>;
  topBuyers: Array<{ username: string; spend: number; count: number }>;
  topSellers: Array<{ username: string; spend: number; count: number }>;
}

async function loadVariantA(): Promise<VariantData | null> {
  const [bulk, biggest] = await Promise.all([
    recentSalesBulk(400).catch(() => []),
    biggestSalesAllTime(8).catch(() => []),
  ]);
  if (!bulk.length) return null;
  const buyers = new Set<string>();
  const sellers = new Set<string>();
  const prices: number[] = [];
  const bySet = new Map<string, { count: number; samples: number[] }>();
  const byPlayer = new Map<string, { count: number; samples: number[] }>();
  const bySetEdition = new Set<string>();
  const buyerSpend = new Map<string, { spend: number; count: number }>();
  const sellerSpend = new Map<string, { spend: number; count: number }>();
  for (const t of bulk) {
    const p = Number(t.price ?? 0);
    prices.push(p);
    if (t.buyer?.flowAddress) buyers.add(t.buyer.flowAddress);
    if (t.seller?.flowAddress) sellers.add(t.seller.flowAddress);
    const setFlowName = t.moment?.set?.flowName;
    const playerName = t.moment?.play?.stats?.playerName;
    if (setFlowName) {
      const cur = bySet.get(setFlowName) ?? { count: 0, samples: [] };
      cur.count++; cur.samples.push(p);
      bySet.set(setFlowName, cur);
      if (playerName) bySetEdition.add(`${setFlowName}|${playerName}`);
    }
    if (playerName) {
      const cur = byPlayer.get(playerName) ?? { count: 0, samples: [] };
      cur.count++; cur.samples.push(p);
      byPlayer.set(playerName, cur);
    }
    if (t.buyer?.username) {
      const cur = buyerSpend.get(t.buyer.username) ?? { spend: 0, count: 0 };
      cur.spend += p; cur.count++;
      buyerSpend.set(t.buyer.username, cur);
    }
    if (t.seller?.username) {
      const cur = sellerSpend.get(t.seller.username) ?? { spend: 0, count: 0 };
      cur.spend += p; cur.count++;
      sellerSpend.set(t.seller.username, cur);
    }
  }
  prices.sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)] ?? 0;
  const mean = prices.reduce((s, x) => s + x, 0) / Math.max(1, prices.length);
  const biggestInWindow = [...bulk].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0))[0];
  const topSetEntry = [...bySet.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const topPlayerEntry = [...byPlayer.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const median2 = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  return {
    windowSize: bulk.length,
    txCount: bulk.length,
    uniqueBuyers: buyers.size,
    uniqueSellers: sellers.size,
    medianUsd: median,
    meanUsd: mean,
    biggestSale: biggestInWindow
      ? {
          price: Number(biggestInWindow.price ?? 0),
          playerName: biggestInWindow.moment?.play?.stats?.playerName ?? "—",
          setFlowName: biggestInWindow.moment?.set?.flowName ?? "—",
          serial: biggestInWindow.moment?.flowSerialNumber ?? "?",
          flowId: biggestInWindow.moment?.flowId ?? null,
          tier: biggestInWindow.moment?.tier ?? null,
        }
      : null,
    hotEditionCount: bySetEdition.size,
    topSet: topSetEntry
      ? { flowName: topSetEntry[0], count: topSetEntry[1].count, medianUsd: median2(topSetEntry[1].samples) }
      : null,
    topPlayer: topPlayerEntry
      ? { playerName: topPlayerEntry[0], count: topPlayerEntry[1].count, medianUsd: median2(topPlayerEntry[1].samples) }
      : null,
    biggestSinglesAllTime: biggest.slice(0, 5).map((t) => ({
      price: Number(t.price ?? 0),
      playerName: t.moment?.play?.stats?.playerName ?? "—",
      setFlowName: t.moment?.set?.flowName ?? "—",
      serial: t.moment?.flowSerialNumber ?? "?",
      flowId: t.moment?.flowId ?? null,
    })),
    topBuyers: [...buyerSpend.entries()]
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 5)
      .map(([username, v]) => ({ username, spend: v.spend, count: v.count })),
    topSellers: [...sellerSpend.entries()]
      .sort((a, b) => b[1].spend - a[1].spend)
      .slice(0, 5)
      .map(([username, v]) => ({ username, spend: v.spend, count: v.count })),
  };
}

export default async function HomeVariantA() {
  const d = await loadVariantA();
  if (!d) {
    return <div className="max-w-[1440px] mx-auto px-4 py-6 text-[11px] text-[var(--text-faint)] font-mono">Upstream Top Shot API unreachable.</div>;
  }
  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Market state</h1>
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">Variant A · KPI strip</span>
        <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">window · {d.windowSize} tx</span>
      </header>

      {/* Headline KPI strip — biggest 5 numbers above the fold */}
      <Card variant="inset">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
          <div className="p-4">
            <KPI label="Window volume" value={d.txCount * d.meanUsd} format="usdCompact" size="xl" hint={`${d.txCount} sales`} />
          </div>
          <div className="p-4">
            <KPI label="Window sales" value={d.txCount} format="int" size="xl" />
          </div>
          <div className="p-4">
            <KPI label="Unique buyers" value={d.uniqueBuyers} format="int" size="xl" hint={`${d.uniqueSellers} sellers`} />
          </div>
          <div className="p-4">
            <KPI label="Median sale" value={d.medianUsd} format="usd" size="xl" hint={`mean ${`$${d.meanUsd.toFixed(2)}`}`} />
          </div>
          <div className="p-4">
            <KPI label="Hot editions" value={d.hotEditionCount} format="int" size="xl" hint="traded ≥1× in window" />
          </div>
        </div>
      </Card>

      {/* Biggest single sale — magazine-cover slot */}
      {d.biggestSale && (
        <Card title="Biggest sale in window" subtitle="window window — single transaction" methodology="Maximum-price row from the 400-tx bulk pull.">
          <Link href={d.biggestSale.flowId ? `/moment/${d.biggestSale.flowId}` : "#"} className="block py-1 hover:bg-[var(--surface-2)]">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-[28px] font-semibold tnum text-[var(--up)]">
                <Num value={d.biggestSale.price} format="usd" />
              </span>
              <span className="text-[14px] text-[var(--text)]">{d.biggestSale.playerName}</span>
              <span className="text-[12px] text-[var(--text-dim)]">#{d.biggestSale.serial} of {d.biggestSale.setFlowName}</span>
              <TierChip tier={d.biggestSale.tier} />
            </div>
          </Link>
        </Card>
      )}

      {/* Top set + top player side-by-side */}
      <div className="grid md:grid-cols-2 gap-3">
        {d.topSet && (
          <Card title="Top set · window" subtitle={`${d.topSet.count} sales`} methodology="Grouped by set.flowName from the 400-tx bulk pull. Median is anti-skew.">
            <div className="p-1 flex items-baseline gap-3">
              <span className="text-[18px] font-semibold text-[var(--text)]">{d.topSet.flowName}</span>
              <span className="ml-auto text-[14px] tnum"><Num value={d.topSet.medianUsd} format="usd" /></span>
              <span className="text-[10px] text-[var(--text-faint)] tracking-data-label">median</span>
            </div>
          </Card>
        )}
        {d.topPlayer && (
          <Card title="Top player · window" subtitle={`${d.topPlayer.count} sales`} methodology="Grouped by play.stats.playerName from the same window.">
            <div className="p-1 flex items-baseline gap-3">
              <span className="text-[18px] font-semibold text-[var(--text)]">{d.topPlayer.playerName}</span>
              <span className="ml-auto text-[14px] tnum"><Num value={d.topPlayer.medianUsd} format="usd" /></span>
              <span className="text-[10px] text-[var(--text-faint)] tracking-data-label">median</span>
            </div>
          </Card>
        )}
      </div>

      {/* Top buyers / sellers / biggest singles — three lists */}
      <div className="grid md:grid-cols-3 gap-3">
        <Card title="Top buyers · window" subtitle={`${d.topBuyers.length} collectors`} methodology="Sum of price column grouped by buyer.username from the window.">
          <div className="divide-y divide-[var(--border-subtle)]">
            {d.topBuyers.map((b) => (
              <Link key={b.username} href={`/u/${encodeURIComponent(b.username)}`} className="py-1.5 px-1 grid grid-cols-[1fr_auto_auto] items-baseline gap-3 hover:bg-[var(--surface-2)]">
                <span className="text-[12px] text-[var(--text)] truncate">{b.username}</span>
                <span className="text-[10px] text-[var(--text-faint)] tnum">{b.count} buys</span>
                <span className="text-[12px] tnum"><Num value={b.spend} format="usdCompact" /></span>
              </Link>
            ))}
          </div>
        </Card>
        <Card title="Top sellers · window" subtitle={`${d.topSellers.length} collectors`} methodology="Same as buyers, grouped by seller.username.">
          <div className="divide-y divide-[var(--border-subtle)]">
            {d.topSellers.map((s) => (
              <Link key={s.username} href={`/u/${encodeURIComponent(s.username)}`} className="py-1.5 px-1 grid grid-cols-[1fr_auto_auto] items-baseline gap-3 hover:bg-[var(--surface-2)]">
                <span className="text-[12px] text-[var(--text)] truncate">{s.username}</span>
                <span className="text-[10px] text-[var(--text-faint)] tnum">{s.count} sells</span>
                <span className="text-[12px] tnum"><Num value={s.spend} format="usdCompact" /></span>
              </Link>
            ))}
          </div>
        </Card>
        <Card title="All-time biggest sales" subtitle="leaderboard · top 5" methodology="biggestSalesAllTime(PRICE_DESC, limit=5) — server-side rank.">
          <div className="divide-y divide-[var(--border-subtle)]">
            {d.biggestSinglesAllTime.map((s, i) => (
              <Link key={i} href={s.flowId ? `/moment/${s.flowId}` : "#"} className="py-1.5 px-1 grid grid-cols-[auto_1fr_auto] items-baseline gap-3 hover:bg-[var(--surface-2)]">
                <span className="text-[10px] text-[var(--text-faint)] tnum">#{i + 1}</span>
                <span className="text-[12px] text-[var(--text)] truncate">{s.playerName} #{s.serial}</span>
                <span className="text-[12px] tnum text-[var(--up)]"><Num value={s.price} format="usdCompact" /></span>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
