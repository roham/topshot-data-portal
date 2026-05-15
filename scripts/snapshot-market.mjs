// 30-min market-wide aggregate. Run by .github/workflows/snapshot-market.yml.
//
// V3 iter-9 round-2: replaced inline slim aggregator with shared
// aggregateMarketWindow so the 30m snapshot carries the same rich payload as
// the day cadence (largestSales, topBuyers, topSellers, medianByTier).
// Output schema matches MarketAggregateSnapshot (lib/snapshots/types.ts).

import { chronologicalTxBackfill, aggregateMarketWindow, writeSnapshot, snapshotKeyNow } from "./_snapshot-helpers.mjs";

const WINDOW_MS = 30 * 60 * 1000;
const HARD_CAP = 5000;

const start = Date.now();
const txs = await chronologicalTxBackfill(WINDOW_MS, HARD_CAP);
const snap = aggregateMarketWindow(txs, WINDOW_MS, "30m");
const w = await writeSnapshot("market", snapshotKeyNow(), snap);
console.log(JSON.stringify({
  cadence: "market",
  txCount: txs.length,
  uniqueBuyers: snap.uniqueBuyers,
  topBuyer: snap.topBuyers[0]?.username ?? null,
  bytes: w.bytes,
  file: w.file,
  elapsedMs: Date.now() - start,
}));
