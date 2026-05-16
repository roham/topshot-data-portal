# Continuous data validation

A battery of checks that compares Supabase materialized-view output against BigQuery
ground truth on a 30-minute cadence. The dashboard at `/admin/data-quality` shows
the latest result per check plus a 50-run pass/fail timeline.

This is the "meta-fix" for the data-correctness bugs we hit by hand: a moments
table that was 95% incomplete and a top-player ranking that was wildly wrong.
Both of those failure modes are now caught automatically.

## How it runs

```
scripts/validation/
  run.mjs              ← the runner (entry point)
  checks.mjs           ← check definitions; one entry per check
  lib/
    metrics.mjs        ← spearman / pct_delta / abs_delta / ratio (pure)
    metrics.test.mjs   ← unit tests for the metric helpers
  checks.test.mjs      ← unit tests for the check shape + compute logic
```

Cron lives in `.github/workflows/data-quality-cron.yml`. It is currently
`workflow_dispatch`-only — uncomment the `schedule:` block once `GCP_BQ_SA_JSON`,
`SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are confirmed present in repo
secrets.

## Local run

```bash
cd /Users/ro/dapper/topshot-data-portal
set -a; source .env.local; set +a
node scripts/validation/run.mjs
```

BQ auth: defaults to gcloud Application Default Credentials when
`GOOGLE_APPLICATION_CREDENTIALS` is unset, which works on Roham's laptop. CI
writes the service-account JSON to `/tmp/bq-sa.json` and exports the path.

Exit code is always 0 unless the runner itself crashes (network down, missing
env, exec_sql unreachable). Per-check failures are persisted to
`topshot._validation_runs` and surfaced in the table + the `SUMMARY:` JSON line.

## Schema

```sql
CREATE TABLE topshot._validation_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name    TEXT NOT NULL,
  ran_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  bq_value      JSONB,              -- raw BQ result (scalar or list)
  sb_value      JSONB,              -- raw Supabase result
  metric        TEXT NOT NULL,       -- spearman | pct_delta | abs_delta | ratio
  metric_value  NUMERIC,
  threshold     NUMERIC,
  passed        BOOLEAN NOT NULL,
  notes         TEXT
);
CREATE INDEX idx_validation_runs_check_ran_at ON topshot._validation_runs (check_name, ran_at DESC);
```

`topshot.v_validation_latest` is a `SELECT DISTINCT ON (check_name)` view that
returns the most-recent run per check.

## Adding a new check

Open `scripts/validation/checks.mjs` and append a new entry to `CHECKS`:

```js
const MY_CHECK = {
  name: "my_check_slug",          // unique, kebab-or-snake_case
  description: "What it proves.",
  metric: "pct_delta",             // or 'spearman' / 'abs_delta' / 'ratio'
  threshold: 0.05,                 // numeric comparator value
  passComparator: "<=",            // '>=' or '<=' — explicit, no inference
  bqSql: `SELECT … FROM …`,
  sbSql: `SELECT … FROM topshot.mv_…`,
  compute(bqRows, sbRows) {
    // Extract the comparable values; call a metric helper; return.
    return {
      metricValue: ...,
      bqValue: ...,                // stored verbatim in _validation_runs.bq_value
      sbValue: ...,                // stored verbatim in _validation_runs.sb_value
      notes: null,                 // optional human note rendered on dashboard
    };
  },
};

export const CHECKS = [
  // ... existing,
  MY_CHECK,
];
```

The next run picks it up automatically and the dashboard renders it. No
schema migration required — `bq_value` and `sb_value` are JSONB so any shape
is accepted.

### Choosing the right metric

| Use this           | When you're comparing                    | Threshold direction |
|--------------------|------------------------------------------|---------------------|
| `spearman`         | Two **ranked lists** (top-N entities)    | `>=`                |
| `pct_delta`        | Two **scalar aggregates** (sums, counts) | `<=`                |
| `abs_delta`        | Two **scalar exact-match** values        | `<=`                |
| `ratio`            | **Coverage**: subset count / total count | `>=`                |

`pct_delta` returns `|sb - bq| / bq`. Treat the threshold as the tolerated
divergence (0.05 = 5%). `abs_delta` returns `|sb - bq|` raw — useful when the
values are dollar amounts where "within $1" means something specific.

### Tolerance philosophy

We're catching **structural** drift, not stochastic noise. Set tolerances tight
enough that backend bugs trip them and loose enough that legitimate per-run
variation doesn't. Coverage checks deserve **strict** thresholds (≥95% is the
floor: anything lower is a real ETL gap). Volume / count deltas deserve
**moderate** thresholds (2-10% depending on cardinality) — these can fluctuate
mildly with cursor-overlap window and pagination boundaries.

## Investigating a failed check

1. **Open `/admin/data-quality`** and click into the failing row. The card
   shows BQ ground truth + Supabase MV output side by side.
2. **Check the history strip** — was this failing for hours or just spiked?
   - Spiked just now → likely an in-flight ETL run; wait one cycle.
   - Failing persistently → real gap. Continue to step 3.
3. **Reproduce the BQ SQL** locally:
   ```bash
   bq query --use_legacy_sql=false "<paste bqSql>"
   ```
4. **Reproduce the Supabase SQL**:
   ```bash
   set -a; source .env.local; set +a
   curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/exec_sql" \
     -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"sql":"<paste sbSql>"}'
   ```
5. **Decide**:
   - If BQ is right and Supabase is wrong → fix the ETL (likely
     `scripts/etl/`) or refresh the MV.
   - If Supabase is right and BQ moved → the threshold may need to drift
     (e.g. moments backfill catching up); update `threshold` in the check
     definition.
   - If both look right but the metric disagrees → the `compute()` function
     has a bug; fix that.

## Bypassing thresholds during known migrations

If you're mid-backfill or mid-schema-migration and want to suppress check
failures temporarily:

**Option A** — Loosen the threshold in `checks.mjs` and commit. The runner
picks up the new threshold on the next run. Tighten back when migration
completes.

**Option B** — Comment the check out of the `CHECKS` array. Same effect, but
no historical row gets written, so the dashboard pass/fail timeline shows a
gap rather than a string of passes-by-loosened-threshold.

**Option C** — Delete the historical runs for that check to reset the timeline:
```sql
DELETE FROM topshot._validation_runs WHERE check_name = 'my_check';
```
Use sparingly; the history strip is more informative when it preserves the
true failure period.

## Why we don't gate on this in CI

The runner exits 0 even on hard failures. Rationale:

1. The dashboard is the surface. Validation failures are operational signal,
   not deploy gates.
2. ETL latency between BQ and Supabase MV (cursor-overlap, refresh cadence)
   means false positives in a deploy-gate setting are constant. CI would fail
   for benign reasons.
3. Deploy gates would force us to either widen thresholds until they're
   useless or red-light deploys on flaky checks. Neither is good.

If we ever want a hard gate (e.g. "block deploy if coverage drops below 80%"),
build a separate `scripts/validation/gate.mjs` that picks the gate-relevant
subset and exits non-zero on fail. Don't conflate it with the always-running
quality observer.
