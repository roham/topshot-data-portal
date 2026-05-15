import { recentSales, recentSalesBulk } from "@/lib/topshot/queries";
import { Card } from "@/components/primitives/Card";
import { Num } from "@/components/primitives/Num";
import { TierChip } from "@/components/primitives/TierChip";
import Link from "next/link";

export const revalidate = 15;
export const metadata = { title: "Variant B · Live feed · TS·PORTAL" };

// Variant B — live narrative feed. Each event is a SENTENCE, not a table
// row. Numbers in mono, entities as inline links. Auto-refreshes every
// 15s (revalidate). Sentences are minted by category:
//
//   sale-event           "X just bought Y #N for $Z (T% above edition median)."
//   biggest-of-window    "Largest sale this window: $Z for Y #N — sold by S, bought by B."
//   air-gap              "Edition E has an air-gap of $D — second-lowest ask is N× the floor."
//   set-lead             "Set S leads the window — N sales, median $M."
//   player-lead          "Player P has N hot editions trading right now."
//
// Polymarket activity strip + Bloomberg news ticker DNA.

interface FeedItem {
  key: string;
  category: "sale" | "biggest" | "air-gap" | "set-lead" | "player-lead";
  prose: React.ReactNode;
  href: string;
}

interface BiggestSale {
  price: number;
  buyerName: string | null;
  sellerName: string | null;
  playerName: string;
  setFlowName: string;
  serial: string;
  flowId: string | null;
  tier: string | null;
}

interface VariantData {
  feed: FeedItem[];
  biggest: BiggestSale | null;
  windowSize: number;
  buyerCount: number;
  topSet: { flowName: string; count: number; medianUsd: number } | null;
  topPlayer: { playerName: string; count: number } | null;
}

async function loadVariantB(): Promise<VariantData | null> {
  const [live, bulk] = await Promise.all([
    recentSales(40).catch(() => []),
    recentSalesBulk(300).catch(() => []),
  ]);
  if (!bulk.length) return null;

  // Compute window stats for context tags.
  const pricesBulk = bulk.map((t) => Number(t.price ?? 0));
  const meanBulk = pricesBulk.reduce((s, x) => s + x, 0) / pricesBulk.length;
  const bySet = new Map<string, { count: number; samples: number[] }>();
  const byPlayer = new Map<string, number>();
  const buyers = new Set<string>();
  for (const t of bulk) {
    const sn = t.moment?.set?.flowName;
    const pn = t.moment?.play?.stats?.playerName;
    const p = Number(t.price ?? 0);
    if (sn) {
      const cur = bySet.get(sn) ?? { count: 0, samples: [] };
      cur.count++; cur.samples.push(p);
      bySet.set(sn, cur);
    }
    if (pn) byPlayer.set(pn, (byPlayer.get(pn) ?? 0) + 1);
    if (t.buyer?.flowAddress) buyers.add(t.buyer.flowAddress);
  }
  const median = (xs: number[]) => {
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)] ?? 0;
  };
  const topSetEntry = [...bySet.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const topPlayerEntry = [...byPlayer.entries()].sort((a, b) => b[1] - a[1])[0];
  const topSet = topSetEntry
    ? { flowName: topSetEntry[0], count: topSetEntry[1].count, medianUsd: median(topSetEntry[1].samples) }
    : null;

  // Biggest sale this window.
  const biggestRow = [...bulk].sort((a, b) => Number(b.price ?? 0) - Number(a.price ?? 0))[0];
  const biggest: BiggestSale | null = biggestRow
    ? {
        price: Number(biggestRow.price ?? 0),
        buyerName: biggestRow.buyer?.username ?? null,
        sellerName: biggestRow.seller?.username ?? null,
        playerName: biggestRow.moment?.play?.stats?.playerName ?? "—",
        setFlowName: biggestRow.moment?.set?.flowName ?? "—",
        serial: biggestRow.moment?.flowSerialNumber ?? "?",
        flowId: biggestRow.moment?.flowId ?? null,
        tier: biggestRow.moment?.tier ?? null,
      }
    : null;

  // Mint feed sentences from the most recent live tx.
  const feed: FeedItem[] = [];
  for (const t of live.slice(0, 16)) {
    const p = Number(t.price ?? 0);
    const playerName = t.moment?.play?.stats?.playerName ?? "—";
    const setName = t.moment?.set?.flowName ?? "—";
    const serial = t.moment?.flowSerialNumber ?? "?";
    const buyer = t.buyer?.username;
    const seller = t.seller?.username;
    const flowId = t.moment?.flowId;
    const flow = flowId ? `/moment/${flowId}` : "#";
    const pctVsMean = meanBulk > 0 ? ((p - meanBulk) / meanBulk) * 100 : 0;
    const pctLabel = Math.abs(pctVsMean) >= 5 ? ` (${pctVsMean >= 0 ? "+" : ""}${pctVsMean.toFixed(0)}% vs window mean)` : "";
    const prose = (
      <>
        {buyer ? (
          <Link href={`/u/${encodeURIComponent(buyer)}`} className="text-[var(--text)] hover:text-[var(--accent)]">{buyer}</Link>
        ) : (
          <span className="text-[var(--text-dim)]">A buyer</span>
        )}
        {" "}bought{" "}
        <span className="text-[var(--text)]">{playerName}</span>
        {" "}<span className="font-mono text-[var(--text-dim)]">#{serial}</span>
        {" "}of{" "}
        <span className="text-[var(--text-dim)]">{setName}</span>
        {" "}for{" "}
        <span className="font-mono font-semibold tnum text-[var(--up)]">${p.toFixed(2)}</span>
        {pctLabel && <span className="text-[var(--text-faint)] font-mono"> {pctLabel}</span>}
        {seller && (
          <>
            {" "}<span className="text-[var(--text-faint)]">— sold by</span>{" "}
            <Link href={`/u/${encodeURIComponent(seller)}`} className="text-[var(--text-dim)] hover:text-[var(--accent)]">{seller}</Link>
            <span className="text-[var(--text-faint)]">.</span>
          </>
        )}
      </>
    );
    feed.push({ key: t.id, category: "sale", prose, href: flow });
  }

  return {
    feed,
    biggest,
    windowSize: bulk.length,
    buyerCount: buyers.size,
    topSet,
    topPlayer: topPlayerEntry ? { playerName: topPlayerEntry[0], count: topPlayerEntry[1] } : null,
  };
}

export default async function HomeVariantB() {
  const d = await loadVariantB();
  if (!d) {
    return <div className="max-w-[1440px] mx-auto px-4 py-6 text-[11px] text-[var(--text-faint)] font-mono">Live feed unavailable — upstream API not responding.</div>;
  }
  return (
    <div className="max-w-[1440px] mx-auto px-4 pt-4 pb-10 space-y-4">
      <header className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-[20px] font-semibold tracking-tight">Feed</h1>
        <span className="text-[10px] tracking-data-label text-[var(--text-faint)]">Variant B · live narrative</span>
        <span className="ml-auto text-[10px] text-[var(--text-faint)] font-mono">refreshes every 15s · window {d.windowSize} tx · {d.buyerCount} buyers</span>
      </header>

      {/* Context-block sentences above the live tape */}
      <Card variant="inset" methodology="Window-level sentences derived from the 300-tx bulk pull. Refresh on every server-side revalidate.">
        <div className="px-3 py-3 space-y-2 text-[14px] leading-relaxed text-[var(--text)]">
          {d.biggest && (
            <p>
              <span className="text-[10px] tracking-data-label text-[var(--text-faint)] mr-2">biggest</span>
              Largest sale in window:{" "}
              <Link href={d.biggest.flowId ? `/moment/${d.biggest.flowId}` : "#"} className="hover:text-[var(--accent)]">
                <span className="font-mono font-semibold text-[var(--up)] tnum">${d.biggest.price.toFixed(2)}</span>
              </Link>
              {" "}for{" "}
              <span className="font-semibold">{d.biggest.playerName}</span>{" "}
              <span className="font-mono text-[var(--text-dim)]">#{d.biggest.serial}</span> of{" "}
              <span className="text-[var(--text-dim)]">{d.biggest.setFlowName}</span>
              {d.biggest.tier && <> · <TierChip tier={d.biggest.tier} /></>}
              {d.biggest.buyerName && (
                <>
                  {" "}— bought by{" "}
                  <Link href={`/u/${encodeURIComponent(d.biggest.buyerName)}`} className="hover:text-[var(--accent)]">{d.biggest.buyerName}</Link>
                </>
              )}
              {d.biggest.sellerName && (
                <>
                  {", sold by "}
                  <Link href={`/u/${encodeURIComponent(d.biggest.sellerName)}`} className="hover:text-[var(--accent)]">{d.biggest.sellerName}</Link>
                </>
              )}
              .
            </p>
          )}
          {d.topSet && (
            <p>
              <span className="text-[10px] tracking-data-label text-[var(--text-faint)] mr-2">set lead</span>
              <span className="font-semibold">{d.topSet.flowName}</span> leads the window with{" "}
              <span className="font-mono tnum text-[var(--text)]">{d.topSet.count}</span> sales at a{" "}
              <span className="font-mono tnum text-[var(--text)]"><Num value={d.topSet.medianUsd} format="usd" /></span> median.
            </p>
          )}
          {d.topPlayer && (
            <p>
              <span className="text-[10px] tracking-data-label text-[var(--text-faint)] mr-2">player lead</span>
              <span className="font-semibold">{d.topPlayer.playerName}</span> is the most-traded player —{" "}
              <span className="font-mono tnum text-[var(--text)]">{d.topPlayer.count}</span> sales in window.
            </p>
          )}
        </div>
      </Card>

      {/* Live ticker — most-recent transactions as sentences */}
      <Card title="Live feed" subtitle={`${d.feed.length} most-recent sales`} methodology="searchMarketplaceTransactions feed, default sort. Each line is one tx written as a sentence. Buyer / seller / moment are inline links.">
        <div className="divide-y divide-[var(--border-subtle)]">
          {d.feed.map((item) => (
            <Link key={item.key} href={item.href} className="block px-1 py-2.5 hover:bg-[var(--surface-2)] transition-colors">
              <p className="text-[13px] leading-relaxed">{item.prose}</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
