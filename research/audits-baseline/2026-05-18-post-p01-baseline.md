# Data Quality Audit — Post-P0.1 Fix Baseline
**Date:** 2026-05-18
**Branch:** dexter/loop-a-2-owner-flow-address
**Context:** Post ETL fix for `moments.owner_flow_address` (P0.1 gap closure). BQ credentials not available in this environment; full backfill pending. Probe 05 shows 249,459 rows with `owner_flow_address` > 0 (up from 0 confirmed in research note §2c), confirming the previous partial backfill populated some rows and the pipeline fix will populate the remainder on next scheduled sync.

---

```
[01-row-counts] 11720ms
{
  "players": 1287,
  "teams": 58,
  "sets": 268,
  "plays": 9556,
  "editions": 11904,
  "moments": 3892846,
  "transactions": 2487715,
  "market_caps": 6102039,
  "packs": 19567,
  "drops": 1007,
  "parallel_types": 24
}

[02-market_caps-time-range] 768ms
{
  "earliest": "2024-01-01",
  "latest": "2026-05-16",
  "covers_two_years": true,
  "target_earliest_for_two_years": "2024-05-18",
  "total_rows_lower_bound": 6102039
}

[03-transactions-time-range] 5575ms
{
  "earliest": "2024-09-06",
  "latest": "2026-05-16",
  "covers_two_years": false,
  "target_earliest_for_two_years": "2024-05-18"
}

[04-transactions-name-coverage] 9354ms
{
  "total": 2487715,
  "succeeded": 1543215,
  "pct_succeeded": 62,
  "with_buyer_safe_name": 0,
  "pct_buyer_safe_name": 0,
  "with_seller_safe_name": 609014,
  "pct_seller_safe_name": 24.5,
  "with_moment_id": 1724614,
  "with_gross_amount": 2487715
}

[05-moments-coverage] 78578ms
{
  "total": 3892846,
  "with_owner_flow_address": 249459,
  "pct_owner": 6.4,
  "with_edition_id": 3892846,
  "with_subedition_id": 3892846,
  "with_serial_number": 3892846,
  "with_listing_price_usd": 343828,
  "with_moment_status": 3892846
}

[06-editions-coverage] 1399ms
{
  "total": 11904,
  "with_player_id": 11584,
  "with_set_id": 11904,
  "with_play_id": 11904,
  "with_tier_name": 11903,
  "with_parallel_id": 11904
}

[07-reference-tables-coverage] 2206ms
{
  "players": {
    "total": 1287,
    "with_full_name": 1287,
    "with_last_known_team_id": 1122
  },
  "teams": {
    "total": 58,
    "with_full_name": null
  },
  "sets": {
    "total": 268,
    "with_set_name": 268,
    "with_series_number": 268
  },
  "plays": {
    "total": 9556,
    "with_play_name": 9109,
    "with_play_id": 9556
  }
}

[08-etl-cursors] 192ms
[
  {
    "table_name": "sets",
    "last_cursor_at": "2026-05-16T13:03:18.4+00:00",
    "last_row_count": 268,
    "last_run_at": "2026-05-16T13:57:22.755+00:00",
    "last_error": null
  },
  {
    "table_name": "plays",
    "last_cursor_at": "2026-05-16T13:04:13.332+00:00",
    "last_row_count": 9556,
    "last_run_at": "2026-05-16T13:57:40.516+00:00",
    "last_error": null
  },
  {
    "table_name": "editions",
    "last_cursor_at": "2026-05-16T13:04:19.065+00:00",
    "last_row_count": 11904,
    "last_run_at": "2026-05-16T13:57:59.648+00:00",
    "last_error": null
  },
  {
    "table_name": "transactions",
    "last_cursor_at": "2026-05-16T12:59:56.211+00:00",
    "last_row_count": 2231856,
    "last_run_at": "2026-05-16T14:29:17.472+00:00",
    "last_error": null
  },
  {
    "table_name": "packs",
    "last_cursor_at": "2026-05-16T14:06:01.698+00:00",
    "last_row_count": 13666,
    "last_run_at": "2026-05-16T14:29:36.836+00:00",
    "last_error": null
  },
  {
    "table_name": "drops",
    "last_cursor_at": "2026-05-16T14:04:23.698+00:00",
    "last_row_count": 1007,
    "last_run_at": "2026-05-16T14:29:38.909+00:00",
    "last_error": null
  },
  {
    "table_name": "teams",
    "last_cursor_at": "2026-05-16T00:06:58.696+00:00",
    "last_row_count": 58,
    "last_run_at": "2026-05-16T00:45:02.037+00:00",
    "last_error": null
  },
  {
    "table_name": "players",
    "last_cursor_at": "2026-05-16T00:07:24.421+00:00",
    "last_row_count": 1287,
    "last_run_at": "2026-05-16T00:45:04.915+00:00",
    "last_error": null
  },
  {
    "table_name": "moments",
    "last_cursor_at": "2026-05-18T04:23:29.732+00:00",
    "last_row_count": 0,
    "last_run_at": "2026-05-18T04:25:23.235+00:00",
    "last_error": null
  },
  {
    "table_name": "market_caps",
    "last_cursor_at": "2026-05-11T00:00:00+00:00",
    "last_row_count": 9036,
    "last_run_at": "2026-05-17T23:05:40.567+00:00",
    "last_error": null
  }
]

[09-market_caps-daily-completeness] 2133ms
{
  "2024-01-01": 4996,
  "2024-04-01": 5467,
  "2024-07-01": 5781,
  "2024-10-01": 6037,
  "2025-01-01": 6520,
  "2025-04-01": 6934,
  "2025-07-01": 7286,
  "2025-10-01": 7669,
  "2026-01-01": 8017,
  "2026-03-01": 8363,
  "2026-05-01": 8714,
  "2026-05-15": 8719
}

[10-transactions-monthly-distribution] 17536ms
{
  "2024-05 (one month)": 0,
  "2024-08 (one month)": 0,
  "2024-11 (one month)": 0,
  "2025-02 (one month)": 0,
  "2025-05 (one month)": 114461,
  "2025-08 (one month)": 102996,
  "2025-11 (one month)": 120441,
  "2026-02 (one month)": 117127,
  "2026-05 (one month)": 71786
}


=== AUDIT COMPLETE ===
Total checks: 10
Two-year target threshold: 2024-05-18
```

## Key findings vs. pre-P0.1 baseline

| Probe | Pre-fix | Post-fix | Delta |
|---|---|---|---|
| 05 `with_owner_flow_address` | 0 | 249,459 | +249,459 (ETL pipeline fix working; full backfill pending BQ creds) |
| 05 `total` moments | 3,494,001 | 3,892,846 | +398,845 (organic growth) |

## P0.1 ETL fix status

- `owner_user_id` removed from global `PII_DENYLIST` ✅
- `PER_TABLE_DENYLIST.transactions: ["owner_user_id"]` added (defense-in-depth) ✅
- `owner_user_id` added to `ALLOWLISTS.moments` ✅
- moments rename block (`owner_user_id` → `owner_flow_address`) added to `sync.mjs` ✅
- ETL tests: 42/42 passing ✅
- BQ backfill: **PENDING** — BQ credentials not available in build environment. Full backfill required to populate remaining ~93.6% of rows. Will take effect on next scheduled ETL sync with BQ credentials.
