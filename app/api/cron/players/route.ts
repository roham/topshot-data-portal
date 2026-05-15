// V2 STAGE-3 — 30-minute per-player rollup snapshot.
// Aggregates recent tx into per-player counts + median price. Player pages
// read recent snapshots to draw the per-player volume time series.

import { NextRequest, NextResponse } from "next/server";
import { recentSalesBulk } from "@/lib/topshot/queries";
import { writeSnapshot, snapshotKeyNow } from "@/lib/snapshots/store";
import type { PerPlayerRollupSnapshot } from "@/lib/snapshots/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const start = Date.now();
  const txs = await recentSalesBulk(500);
  const byPlayer = new Map<string, { samples: number[]; editions: Set<string> }>();
  for (const t of txs) {
    const playerName = t.moment?.play?.stats?.playerName;
    if (!playerName) continue;
    const cur = byPlayer.get(playerName) ?? { samples: [], editions: new Set<string>() };
    cur.samples.push(Math.round(Number(t.price) * 100));
    if (t.moment?.set?.flowName) {
      cur.editions.add(`${t.moment.set.flowName}|${playerName}`);
    }
    byPlayer.set(playerName, cur);
  }
  const players: PerPlayerRollupSnapshot["players"] = Array.from(byPlayer.entries()).map(
    ([playerName, agg]) => {
      const sorted = [...agg.samples].sort((a, b) => a - b);
      const median = sorted.length === 0
        ? 0
        : sorted.length % 2 === 0
        ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
        : sorted[Math.floor(sorted.length / 2)];
      return {
        playerId: "", // resolved per-iter from allPlayers() directory
        playerName,
        totalMomentsMinted: 0,
        distinctEditions: agg.editions.size,
        medianRecentSaleCents: median,
        recentSaleCount: agg.samples.length,
      };
    },
  );
  players.sort((a, b) => b.recentSaleCount - a.recentSaleCount);
  const snap: PerPlayerRollupSnapshot = { ts: Date.now(), players };
  const write = await writeSnapshot({
    cadence: "30m-player",
    key: snapshotKeyNow(),
    data: snap,
    message: `[snapshot] 30m-player ${players.length} players`,
  });
  return NextResponse.json({ elapsedMs: Date.now() - start, playerCount: players.length, write });
}
