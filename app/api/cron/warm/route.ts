// V2 STAGE-3 — 1-hour warm-editions snapshot.
// "Warm" = sets observed in tx feed but not currently in the hot-top-30.
// Iter-1 will tune the threshold. For STAGE-3 this records the set-level
// activity tally so the warm-editions UI has a known data shape.

import { NextRequest, NextResponse } from "next/server";
import { recentSalesBulk } from "@/lib/topshot/queries";
import { writeSnapshot, snapshotKeyNow } from "@/lib/snapshots/store";

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
  const bySet = new Map<string, { count: number; medianCents: number; samples: number[] }>();
  for (const t of txs) {
    const flowName = t.moment?.set?.flowName ?? "(unknown)";
    const cents = Math.round(Number(t.price) * 100);
    const cur = bySet.get(flowName) ?? { count: 0, medianCents: 0, samples: [] };
    cur.count++;
    cur.samples.push(cents);
    bySet.set(flowName, cur);
  }
  // Compute medians for each set.
  const sets = Array.from(bySet.entries()).map(([flowName, agg]) => {
    const sorted = [...agg.samples].sort((a, b) => a - b);
    const median = sorted.length === 0 ? 0 : sorted.length % 2 === 0
      ? Math.round((sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2)
      : sorted[Math.floor(sorted.length / 2)];
    return { flowName, count: agg.count, medianCents: median };
  });
  sets.sort((a, b) => b.count - a.count);
  // Warm = ranks 30..200 (skip the hot tier).
  const warm = sets.slice(30, 200);
  const write = await writeSnapshot({
    cadence: "1h",
    key: snapshotKeyNow(),
    data: { ts: Date.now(), warm },
    message: `[snapshot] 1h warm ${warm.length} sets`,
  });
  return NextResponse.json({ elapsedMs: Date.now() - start, warmCount: warm.length, write });
}
