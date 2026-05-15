// 7-day market aggregate. Runs every 12h via .github/workflows/snapshot-week-aggregate.yml.
// At ~35tx/h × 168h ≈ 5,880 transactions per run (~120 pages × 50).

import { chronologicalTxBackfill, aggregateMarketWindow, writeSnapshot, snapshotKeyNow } from "./_snapshot-helpers.mjs";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const HARD_CAP = 15000;

const start = Date.now();
const txs = await chronologicalTxBackfill(WINDOW_MS, HARD_CAP);
const snap = aggregateMarketWindow(txs, WINDOW_MS, "7d");
const w = await writeSnapshot("week", snapshotKeyNow(), snap);
console.log(JSON.stringify({
  cadence: "week",
  txCount: txs.length,
  uniqueBuyers: snap.uniqueBuyers,
  uniqueSellers: snap.uniqueSellers,
  topBuyer: snap.topBuyers[0]?.username ?? null,
  bytes: w.bytes,
  file: w.file,
  elapsedMs: Date.now() - start,
}));
