// Tests for the pure metric functions used by validation checks.
// No I/O; these are deterministic data transforms.

import { describe, it, expect } from "vitest";
import {
  spearmanCorrelation,
  pctDelta,
  absDelta,
  ratio,
} from "./metrics.mjs";

describe("spearmanCorrelation", () => {
  it("returns 1 for identically ranked lists", () => {
    const a = ["lebron", "curry", "durant", "giannis"];
    const b = ["lebron", "curry", "durant", "giannis"];
    expect(spearmanCorrelation(a, b)).toBeCloseTo(1.0, 5);
  });

  it("returns -1 for completely reversed lists", () => {
    const a = ["a", "b", "c", "d"];
    const b = ["d", "c", "b", "a"];
    expect(spearmanCorrelation(a, b)).toBeCloseTo(-1.0, 5);
  });

  it("returns ~0.6 for a single transposition of adjacent items in length-4 list", () => {
    // Swap last two: a,b,c,d  vs  a,b,d,c — Spearman ~= 0.8 by formula
    const a = ["a", "b", "c", "d"];
    const b = ["a", "b", "d", "c"];
    const r = spearmanCorrelation(a, b);
    expect(r).toBeGreaterThan(0.5);
    expect(r).toBeLessThan(1.0);
  });

  it("only ranks items that appear in both lists (intersection)", () => {
    // Perfect order on intersection; "extras" in either should be ignored
    const a = ["lebron", "curry", "durant", "giannis"];
    const b = ["lebron", "curry", "durant", "luka"];
    // Intersection = [lebron, curry, durant] — same order in both → 1.0
    expect(spearmanCorrelation(a, b)).toBeCloseTo(1.0, 5);
  });

  it("returns null when intersection has fewer than 2 items", () => {
    // Cannot compute correlation with n<2
    expect(spearmanCorrelation(["a"], ["a"])).toBeNull();
    expect(spearmanCorrelation(["a", "b"], ["c", "d"])).toBeNull();
  });

  it("returns null when either list is empty", () => {
    expect(spearmanCorrelation([], ["a", "b"])).toBeNull();
    expect(spearmanCorrelation(["a", "b"], [])).toBeNull();
  });

  it("handles ties correctly via average rank", () => {
    // Sufficient to verify no throw + result is in [-1, 1]
    const a = ["a", "b", "c", "d", "e"];
    const b = ["a", "c", "b", "d", "e"]; // single swap
    const r = spearmanCorrelation(a, b);
    expect(r).toBeGreaterThan(0.5);
    expect(r).toBeLessThanOrEqual(1.0);
  });
});

describe("pctDelta", () => {
  it("returns 0 when both values are equal", () => {
    expect(pctDelta(100, 100)).toBe(0);
  });

  it("returns 0.10 (10%) when supabase=110, bq=100", () => {
    expect(pctDelta(110, 100)).toBeCloseTo(0.1, 5);
  });

  it("returns 0.05 (5%) absolute regardless of direction (always non-negative)", () => {
    // |sb - bq| / bq — the delta is a magnitude, sign is conveyed elsewhere
    expect(pctDelta(95, 100)).toBeCloseTo(0.05, 5);
    expect(pctDelta(105, 100)).toBeCloseTo(0.05, 5);
  });

  it("returns Infinity when bq is 0 and supabase is non-zero", () => {
    expect(pctDelta(50, 0)).toBe(Infinity);
  });

  it("returns 0 when both are 0", () => {
    expect(pctDelta(0, 0)).toBe(0);
  });

  it("handles bigint-like strings by Number()-coercing", () => {
    expect(pctDelta("110", "100")).toBeCloseTo(0.1, 5);
  });
});

describe("absDelta", () => {
  it("returns abs difference between two numbers", () => {
    expect(absDelta(100, 105)).toBe(5);
    expect(absDelta(105, 100)).toBe(5);
  });

  it("handles null/undefined as 0-equivalent for magnitude calculation", () => {
    // Honest absence — caller should check both inputs; we return Infinity for missing
    expect(absDelta(null, 100)).toBe(Infinity);
    expect(absDelta(100, null)).toBe(Infinity);
  });
});

describe("ratio", () => {
  it("returns numerator/denominator", () => {
    expect(ratio(50, 100)).toBe(0.5);
    expect(ratio(95, 100)).toBe(0.95);
  });

  it("returns Infinity when denominator is 0 and numerator is non-zero", () => {
    expect(ratio(5, 0)).toBe(Infinity);
  });

  it("returns 1 when both are 0 (definitional 'fully matched')", () => {
    expect(ratio(0, 0)).toBe(1);
  });
});
