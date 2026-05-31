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
- (start) 5bc656f baseline.
- ✅ f8135d4 — market-cap × circulation scatter on /market-cap (missing 'scatter' viz kind).
- ✅ d36bd18 — real /volume surface (killed ComingSoon): KPI strip + top-25 volume bar +
  volume×median-price liquidity scatter + top-50 table. Verified live, $947K vol.

## ComingSoon sweep (11 remaining; each = doctrine violation on a real route)
Buildable on existing data (no ETL) — DOING:
- `/team/[id]` — aggregate mv_player_market_cap by team. HIGH leverage (linked everywhere).
- `/tier/[id]` — per-tier deep dive (tier aggregates exist via market-cap-landing byTier).
- `/parallel/[id]` — parallels.ts query exists.
- `/series/[n]` — series aggregates from sets/editions.
Honestly gated — LEAVE as ComingSoon (legit absence, not laziness):
- `/locking` — needs authenticated GraphQL session (UNLOCK-03).
- `/game`, `/game/[id]` — need dateOfMoment→game-id resolution lib.
- `/u/[username]/history` — gated on PORTFOLIO_WATCHLIST.
- `/u/[username]/sets`, `/compare` — user/collector territory; defer.
- `/misc` — intentional orphan-catalog page, not a real ComingSoon.

## Next: build /team/[id]. → DONE.

---

## MORNING SUMMARY (for Roham)

Shipped + verified (screenshot per unit) + pushed to `main` tonight:
1. **f8135d4** — Market cap × circulation **scatter** on `/market-cap` (the missing
   "scatter" viz kind; ~200-player bubble cloud, log–log, color=30D move).
2. **d36bd18** — Real **`/volume`** surface (killed a ComingSoon): KPI strip +
   top-25 volume bar + volume×median-price liquidity scatter + top-50 table. $947K vol.
3. **5f3729a** — Real **`/team/[id]`** surface (killed a ComingSoon): logo + team-colored
   headshot roster ranked by floor mcap with proportional bars. Spurs $2.17M, Wemby leads.
4. **e54ded6** — **CSV export** on `/volume` + `/sales` (constitution table-stakes).

Screenshots on disk: /tmp/MCAP-scatter.png, /tmp/VOLUME-new.png, /tmp/TEAM-spurs.png,
/tmp/TOPSALES-30d.png, /tmp/TOPSALES-1y.png.

**⚠ DEPLOY:** all the above is on `main` but topshot.world was NOT redeploying my pushes
(prod deploy is gated to you). To see it live: `vercel --prod --yes` from the repo, or
authorize me. Until then it's verified locally only.

Disciplines held: explicit-path commits only (never clobbered the other session's
appreciating/edition-growth/ETL/migration files); no new MVs/ETL; build + screenshot before
every commit; signed as Dexter; rebase-retry on every push (other session + snapshot cron
were active — all rebased cleanly).

## Remaining queue (next session)
- ComingSoon kills, by confidence:
  - `/vip` CSV export (consistency; data is per-table, minor lift).
  - `/tier/[id]` — needs an editions-by-tier query (mv_player_market_cap lacks tier).
  - `/parallel/[id]` — LOW value now: named parallels aren't in the DB yet (all resolve
    to Base per the /market-cap byParallel caption). Honest-absence until sibling-edition ETL.
  - `/series/[n]` — series aggregates from sets/editions (untried).
  - Leave gated (legit absence): `/locking` (auth GraphQL), `/game[/id]` (date→game lib),
    `/u/[username]/history` + `/sets`, `/compare`. `/misc` is intentional.
- Show-stopper viz still missing (need new MVs → blocked while ETL contended):
  candlestick (edition OHLC), serial×price scatter (the Tensor moat — edition territory),
  calendar heatmap (needs a deep daily series), sankey (holder-flow), ECDF, anomaly-band.
- Loop-restart sweep (tracked in doctrine-vs-constitution-reconciliation.md): relax the v8/v9
  Judge's hard 30D + never-aggregate-parallels assertions to match the ratified constitution.
