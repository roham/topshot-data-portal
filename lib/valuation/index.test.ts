import { describe, it, expect } from "vitest";
import { valueMoment, DEFAULT_RULES } from "./index";
import type { MintedMoment } from "@/lib/topshot/types";

function m(over: Partial<MintedMoment> = {}): MintedMoment {
  return {
    flowId: "x",
    flowSerialNumber: "10",
    tier: "MOMENT_TIER_COMMON",
    edition: { circulationCount: 1000, parallelID: 0, tier: "MOMENT_TIER_COMMON" },
    play: { stats: { playerName: "X", jerseyNumber: "23" } },
    set: { flowName: "Base Set" },
    lowAsk: 10,
    forSale: true,
    ...over,
  };
}

describe("valuation engine", () => {
  it("returns none when no base price exists", () => {
    const v = valueMoment({ ...m(), lowAsk: null, lastPurchasePrice: null }, { recentSales: [] });
    expect(v.fairValue).toBe(null);
    expect(v.confidence).toBe("none");
  });

  it("applies jersey-match premium when serial == jersey", () => {
    const v = valueMoment(m({ flowSerialNumber: "23" }));
    expect(v.adjustments.find((a) => a.rule === "jerseyMatch")).toBeTruthy();
    expect(v.fairValue).toBeGreaterThan(v.base!);
  });

  it("applies serial #1 premium", () => {
    const v = valueMoment(m({ flowSerialNumber: "1" }));
    expect(v.adjustments.find((a) => a.rule === "serial1")).toBeTruthy();
    // Default +100% means fairValue should be at least 2× base
    expect(v.fairValue!).toBeGreaterThanOrEqual(v.base! * 2);
  });

  it("applies low-serial tier ≤10 for serial 5", () => {
    const v = valueMoment(m({ flowSerialNumber: "5" }));
    const tier = v.adjustments.find((a) => a.rule.startsWith("lowSerial"));
    expect(tier).toBeTruthy();
    expect(tier!.multiplier).toBeCloseTo(1.5);
  });

  it("applies last-serial premium when serial == circulation", () => {
    const v = valueMoment(m({ flowSerialNumber: "1000" }));
    expect(v.adjustments.find((a) => a.rule === "lastSerial")).toBeTruthy();
  });

  it("applies legendary tier multiplier", () => {
    const v = valueMoment(
      m({ tier: "MOMENT_TIER_LEGENDARY", edition: { circulationCount: 100, tier: "MOMENT_TIER_LEGENDARY", parallelID: 0 } })
    );
    const adj = v.adjustments.find((a) => a.rule.startsWith("tier:"));
    expect(adj).toBeTruthy();
    expect(adj!.multiplier).toBeCloseTo(1.2);
  });

  it("applies parallel multiplier when parallelID > 0", () => {
    const v = valueMoment(m({ edition: { circulationCount: 100, parallelID: 2, tier: "MOMENT_TIER_COMMON" } }));
    const adj = v.adjustments.find((a) => a.rule.startsWith("parallel:"));
    expect(adj).toBeTruthy();
    expect(adj!.multiplier).toBeCloseTo(1.3);
  });

  it("does not double-apply low-serial when serial1 already applied", () => {
    const v = valueMoment(m({ flowSerialNumber: "1" }));
    const low = v.adjustments.find((a) => a.rule.startsWith("lowSerial"));
    expect(low).toBeFalsy();
  });

  it("compounds multipliers correctly: jersey + low-serial + legendary + parallel", () => {
    const v = valueMoment(
      m({
        flowSerialNumber: "23",
        tier: "MOMENT_TIER_LEGENDARY",
        edition: { circulationCount: 75, parallelID: 1, tier: "MOMENT_TIER_LEGENDARY" },
        play: { stats: { playerName: "X", jerseyNumber: "23" } },
      })
    );
    // serial 23 is ≤ 100 so low-serial tier 0.2 applies; jersey 23 match adds 0.5; leg 1.2; parallel-1 1.2.
    const expected = 10 * 1.5 * 1.2 * 1.2 * 1.2;
    expect(v.fairValue!).toBeCloseTo(expected, 3);
  });

  it("uses editionFloor when lowAsk null", () => {
    const v = valueMoment(
      { ...m(), lowAsk: null, forSale: false },
      { editionFloor: 50, recentSales: [{ price: 49 }, { price: 51 }, { price: 50 }] }
    );
    expect(v.base).toBe(50);
  });

  it("uses median of recent sales when no live floor", () => {
    const v = valueMoment(
      { ...m(), lowAsk: null, forSale: false },
      { recentSales: [{ price: 10 }, { price: 30 }, { price: 20 }] }
    );
    expect(v.base).toBe(20);
  });

  it("uses lastPurchasePrice as last resort", () => {
    const v = valueMoment(
      { ...m(), lowAsk: null, forSale: false, lastPurchasePrice: 5 },
      { recentSales: [] }
    );
    expect(v.base).toBe(5);
    expect(v.confidence).toBe("low");
  });

  it("reports high confidence when many comps", () => {
    const comps = Array(12).fill(0).map((_, i) => ({ price: 100 + i }));
    const v = valueMoment(m(), { recentSales: comps });
    expect(v.confidence).toBe("high");
  });

  it("reports low confidence when thin market", () => {
    const v = valueMoment({ ...m(), lowAsk: null }, { recentSales: [{ price: 10 }] });
    expect(v.confidence).toBe("low");
  });

  it("DEFAULT_RULES are stable known values", () => {
    expect(DEFAULT_RULES.jerseyPremium).toBe(0.5);
    expect(DEFAULT_RULES.serial1Premium).toBe(1.0);
  });

  it("ultimate tier amplifies the most", () => {
    const v = valueMoment(
      m({ tier: "MOMENT_TIER_ULTIMATE", edition: { circulationCount: 99, parallelID: 0, tier: "MOMENT_TIER_ULTIMATE" } })
    );
    const adj = v.adjustments.find((a) => a.rule.startsWith("tier:"));
    expect(adj!.multiplier).toBeCloseTo(1.5);
  });

  it("fandom tier slightly discounts", () => {
    const v = valueMoment(
      m({ tier: "MOMENT_TIER_FANDOM", edition: { circulationCount: 3000, parallelID: 0, tier: "MOMENT_TIER_FANDOM" } })
    );
    const adj = v.adjustments.find((a) => a.rule.startsWith("tier:"));
    expect(adj!.multiplier).toBeCloseTo(0.95);
  });

  it("no jersey premium when jersey is 0", () => {
    const v = valueMoment(m({ play: { stats: { playerName: "X", jerseyNumber: "0" } }, flowSerialNumber: "0" }));
    expect(v.adjustments.find((a) => a.rule === "jerseyMatch")).toBeFalsy();
  });

  it("rationale strings are non-empty and explanatory", () => {
    const v = valueMoment(m({ flowSerialNumber: "1" }));
    for (const a of v.adjustments) {
      expect(a.rationale.length).toBeGreaterThan(10);
    }
  });

  it("fairValue equals base when no premium rules apply (above all low-serial thresholds, base tier, parallel 0)", () => {
    const v = valueMoment(
      m({
        flowSerialNumber: "5555",
        edition: { circulationCount: 12000, parallelID: 0, tier: "MOMENT_TIER_COMMON" },
        play: { stats: { playerName: "X", jerseyNumber: "23" } },
      })
    );
    expect(v.fairValue).toBe(v.base);
  });

  it("medium confidence with live ask + few comps", () => {
    const v = valueMoment(m(), { recentSales: [{ price: 10 }, { price: 11 }, { price: 12 }, { price: 13 }] });
    expect(v.confidence).toBe("medium");
  });

  it("multiple parallel multipliers respect rules", () => {
    const v0 = valueMoment(m({ edition: { circulationCount: 100, parallelID: 0, tier: "MOMENT_TIER_COMMON" } }));
    const v3 = valueMoment(m({ edition: { circulationCount: 100, parallelID: 3, tier: "MOMENT_TIER_COMMON" } }));
    expect(v3.fairValue!).toBeGreaterThan(v0.fairValue!);
  });
});
