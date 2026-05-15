// 30-min market-wide aggregate. Run by .github/workflows/snapshot-market.yml.
import {
  chronologicalTxBackfill,
  writeSnapshot,
  snapshotKeyNow,
  median,
  mean,
} from "./_snapshot-helpers.mjs";

const WINDOW_MS = 30 * 60 * 1000;

const txs = await chronologicalTxBackfill(WINDOW_MS, 5000);
const pricesCents = txs.map((t) => Math.round(Number(t.price) * 100));
const buyers = new Set();
const sellers = new Set();
const byPlayer = new Map();
const bySet = new Map();
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

const snap = {
  ts: Date.now(),
  windowMs: WINDOW_MS,
  txCount: txs.length,
  uniqueBuyers: buyers.size,
  uniqueSellers: sellers.size,
  medianPriceCents: median(pricesCents),
  meanPriceCents: mean(pricesCents),
  topPlayersByVolume: Array.from(byPlayer.entries())
    .map(([playerName, prices]) => ({ playerName, count: prices.length, medianPriceCents: median(prices) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25),
  topSetsByVolume: Array.from(bySet.entries())
    .map(([setFlowName, prices]) => ({ setFlowName, count: prices.length, medianPriceCents: median(prices) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 25),
};

const w = await writeSnapshot("market", snapshotKeyNow(), snap);
console.log(JSON.stringify({ cadence: "market", txCount: txs.length, bytes: w.bytes, file: w.file }));
