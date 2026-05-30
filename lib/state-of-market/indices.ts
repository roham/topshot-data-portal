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
  basket_mcap_usd: number; // nominal basket value, USD (current)
  pct_change: number; // % change across the series window
  delta_usd: number; // dollar change across the series window (now − start)
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
    toCard("rookies", "ROOKIES", rookies.draft_year_used
      ? `${rookies.draft_year_used} draft class`
      : "current draft class", rookies.is_thin, rookies),
    toCard("grail", "GRAIL", "blue-chip basket",
      // GrailIndexResult has no is_thin flag — derive it from coverage.
      grail.days_of_history < 2 || grail.basket_active_size === 0, grail),
    toCard("ts50", "TS-50", "top 50 by cap × floor", ts50.is_thin, ts50),
  ];
}

// Shared synthesizer result shape (the fields all three indices expose that we
// need). Each synth also exposes index_value per point — we deliberately ignore
// it (see below).
interface SynthResult {
  series: { date: string; index_value: number; basket_mcap_usd: number }[];
  basket_mcap_total_usd: number;
  as_of_date: string | null;
}

/**
 * % change over the window, computed from the HONEST DOLLAR series
 * (`basket_mcap_usd`) — the same series the hero chart plots — NOT from the
 * normalized `index_value`.
 *
 * Why: the synthesizers normalize `index_value` to 100 at the first in-window
 * date, and that baseline (`weightedSumByDate[0]`) collapses when the start of
 * the window lands on a sparse-coverage snapshot, producing nonsense like
 * Grail +404% over 30d while the dollar basket sat flat at ~$25M. Anchoring the
 * headline on the dollar series keeps the number consistent with the chart and
 * monotonic across windows (a 30d move is contained within the 90d/1y series).
 */
function dollarPct(series: { basket_mcap_usd: number }[]): number {
  const nonzero = series.filter((p) => p.basket_mcap_usd > 0);
  if (nonzero.length < 2) return 0;
  const first = nonzero[0].basket_mcap_usd;
  const last = nonzero[nonzero.length - 1].basket_mcap_usd;
  return first > 0 ? ((last - first) / first) * 100 : 0;
}

function dollarDelta(series: { basket_mcap_usd: number }[]): number {
  const nonzero = series.filter((p) => p.basket_mcap_usd > 0);
  if (nonzero.length < 2) return 0;
  return nonzero[nonzero.length - 1].basket_mcap_usd - nonzero[0].basket_mcap_usd;
}

function toCard(
  key: MarketIndexKey,
  name: string,
  sublabel: string,
  isThin: boolean,
  synth: SynthResult,
): MarketIndexCard {
  return {
    key,
    name,
    sublabel,
    basket_mcap_usd: synth.basket_mcap_total_usd,
    pct_change: dollarPct(synth.series),
    delta_usd: dollarDelta(synth.series),
    // value === mcap on purpose: chart, sparkline, and headline % all read the
    // one honest dollar series, so they can never disagree.
    series: synth.series.map((p) => ({
      date: p.date,
      value: p.basket_mcap_usd,
      mcap: p.basket_mcap_usd,
    })),
    is_thin: isThin,
    as_of_date: synth.as_of_date,
  };
}
