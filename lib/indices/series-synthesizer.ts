// V4-iter-3 — series index synthesizer.
//
// Pages all sets via allSets(250), groups by `flowSeriesNumber`, fans out
// getSetPriceHistory per set, weights each set by circulation × current
// floor, rolls up to a base-100 series per series.
//
// Returns 6 series indices (S1–S6) per directive D005. S7 + S8 are
// silent-omitted per design.md §Q4; surfaced in the aside.
//
// Circulation derivation: we sum edition circulation per set via
// editionsInSet (12h-cached); current-floor proxy = last point of
// getSetPriceHistory.

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { allSets, editionsInSet, getSetPriceHistory } from "@/lib/topshot/queries";
import { rollupSetHistoriesToIndex } from "./rollup";
import type { SeriesIndex, IndexSnapshot } from "./types";

export type { SeriesIndex };

/**
 * V4-iter-4 — heavy compute path (cron-only).
 * Renamed from `getSeriesIndices`. Do NOT call from SSR; use
 * `readSeriesIndicesSnapshot()` instead.
 */
export async function computeSeriesIndices(
  days: number = 30,
  max: number = 6,
): Promise<SeriesIndex[]> {
  const sets = await allSets(250).catch(() => []);
  if (sets.length === 0) {
    return Array.from({ length: max }, (_, i) => ({
      series: i + 1,
      normalized: [],
      deltaPct: 0,
      contributingSetCount: 0,
      totalCirculation: 0,
      thinSetCount: 0,
    }));
  }

  const enriched = await Promise.all(
    sets.map(async (s) => {
      const [editions, points] = await Promise.all([
        editionsInSet(s.id).catch(() => []),
        getSetPriceHistory(s.id, days).catch(() => []),
      ]);
      const totalCirculation = editions.reduce(
        (acc, e) => acc + (e.circulationCount || 0),
        0,
      );
      const lastCents = points.length ? points[points.length - 1].priceCents : 0;
      const weight = totalCirculation * lastCents;
      return {
        setId: s.id,
        series: s.flowSeriesNumber ?? null,
        totalCirculation,
        points,
        weight,
      };
    }),
  );

  return Array.from({ length: max }, (_, i) => {
    const n = i + 1;
    const groupSets = enriched.filter((e) => e.series === n);
    const totalCirculation = groupSets.reduce((acc, g) => acc + g.totalCirculation, 0);
    const thinSetCount = groupSets.filter((g) => g.points.length < 2).length;
    const rolled = rollupSetHistoriesToIndex(
      groupSets.map((g) => ({ id: g.setId, points: g.points, weight: g.weight })),
      days,
    );
    return {
      series: n,
      totalCirculation,
      thinSetCount,
      ...rolled,
    };
  });
}

/**
 * V4-iter-4 — cheap disk reader (SSR-safe). See tier-synthesizer
 * `readTierIndicesSnapshot` for the contract; series uses the same shape.
 */
export function readSeriesIndicesSnapshot(): {
  indices: SeriesIndex[];
  computedAt: string;
} | null {
  try {
    const dir = path.join(process.cwd(), ".snapshots", "indices");
    const files = readdirSync(dir)
      .filter((f) => f.startsWith("series-") && f.endsWith(".json"))
      .sort();
    if (files.length === 0) return null;
    const newest = files[files.length - 1];
    const raw = readFileSync(path.join(dir, newest), "utf8");
    const parsed = JSON.parse(raw) as IndexSnapshot<SeriesIndex>;
    if (parsed.schema_version !== 1) return null;
    if (!Array.isArray(parsed.data)) return null;
    return { indices: parsed.data, computedAt: parsed.computed_at };
  } catch {
    return null;
  }
}
