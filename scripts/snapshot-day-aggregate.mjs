// 24h-window market aggregate. Runs every 2h via .github/workflows/snapshot-day-aggregate.yml.
// At the current ~35tx/h marketplace rate this is ~840 transactions per run (~17 pages × 50).
//
// Output schema matches MarketAggregateSnapshot (lib/snapshots/types.ts), with
// the new topBuyers / topSellers / largestSales fields added by aggregateMarketWindow.
// The day cadence is the canonical source for the homepage 24h window.

import { chronologicalTxBackfill, aggregateMarketWindow, writeSnapshot, snapshotKeyNow } from "./_snapshot-helpers.mjs";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const HARD_CAP = 5000;

const start = Date.now();
const txs = await chronologicalTxBackfill(WINDOW_MS, HARD_CAP);
const snap = aggregateMarketWindow(txs, WINDOW_MS, "24h");
const w = await writeSnapshot("day", snapshotKeyNow(), snap);
console.log(JSON.stringify({
  cadence: "day",
  txCount: txs.length,
  uniqueBuyers: snap.uniqueBuyers,
  uniqueSellers: snap.uniqueSellers,
  topBuyer: snap.topBuyers[0]?.username ?? null,
  bytes: w.bytes,
  file: w.file,
  elapsedMs: Date.now() - start,
}));
