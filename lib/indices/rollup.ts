// V4-iter-3 — shared rollup helper.
//
// Factors the per-set → group-index rollup used by featured-sets, tier,
// team, and series synthesizers. Each contributing set carries a weight
// (circulation × current floor for tier/series; 30d $ volume for team);
// the helper normalizes each set's price-history to base-100 then computes
// a weight-weighted average across the per-day buckets.
//
// Honest-absence: sets with <2 history points are excluded; if no set in
// the group has ≥2 points, the result has an empty `normalized` array
// (caller renders the "Synthesis insufficient" caption).
//
// Per design.md §Q-extract — this helper is the single point of change for
// the rollup algorithm; the 4 synthesizers are thin wrappers around it.

import type { SetPriceHistoryPoint } from "@/lib/topshot/queries";

export interface SetContribution {
  /** Stable identifier — setUuid (tier/series) or team slug (team). */
  id: string;
  /** Raw daily-bucketed price points (from getSetPriceHistory). */
  points: SetPriceHistoryPoint[];
  /** Non-negative weight; sets with weight ≤ 0 are excluded from the rollup. */
  weight: number;
}

export interface IndexSeries {
  /** Weighted base-100 series, sampled to a common length. */
  normalized: number[];
  /** Window Δ% = (last − first) / first × 100. */
  deltaPct: number;
  /** Count of sets that contributed ≥2-point history to the rollup. */
  contributingSetCount: number;
}

/**
 * Roll up per-set price histories into a single weighted base-100 series.
 * Histories are normalized per-set first (so each set enters at 100), then
 * averaged at each sample index with per-set weights.
 *
 * Sample-index alignment: histories are sampled to the longest contributing
 * series' length via linear interpolation in index-space. This avoids
 * timestamp-grid mismatch (getSetPriceHistory sample times are irregular
 * per research/01-data-ceilings-v2.md §UNLOCK-01) while preserving each
 * set's shape.
 */
export function rollupSetHistoriesToIndex(
  sets: SetContribution[],
  _days: number,
): IndexSeries {
  const usable = sets.filter((s) => s.points.length >= 2 && s.weight > 0);
  if (usable.length === 0) {
    return { normalized: [], deltaPct: 0, contributingSetCount: 0 };
  }
  // Pre-normalize each set's series to base-100 (sorted ascending by ts).
  const normalizedSeries = usable.map((s) => {
    const sorted = [...s.points].sort((a, b) => a.ts - b.ts);
    const first = sorted[0].priceCents || 1;
    return {
      weight: s.weight,
      values: sorted.map((p) => (p.priceCents / first) * 100),
    };
  });
  // Resample each series to a common length (longest series' length).
  const targetLen = Math.max(...normalizedSeries.map((s) => s.values.length));
  const resample = (vals: number[], n: number): number[] => {
    if (vals.length === n) return vals;
    if (vals.length < 2) return Array(n).fill(vals[0] ?? 100);
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = (i * (vals.length - 1)) / (n - 1);
      const lo = Math.floor(t);
      const hi = Math.ceil(t);
      const frac = t - lo;
      out.push(vals[lo] * (1 - frac) + vals[hi] * frac);
    }
    return out;
  };
  const aligned = normalizedSeries.map((s) => ({
    weight: s.weight,
    values: resample(s.values, targetLen),
  }));
  const totalWeight = aligned.reduce((acc, s) => acc + s.weight, 0) || 1;
  const merged: number[] = [];
  for (let i = 0; i < targetLen; i++) {
    let sum = 0;
    for (const s of aligned) sum += s.values[i] * s.weight;
    merged.push(sum / totalWeight);
  }
  const first = merged[0] || 1;
  const last = merged[merged.length - 1];
  const deltaPct = first > 0 ? ((last - first) / first) * 100 : 0;
  return {
    normalized: merged,
    deltaPct,
    contributingSetCount: usable.length,
  };
}
