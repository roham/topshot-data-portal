// Pure metric helpers for the data-quality validation suite.
// No I/O; deterministic data transforms only.
// Tests live in metrics.test.mjs.

/**
 * Spearman rank correlation between two ordered lists of identifiers.
 *
 * We rank by position in each list (1-indexed), then compute Spearman on the
 * intersection: items present in both lists. Items unique to either list are
 * dropped — there's no meaningful rank to compare against.
 *
 * Returns:
 *   number in [-1, 1] — correlation strength
 *   null              — when fewer than 2 items intersect, or any input empty
 */
export function spearmanCorrelation(listA, listB) {
  if (!Array.isArray(listA) || !Array.isArray(listB)) return null;
  if (listA.length === 0 || listB.length === 0) return null;

  // Build {id → rank} for each list (1-indexed).
  const rankA = new Map();
  for (let i = 0; i < listA.length; i++) rankA.set(listA[i], i + 1);
  const rankB = new Map();
  for (let i = 0; i < listB.length; i++) rankB.set(listB[i], i + 1);

  // Intersection only — items present in both.
  const common = [];
  for (const id of rankA.keys()) {
    if (rankB.has(id)) common.push(id);
  }
  const n = common.length;
  if (n < 2) return null;

  // Re-rank within the intersection to use comparable ranks (1..n).
  // Sort common by rank in A → assign new rank 1..n; same for B.
  const sortedByA = [...common].sort((x, y) => rankA.get(x) - rankA.get(y));
  const sortedByB = [...common].sort((x, y) => rankB.get(x) - rankB.get(y));
  const reRankA = new Map();
  const reRankB = new Map();
  sortedByA.forEach((id, idx) => reRankA.set(id, idx + 1));
  sortedByB.forEach((id, idx) => reRankB.set(id, idx + 1));

  // Spearman = 1 - 6 * Σd² / (n(n² - 1))  — no ties version. Identifiers are
  // unique so ties cannot arise from this construction.
  let sumDSquared = 0;
  for (const id of common) {
    const d = reRankA.get(id) - reRankB.get(id);
    sumDSquared += d * d;
  }
  return 1 - (6 * sumDSquared) / (n * (n * n - 1));
}

/**
 * Absolute percentage delta between two numeric values.
 * Returns:
 *   0          — when both are 0
 *   Infinity   — when denominator is 0 and numerator is non-zero
 *   number     — |sb - bq| / bq otherwise
 *
 * Coerces string inputs (BigQuery NUMERIC / Supabase BIGINT can arrive as strings).
 */
export function pctDelta(supabaseVal, bqVal) {
  const sb = Number(supabaseVal);
  const bq = Number(bqVal);
  if (bq === 0 && sb === 0) return 0;
  if (bq === 0) return Infinity;
  return Math.abs(sb - bq) / Math.abs(bq);
}

/**
 * Absolute delta. Returns Infinity if either side is null/undefined — that
 * way the caller's threshold check trips on missing data.
 */
export function absDelta(a, b) {
  if (a == null || b == null) return Infinity;
  return Math.abs(Number(a) - Number(b));
}

/**
 * Simple ratio numerator/denominator with the {0,0}→1 convention.
 */
export function ratio(num, den) {
  const n = Number(num);
  const d = Number(den);
  if (d === 0 && n === 0) return 1;
  if (d === 0) return Infinity;
  return n / d;
}
