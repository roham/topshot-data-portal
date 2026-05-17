// Server-safe parser for the ?mcap= URL param. The toggle UI lives in a
// "use client" component; the page reads this from searchParams server-side.

export type McapFormula = "floor" | "avg_sale";

export function parseMcapFormula(value: string | undefined | null): McapFormula {
  return value === "avg_sale" ? "avg_sale" : "floor";
}
