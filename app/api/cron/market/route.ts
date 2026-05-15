// V2 STAGE-3 — 30-minute market-wide aggregate cron.
// Schedule: every 30 minutes (vercel.json). Pulls UPDATED_AT_DESC tx feed
// over the last 30 minutes, aggregates, writes a snapshot.

import { NextRequest, NextResponse } from "next/server";
import { chronologicalTxBackfill } from "@/lib/topshot/queries";
import { aggregateMarketWindow } from "@/lib/snapshots/aggregate";
import { writeSnapshot, snapshotKeyNow } from "@/lib/snapshots/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WINDOW_MS = 30 * 60 * 1000;

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // open during local dev
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const start = Date.now();
  const txs = await chronologicalTxBackfill(WINDOW_MS, 5000);
  const agg = aggregateMarketWindow(txs, WINDOW_MS);
  const write = await writeSnapshot({
    cadence: "30m-market",
    key: snapshotKeyNow(),
    data: agg,
    message: `[snapshot] 30m-market ${agg.txCount} tx`,
  });
  return NextResponse.json({
    elapsedMs: Date.now() - start,
    txCount: agg.txCount,
    uniqueBuyers: agg.uniqueBuyers,
    uniqueSellers: agg.uniqueSellers,
    medianPriceCents: agg.medianPriceCents,
    write,
  });
}
