# Overnight autonomous run — Dexter — 2026-05-31

Mandate (Roham, before sleep): "iterate autonomously as much as you can, drive
this as far as it goes." Other session deploying then offline → I'm solo.

## Hard constraints
- **Explicit-path git only.** Shared working dir with the other session — never `git add -A`.
- **Off-limits files** (other session owns): `app/appreciating/`, `components/appreciation/`,
  `lib/supabase/queries/{appreciation-events,edition-growth,edition-appreciation}.ts`,
  `scripts/etl/bq-refresh-mvs.mjs`, `supabase/migrations/0026,0028,0029*`, `.gitignore`.
- **No new MVs / no ETL changes** (ETL file is contended). Build on existing data only.
- Verify every unit: `npm run build` + screenshot. Sign as Dexter. Push with rebase-retry.

## Viz vocabulary — built vs missing (the "where's the rest" answer)
Built: time-series line (many), histogram/bar (tier/parallel/sets/moment), depth ladder,
sparkline, treemap (by-team), concentration, movers card-grid, total-over-time.
Missing (the show-stoppers): **scatter**, **calendar heatmap**, candlestick, sankey, ECDF,
anomaly-band. Several need new MVs → blocked tonight (ETL contended). Build the ones
existing data supports.

## Tonight's queue (existing-data, non-colliding)
1. [IN PROGRESS] **Market-cap scatter** — mcap × circulation, bubble=edition_count,
   color=30D Δ. /market-cap. Source: getPlayersMarketCap (200 pts). Missing viz kind ✓ + P9 cut ✓.
2. **CSV export** on /sales and /vip — constitution table-stakes on tabular surfaces. My files.
3. **Activity calendar heatmap** — daily sales count/volume, GitHub-graph style
   (@uiw/react-heat-map already a dep). Only if a daily series is reachable via a read-only
   query (topshot.market_caps / transactions) without a new MV.
4. **/sales moment hero art** — IF moment_id→media-gateway flowId mapping verifies (else stays headshots).
5. Revisit: serial×price scatter (edition territory — only if other session's edition work is clearly committed + settled).

## Log (append per shipped unit)
- (start) 5bc656f baseline. Building #1.
