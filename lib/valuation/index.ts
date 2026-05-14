import type { MintedMoment, MomentTier } from "@/lib/topshot/types";
import { DEFAULT_RULES, type ValuationRules } from "./rules";

export interface Adjustment {
  rule: string;
  multiplier: number;
  rationale: string;
}

export interface Valuation {
  base: number | null;
  adjustments: Adjustment[];
  fairValue: number | null;
  confidence: "high" | "medium" | "low" | "none";
  confidenceReason: string;
}

export interface MarketContext {
  /** Most recent sales (price + date) for the same edition. Newest first. */
  recentSales?: Array<{ price: number; date?: string }>;
  /** Optional explicit floor (use when computing from a sampled edition floor). */
  editionFloor?: number | null;
}

/**
 * Pure valuation. Given a moment, its market context, and a rules object,
 * produce a Valuation with full adjustment trace.
 *
 * Base price priority:
 * 1. moment.lowAsk (live listing on this serial)
 * 2. marketContext.editionFloor (lowest serial of same edition currently listed)
 * 3. median(recentSales[:5])
 * 4. lastPurchasePrice
 * 5. null
 */
export function valueMoment(
  moment: MintedMoment,
  market: MarketContext = {},
  rules: ValuationRules = DEFAULT_RULES
): Valuation {
  const adjustments: Adjustment[] = [];

  // Base price selection (coerce string|number → number)
  let base: number | null = null;
  let baseSource = "";
  const lowAsk = moment.lowAsk == null ? null : Number(moment.lowAsk);
  const lastPp = moment.lastPurchasePrice == null ? null : Number(moment.lastPurchasePrice);
  if (lowAsk != null && isFinite(lowAsk) && lowAsk > 0) {
    base = lowAsk;
    baseSource = "lowAsk";
  } else if (market.editionFloor != null && market.editionFloor > 0) {
    base = market.editionFloor;
    baseSource = "editionFloor";
  } else if (market.recentSales && market.recentSales.length > 0) {
    const sorted = [...market.recentSales].slice(0, 5).map((s) => Number(s.price)).sort((a, b) => a - b);
    base = sorted[Math.floor(sorted.length / 2)];
    baseSource = `medianRecent(${sorted.length})`;
  } else if (lastPp != null && isFinite(lastPp) && lastPp > 0) {
    base = lastPp;
    baseSource = "lastPurchasePrice";
  }

  if (base == null) {
    return {
      base: null,
      adjustments: [],
      fairValue: null,
      confidence: "none",
      confidenceReason: "No live ask, no recent sales, no last purchase price.",
    };
  }

  // --- Rule 1: Jersey-serial match
  const jerseyStr = moment.play?.stats?.jerseyNumber;
  const serial = Number(moment.flowSerialNumber);
  const jersey = jerseyStr != null ? Number(jerseyStr) : NaN;
  if (isFinite(jersey) && jersey > 0 && serial === jersey) {
    adjustments.push({
      rule: "jerseyMatch",
      multiplier: 1 + rules.jerseyPremium,
      rationale: `Serial #${serial} matches jersey #${jersey} (+${Math.round(rules.jerseyPremium * 100)}%).`,
    });
  }

  // --- Rule 2: Serial #1
  if (serial === 1) {
    adjustments.push({
      rule: "serial1",
      multiplier: 1 + rules.serial1Premium,
      rationale: `Serial #1 in edition (+${Math.round(rules.serial1Premium * 100)}%).`,
    });
  }

  // --- Rule 3: Last-serial premium
  const circ = moment.edition?.circulationCount ?? 0;
  if (circ > 0 && serial === circ) {
    adjustments.push({
      rule: "lastSerial",
      multiplier: 1 + rules.lastSerialPremium,
      rationale: `Final serial #${serial} of /${circ} (+${Math.round(rules.lastSerialPremium * 100)}%).`,
    });
  }

  // --- Rule 4: Low-serial tier (first match wins, skip if already serial1)
  if (serial > 1) {
    for (const tier of rules.lowSerialTiers) {
      if (serial <= tier.threshold) {
        adjustments.push({
          rule: `lowSerial≤${tier.threshold}`,
          multiplier: 1 + tier.premium,
          rationale: `Low serial #${serial} (top ${tier.threshold}) (+${Math.round(tier.premium * 100)}%).`,
        });
        break;
      }
    }
  }

  // --- Rule 5: Edition tier multiplier
  const tier = (moment.edition?.tier ?? moment.tier) as MomentTier | undefined;
  if (tier && rules.editionTierMultipliers[tier] && rules.editionTierMultipliers[tier] !== 1) {
    const m = rules.editionTierMultipliers[tier];
    adjustments.push({
      rule: `tier:${tier.replace("MOMENT_TIER_", "")}`,
      multiplier: m,
      rationale: `${tier.replace("MOMENT_TIER_", "")} tier (×${m.toFixed(2)}).`,
    });
  }

  // --- Rule 6: Parallel multiplier
  const parallelId = moment.edition?.parallelID ?? 0;
  if (rules.parallelMultipliers[parallelId] && rules.parallelMultipliers[parallelId] !== 1) {
    const m = rules.parallelMultipliers[parallelId];
    adjustments.push({
      rule: `parallel:${parallelId}`,
      multiplier: m,
      rationale: `Parallel variant #${parallelId} (×${m.toFixed(2)}).`,
    });
  }

  const fairValue = adjustments.reduce((v, a) => v * a.multiplier, base);

  // Confidence band
  const compCount = market.recentSales?.length ?? 0;
  let confidence: Valuation["confidence"] = "low";
  let reason = "";
  if (compCount >= rules.confidence.high) {
    confidence = "high";
    reason = `${compCount} recent comps · base from ${baseSource}.`;
  } else if (compCount >= rules.confidence.medium) {
    confidence = "medium";
    reason = `${compCount} recent comps (thin) · base from ${baseSource}.`;
  } else if (baseSource === "lowAsk") {
    confidence = "medium";
    reason = `Live ask but only ${compCount} recent comps.`;
  } else if (baseSource === "lastPurchasePrice") {
    confidence = "low";
    reason = `No recent comps and no active ask — using last purchase price as cold proxy.`;
  } else {
    confidence = "low";
    reason = `Thin market: ${compCount} comp(s), base from ${baseSource}.`;
  }

  return { base, adjustments, fairValue, confidence, confidenceReason: reason };
}

export { DEFAULT_RULES };
export type { ValuationRules };
