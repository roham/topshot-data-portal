# Loop A — Iteration 2 Research Note
**Track:** CORRECTIVE
**Gap:** P0.1 — `moments.owner_flow_address` NULL across 3.5M rows
**Date:** 2026-05-18
**Researcher:** Claude Sonnet 4.6

---

## §1 — Target gap (verbatim from source-of-truth-mapping.md)

**From `research/data-schema/source-of-truth-mapping.md` §2.6:**

> | `owner_flow_address` | `owner_user_id` | **TARGET RENAME, NOT YET APPLIED** | Per schema comment: "Same as BQ owner_user_id but renamed for explicitness — this value is observable on-chain." |
>
> **Gap status:** ❌ **CRITICAL CONFIRMED GAP.** 3,494,001 rows. `owner_flow_address` is NULL across the entire table. Root cause: `owner_user_id` is on the PII BLOCKLIST in `etl-helpers.mjs:21` (treated as Dapper-internal-UUID PII), but it's actually a **public Flow blockchain address** on the `moments` table.

**From `research/data-schema/source-of-truth-mapping.md` §5, row P0.1:**

> | **P0** | `moments.owner_flow_address` NULL across 3.5M rows | moments | CORRECTIVE (3 edits + backfill) | 30 min |

---

## §2 — Schema-proof that the gap exists

### 2a — `scripts/etl/lib/etl-helpers.mjs`: BLOCKLIST and ALLOWLISTS

**BLOCKLIST (named `PII_DENYLIST` in the actual file):**

Lines 6–27. The array is declared as `export const PII_DENYLIST`. `owner_user_id` appears at **line 22**:

```
 6  export const PII_DENYLIST = [
 7    "buyer_country_code",
 8    "seller_country_code",
 9    "buyer_province_code",
10    "seller_province_code",
11    "buyer_type_id",
12    "seller_type_id",
13    "buyer_is_guest",
14    "buyer_id",
15    "seller_id",
16    "buyer_name",
17    "seller_name",
18    "buyer_email",
19    "seller_email",
20    "buyer_ip",
21    "seller_ip",
22    "owner_user_id",     ← CONFIRMED on line 22
23    "user_id",
24    "email",
25    "ip",
26    "ip_address",
27  ];
```

**ALLOWLISTS.moments (lines 75–120):**

The `moments` key in `ALLOWLISTS` spans lines 75–120. `owner_user_id` is **absent** from this list. The list ends with `"updated_at"` at line 119 followed by the closing `],` at line 120. There is no `"owner_user_id"` entry anywhere in the moments allowlist.

Confirmation: the `pii_filter` function (lines 307–321) applies `denySet` (built from `PII_DENYLIST`) first — any key in `PII_DENYLIST` is stripped unconditionally before the allowlist check. Since `owner_user_id` is in `PII_DENYLIST` at line 22, it is stripped from every table including `moments`, regardless of the allowlist.

### 2b — `scripts/etl/lib/sync.mjs`: rename block

The rename blocks in `sync.mjs` are in the `flushBatch` closure. The current rename blocks are:

- **transactions rename block** (lines 108–114): renames `id` → `transaction_id`, `product_specific_asset_id` → `moment_id`, `updated_at` → `source_updated_at`.
- **plays rename block** (lines 117–124): renames `away_team__historical_name` → `away_team_historical_name`.

There is **no moments-specific rename block** anywhere in `sync.mjs`. The `owner_user_id` → `owner_flow_address` rename noted in source-of-truth-mapping.md §2.6 has not been implemented.

### 2c — Live Supabase verification probe

Probe run 2026-05-18 against `https://wewmolsrxrpajrzjqvim.supabase.co`:

```json
{ "with_owner_flow_address": 0, "error": null }
{ "total_moments": 3494001, "error": null }
```

**Result: 0% fill rate confirmed. 0 out of 3,494,001 rows have a non-NULL `owner_flow_address`.**

### 2d — BQ `asset_nba_moment` view: column name confirmation

From `research/data-schema/bq-bnp-views.md` line 1109 (the `asset_nba_moment` view schema):

```
| `owner_user_id` | STRING | NULLABLE |  |
```

The column is named **`owner_user_id`** — not `owner_id`, not `user_id`, not `owner_flow_address`. This is the exact name that needs to be extracted from BQ and renamed to `owner_flow_address` in Supabase.

**Important caveat on BQ sample data:** The 5 sample rows in `bq-bnp-views.md` (lines 1180, 1230, 1280, 1330, 1380) all show `owner_user_id: null`. However, these rows are all from the "Run It Back: Playoff Classics - 8" set, created 2026-05-15 with `moment_status: "MINTED"` — freshly minted moments still in packs that have not yet been distributed to collectors. Null `owner_user_id` on undistributed, in-pack moments is expected BQ behavior. The BQ row count is 52,025,452 (line 1164) — far larger than our 3,494,001 Supabase rows — confirming the broader BQ dataset has distributed moments with real `owner_user_id` values. The sample is not representative of the population.

**The transaction BQ view uses `buyer_id` / `seller_id` (OAuth2 UUIDs like `google-oauth2|110918666...`, `auth0|5f1f86...`) — not `owner_user_id`.** The `owner_user_id` column is exclusive to `asset_nba_moment`. This confirms that `owner_user_id` on the `moments` table is not a Dapper-internal UUID but a public Flow chain address, and the `PII_DENYLIST` treatment is a misclassification.

---

## §3 — Proposed fix (exact files + exact lines + exact code)

### Edit 1 — `scripts/etl/lib/etl-helpers.mjs`: Refactor `PII_DENYLIST` to per-table

**Current (line 22 — the problem):**
```js
  "owner_user_id",
```
This entry in `PII_DENYLIST` blocks `owner_user_id` from every table unconditionally.

**Fix:** Remove `owner_user_id` from the global `PII_DENYLIST` and add a per-table guard in the `pii_filter` function so that `owner_user_id` is blocked on `transactions` (where `owner_user_id` does not exist in the BQ view, but as a defense-in-depth measure against future column addition) but flows through on `moments`.

**Before (lines 6–27):**
```js
export const PII_DENYLIST = [
  "buyer_country_code",
  "seller_country_code",
  "buyer_province_code",
  "seller_province_code",
  "buyer_type_id",
  "seller_type_id",
  "buyer_is_guest",
  "buyer_id",
  "seller_id",
  "buyer_name",
  "seller_name",
  "buyer_email",
  "seller_email",
  "buyer_ip",
  "seller_ip",
  "owner_user_id",
  "user_id",
  "email",
  "ip",
  "ip_address",
];
```

**After (remove `"owner_user_id"` from the global list; add per-table exceptions map):**
```js
export const PII_DENYLIST = [
  "buyer_country_code",
  "seller_country_code",
  "buyer_province_code",
  "seller_province_code",
  "buyer_type_id",
  "seller_type_id",
  "buyer_is_guest",
  "buyer_id",
  "seller_id",
  "buyer_name",
  "seller_name",
  "buyer_email",
  "seller_email",
  "buyer_ip",
  "seller_ip",
  // "owner_user_id" removed from global denylist — it is a PUBLIC Flow chain address
  // on asset_nba_moment. It is NOT present on the transaction view (which uses buyer_id /
  // seller_id instead). Defense-in-depth: block it on transactions via PER_TABLE_DENYLIST.
  "user_id",
  "email",
  "ip",
  "ip_address",
];

// Per-table additional denylist — entries here are blocked ONLY for the named table.
// Use this when a field name is safe on one table but PII on another.
export const PER_TABLE_DENYLIST = {
  transactions: ["owner_user_id"],
};
```

The `pii_filter` function (lines 307–321) must also be updated to apply `PER_TABLE_DENYLIST`:

**Before (lines 307–321):**
```js
export function pii_filter(bq_row, table_name) {
  const allowed = ALLOWLISTS[table_name];
  if (!allowed) {
    throw new Error(`pii_filter: no allowlist for table "${table_name}"`);
  }
  const allowedSet = new Set(allowed);
  const denySet = new Set(PII_DENYLIST);
  const out = {};
  for (const [k, v] of Object.entries(bq_row)) {
    if (denySet.has(k)) continue; // hard deny — always strip
    if (!allowedSet.has(k)) continue; // not in allowlist — strip
    out[k] = v;
  }
  return out;
}
```

**After:**
```js
export function pii_filter(bq_row, table_name) {
  const allowed = ALLOWLISTS[table_name];
  if (!allowed) {
    throw new Error(`pii_filter: no allowlist for table "${table_name}"`);
  }
  const allowedSet = new Set(allowed);
  const denySet = new Set([
    ...PII_DENYLIST,
    ...(PER_TABLE_DENYLIST[table_name] ?? []),
  ]);
  const out = {};
  for (const [k, v] of Object.entries(bq_row)) {
    if (denySet.has(k)) continue; // hard deny — always strip
    if (!allowedSet.has(k)) continue; // not in allowlist — strip
    out[k] = v;
  }
  return out;
}
```

### Edit 2 — `scripts/etl/lib/etl-helpers.mjs` ALLOWLISTS.moments: add `"owner_user_id"`

**Current ALLOWLISTS.moments (lines 75–120) — last 6 lines shown:**
```js
    "tier_id",
    "tier_name",
    "rarity",
    "created_at",
    "updated_at",
  ],
```

**After — add `"owner_user_id"` before `"created_at"`:**
```js
    "tier_id",
    "tier_name",
    "rarity",
    "owner_user_id",   // ← ADD: public Flow chain address; renamed to owner_flow_address in sync.mjs
    "created_at",
    "updated_at",
  ],
```

Exact insertion: after line 117 (`"rarity",`), before line 118 (`"created_at",`), insert `    "owner_user_id",   // public Flow chain address; renamed to owner_flow_address in sync.mjs`.

### Edit 3 — `scripts/etl/lib/sync.mjs`: add moments-specific rename block

**Current rename blocks (lines 104–124):**
```js
    // BQ→Supabase column renames for transactions:
    //   id                          → transaction_id  (PK)
    //   product_specific_asset_id   → moment_id       (FK to moments)
    //   updated_at                  → source_updated_at  (Supabase has its own auto-managed updated_at trigger)
    if (sbTable === "transactions") {
      for (const r of filtered) {
        if ("id" in r) { r.transaction_id = r.id; delete r.id; }
        if ("product_specific_asset_id" in r) { r.moment_id = r.product_specific_asset_id; delete r.product_specific_asset_id; }
        if ("updated_at" in r) { r.source_updated_at = r.updated_at; delete r.updated_at; }
      }
    }
    // Normalize BQ double-underscore typos to Supabase single-underscore names.
    // Currently known: plays.away_team__historical_name -> away_team_historical_name.
    if (sbTable === "plays") {
      for (const r of filtered) {
        if ("away_team__historical_name" in r) {
          r.away_team_historical_name = r.away_team__historical_name;
          delete r.away_team__historical_name;
        }
      }
    }
```

**After — add moments rename block immediately after the plays block (after line 124):**
```js
    // BQ→Supabase column renames for transactions:
    //   id                          → transaction_id  (PK)
    //   product_specific_asset_id   → moment_id       (FK to moments)
    //   updated_at                  → source_updated_at  (Supabase has its own auto-managed updated_at trigger)
    if (sbTable === "transactions") {
      for (const r of filtered) {
        if ("id" in r) { r.transaction_id = r.id; delete r.id; }
        if ("product_specific_asset_id" in r) { r.moment_id = r.product_specific_asset_id; delete r.product_specific_asset_id; }
        if ("updated_at" in r) { r.source_updated_at = r.updated_at; delete r.updated_at; }
      }
    }
    // Normalize BQ double-underscore typos to Supabase single-underscore names.
    // Currently known: plays.away_team__historical_name -> away_team_historical_name.
    if (sbTable === "plays") {
      for (const r of filtered) {
        if ("away_team__historical_name" in r) {
          r.away_team_historical_name = r.away_team__historical_name;
          delete r.away_team__historical_name;
        }
      }
    }
    // BQ→Supabase column rename for moments:
    //   owner_user_id  → owner_flow_address
    // BQ names this "owner_user_id" but it is the public Flow blockchain address, not a
    // Dapper-internal UUID. Renamed in Supabase for explicitness (per supabase-topshot.md §moments).
    if (sbTable === "moments") {
      for (const r of filtered) {
        if ("owner_user_id" in r) { r.owner_flow_address = r.owner_user_id; delete r.owner_user_id; }
      }
    }
```

### Backfill command (step 4)

```bash
ETL_BACKFILL_START=2024-01-01 node scripts/etl/bq-backfill-historical.mjs --tables=moments
```

**Why this is required:** The three ETL edits above fix the pipeline going forward — new and updated moments rows will correctly carry `owner_flow_address` from the next incremental sync. However, the existing 3,494,001 rows in `topshot.moments` were written when the pipeline was broken; they all have `owner_flow_address = NULL`. The backfill re-reads every moments row from BQ (from 2024-01-01 through present) through the fixed pipeline, and upserts them into Supabase — overwriting the NULL `owner_flow_address` with the real Flow address values. Without the backfill, the column stays 0% populated for all historical rows.

---

## §4 — Verification probe (post-fix)

Run the following SQL via Supabase SQL editor or RPC after the backfill completes:

```sql
SELECT COUNT(*) as total,
       COUNT(owner_flow_address) as with_addr,
       ROUND(100.0 * COUNT(owner_flow_address) / COUNT(*), 1) as pct
FROM topshot.moments;
```

**Expected result:** `with_addr >= 3,400,000` (≥ 97% fill rate).

The remaining ≤3% NULL is expected and acceptable: it covers moments that are freshly minted but not yet distributed to a collector (in-pack moments), for which BQ's `owner_user_id` is genuinely NULL (as confirmed in bq-bnp-views.md sample rows: the "Run It Back: Playoff Classics - 8" packs created 2026-05-15 show `owner_user_id: null` while `moment_status: "MINTED"` — undistributed).

**Also rerun audit probe 05** from `loop/v7/scripts/data-quality-audit.mjs`:
```
[05-moments-ownership-coverage]
```
Expected output: `{ "total": ~3494001, "with_owner_flow_address": ≥3400000, "pct_owner": ≥97 }` — status changes from FAIL to PASS.

---

## §5 — Doctrine compliance

**P1 (Faithful display, never smooth):** `owner_flow_address` is an immutable on-chain fact — the public Flow blockchain address that holds this moment. Displaying it faithfully requires it to be present. A NULL address is a structural lie: the moment has an owner, we just can't see it. Fixing this is a P1 requirement.

**P6 (The trader's verbatim ask is the spec):** From `research/doctrine.md §3` (Roham 2026-05-17):
> *"MBL serves the doctrine as a VERBATIM-VOICE anchor... Until either (a) we get MBL's flow_address from outside the DB and look up his moments via `moments.owner_flow_address`..."*

The collector portfolio feature — the single most-requested collector capability — cannot be served without `owner_flow_address`. The source-of-truth-mapping.md §2.6 notes: "Subsequent dependencies: /u/[username] portfolio rebuild against Supabase... becomes possible once owner_flow_address is populated." The trader's verbatim ask (see Michael Levy / MBL public posts: "show me my bag") is blocked until this column is populated.

**CHARTER §6 (ETL files in Loop A's write boundary):** `scripts/etl/lib/etl-helpers.mjs` and `scripts/etl/lib/sync.mjs` are within Loop A's authorized write boundary per loop-a-rubric.md §6. No Loop B files are touched.

---

## §6 — Risk assessment

### Risk 1: `owner_user_id` column returns NULL for most BQ rows (BQ data quality issue)

**Scenario:** The 5 BQ sample rows in `bq-bnp-views.md` (lines 1180, 1230, 1280, 1330, 1380) all show `owner_user_id: null`. If this is not just sample bias (undistributed pack moments) but a systemic BQ issue, the backfill would write 3.5M NULLs and the `with_addr` count would remain near 0.

**Detect:** Check the backfill's logged `rowsUpserted` count and spot-query 10 moments from pre-2025 dates (long-distributed moments): `SELECT owner_flow_address FROM topshot.moments WHERE created_at < '2025-01-01' LIMIT 10`. If these return real Flow addresses (0x...), the fix worked. If still NULL, escalate to BQ investigation.

**Mitigation:** The sample rows' null values are contextualized by their `moment_status: "MINTED"` and `pack_name: "2026 NBA Playoffs Premium Pack"` — these are brand-new packs from 2026-05-15 not yet opened. BQ's row count of 52,025,452 vs. our 3,494,001 Supabase rows confirms the broader dataset has far more distributed moments. Historical distributed moments should have non-NULL `owner_user_id` in BQ.

### Risk 2: BLOCKLIST refactor accidentally removes protection from `transactions`

**Scenario:** The per-table refactor of `PII_DENYLIST` could, if implemented incorrectly, fail to block `owner_user_id` on `transactions`, potentially leaking Dapper-internal OAuth2 UUIDs. (Note: `owner_user_id` does not currently appear in the BQ `transaction` view schema — `buyer_id`/`seller_id` are the equivalent columns — but defense-in-depth matters.)

**Detect:** Run `etl-helpers.test.mjs` post-fix. This test suite explicitly validates PII stripping behavior. The fix MUST add a new test case: `assert pii_filter({owner_user_id: "0xabc"}, "transactions")` returns `{}` (stripped). The existing tests must still pass.

**Mitigation:** The proposed `PER_TABLE_DENYLIST` explicitly lists `transactions: ["owner_user_id"]`, and the updated `pii_filter` merges global + per-table denylists. The test suite is the enforcement gate.

### Risk 3: Per-table rename fires before `pii_filter` strips the column, or vice versa

**Scenario:** If `sync.mjs` applies the moments rename block (`owner_user_id` → `owner_flow_address`) BEFORE `pii_filter` runs, the rename happens but then `pii_filter` looks for `owner_user_id` (not `owner_flow_address`) and doesn't find it to strip — so `owner_flow_address` passes through. This would be the correct outcome. But if the order were reversed (filter first, rename second), `pii_filter` would see `owner_user_id` in the denylist and strip it before the rename could occur.

**Current order in `sync.mjs` `flushBatch` (lines 97–132):**
1. `pii_filter` applied (line 97): `let filtered = batch.map((r) => pii_filter(r, allowlistKey));`
2. Rename blocks applied (lines 108–124+): transactions, plays, [new moments] block.

**This order means the fix must ensure `owner_user_id` passes `pii_filter` first** (i.e., it is NOT in `PII_DENYLIST` and IS in `ALLOWLISTS.moments`). The proposed edits do exactly this: remove from global `PII_DENYLIST` + add to `ALLOWLISTS.moments`. Then the sync rename block fires after filter, renames it to `owner_flow_address`, and it upserts correctly.

**Detect:** Run a small-batch smoke test (`LIMIT=100` probe) before full backfill: query 100 moments from a non-2026-05-15 date range and confirm `owner_flow_address` is non-NULL in the result.

---

## §7 — Confidence

**PASS-likely.**

The root cause is unambiguous (line 22 of `etl-helpers.mjs` puts `owner_user_id` in the global denylist; the allowlist for moments omits it; there is no rename block). The fix is three mechanical edits with no ambiguous logic. The BQ column exists with the correct name (`owner_user_id`, `bq-bnp-views.md:1109`). The only non-trivial risk is whether BQ's `owner_user_id` is populated for distributed moments (the sample is biased to undistributed moments) — but the BQ total row count (52M) vs. our Supabase count (3.5M) and the long history of ETL pulls for other columns from this same view give high confidence the column populates for non-in-pack moments. Risk 1 is the primary uncertainty; it is detectable within the first minute of post-backfill spot-checks.
