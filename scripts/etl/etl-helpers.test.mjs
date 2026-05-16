// Tests for etl-helpers.mjs — PII filter, retry helper, chunk-by-week iterator.
// PII filter is the security boundary; if it leaks, that's an incident.
//
// Run: npx vitest run scripts/etl/etl-helpers.test.mjs

import { describe, it, expect } from "vitest";
import {
  pii_filter,
  chunkWeeks,
  retryWithBackoff,
  ALLOWLISTS,
  PII_DENYLIST,
} from "./lib/etl-helpers.mjs";

describe("pii_filter — transactions", () => {
  const row = {
    id: "tx-abc",
    transaction_type_id: "MARKETPLACE",
    transaction_state_id: "COMPLETE",
    asset_type_id: "MOMENT",
    product_specific_asset_id: "moment-123",
    gross_amount_usd: 100,
    net_amount_usd: 95,
    list_price_usd: 100,
    amount: 100,
    buyer_safe_name: "nba_top_shot",
    seller_safe_name: null,
    platform: "WEB",
    client_marketplace_id: "mkt-1",
    client_marketplace_safe_name: "nba_top_shot",
    updated_at: "2026-05-15T12:00:00Z",
    row_updated_at: "2026-05-15T12:00:01Z",
    // PII fields that MUST be dropped:
    buyer_country_code: "US",
    seller_country_code: "CA",
    buyer_province_code: "CA",
    seller_province_code: "ON",
    buyer_type_id: "USER",
    seller_type_id: "USER",
    buyer_is_guest: false,
    buyer_id: "user-uuid-buyer",
    seller_id: "user-uuid-seller",
    buyer_name: "alice",
    seller_name: "bob",
    buyer_email: "alice@example.com",
    seller_email: "bob@example.com",
    buyer_ip: "1.2.3.4",
    seller_ip: "5.6.7.8",
  };

  it("drops every PII field listed in spec", () => {
    const out = pii_filter(row, "transactions");
    expect(out.buyer_country_code).toBeUndefined();
    expect(out.seller_country_code).toBeUndefined();
    expect(out.buyer_province_code).toBeUndefined();
    expect(out.seller_province_code).toBeUndefined();
    expect(out.buyer_type_id).toBeUndefined();
    expect(out.seller_type_id).toBeUndefined();
    expect(out.buyer_is_guest).toBeUndefined();
    expect(out.buyer_id).toBeUndefined();
    expect(out.seller_id).toBeUndefined();
    expect(out.buyer_name).toBeUndefined();
    expect(out.seller_name).toBeUndefined();
    expect(out.buyer_email).toBeUndefined();
    expect(out.seller_email).toBeUndefined();
    expect(out.buyer_ip).toBeUndefined();
    expect(out.seller_ip).toBeUndefined();
  });

  it("keeps every allowlisted field with original value", () => {
    const out = pii_filter(row, "transactions");
    expect(out.id).toBe("tx-abc");
    expect(out.buyer_safe_name).toBe("nba_top_shot");
    expect(out.seller_safe_name).toBeNull();
    expect(out.gross_amount_usd).toBe(100);
    expect(out.product_specific_asset_id).toBe("moment-123");
    expect(out.updated_at).toBe("2026-05-15T12:00:00Z");
    expect(out.row_updated_at).toBe("2026-05-15T12:00:01Z");
  });

  it("drops fields not in allowlist (defense against schema drift)", () => {
    const rowWithUnknown = { ...row, mystery_field: "should-not-survive" };
    const out = pii_filter(rowWithUnknown, "transactions");
    expect(out.mystery_field).toBeUndefined();
  });
});

describe("pii_filter — moments", () => {
  it("drops owner_user_id when it's a Dapper user uuid (not a flow address)", () => {
    const row = {
      moment_id: "mom-1",
      edition_id: "ed-1",
      serial_number: 42,
      owner_user_id: "internal-uuid-xyz",
      top_shot_score: 0.9,
      moment_status: "ACTIVE",
      released_at: "2026-01-01T00:00:00Z",
      listed_at: null,
      listing_price_usd: null,
      pack_id: "pack-1",
      row_updated_at: "2026-05-15T12:00:00Z",
    };
    const out = pii_filter(row, "moments");
    expect(out.owner_user_id).toBeUndefined();
    expect(out.moment_id).toBe("mom-1");
    expect(out.serial_number).toBe(42);
  });
});

describe("pii_filter — denylist guard", () => {
  it("PII_DENYLIST and allowlists must not overlap (no field in both)", () => {
    for (const [table, allowed] of Object.entries(ALLOWLISTS)) {
      for (const f of allowed) {
        expect(PII_DENYLIST.includes(f), `${table}.${f} is in allowlist AND denylist`).toBe(false);
      }
    }
  });

  it("denylist fields are stripped even if accidentally allowlisted", () => {
    // Defense-in-depth: if someone adds 'buyer_country_code' to allowlist by mistake,
    // the denylist re-filters and removes it anyway.
    const out = pii_filter(
      { id: "x", buyer_country_code: "US", row_updated_at: "2026-01-01T00:00:00Z" },
      "transactions",
    );
    expect(out.buyer_country_code).toBeUndefined();
  });
});

describe("chunkWeeks", () => {
  it("yields weekly intervals from start to end inclusive", () => {
    const chunks = Array.from(
      chunkWeeks("2026-01-01T00:00:00Z", "2026-01-22T00:00:00Z"),
    );
    expect(chunks).toHaveLength(3);
    expect(chunks[0].start).toBe("2026-01-01T00:00:00.000Z");
    expect(chunks[0].end).toBe("2026-01-08T00:00:00.000Z");
    expect(chunks[2].end).toBe("2026-01-22T00:00:00.000Z");
  });

  it("clamps the final chunk to end timestamp", () => {
    const chunks = Array.from(
      chunkWeeks("2026-01-01T00:00:00Z", "2026-01-04T00:00:00Z"),
    );
    expect(chunks).toHaveLength(1);
    expect(chunks[0].end).toBe("2026-01-04T00:00:00.000Z");
  });

  it("returns empty when start >= end", () => {
    const chunks = Array.from(chunkWeeks("2026-01-10T00:00:00Z", "2026-01-10T00:00:00Z"));
    expect(chunks).toHaveLength(0);
  });
});

describe("retryWithBackoff", () => {
  it("returns result on first success without retries", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      return "ok";
    };
    const result = await retryWithBackoff(fn, { maxAttempts: 3, baseMs: 1 });
    expect(result).toBe("ok");
    expect(calls).toBe(1);
  });

  it("retries failures up to maxAttempts then throws", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      throw new Error("boom");
    };
    await expect(
      retryWithBackoff(fn, { maxAttempts: 3, baseMs: 1 }),
    ).rejects.toThrow("boom");
    expect(calls).toBe(3);
  });

  it("succeeds on retry after transient failure", async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls < 2) throw new Error("transient");
      return "recovered";
    };
    const result = await retryWithBackoff(fn, { maxAttempts: 3, baseMs: 1 });
    expect(result).toBe("recovered");
    expect(calls).toBe(2);
  });
});
