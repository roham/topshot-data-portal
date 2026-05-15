// 15-min hot-editions snapshot. The "hot" set = (setFlowName, playerName)
// tuples observed most frequently in the recent tx feed. Iter-N enriches
// with bottom-50 listing ladders + UUIDs once the set/play lookup lib
// is in place.

import { recentSalesBulk, writeSnapshot, snapshotKeyNow } from "./_snapshot-helpers.mjs";

const HOT_TOP_N = 30;

const txs = await recentSalesBulk(200);
const counter = new Map();
for (const t of txs) {
  const setFlowId = t.moment?.set?.flowId;
  const playerName = t.moment?.play?.stats?.playerName;
  const setFlowName = t.moment?.set?.flowName;
  if (!setFlowId || !playerName) continue;
  const key = `${setFlowId}|${playerName}`;
  const cur = counter.get(key);
  if (cur) cur.count++;
  else {
    counter.set(key, {
      ref: {
        setFlowName: setFlowName ?? "",
        playerName,
        circulationCount: t.moment?.edition?.circulationCount ?? 0,
        tier: t.moment?.edition?.tier ?? null,
        parallelID: t.moment?.edition?.parallelID ?? null,
      },
      count: 1,
    });
  }
}

const editions = Array.from(counter.values())
  .sort((a, b) => b.count - a.count)
  .slice(0, HOT_TOP_N)
  .map(({ ref, count }) => ({ ...ref, observedSales: count, ts: Date.now() }));

const snap = { ts: Date.now(), editions };
const w = await writeSnapshot("hot", snapshotKeyNow(), snap);
console.log(JSON.stringify({ cadence: "hot", editionCount: editions.length, bytes: w.bytes, file: w.file }));
