// V4-iter-1 — aggregate-economy data module.
//
// Wires the four-cell aggregate-economy strip (components/AggregateEconomyStrip.tsx)
// to the day-tier snapshot accumulator + render-time backfill cascade described
// in iter/v4-iter-1/design.md "Library calls" §.
//
// Primary path (cells 1-3, sales/buyers/volume):
//   readRecentSnapshots("day", N) — newest snapshot is `now`, second-newest is `prior`.
//   Up to 12 snapshots feed the sparkline ladder per design.md Q2.
//
// Fallback (cells 1-3, when day-tier accumulator empty):
//   chronologicalTxBackfill(24h) computed at render time — gives a one-shot
//   number (no Δ, no sparkline). The strip renders the "0 snaps, backfill OK"
//   honest-absence caption.
//
// Cell 4 (active listings):
//   searchMintedMoments byForSale FOR_SALE totalCount — independent of the
//   accumulator (structural Δ absence; design.md Cell 4 §).
//
// Honest-absence: every cell returns a `state` discriminator the component
// renders against — never a number masquerading as live data, never a 0
// where a caption should sit. This is the iter-v3-1 P0-1..P0-4 lesson
// literalized into the contract.

import { gqlFetch } from "@/lib/topshot/proxy";
import { chronologicalTxBackfill } from "@/lib/topshot/queries";
import { readRecentSnapshots } from "@/lib/snapshots/store";
import type { MarketAggregateSnapshot } from "@/lib/snapshots/types";
import type { MarketplaceTransaction } from "@/lib/topshot/types";

const DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const DAY_CRON_INTERVAL_MS = 2 * 60 * 60 * 1000; // matches .github/workflows/snapshot-day-aggregate.yml
const HARD_CAP_TX = 5000;

// ---- per-cell value-state discriminator -------------------------------------

export type CellState =
  | { kind: "full"; value: number; deltaPct: number; spark: number[] }
  | { kind: "partial"; value: number; deltaPct: number; spark: number[]; ticks: number }
  | { kind: "single"; value: number; deltaPct: number }
  | { kind: "first-snapshot-pending"; value: number; captionISO: string }
  | { kind: "backfill"; value: number; nextCronIso: string }
  | { kind: "absent"; nextPopulatedIso: string };

export type ListingsState =
  | { kind: "live"; value: number }
  | { kind: "unreachable" };

export interface AggregateEconomyResult {
  volUsd: CellState;
  salesCount: CellState;
  buyersCount: CellState;
  listings: ListingsState;
  /** True when readPair("day") returned null and the backfill path fired. */
  usedRenderTimeBackfill: boolean;
}

// ---- internals --------------------------------------------------------------

interface SnapshotPair<T> {
  now: T | null;
  prior: T | null;
  series: T[]; // newest-first, up to 12 entries for sparkline
}

async function readDayPair(): Promise<SnapshotPair<MarketAggregateSnapshot>> {
  const snaps = await readRecentSnapshots<MarketAggregateSnapshot>("day", 12).catch(() => []);
  const sorted = [...snaps].sort((a, b) => (a.key < b.key ? 1 : -1));
  const series = sorted.map((s) => s.data);
  return {
    now: series[0] ?? null,
    prior: series[1] ?? null,
    series,
  };
}

function safePct(now: number, prior: number): number {
  if (!isFinite(prior) || prior <= 0) return 0;
  return ((now - prior) / prior) * 100;
}

function isoPlusMs(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

/**
 * Next `0 every-2h * * *` cron-tick boundary (UTC). Mirrors
 * `.github/workflows/snapshot-day-aggregate.yml` cadence. Used by the
 * `first-snapshot-pending` state to tell the Pro Trader exactly when the
 * second snapshot — and therefore an honest Δ — will be available.
 */
function nextDayCronIso(now: Date = new Date()): string {
  const next = new Date(now.getTime());
  next.setUTCMilliseconds(0);
  next.setUTCSeconds(0);
  next.setUTCMinutes(0);
  const hour = next.getUTCHours();
  // even hours are cron firings; advance to the next even hour strictly in the future.
  const addHours = hour % 2 === 0 ? 2 : 1;
  next.setUTCHours(hour + addHours);
  return next.toISOString();
}

function volumeUsdFromSnap(snap: MarketAggregateSnapshot): number {
  // MarketAggregateSnapshot stores cents-per-tx aggregates but not a rolled-up
  // volume field. Sum = txCount × meanPriceCents. /100 to convert cents → dollars.
  return (snap.txCount * snap.meanPriceCents) / 100;
}

function buildCellState(
  series: MarketAggregateSnapshot[],
  pick: (s: MarketAggregateSnapshot) => number,
): CellState | null {
  if (!series.length) return null;
  const valuesNewestFirst = series.map(pick);
  const value = valuesNewestFirst[0];
  const ticks = valuesNewestFirst.length;
  if (ticks === 1) {
    // D010 fix (critic P0-1): one snapshot has no honest prior — emit
    // first-snapshot-pending instead of a fabricated 0.00% delta.
    return { kind: "first-snapshot-pending", value, captionISO: nextDayCronIso() };
  }
  const prior = valuesNewestFirst[1];
  const deltaPct = safePct(value, prior);
  // Sparkline takes oldest→newest order for the visual progression.
  const sparkChronological = [...valuesNewestFirst].reverse();
  if (ticks >= 12) {
    return { kind: "full", value, deltaPct, spark: sparkChronological.slice(-12) };
  }
  return {
    kind: "partial",
    value,
    deltaPct,
    spark: sparkChronological,
    ticks,
  };
}

async function fetchListingsCount(): Promise<ListingsState> {
  // Per design.md Cell 4: searchMintedMoments({byForSale: FOR_SALE}, limit: 1).
  // We only need totalCount. The proxy returns the upstream `data` object;
  // we cache for 5 min via gqlFetch ttlMs.
  const q = `query {
    searchMintedMoments(input: {
      filters: { byForSale: FOR_SALE }
      searchInput: { pagination: { cursor: "", direction: RIGHT, limit: 1 } }
    }) {
      data { searchSummary { totalCount } }
    }
  }`;
  type R = { searchMintedMoments: { data: { searchSummary: { totalCount: number | null } } } };
  try {
    const d = await gqlFetch<R>(q, {}, { ttlMs: 5 * 60_000 });
    const total = d?.searchMintedMoments?.data?.searchSummary?.totalCount ?? null;
    if (total == null || total <= 0) return { kind: "unreachable" };
    return { kind: "live", value: total };
  } catch {
    return { kind: "unreachable" };
  }
}

async function backfill24h(): Promise<{
  txs: MarketplaceTransaction[];
  volUsd: number;
  salesCount: number;
  buyersCount: number;
} | null> {
  try {
    const txs = await chronologicalTxBackfill(DAY_WINDOW_MS, HARD_CAP_TX);
    if (!txs.length) return null;
    let volCents = 0;
    const buyers = new Set<string>();
    for (const t of txs) {
      const cents = Math.round(Number(t.price ?? 0) * 100);
      volCents += cents;
      const b = t.buyer?.flowAddress;
      if (b) buyers.add(b);
    }
    return {
      txs,
      volUsd: volCents / 100,
      salesCount: txs.length,
      buyersCount: buyers.size,
    };
  } catch {
    return null;
  }
}

// ---- public entry -----------------------------------------------------------

export async function getAggregateEconomy(): Promise<AggregateEconomyResult> {
  const [pair, listings] = await Promise.all([readDayPair(), fetchListingsCount()]);

  if (pair.now) {
    const volCell = buildCellState(pair.series, volumeUsdFromSnap);
    const salesCell = buildCellState(pair.series, (s) => s.txCount);
    const buyersCell = buildCellState(pair.series, (s) => s.uniqueBuyers);
    if (volCell && salesCell && buyersCell) {
      return {
        volUsd: volCell,
        salesCount: salesCell,
        buyersCount: buyersCell,
        listings,
        usedRenderTimeBackfill: false,
      };
    }
  }

  // Day-tier empty (the world-comparison.md §6 risk). Fall back to
  // chronologicalTxBackfill at render time. Log so QA's network trace
  // can confirm the fallback fired (per dispatch §6).
  // eslint-disable-next-line no-console
  console.warn("[aggregate-economy] day-tier empty; fell back to chronologicalTxBackfill");

  const back = await backfill24h();
  const nextCronIso = isoPlusMs(DAY_CRON_INTERVAL_MS);

  if (back) {
    return {
      volUsd: { kind: "backfill", value: back.volUsd, nextCronIso },
      salesCount: { kind: "backfill", value: back.salesCount, nextCronIso },
      buyersCount: { kind: "backfill", value: back.buyersCount, nextCronIso },
      listings,
      usedRenderTimeBackfill: true,
    };
  }

  // Total failure — honest-absence captions on cells 1-3. Cell 4 may still be live.
  const nextPopulatedIso = isoPlusMs(4 * 60 * 60 * 1000); // first-populated = +4h per spec §5
  return {
    volUsd: { kind: "absent", nextPopulatedIso },
    salesCount: { kind: "absent", nextPopulatedIso },
    buyersCount: { kind: "absent", nextPopulatedIso },
    listings,
    usedRenderTimeBackfill: true,
  };
}
