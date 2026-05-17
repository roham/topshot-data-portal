// Shared chart palette — canonical colors per dimension so the same concept
// (a tier, a parallel, a market direction) renders the same color everywhere.
//
// Doctrine reference: research/doctrine.md v1.1 §P3 (every page has a
// comparable + signature move). Color cohesion is part of the signature move —
// scattered palettes read as Vercel-template; a tight tier palette reads as
// terminal-grade.

/** Tier colors — same across ByTier chart, TopPlayers tier-overlay, treemap, etc. */
export const TIER_COLOR: Record<string, string> = {
  Common: "#94a3b8",      // slate — high-circulation, low-rarity
  Fandom: "#fcd34d",      // gold — WNBA fandom tier
  Rare: "#67e8f9",        // cyan — mid-rarity
  Legendary: "#a78bfa",   // violet — high-rarity
  Ultimate: "#fb7185",    // coral — top-rarity
  Anthology: "#f472b6",   // pink — special variant
  Unknown: "#475569",     // dim slate — unresolved fallback
};

/** Parallel colors — for the 22 named parallels + Base sentinel. Index = parallel_id. */
export const PARALLEL_COLOR_BY_ID: Record<number, string> = {
  0: "#94a3b8",   // Base — neutral slate (matches Common, reflecting "default" status)
  1: "#fbbf24",   // Explosion — orange
  2: "#f87171",   // Torn — red
  3: "#60a5fa",   // Vortex — blue
  4: "#34d399",   // Rippled — emerald
  5: "#a78bfa",   // Coded — violet
  6: "#fb7185",   // Halftone — coral
  7: "#22d3ee",   // Bubbled — cyan
  8: "#fdba74",   // Diced — peach
  9: "#c084fc",   // Bit — purple
  10: "#67e8f9",  // Vibe — light cyan
  11: "#86efac",  // Astra — light green
  12: "#fcd34d",  // Diamond — gold
  13: "#fca5a5",  // Voltage — pink
  14: "#bef264",  // Livewire — lime
  15: "#f9a8d4",  // Championship — pink
  16: "#f97316",  // Club Collection — orange-deep
  17: "#7dd3fc",  // Blockchain — sky
  18: "#a3e635",  // Hardcourt — lime-bright
  19: "#f0abfc",  // Hexwave — fuchsia
  20: "#fde047",  // Jukebox — yellow
  21: "#a5b4fc",  // Galactic — indigo-soft
  22: "#f472b6",  // Omega — pink-deep
};

/** Series colors — older series cooler, newer warmer. Used in TopSets. */
export const SERIES_COLOR: Record<number, string> = {
  1: "#a78bfa",   // violet
  2: "#8b5cf6",
  3: "#7c3aed",
  4: "#6366f1",
  5: "#4f46e5",   // indigo
  6: "#3b82f6",
  7: "#0ea5e9",
  8: "#06b6d4",   // cyan — newest
};

/** Rank-based gradient — for TopPlayers + TopSets where ordering matters more than category. */
export const RANK_GRADIENT: string[] = [
  "#5eead4", // top — bright teal
  "#67e8f9",
  "#7dd3fc",
  "#a5b4fc",
  "#c4b5fd",
  "#d8b4fe",
  "#f0abfc",
  "#fda4af",
  "#fcd34d",
  "#fde68a",
  "#bef264",
  "#86efac",
  "#67e8f9",
  "#7dd3fc",
  "#a5b4fc",
  "#c4b5fd",
  "#d8b4fe",
  "#f0abfc",
  "#fda4af",
  "#fcd34d", // bottom of 20
];

/** Market direction — gain / loss / neutral. Mirror Bloomberg green-up red-down. */
export const DIRECTION_COLOR = {
  up: "#5eead4",      // teal-green
  down: "#fb7185",    // coral-red
  flat: "#94a3b8",    // slate
};

/** Accent for primary lines (concentration curve, hero metric). */
export const ACCENT = "#fcd34d"; // gold

/** Semantic helpers — pick the right color regardless of dimension shape. */
export function colorForTier(tierName: string | null): string {
  return TIER_COLOR[tierName ?? "Unknown"] ?? TIER_COLOR.Unknown;
}

export function colorForParallel(parallelId: number | null): string {
  return PARALLEL_COLOR_BY_ID[parallelId ?? 0] ?? PARALLEL_COLOR_BY_ID[0];
}

export function colorForSeries(seriesNumber: number | null): string {
  return SERIES_COLOR[seriesNumber ?? 0] ?? "#475569";
}

export function colorForRank(rank: number): string {
  return RANK_GRADIENT[Math.min(rank, RANK_GRADIENT.length - 1)];
}

export function colorForDelta(pct: number): string {
  if (pct > 0.5) return DIRECTION_COLOR.up;
  if (pct < -0.5) return DIRECTION_COLOR.down;
  return DIRECTION_COLOR.flat;
}
