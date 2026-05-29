// Rookie draft-year constants — shared by the rookies synthesizer (server) and
// the RookieYearSelect control (client). Kept free of server-only deps
// (no node:crypto, no unstable_cache) so a client component can import it.

// The 2025 draft class = the 2025–26 rookies, i.e. "this season's" rookies.
// This is the default basket; any prior class is reachable via the year filter.
export const CURRENT_ROOKIE_YEAR = "2025";

// Draft years exposed in the year filter. Every one of these has
// market-cap-bearing editions in topshot.market_caps (verified 2026-05-28).
export const SELECTABLE_ROOKIE_YEARS = [
  "2025", "2024", "2023", "2022", "2021", "2020",
  "2019", "2018", "2017", "2016", "2015", "2014",
] as const;

export type RookieYear = (typeof SELECTABLE_ROOKIE_YEARS)[number];

/** Coerce a raw `ry` searchParam to a valid draft year, defaulting to current. */
export function parseRookieYear(raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && (SELECTABLE_ROOKIE_YEARS as readonly string[]).includes(v)
    ? v
    : CURRENT_ROOKIE_YEAR;
}
