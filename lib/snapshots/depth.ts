// Accumulator depth — how much history the snapshot system has accumulated.
// Used to surface honest captions like "Snapshot history: 3.5h / 7d target"
// across surfaces that depend on accumulator data.

import { listRecentSnapshotKeys, type Cadence } from "./store";

interface DepthForCadence {
  cadence: Cadence;
  count: number;
  /** Milliseconds between the oldest and newest snapshot. 0 if <2 snapshots. */
  spanMs: number;
  /** ISO timestamp of the oldest snapshot we found. */
  firstKey: string | null;
}

export interface AccumulatorDepth {
  byCadence: Record<Cadence, DepthForCadence>;
  /** The cadence whose span is the longest — used as the "headline" depth. */
  headlineSpanMs: number;
  headlineCadence: Cadence | null;
  /** Target depth for the headline (7 days). */
  targetMs: number;
}

const TARGET_MS = 7 * 24 * 60 * 60 * 1000;
const CADENCES: Cadence[] = ["hot", "warm", "market", "players", "portfolios", "nba-games"];

function parseKeyToMs(name: string): number | null {
  // Filenames look like 2026-05-15T02-06-47Z — convert back to ISO.
  // Pattern: YYYY-MM-DDThh-mm-ssZ
  const m = name.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z$/);
  if (!m) {
    // Some keys have suffixes (portfolios use {ts}__{addr}). Take the prefix.
    const m2 = name.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z/);
    if (!m2) return null;
    return Date.parse(`${m2[1]}T${m2[2]}:${m2[3]}:${m2[4]}Z`);
  }
  return Date.parse(`${m[1]}T${m[2]}:${m[3]}:${m[4]}Z`);
}

export async function getAccumulatorDepth(): Promise<AccumulatorDepth> {
  const results = await Promise.all(
    CADENCES.map(async (cadence) => {
      const keys = await listRecentSnapshotKeys(cadence, 1000);
      const tsList = keys.map((k) => parseKeyToMs(k.name)).filter((n): n is number => n != null);
      if (tsList.length < 1) return { cadence, count: 0, spanMs: 0, firstKey: null };
      const oldest = Math.min(...tsList);
      const newest = Math.max(...tsList);
      return {
        cadence,
        count: keys.length,
        spanMs: newest - oldest,
        firstKey: new Date(oldest).toISOString(),
      };
    }),
  );
  const byCadence = Object.fromEntries(results.map((r) => [r.cadence, r])) as Record<Cadence, DepthForCadence>;
  // Headline: pick the cadence with the largest span (typically `market` or `hot`).
  const sorted = [...results].sort((a, b) => b.spanMs - a.spanMs);
  const headline = sorted[0];
  return {
    byCadence,
    headlineSpanMs: headline?.spanMs ?? 0,
    headlineCadence: headline?.spanMs ? headline.cadence : null,
    targetMs: TARGET_MS,
  };
}

export function formatDepthCaption(depth: AccumulatorDepth): string {
  const ms = depth.headlineSpanMs;
  if (ms <= 0) return "Snapshot history: 0h / 7d target — accumulator warming";
  const hours = ms / (60 * 60 * 1000);
  const days = ms / (24 * 60 * 60 * 1000);
  const label = days >= 1 ? `${days.toFixed(1)}d` : `${hours.toFixed(1)}h`;
  return `Snapshot history: ${label} / 7d target`;
}
