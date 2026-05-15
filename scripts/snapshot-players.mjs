// 30-min per-player rollup. Counts + median price by playerName from the
// recent tx feed.
import { recentSalesBulk, writeSnapshot, snapshotKeyNow, median } from "./_snapshot-helpers.mjs";

const txs = await recentSalesBulk(500);
const byPlayer = new Map();
for (const t of txs) {
  const playerName = t.moment?.play?.stats?.playerName;
  if (!playerName) continue;
  const cur = byPlayer.get(playerName) ?? { samples: [], editions: new Set() };
  cur.samples.push(Math.round(Number(t.price) * 100));
  if (t.moment?.set?.flowName) cur.editions.add(`${t.moment.set.flowName}|${playerName}`);
  byPlayer.set(playerName, cur);
}

const players = Array.from(byPlayer.entries())
  .map(([playerName, agg]) => ({
    playerName,
    distinctEditions: agg.editions.size,
    medianRecentSaleCents: median(agg.samples),
    recentSaleCount: agg.samples.length,
  }))
  .sort((a, b) => b.recentSaleCount - a.recentSaleCount);

const snap = { ts: Date.now(), players };
const w = await writeSnapshot("players", snapshotKeyNow(), snap);
console.log(JSON.stringify({ cadence: "players", playerCount: players.length, bytes: w.bytes, file: w.file }));
