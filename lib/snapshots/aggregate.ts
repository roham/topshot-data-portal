// V2 STAGE-3 — pure aggregation helpers that consume the public-api shapes
// and produce snapshot payloads. Kept separate from the cron route handlers
// so they're unit-testable.

import type { MarketplaceTransaction } from "@/lib/topshot/types";
import type { MarketAggregateSnapshot } from "./types";

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[Math.floor(mid)];
}

function mean(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

export function aggregateMarketWindow(
  txs: MarketplaceTransaction[],
  windowMs: number,
): MarketAggregateSnapshot {
  // Prices arrive as strings (per V1 types). Convert to cents (× 100, rounded)
  // for integer arithmetic.
  const pricesCents = txs.map((t) => Math.round(Number(t.price) * 100));
  const buyers = new Set<string>();
  const sellers = new Set<string>();
  const byPlayer = new Map<string, number[]>(); // playerName -> price cents
  const bySet = new Map<string, number[]>();    // setFlowName -> price cents
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    const cents = pricesCents[i];
    if (t.buyer?.flowAddress) buyers.add(t.buyer.flowAddress);
    if (t.seller?.flowAddress) sellers.add(t.seller.flowAddress);
    const playerName = t.moment?.play?.stats?.playerName;
    if (playerName) {
      const arr = byPlayer.get(playerName) ?? [];
      arr.push(cents);
      byPlayer.set(playerName, arr);
    }
    const setFlowName = t.moment?.set?.flowName;
    if (setFlowName) {
      const arr = bySet.get(setFlowName) ?? [];
      arr.push(cents);
      bySet.set(setFlowName, arr);
    }
  }
  const topPlayersByVolume = Array.from(byPlayer.entries())
    .map(([playerName, prices]) => ({ playerName, count: prices.length, medianPriceCents: median(prices) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);
  const topSetsByVolume = Array.from(bySet.entries())
    .map(([setFlowName, prices]) => ({ setFlowName, count: prices.length, medianPriceCents: median(prices) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);
  return {
    ts: Date.now(),
    windowMs,
    txCount: txs.length,
    uniqueBuyers: buyers.size,
    uniqueSellers: sellers.size,
    medianPriceCents: median(pricesCents),
    meanPriceCents: mean(pricesCents),
    topPlayersByVolume,
    topSetsByVolume,
  };
}
