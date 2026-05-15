// V4-iter-4 — shared types for the indices precompute pipeline.
//
// Single source of truth for the wire shape between the cron writer
// (scripts/snapshot-indices.mjs) and the SSR readers
// (tier/team/series-synthesizer.ts → HomepageIndices.tsx).
//
// schema_version is the runtime contract: readers MUST return null on
// any mismatch, which routes through honest-absence fallback per spec
// acceptance 8. Bump in both writer + reader simultaneously when wire
// shape changes.

import type { IndexSeries } from "./rollup";

export type TierName = "Common" | "Rare" | "Legendary" | "Anthology" | "Ultimate";

export interface IndexPoint {
  ts: number;
  value: number;
}

export interface ChipState {
  hasData: boolean;
  deltaPct: number | null;
}

export interface TierIndex extends IndexSeries {
  tier: TierName;
  totalCirculation: number;
}

export interface TeamIndex extends IndexSeries {
  team: string;
  slug: string;
  volumeCents: number;
  salesCount: number;
}

export interface SeriesIndex extends IndexSeries {
  series: number;
  totalCirculation: number;
  thinSetCount: number;
}

export interface IndexSnapshot<T> {
  schema_version: 1;
  computed_at: string;
  scope: "tier" | "team" | "series";
  data: T[];
}
