// V4-iter-3 — tier index synthesizer.
//
// Pages all sets via allSets(250), groups by modal-edition tier (derived
// via editionsInSet → 12h-cached, so 238 sets cost ~one bulk warm-up per
// half-day), fans out getSetPriceHistory per set, then weights each
// contributing set by circulation × current-floor and rolls up to a
// base-100 series per tier.
//
// Returns the 5 canonical tiers in directive order:
//   Common, Rare, Legendary, Anthology, Ultimate
// Fandom is silent-omitted per design.md §Q1; surfaced in the aside.
//
// Cache: callers should set `next.revalidate = 1800` (30 min). The inner
// gqlFetch ttlMs handles set-level caching (12h editionsInSet, 30min
// price-history).

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { allSets, editionsInSet, getSetPriceHistory } from "@/lib/topshot/queries";
import { rollupSetHistoriesToIndex } from "./rollup";
import type { TierIndex, TierName, IndexSnapshot } from "./types";

export type { TierIndex, TierName };

const TIER_ORDER: TierName[] = ["Common", "Rare", "Legendary", "Anthology", "Ultimate"];

// Edition tiers from the API arrive as enum-like strings. The directive
// adds "Anthology" — which the schema surfaces via setVisualId rather than
// the legacy MOMENT_TIER enum. We map both surfaces here.
function normalizeEditionTier(raw: string | undefined, setName: string): TierName | null {
  if (!raw) return null;
  const t = raw.toUpperCase();
  if (t.includes("ULTIMATE")) return "Ultimate";
  if (t.includes("LEGENDARY")) return "Legendary";
  if (t.includes("RARE")) return "Rare";
  if (t.includes("COMMON")) return "Common";
  // Anthology is surfaced via set-name pattern in the current substrate
  // (per design.md §Q1 — 5-tier list includes Anthology, which API enum
  // does not enumerate distinctly from RARE/LEGENDARY in MOMENT_TIER_*).
  if (/anthology/i.test(setName)) return "Anthology";
  return null;
}

function classifySetTier(
  setName: string,
  editions: Array<{ tier: string; circulationCount: number }>,
): { tier: TierName | null; totalCirculation: number } {
  // Anthology takes precedence based on set name (load-bearing per design.md).
  if (/anthology/i.test(setName)) {
    return {
      tier: "Anthology",
      totalCirculation: editions.reduce((acc, e) => acc + (e.circulationCount || 0), 0),
    };
  }
  // Otherwise: modal tier across editions.
  const counts = new Map<TierName, number>();
  let totalCirc = 0;
  for (const e of editions) {
    totalCirc += e.circulationCount || 0;
    const t = normalizeEditionTier(e.tier, setName);
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  if (counts.size === 0) return { tier: null, totalCirculation: totalCirc };
  let bestTier: TierName | null = null;
  let best = -1;
  for (const [t, n] of counts) {
    if (n > best) {
      best = n;
      bestTier = t;
    }
  }
  return { tier: bestTier, totalCirculation: totalCirc };
}

/**
 * V4-iter-4 — heavy compute path (cron-only).
 * Renamed from `getTierIndices`; do NOT call from SSR. Use
 * `readTierIndicesSnapshot()` instead.
 */
export async function computeTierIndices(days: number = 30): Promise<TierIndex[]> {
  const sets = await allSets(250).catch(() => []);
  if (sets.length === 0) {
    return TIER_ORDER.map((tier) => ({
      tier,
      normalized: [],
      deltaPct: 0,
      contributingSetCount: 0,
      totalCirculation: 0,
    }));
  }

  // Pull editions + price-history per set in parallel (each is cached
  // upstream; 238 calls land in one round under warm-cache).
  const enriched = await Promise.all(
    sets.map(async (s) => {
      const [editions, points] = await Promise.all([
        editionsInSet(s.id).catch(() => []),
        getSetPriceHistory(s.id, days).catch(() => []),
      ]);
      const { tier, totalCirculation } = classifySetTier(s.flowName, editions);
      const lastCents = points.length ? points[points.length - 1].priceCents : 0;
      const weight = totalCirculation * lastCents;
      return { setId: s.id, tier, totalCirculation, points, weight };
    }),
  );

  return TIER_ORDER.map((tier) => {
    const groupSets = enriched.filter((e) => e.tier === tier);
    const totalCirculation = groupSets.reduce((acc, g) => acc + g.totalCirculation, 0);
    const rolled = rollupSetHistoriesToIndex(
      groupSets.map((g) => ({ id: g.setId, points: g.points, weight: g.weight })),
      days,
    );
    return {
      tier,
      totalCirculation,
      ...rolled,
    };
  });
}

/**
 * V4-iter-4 — cheap disk reader (SSR-safe).
 * Reads the most recent `tier-*.json` snapshot under `.snapshots/indices/`.
 * Returns `null` on:
 *   - directory or file missing
 *   - JSON parse error
 *   - `schema_version !== 1` (per spec acceptance 8 honest-absence routing)
 *
 * The reader is synchronous and intentionally side-effect-free; it is
 * called once per SSR render and the result is cached by Next.js per the
 * page-level `revalidate`.
 */
export function readTierIndicesSnapshot(): {
  indices: TierIndex[];
  computedAt: string;
} | null {
  try {
    const dir = path.join(process.cwd(), ".snapshots", "indices");
    const files = readdirSync(dir)
      .filter((f) => f.startsWith("tier-") && f.endsWith(".json"))
      .sort();
    if (files.length === 0) return null;
    const newest = files[files.length - 1];
    const raw = readFileSync(path.join(dir, newest), "utf8");
    const parsed = JSON.parse(raw) as IndexSnapshot<TierIndex>;
    if (parsed.schema_version !== 1) return null;
    if (!Array.isArray(parsed.data)) return null;
    return { indices: parsed.data, computedAt: parsed.computed_at };
  } catch {
    return null;
  }
}
