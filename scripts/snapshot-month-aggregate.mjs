// 30-day market aggregate. Runs every 24h via .github/workflows/snapshot-month-aggregate.yml.
// At ~35tx/h × 720h ≈ 25,200 transactions per run (~500 pages × 50).
//
// Heaviest cron. Defensive 2RPS rate-limit in chronologicalTxBackfill caps
// pagination throughput at ~120 pages/min = ~10min for 500 pages plus
// aggregation = comfortably inside a 15min workflow timeout.

import { chronologicalTxBackfill, aggregateMarketWindow, writeSnapshot, snapshotKeyNow } from "./_snapshot-helpers.mjs";

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const HARD_CAP = 50000;

const start = Date.now();
const txs = await chronologicalTxBackfill(WINDOW_MS, HARD_CAP);
const snap = aggregateMarketWindow(txs, WINDOW_MS, "30d");
const w = await writeSnapshot("month", snapshotKeyNow(), snap);
console.log(JSON.stringify({
  cadence: "month",
  txCount: txs.length,
  uniqueBuyers: snap.uniqueBuyers,
  uniqueSellers: snap.uniqueSellers,
  topBuyer: snap.topBuyers[0]?.username ?? null,
  topBuyerSpendCents: snap.topBuyers[0]?.spendCents ?? null,
  bytes: w.bytes,
  file: w.file,
  elapsedMs: Date.now() - start,
}));
