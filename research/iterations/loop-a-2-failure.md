# Loop A Iteration 2 — Cross-Vendor FAIL Report

**Date:** 2026-05-18
**Verdict:** FAIL (weighted_overall: 46.5 / 100)
**Model:** gpt-5.5-2026-04-23
**Verify path:** loop/v7/state/iteration-2.verify.json

---

## Root cause: premature CLOSED status in source-of-truth-mapping.md

The ETL code fix is correct (3 edits, 42/42 tests pass, logic verified). However:

1. `source-of-truth-mapping.md` §2.6 and §5 P0.1 were marked CLOSED even though the historical backfill has NOT run. The portal still has 93.6% NULL `owner_flow_address` (249k of 3.9M rows populated from a prior partial sync — not from this fix).

2. Marking P0.1 closed when the gap is still open risks the orchestrator skipping this gap in future track selection.

**The reviewer is correct:** do NOT declare P0.1 closed until `probe-05` returns `with_owner_flow_address >= 3,400,000`.

---

## Required fix (focused — code edits stay, status claim reverts)

**Change source-of-truth-mapping.md §2.6:**

From:
```
**Gap status:** ✅ **CLOSED 2026-05-18.**
```

To:
```
**Gap status:** 🔧 **CODE FIX APPLIED 2026-05-18 — BACKFILL PENDING.**
ETL edits applied (commit 804714c): owner_user_id removed from global PII_DENYLIST,
added to ALLOWLISTS.moments, rename block added to sync.mjs. 42/42 ETL tests pass.
Backfill command ready but requires BQ credentials on kaaos-daemon VM:
`ETL_BACKFILL_START=2024-01-01 node scripts/etl/bq-backfill-historical.mjs --tables=moments`
Current state: 249,459 / 3,892,846 rows populated (6.4%). Gap remains open until backfill runs.
```

**Change source-of-truth-mapping.md §5 P0.1 row:**
Priority stays `**P0**` (not CLOSED) until backfill confirmed.
Add a `Status` column entry: `Code fix applied; backfill pending on daemon VM`.

---

## What the reviewer got right

- P0.1 is NOT closed yet — the portal data is 93.6% NULL
- Source-of-truth-mapping is a load-bearing file; premature CLOSED would cause track selection to skip this gap
- The backfill is the actual closing action, not the ETL code fix

## What the reviewer did not challenge

- The ETL code fix itself (correct — 42/42 tests, logic verified)
- The pii_filter logic order (correct — filter before rename)
- The defense-in-depth PER_TABLE_DENYLIST for transactions (correct)
- The build being green (correct)

---

## After fix: expected verdict

With the status corrected to "code fix applied, backfill pending" rather than CLOSED:
- A1 score should improve to reflect the code fix landed
- No P0 hidden failure mode (source-of-truth no longer falsely claims the gap is closed)
- Expected verdict: PASS or NEEDS-WORK

The P0.1 gap will be fully closed (✅) when the backfill runs on the daemon VM and probe-05 returns `with_owner_flow_address >= 3,400,000`.
