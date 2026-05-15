// V2 STAGE-3 — indices registry.
// Config-driven. Adding a new index = adding a `IndexDef` entry below
// (target ~20 LOC per definition). The index pages render uniformly from this.

export type IndexKind = "ts500" | "tier" | "series" | "team";

export interface IndexDef {
  /** stable URL slug, also the storage key */
  slug: string;
  /** human-readable name */
  name: string;
  /** one-line description shown on the index page */
  description: string;
  /** taxonomy hint, drives which loader is used */
  kind: IndexKind;
  /**
   * filter args specific to the kind:
   * - tier: { tier: "Common" | "Rare" | "Legendary" | "Ultimate" | "Fandom" }
   * - series: { seriesNumber: number }
   * - team: { abbreviation: string }
   * - ts500: {} — uses every active set weighted by circulation × floor
   */
  params: Record<string, unknown>;
}

// ---- Starting set. Loop adds more via [TOPSHOT-PORTAL-V2 CATALOG-EXPAND] commits.

export const TIER_NAMES = ["Common", "Rare", "Fandom", "Legendary", "Ultimate"] as const;

const TEAMS_TO_INDEX = [
  // Seed: 5 highest-concentration NBA franchises by historical Top Shot trading volume.
  // The loop adjusts the seed based on accumulator data once it's running.
  "BOS", "LAL", "GSW", "NYK", "MIL",
];

const SERIES_NUMBERS = [1, 2, 3, 4, 5, 6];

export const INDICES: IndexDef[] = [
  {
    slug: "ts500",
    name: "TS500",
    description:
      "Weighted index of the 500 most-traded editions by circulationCount × floor price. The market in a single number.",
    kind: "ts500",
    params: {},
  },
  ...TIER_NAMES.map<IndexDef>((tier) => ({
    slug: `tier-${tier.toLowerCase()}`,
    name: `TS-${tier.toUpperCase()}`,
    description: `Floor-weighted index across all currently-active ${tier} editions.`,
    kind: "tier",
    params: { tier },
  })),
  ...SERIES_NUMBERS.map<IndexDef>((n) => ({
    slug: `series-${n}`,
    name: `TS-S${n}`,
    description: `Series ${n} index — floor-weighted across every set in Series ${n}.`,
    kind: "series",
    params: { seriesNumber: n },
  })),
  ...TEAMS_TO_INDEX.map<IndexDef>((abbr) => ({
    slug: `team-${abbr.toLowerCase()}`,
    name: `TS-${abbr}`,
    description: `${abbr} team index — sale-weighted across every moment whose teamAtMoment matches.`,
    kind: "team",
    params: { abbreviation: abbr },
  })),
];

export function getIndex(slug: string): IndexDef | undefined {
  return INDICES.find((i) => i.slug === slug);
}
