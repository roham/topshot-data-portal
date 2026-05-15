// V2 STAGE-3 — 15-minute hot-editions snapshot.
// "Hot" = the editions present in the most recent global tx feed (cheap proxy
// for "active"). Pulls bottom-50 listings + recent sales for each, writes a
// snapshot. Iter-1 of indices and the depth chart can read this as the
// pre-warm seed.

import { NextRequest, NextResponse } from "next/server";
import {
  recentSalesBulk,
  editionListedSerials,
  editionRecentSales,
} from "@/lib/topshot/queries";
import { writeSnapshot, snapshotKeyNow } from "@/lib/snapshots/store";
import type {
  HotEditionsSnapshot,
  PerEditionFloorSnapshot,
} from "@/lib/snapshots/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const HOT_TOP_N = 30; // keep modest; runs every 15min

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

interface EditionRef {
  setUuid: string;
  playUuid: string;
  setFlowName: string;
  playerName: string;
  circulationCount: number;
}

async function topHotEditions(): Promise<EditionRef[]> {
  // Use a bulk pull of recent tx, group by (setID, playID), take top-N by count.
  const txs = await recentSalesBulk(200);
  const counter = new Map<string, { ref: EditionRef; count: number }>();
  for (const t of txs) {
    // The tx feed exposes set and play in moment, but not their UUIDs — only
    // flowId on set and stats on play. To address by UUID we need a lookup;
    // for now, use flowId-encoded keys so we can dedupe and report. UUIDs
    // come from editionsForPlay-style enrichment in the iter that consumes
    // this snapshot. So this snapshot records the edition tuple by
    // identifiable fields and the iter resolves to UUID at read-time.
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
          setUuid: "",
          playUuid: "",
          setFlowName: setFlowName ?? "",
          playerName,
          circulationCount: t.moment?.edition?.circulationCount ?? 0,
        },
        count: 1,
      });
    }
  }
  return Array.from(counter.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, HOT_TOP_N)
    .map((c) => c.ref);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const start = Date.now();
  const hot = await topHotEditions();
  // For now, the hot-snapshot v1 just records the (setFlowName, playerName) tuples
  // and lets later iters resolve UUIDs + pull bottom-50 ladders. Once a
  // playerName-to-playUUID + setFlowId-to-setUUID lookup lib is in place, we
  // call editionListedSerials + editionRecentSales here.
  void editionListedSerials;
  void editionRecentSales;
  const editions: PerEditionFloorSnapshot[] = hot.map((h) => ({
    setUuid: "",
    playUuid: "",
    setFlowName: h.setFlowName,
    playerName: h.playerName,
    ts: Date.now(),
    floorCents: 0, // populated by enrichment pass
    listingCount: 0,
    topAsksCents: [],
    circulationCount: h.circulationCount,
  }));
  const snap: HotEditionsSnapshot = { ts: Date.now(), editions };
  const write = await writeSnapshot({
    cadence: "15m",
    key: snapshotKeyNow(),
    data: snap,
    message: `[snapshot] 15m hot ${editions.length} editions`,
  });
  return NextResponse.json({
    elapsedMs: Date.now() - start,
    editionCount: editions.length,
    write,
  });
}
