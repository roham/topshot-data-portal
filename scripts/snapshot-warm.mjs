// 1-hour warm-sets snapshot. Sets at ranks 30..200 in the broader tx feed.
import { recentSalesBulk, writeSnapshot, snapshotKeyNow, median } from "./_snapshot-helpers.mjs";

const txs = await recentSalesBulk(500);
const bySet = new Map();
for (const t of txs) {
  const flowName = t.moment?.set?.flowName ?? "(unknown)";
  const cents = Math.round(Number(t.price) * 100);
  const cur = bySet.get(flowName) ?? { count: 0, samples: [] };
  cur.count++;
  cur.samples.push(cents);
  bySet.set(flowName, cur);
}

const sets = Array.from(bySet.entries())
  .map(([flowName, agg]) => ({ flowName, count: agg.count, medianCents: median(agg.samples) }))
  .sort((a, b) => b.count - a.count);

const warm = sets.slice(30, 200);
const snap = { ts: Date.now(), warm };
const w = await writeSnapshot("warm", snapshotKeyNow(), snap);
console.log(JSON.stringify({ cadence: "warm", warmCount: warm.length, bytes: w.bytes, file: w.file }));
