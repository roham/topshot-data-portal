// V2 STAGE-3 — 30-minute portfolio refresh.
// Reads a watchlist from env (PORTFOLIO_WATCHLIST = comma-separated
// flowAddresses) and snapshots each portfolio's high-level metrics. The
// per-collector pages read recent snapshots to draw the portfolio-value
// time series without re-paginating the bag on every render.

import { NextRequest, NextResponse } from "next/server";
import { fetchBagPage, getUserByFlow } from "@/lib/topshot/queries";
import { writeSnapshot, snapshotKeyNow } from "@/lib/snapshots/store";
import type { PortfolioSnapshot } from "@/lib/snapshots/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

function authorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  return req.headers.get("authorization") === `Bearer ${expected}`;
}

function watchlist(): string[] {
  const raw = process.env.PORTFOLIO_WATCHLIST ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function snapshotPortfolio(flowAddress: string): Promise<PortfolioSnapshot> {
  const user = await getUserByFlow(flowAddress);
  const firstPage = await fetchBagPage(flowAddress, "", 100);
  const total = firstPage.totalCount ?? firstPage.items.length;
  // Estimated value: sum of lowAsk over all known listed moments in the first
  // page, scaled up by total/sampleSize. Cruder than the V1 valuation engine
  // but fine for a 30m delta. The collector page can run the full engine.
  let sumCentsSampled = 0;
  let listedSampled = 0;
  for (const m of firstPage.items) {
    if (m.lowAsk && Number(m.lowAsk) > 0) {
      sumCentsSampled += Math.round(Number(m.lowAsk) * 100);
      listedSampled++;
    }
  }
  const sampleSize = firstPage.items.length;
  const estCents = sampleSize > 0 && total > 0
    ? Math.round((sumCentsSampled / sampleSize) * total)
    : 0;
  const topHoldingsByValue = [...firstPage.items]
    .filter((m) => m.lowAsk && Number(m.lowAsk) > 0)
    .sort((a, b) => Number(b.lowAsk) - Number(a.lowAsk))
    .slice(0, 25)
    .map((m) => ({
      flowId: m.flowId,
      playerName: m.play?.stats?.playerName ?? "(unknown)",
      setFlowName: m.set?.flowName ?? "(unknown)",
      serial: Number(m.flowSerialNumber),
      lowAskCents: Math.round(Number(m.lowAsk) * 100),
    }));
  return {
    ts: Date.now(),
    flowAddress,
    username: user?.username ?? null,
    totalMoments: total,
    estimatedValueCents: estCents,
    topHoldingsByValue,
  };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const start = Date.now();
  const addrs = watchlist();
  if (!addrs.length) {
    return NextResponse.json({ skipped: "no PORTFOLIO_WATCHLIST configured", elapsedMs: Date.now() - start });
  }
  const writes: Array<{ flowAddress: string; ok: boolean; bytes: number; reason?: string }> = [];
  for (const addr of addrs) {
    try {
      const snap = await snapshotPortfolio(addr);
      const w = await writeSnapshot({
        cadence: "30m-portfolio",
        key: `${snapshotKeyNow()}__${addr}`,
        data: snap,
        message: `[snapshot] 30m-portfolio ${snap.username ?? addr} ${snap.totalMoments}`,
      });
      writes.push({ flowAddress: addr, ok: w.ok, bytes: w.bytes, reason: w.reason });
    } catch (e) {
      writes.push({ flowAddress: addr, ok: false, bytes: 0, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return NextResponse.json({ elapsedMs: Date.now() - start, count: addrs.length, writes });
}
