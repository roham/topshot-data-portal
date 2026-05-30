# SPEC — Realized Economics layer (GMV / median / avg, sliced)

**Why:** the portal is floor/ask-based, which read "all down." Realized trading
tells a different, precise story (GMV +30% YoY, +130% off the bottom; current-season
product now 63% of GMV). PostgREST aggregates are disabled and the
`transactions → moments → editions` join times out at request time, so this must be
**ETL-refreshed materialized views + a thin read path**, not a live RPC.

## Deliverables (PR on roham/topshot-data-portal)
1. **Migration** `supabase/migrations/00XX_realized_economics_mvs.sql`:
   - `topshot.mv_realized_monthly` — one row per calendar month:
     `month, trades, gmv, median_usd, avg_usd`. Source: `transactions`
     (`transaction_state_id='SUCCEEDED'`, `gross_amount_usd` not null),
     `date_trunc('month', source_updated_at)`. `median_usd` via
     `percentile_cont(0.5)`.
   - `topshot.mv_realized_slices` — current 30d + prior 30d, grouped by
     `(window, dimension, bucket)` for dimensions: `scarcity` (editions.mint_count
     bands: 1, ≤25, ≤99, ≤499, ≤4999, 5000+), `tier` (editions.tier_name),
     `season` (`moments.released_at >= '2025-10-21'` ⇒ 'season' else 'legacy').
     Columns: `window, dimension, bucket, trades, gmv, median_usd, avg_usd`.
     Joins `transactions → moments (moment_id) → editions (edition_id)`.
   - Indexes to support the joins if missing (`transactions(moment_id)`,
     `moments(edition_id)`).
2. **Refresh wiring** in `scripts/etl/bq-refresh-mvs.mjs` (add both MVs to the
   refresh list; `REFRESH MATERIALIZED VIEW CONCURRENTLY` where unique index allows).
3. **Read wrapper** `lib/supabase/queries/realized-economics.ts` — typed reads of
   both MVs (no aggregation client-side; just `select`). Cached `unstable_cache`,
   revalidate 300, key versioned.
4. **Viz** `app/lab/economy/page.tsx` — 12-month GMV + median trend (Recharts,
   matching existing chart conventions), plus season-vs-legacy and by-scarcity
   bars for the recent window. Window pills reuse `components/global/window-types`.

## Acceptance / verification (test oracle = these psql ground-truth numbers)
- `mv_realized_monthly` matches (±1% rounding): 2025-06 gmv≈$4.89M med $12;
  2025-10 gmv≈$1.57M med $5 (bottom); 2026-04 gmv≈$3.65M med $5. 13 months present.
- `mv_realized_slices` season share: recent ≈ **63%**, prior-30d-6mo-ago ≈ **30%**;
  season GMV recent ≈ $1.05M, legacy ≈ $607K.
- Read wrapper: `tsc --noEmit` clean.
- `/lab/economy` renders the trend + slices on prod with these numbers (eyes-on).
- MV refresh completes in the ETL run without timeout (it's a one-shot refresh,
  not request-time, so the slow join is acceptable here).

## Conventions
- Mirror `supabase/market_cap_landing_rpc.sql` + existing migrations for style.
- Schema `topshot`. Server reads via `getSupabaseServerAnon()`.
- No new external deps. Match Recharts/token usage in `components/charts/market-cap/`.

## Apply path (operator, not the agent)
Agent authors files + opens PR only. Migration applied by operator via
`psql "$SUPABASE_DB_URL" -f <migration>` then MV refresh; viz deploys via Vercel.
