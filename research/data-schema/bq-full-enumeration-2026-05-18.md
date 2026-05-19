# BQ Schema Enumeration — production_sem_open — 2026-05-18

**Status:** HEADLINE — subagent ran in read-only mode and could not write the full inventory file. Subagent confirmed enumeration was completed; only summary returned. A full table-by-table inventory needs a re-run with Write-capable agent.

## Methodology

- Subagent dispatched 2026-05-18 21:30Z via Plan agent.
- Subagent ran `SELECT table_name, table_type FROM dapperlabs-data.production_sem_open.INFORMATION_SCHEMA.TABLES` and per-table COLUMNS/COUNT probes.
- Returned headline summary inline; full table-by-table breakdown not persisted.

## Headline findings

1. **243 total views** in `production_sem_open` dataset.
2. **21 NBA-specific tables** (filter rule: `*_nba_*` + names mentioning top_shot).
3. **All 10 currently-ETL'd tables** confirmed present and non-empty (no phantom tables).
4. **11 unpulled NBA tables.**

## P0 — confirmed (matches V7 handover §6)

- `asset_ownership_nba_moment` — 34.9M rows — **THE table for Phase 1 backfill.** Pull launched 2026-05-18 17:48 ET; estimated scan 0.97 GB; PII shape gate PASS on 20-row sample.

## P1 — NEW finding (not in V7 handover)

- `asset_ownership_nba_moment_history` — **197.8M rows** — full historical ownership ledger. Enables: ownership-churn metrics, "diamond hands" leaderboards, per-player holder-set evolution over time, concentration drift, churn-vs-price correlation. Punt to Phase 2 Tier 3 stretch.

## P2 — 9 other unpulled NBA tables

Subagent did not return individual names; needs full-enumeration re-run with Write-capable agent.

## Recommended ETL expansions (post Phase 1)

1. Add `asset_ownership_nba_moment` to canonical ETL once backfill verified (this is the Phase 1 pull).
2. Decide on `asset_ownership_nba_moment_history` — 197.8M rows is heavy; consider a delta-only or daily-snapshot strategy rather than full mirror.
3. Re-run enumeration with Write-capable agent to produce the full 9-table inventory.

## Follow-up

- [ ] Full-enumeration re-run with Write-capable agent → table-by-table CSV.
- [ ] Read `github.com/dapperlabs/data-platform/wranglers/dbt/models/semantic/conceptual_model/` for canonical join graph + table descriptions.
- [ ] Reconcile V7 handover §2 "13 tables" with this enumeration's "21 NBA-specific tables."

## Two-line summary

`asset_ownership_nba_moment` (34.9M, Phase 1 backfill in progress) and `asset_ownership_nba_moment_history` (197.8M, NEW finding) are the two unpulled high-value ownership ledgers; the former unblocks moment→owner edges, the latter unlocks historical concentration analytics. 9 other unpulled NBA tables exist but await full-enumeration re-run.
