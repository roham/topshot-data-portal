// Tests for the check definitions — pass-comparator logic and per-check
// compute() with synthetic rows. Real BQ/Supabase wiring is tested via the
// runner's actual execution (run.mjs); these tests cover the pure transforms.

import { describe, it, expect } from "vitest";
import { CHECKS, checkPasses } from "./checks.mjs";

describe("checkPasses", () => {
  it("spearman passes when metricValue >= threshold", () => {
    const check = { metric: "spearman", threshold: 0.7, passComparator: ">=" };
    expect(checkPasses(check, 0.8)).toBe(true);
    expect(checkPasses(check, 0.7)).toBe(true);
    expect(checkPasses(check, 0.6)).toBe(false);
  });

  it("pct_delta passes when metricValue <= threshold", () => {
    const check = { metric: "pct_delta", threshold: 0.05, passComparator: "<=" };
    expect(checkPasses(check, 0.02)).toBe(true);
    expect(checkPasses(check, 0.05)).toBe(true);
    expect(checkPasses(check, 0.1)).toBe(false);
  });

  it("ratio passes when metricValue >= threshold", () => {
    const check = { metric: "ratio", threshold: 0.95, passComparator: ">=" };
    expect(checkPasses(check, 1.0)).toBe(true);
    expect(checkPasses(check, 0.95)).toBe(true);
    expect(checkPasses(check, 0.5)).toBe(false);
  });

  it("returns false when metricValue is null", () => {
    const check = { metric: "spearman", threshold: 0.7, passComparator: ">=" };
    expect(checkPasses(check, null)).toBe(false);
    expect(checkPasses(check, undefined)).toBe(false);
  });

  it("returns false when metricValue is Infinity", () => {
    const check = { metric: "pct_delta", threshold: 0.05, passComparator: "<=" };
    expect(checkPasses(check, Infinity)).toBe(false);
  });
});

describe("CHECKS registry", () => {
  it("exposes all 8 checks named in the spec", () => {
    const names = CHECKS.map((c) => c.name).sort();
    expect(names).toEqual(
      [
        "distinct_moments_traded_24h_pct_delta",
        "largest_sale_24h_abs_delta",
        "moments_table_coverage_ratio",
        "top_players_24h_spearman",
        "top_players_7d_spearman",
        "total_tx_count_24h_pct_delta",
        "total_volume_24h_pct_delta",
        "transactions_coverage_7d_ratio",
      ].sort(),
    );
  });

  it("every check exposes the required shape", () => {
    for (const c of CHECKS) {
      expect(typeof c.name).toBe("string");
      expect(typeof c.description).toBe("string");
      expect(["spearman", "pct_delta", "abs_delta", "ratio"]).toContain(c.metric);
      expect(typeof c.threshold).toBe("number");
      expect([">=", "<="]).toContain(c.passComparator);
      expect(typeof c.bqSql).toBe("string");
      expect(c.bqSql.length).toBeGreaterThan(10);
      expect(typeof c.sbSql).toBe("string");
      expect(c.sbSql.length).toBeGreaterThan(10);
      expect(typeof c.compute).toBe("function");
    }
  });
});

describe("compute functions with synthetic rows", () => {
  const byName = (n) => CHECKS.find((c) => c.name === n);

  it("top_players_24h: identical lists yield spearman=1", () => {
    const c = byName("top_players_24h_spearman");
    const bq = [{ player_name: "A" }, { player_name: "B" }, { player_name: "C" }];
    const sb = [{ player_name: "A" }, { player_name: "B" }, { player_name: "C" }];
    const out = c.compute(bq, sb);
    expect(out.metricValue).toBeCloseTo(1.0, 5);
  });

  it("total_volume_24h: equal totals yield pct_delta=0", () => {
    const c = byName("total_volume_24h_pct_delta");
    const out = c.compute(
      [{ total_volume_usd: "1000.00" }],
      [{ total_volume_usd: "1000.00" }],
    );
    expect(out.metricValue).toBe(0);
    expect(out.bqValue).toBe(1000);
    expect(out.sbValue).toBe(1000);
  });

  it("moments_coverage: sb < bq yields ratio < 1", () => {
    const c = byName("moments_table_coverage_ratio");
    const out = c.compute(
      [{ bq_count: "1000000" }],
      [{ sb_count: "500000" }],
    );
    expect(out.metricValue).toBe(0.5);
  });

  it("largest_sale_24h: equal max yields abs_delta=0", () => {
    const c = byName("largest_sale_24h_abs_delta");
    const out = c.compute(
      [{ max_sale_usd: "12345.67" }],
      [{ gross_amount_usd: "12345.67" }],
    );
    expect(out.metricValue).toBe(0);
  });

  it("largest_sale_24h: $1.50 delta exceeds $1 threshold", () => {
    const c = byName("largest_sale_24h_abs_delta");
    const out = c.compute(
      [{ max_sale_usd: "100.00" }],
      [{ gross_amount_usd: "101.50" }],
    );
    expect(out.metricValue).toBe(1.5);
    expect(checkPasses(c, out.metricValue)).toBe(false);
  });
});
