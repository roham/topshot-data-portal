// V4-iter-2 — featured-set indices data module.
//
// Restores h-c-era's 6-set canonical surface as the primary indices entity
// per directive D004 (V4-iter-2). All 6 setUuids are pinned from
// Researcher §5a UUID probe and golden-traces/homepage/h-c-era.yaml.
//
// Data source: getSetPriceHistory(setUuid, days) — the only entity dimension
// with a direct public-API endpoint (per world-comparison §3 / §5a).
// No synthesizers in this iter; tier/team/series indices ship as captioned
// honest-absence sections (parent D004; child synthesizer directives).
//
// Cache discipline: per-fetch tag relies on the upstream gqlFetch ttlMs
// (already 30 min at lib/topshot/queries.ts L722). The outer app/page.tsx
// keeps revalidate = 600 from V4-iter-1 so the page revalidates more
// frequently than the inner cache — first loader after a 15-min window
// pays the cost, subsequent loaders read cached series.

import { getSetPriceHistory } from "@/lib/topshot/queries";
import type { SetPriceHistoryPoint } from "@/lib/topshot/queries";

export interface FeaturedSetEntry {
  setUuid: string;
  setName: string;
  /** Palette token for the 6 multi-series chart lines. */
  color: string;
}

export interface FeaturedSetIndex {
  setUuid: string;
  setName: string;
  color: string;
  /** Raw daily-bucketed price points (from getSetPriceHistory). */
  points: SetPriceHistoryPoint[];
  /** Base-100 normalized series at the window's left edge. */
  normalized: number[];
  /** Δ% over the window: (last − first) / first * 100. */
  deltaPct: number;
}

/** h-c-era canonical 6, in golden-trace order. */
export const FEATURED_SETS: FeaturedSetEntry[] = [
  {
    setUuid: "2eb47cb4-03ce-4b45-8cf0-d9f4bde8710f",
    setName: "Base Set",
    color: "#22d3ee", // cyan
  },
  {
    setUuid: "a61f2313-932a-491d-a48d-99e5e5a5d6bb",
    setName: "Metallic Gold LE",
    color: "#14b8a6", // teal
  },
  {
    setUuid: "891987bc-a5c0-404e-8486-1735a330a81a",
    setName: "Rookie Debut",
    color: "#6366f1", // indigo
  },
  {
    setUuid: "dfbcffac-ff8b-420e-ab31-927f263fcb2b",
    setName: "Run It Back: Origins",
    color: "#8b5cf6", // violet
  },
  {
    setUuid: "416c19b5-dcac-4e5d-8327-f794ec7d8ee0",
    setName: "Holo Icon",
    color: "#f59e0b", // amber
  },
  {
    setUuid: "4227aba2-6cdf-4a6a-87af-7fcd2e13562c",
    setName: "Top Shot This",
    color: "#f87171", // coral
  },
];

export const FEATURED_SET_NAMES = FEATURED_SETS.map((s) => s.setName);

/**
 * Fan out getSetPriceHistory(setUuid, days) across the 6 featured sets via
 * Promise.all. Returns an enriched record per set with raw points, base-100
 * normalized series, and window Δ%. Sets that fail upstream return an empty
 * series rather than throwing — the chart degrades gracefully and the
 * window-leaders sidebar excludes empties from ranking.
 */
export async function getFeaturedSetIndices(
  days: number = 30,
): Promise<FeaturedSetIndex[]> {
  const settled = await Promise.all(
    FEATURED_SETS.map(async (entry) => {
      try {
        const points = await getSetPriceHistory(entry.setUuid, days);
        return { entry, points };
      } catch {
        return { entry, points: [] as SetPriceHistoryPoint[] };
      }
    }),
  );

  return settled.map(({ entry, points }) => {
    if (!points.length) {
      return {
        setUuid: entry.setUuid,
        setName: entry.setName,
        color: entry.color,
        points: [],
        normalized: [],
        deltaPct: 0,
      };
    }
    const sorted = [...points].sort((a, b) => a.ts - b.ts);
    const first = sorted[0].priceCents || 1; // guard div-by-zero
    const normalized = sorted.map((p) => (p.priceCents / first) * 100);
    const last = sorted[sorted.length - 1].priceCents;
    const deltaPct = first > 0 ? ((last - first) / first) * 100 : 0;
    return {
      setUuid: entry.setUuid,
      setName: entry.setName,
      color: entry.color,
      points: sorted,
      normalized,
      deltaPct,
    };
  });
}

/** Top-N window leaders by Δ% across the 6 featured sets. */
export function windowLeaders(
  indices: FeaturedSetIndex[],
  n: number = 3,
): FeaturedSetIndex[] {
  return [...indices]
    .filter((i) => i.points.length >= 2)
    .sort((a, b) => b.deltaPct - a.deltaPct)
    .slice(0, n);
}
