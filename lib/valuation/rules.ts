import type { MomentTier } from "@/lib/topshot/types";

export interface ValuationRules {
  /** Premium applied when serial number equals jersey number, e.g. +0.5 = +50%. */
  jerseyPremium: number;
  /** Premium for serial #1, e.g. +1.0 = +100%. */
  serial1Premium: number;
  /** Tiered premiums for low-serial moments. Walked in order; first match wins. */
  lowSerialTiers: Array<{ threshold: number; premium: number }>;
  /** Premium for the last serial in the circulation. */
  lastSerialPremium: number;
  /** Multipliers by play tier. */
  editionTierMultipliers: Record<MomentTier, number>;
  /** Multipliers by parallel ID (0 = Base). Additional IDs can be added by users in the rules editor. */
  parallelMultipliers: Record<number, number>;
  /** Floor confidence thresholds (sales-comp count window). */
  confidence: {
    high: number;
    medium: number;
  };
}

export const DEFAULT_RULES: ValuationRules = {
  jerseyPremium: 0.5,
  serial1Premium: 1.0,
  lowSerialTiers: [
    { threshold: 10, premium: 0.5 },
    { threshold: 100, premium: 0.2 },
    { threshold: 1000, premium: 0.05 },
  ],
  lastSerialPremium: 0.3,
  editionTierMultipliers: {
    MOMENT_TIER_COMMON: 1.0,
    MOMENT_TIER_FANDOM: 0.95,
    MOMENT_TIER_RARE: 1.05,
    MOMENT_TIER_LEGENDARY: 1.2,
    MOMENT_TIER_ULTIMATE: 1.5,
  },
  parallelMultipliers: {
    0: 1.0, // Base
    1: 1.2, // Anthology / first known parallel
    2: 1.3, // Holo
    3: 1.4, // In Color
  },
  confidence: {
    high: 10,
    medium: 3,
  },
};
