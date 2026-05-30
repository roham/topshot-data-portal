// State of the Market — index rail orchestrator.
//
// Normalizes the three first-class synthesized indices (Rookies / Grail / TS-50)
// into one uniform card shape so the hero + switcher rail render uniformly,
// regardless of each synthesizer's bespoke result fields. Featured index is
// chosen by the ?idx= URL param; default is Rookies (the growth engine).
//
// Every value here is real (computed from mcap snapshots). `is_thin` carries the
// honest-thinness flag through to the UI — no fabricated marks.

import { getRookiesIndex } from "@/lib/indices/rookies-synthesizer";
import { getGrailIndex } from "@/lib/indices/grail-synthesizer";
import { getTS50Index } from "@/lib/indices/ts50-synthesizer";

export type MarketIndexKey = "rookies" | "grail" | "ts50";

export interface MarketIndexPoint {
  date: string;
  value: number; // normalized index value (first point = 100)
  mcap: number; // basket mcap on that date, USD
}

export interface MarketIndexCard {
  key: MarketIndexKey;
  name: string; // rail label, e.g. "ROOKIES"
  sublabel: string; // one-line descriptor (analyst voice, not rationale)
  basket_mcap_usd: number; // nominal basket value, USD
  pct_change: number; // % change across the series window
  series: MarketIndexPoint[];
  is_thin: boolean;
  as_of_date: string | null;
}

export const DEFAULT_INDEX: MarketIndexKey = "rookies";

export function parseIndexKey(raw: string | string[] | undefined): MarketIndexKey {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "grail" || v === "ts50" || v === "rookies") return v;
  return DEFAULT_INDEX;
}

/**
 * Fetch all three indices in parallel, normalized to the common card shape.
 * `lookbackDays` controls the series window for every index.
 */
export async function getMarketIndices(lookbackDays = 30): Promise<MarketIndexCard[]> {
  const [rookies, grail, ts50] = await Promise.all([
    getRookiesIndex(lookbackDays),
    getGrailIndex(lookbackDays),
    getTS50Index(lookbackDays),
  ]);

  return [
    {
      key: "rookies",
      name: "ROOKIES",
      sublabel: rookies.draft_year_used
        ? `${rookies.draft_year_used} draft class`
        : "current draft class",
      basket_mcap_usd: rookies.basket_mcap_total_usd,
      pct_change: rookies.series_pct_change,
      series: rookies.series.map((p) => ({
        date: p.date,
        value: p.index_value,
        mcap: p.basket_mcap_usd,
      })),
      is_thin: rookies.is_thin,
      as_of_date: rookies.as_of_date,
    },
    {
      key: "grail",
      name: "GRAIL",
      sublabel: "blue-chip basket",
      basket_mcap_usd: grail.basket_mcap_total_usd,
      pct_change: grail.series_pct_change,
      series: grail.series.map((p) => ({
        date: p.date,
        value: p.index_value,
        mcap: p.basket_mcap_usd,
      })),
      // GrailIndexResult has no is_thin flag — derive it from coverage.
      is_thin: grail.days_of_history < 2 || grail.basket_active_size === 0,
      as_of_date: grail.as_of_date,
    },
    {
      key: "ts50",
      name: "TS-50",
      sublabel: "top 50 by cap × floor",
      basket_mcap_usd: ts50.basket_mcap_total_usd,
      pct_change: ts50.series_pct_change,
      series: ts50.series.map((p) => ({
        date: p.date,
        value: p.index_value,
        mcap: p.basket_mcap_usd,
      })),
      is_thin: ts50.is_thin,
      as_of_date: ts50.as_of_date,
    },
  ];
}
