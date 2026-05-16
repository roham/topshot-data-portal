# ETL: BigQuery → Supabase (`topshot` schema)

Production ETL pulling NBA Top Shot data from `dapperlabs-data.production_sem_open.*`
into Supabase project `zvyfciivqibziewrmhuw` schema `topshot`. PII-filtered at ETL
time. Incremental every 15 minutes. Materialized views refreshed after each tick.

## Files

| Path                                | Role                                       |
|-------------------------------------|--------------------------------------------|
| `etl-config.mjs`                    | Table mappings, BQ/SB env, scan budget     |
| `lib/etl-helpers.mjs`               | PII filter, chunking, retry, cursor I/O    |
| `lib/bq-client.mjs`                 | BQ client w/ scan-budget enforcement       |
| `lib/sb-client.mjs`                 | Supabase admin (service-role) client       |
| `lib/sync.mjs`                      | Per-table sync orchestration               |
| `bq-backfill-historical.mjs`        | One-shot historical backfill (weekly bands)|
| `bq-incremental-sync.mjs`           | 15-min cron entrypoint                     |
| `bq-refresh-mvs.mjs`                | Refresh all MVs concurrently               |
| `etl-helpers.test.mjs`              | PII filter tests + helpers (vitest)        |

## Secrets required (GH Actions)

| Secret                       | Purpose                                          |
|------------------------------|--------------------------------------------------|
| `GCP_BQ_SA_JSON`             | Service-account JSON with BQ read access         |
| `SUPABASE_URL`               | `https://zvyfciivqibziewrmhuw.supabase.co`       |
| `SUPABASE_SERVICE_ROLE_KEY`  | Service-role key (bypasses RLS; required for writes) |

## Operator runbook

### Run a historical backfill
```bash
# From GH → Actions → "etl-backfill" → Run workflow
# Inputs: start_date=2018-01-01, end_date=2026-05-15, tables= (blank = all)
```

### Verify incremental sync is alive
```sql
-- In Supabase SQL editor:
SELECT * FROM topshot._etl_heartbeat;
-- last_success_at should be within last 15-30 minutes.

SELECT table_name, last_cursor_at, last_row_count, last_error
  FROM topshot._etl_cursors
ORDER BY last_run_at DESC;
-- All last_error should be NULL. Any non-null = read run log artifact.
```

### Check the heartbeat from the portal
The `_etl_heartbeat` table has `anon` read RLS, so the portal can render a
freshness badge: `GET /rest/v1/_etl_heartbeat?select=last_success_at`.

### Recover from a failed incremental run
1. Inspect failing table's `last_error` column.
2. Check uploaded log artifact in the failing GH Action run.
3. If transient (BQ blip, Supabase quota): re-trigger the workflow_dispatch
   — cursor will pick up where it left off, idempotent upserts handle dupes.
4. If schema drift (BQ field renamed): update `ALLOWLISTS` in `etl-helpers.mjs`
   AND the corresponding Supabase column, then re-run.

### Rotate credentials
- BQ service account: rotate in GCP IAM, update `GCP_BQ_SA_JSON` GH secret.
- Supabase service role: regenerate in Supabase dashboard, update
  `SUPABASE_SERVICE_ROLE_KEY` GH secret. Old key is invalidated immediately —
  any in-flight ETL run will fail on next request; cron resumes next tick.

### Pause the pipeline
- Disable the `etl-incremental-sync` workflow in GH → Actions UI.
- Cursors are preserved; resume continues from last successful run.

### Scan budget tuning
- Default cap: 10 GB per single query (`BQ_MAX_BYTES_BILLED`).
- Bump for backfill of `transactions`: set `BQ_MAX_BYTES_BILLED=53687091200` (50GB)
  via workflow env. Each weekly band of `transaction` is ~5–8 GB historical.

## PII filter — security boundary

`lib/etl-helpers.mjs` exports `pii_filter(row, table_name)`. It applies a
**hard denylist** (always strip — even if accidentally allowlisted) AND a
**per-table allowlist** (only these fields survive). Schema drift = silent
field-loss, NOT silent leak.

Denied fields (NEVER reach Supabase):
- `buyer_country_code`, `seller_country_code`
- `buyer_province_code`, `seller_province_code`
- `buyer_type_id`, `seller_type_id`, `buyer_is_guest`
- `buyer_id`, `seller_id` (raw user uuids)
- `buyer_name`, `seller_name`, `*_email`, `*_ip`
- `owner_user_id` (on moments — replaced by flow_address if we add it later)

Tests in `etl-helpers.test.mjs` validate every denial. Run:
```bash
npx vitest run scripts/etl/etl-helpers.test.mjs
```

## Sync order (FK-safe)

```
players → teams → sets → plays → editions → moments → transactions
       → market_caps → packs → drops → refresh MVs → update heartbeat
```

Each table holds a Postgres advisory lock (`pg_try_advisory_lock`) during its
sync. Cron + manual trigger overlap = second instance gracefully skips locked
tables.

## Cost discipline

- Every BQ query runs a dry-run first; aborts if scan > `BQ_MAX_BYTES_BILLED`.
- `transactions` queries always include `DATE(updated_at)` partition prune
  (~750x scan reduction vs unfiltered).
- Static-ish tables (`players`, `teams`) throttle to once per 24h via
  `staleHours` config — saves ~96 BQ jobs/day per table.

## What this ETL is NOT

- Real-time. 15-min cadence is the SLA. The portal renders "as of HH:MM:SS UTC".
- Live-streaming. No Pub/Sub, no CDC. If you need second-level freshness,
  add a Pub/Sub subscriber and write a separate hot-path script.
- Self-healing on schema drift. New BQ columns require an allowlist update.
