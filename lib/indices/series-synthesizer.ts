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

import { allSets, editionsInSet, getSetPriceHistory } from "@/lib/topshot/queries";
import { rollupSetHistoriesToIndex, type IndexSeries } from "./rollup";

export interface SeriesIndex extends IndexSeries {
  /** Series number (1..6 per directive). */
  series: number;
  /** Sum of edition circulation across contributing sets. */
  totalCirculation: number;
  /** Sets in this series that returned <2-point history (honest-absent). */
  thinSetCount: number;
}

export async function getSeriesIndices(
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
