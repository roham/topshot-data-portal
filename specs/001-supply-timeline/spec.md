# SPEC-001 — Moment Supply Timeline

**Status:** active
**Author:** Dexter (for Roham)
**Date:** 2026-06-04
**Governs:** the `/supply` page + its data pipeline (migration 0035, ETL `bq-refresh-supply-timeline.mjs`, query module, charts).

## Problem

There is no view of NBA Top Shot moment supply over time. Roham wants to see:
1. **Total moments ever minted**, year by year since launch — how Top Shot grew.
2. **How many were removed (burned)** over time, since deflation was introduced.
3. **How many are locked.**

Ground-truth anchor (out-of-band, production Spanner): **52,212,386** moments current count.

## Why a dedicated aggregate (not an MV over `topshot.moments`)

The Supabase `topshot.moments` mirror is **partial** (~8.6M of 52.2M rows). The full
supply history exists only in BigQuery (`dapperlabs-data.production_sem_open.asset_nba_moment`,
52.18M rows — reconciles to the Spanner anchor within replication lag, 0.06%). So the
pipeline aggregates **in BigQuery** and upserts the rolled-up result into two small
Supabase tables the page reads, matching the repo's BQ→Supabase→page convention.

## Definitions (locked)

- **Minted** = NFT created. Keyed on BQ `created_at` (100% populated). NOT `released_at`
  (the later release-to-collector event; NULL for ~5M moments → undercounts the mint curve).
- **Burned** = keyed on `burned_at`; equals `moment_status = 'BURNED'`. Deflation began
  2021-11; mega-burns 2022-11 (2.6M) and 2023-05 (3.9M).
- **Locked (events)** = `locked_at` per month (gross; includes later-unlocked). Locking
  launched 2022-07.
- **Currently locked** = `moment_status = 'LOCKED'` (net of unlocks).
- Status is an exact partition: `BURNED + LOCKED + MINTED = total_minted`.
- **Circulating** = `total_minted - total_burned` (= LOCKED + MINTED).

## Functional requirements

- **FR-1** Migration `0035` creates `topshot.supply_timeline` (monthly facts) and
  `topshot.supply_snapshot` (singleton headline), anon-readable via RLS (0003 posture).
- **FR-2** ETL `scripts/etl/bq-refresh-supply-timeline.mjs` aggregates BQ and upserts both
  tables. Idempotent; safe to re-run; cron-friendly.
- **FR-3** Query module `lib/supabase/queries/supply-timeline.ts` reads both tables, returns
  monthly rows + cumulative curves + snapshot, with honest-absence (null → empty state).
- **FR-4** `/supply` page renders: KPI strip (ever minted, burned, locked, circulating,
  Spanner reconciliation), a cumulative supply curve (minted vs burned vs circulating), a
  per-year minted-vs-burned breakdown, and a locked panel. Deflation + locking launch marked.
- **FR-5** Yearly view is the default framing (per Roham's "year by year"); monthly data
  backs it for resolution.
- **FR-6** `/supply` is reachable from nav (Market lane) and the command palette.

## Non-goals

- Per-edition / per-set supply (already covered elsewhere).
- Real-time supply (refresh is ETL-cadence, not live).
- Backfilling the full 52M moments into Supabase.

## Verification

- BQ aggregate sums reconcile: `Σ minted = total_minted`; partition holds exactly.
- Page builds (`next build`) and renders with real data; KPIs match BQ within replication lag.
- Reconciliation line shows BQ total vs Spanner anchor.
