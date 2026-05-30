# Handover: Top Shot Data Portal — critique, market-cap rebuild, ETL fix, redesign vision
**Date:** 2026-05-29 17:20

## Objective
Rehydrate on the Top Shot Data Portal (https://topshot-data-portal.vercel.app), critique how far it had drifted from its goal (a pro-trader terminal for NBA Top Shot), get it back on track, then iteratively improve it — fix the broken flagship page, make the time-filter UX best-in-class, and ultimately brainstorm a fundamental redesign from first principles. Repo: `roham/topshot-data-portal` (local: `/Users/ro/dapper/topshot-data-portal`).

## What Was Done
**Critique + reset plan**
- `research/design-sprints/04-where-we-are-and-the-reset.md` — diagnosis: signed doctrine (graphs-first, one-surface scope) was ignored; 49 routes, table-first homepage, dead `/admin/review` gate; loop spent its last days on ETL snapshots + Grail-count minutiae. Reset = collapse to one graph-first surface, push the rest behind `/lab`, gate every promotion on Roham's eye.

**`/market-cap` rebuilt + shipped to prod**
- Hero: replaced TS50 with `IndexHeroPair` (GRAIL + ROOKIES), then converted from normalized **index → dollar basket market cap** (the index was showing +404% that didn't exist in the dollars). Files: `components/IndexHeroPair.tsx`, `components/TS50IndexChart.tsx` (added `currency` prop), `lib/indices/rookies-synthesizer.ts` + `grail-synthesizer.ts` (replaced weighted/normalized carry-forward `basket_mcap_usd` with honest daily raw $ sum + per-edition carry-forward across gap days).
- Fixed empty ROOKIES basket bug: candidate-pool `.in()` batched 500 compound edition_ids (~37KB URL) → gateway rejected → error swallowed. Chunk at 100, throw on error. `lib/indices/rookies-synthesizer.ts`.
- Added draft-year filter (URL `?ry=`, default 2025, back to 2014). `lib/indices/rookie-years.ts`, `components/RookieYearSelect.tsx`, wired in `IndexHeroPair` + both `/market-cap` and homepage.
- **Fixed the 504:** page was paginating ~261K market_caps rows over ~250 round-trips (120s cold, past Vercel's 60s ceiling). Replaced with one Postgres RPC `topshot.market_cap_landing(window_days)` (SECURITY DEFINER, granted anon) — `supabase/market_cap_landing_rpc.sql`. Rewrote `lib/supabase/queries/market-cap-landing.ts` to call it. 120s → ~1s. Added MV `topshot.mv_market_cap_daily_totals` so over-time is a ~730-row read (every window ~140ms).
- Best-in-class time-window UX: window now drives the whole page; `app/market-cap/page.tsx` restructured (instant shell + data below window-keyed `<Suspense>`), `components/market-cap/MarketCapSkeleton.tsx`, `components/global/WindowTransition.tsx` (shared transition context in `app/layout.tsx`), `WindowPendingVeil.tsx`, `TimeWindowSelector.tsx` + `useTimeWindow.ts` (useTransition + progress bar + optimistic active), CSS in `app/globals.css`.
- Nav/buttons modernized: accent-tinted pill controls (tabs + all segmented toggles). `components/TopNav.tsx`, `TimeWindowSelector.tsx`, `market-cap/McapFormulaToggle.tsx`, `MoverWindowToggle.tsx`.

**ETL fixed**
- Root cause of 13-day-stale data: every `etl-incremental-sync` run failed at the MV-refresh step on Node 20 (`@supabase/supabase-js` now needs native WebSocket). Bumped all 12 `.github/workflows/*.yml` to **Node 22**. Set the sync cron to **1×/day at 09:00 UTC** (was every 15 min; market_caps is daily-granular). Added `mv_market_cap_daily_totals` to `scripts/etl/bq-refresh-mvs.mjs`.

**Redesign vision (visual-companion brainstorm)**
- `research/design-sprints/05-redesign-vision-handover.md` (the design source of truth) + `research/design-sprints/mockups/*.html` (directions, state-of-market-b-v2, player-page-v3, parallels-and-avgsale).

All of the above is committed and pushed to `origin/main`.

## Key Decisions & Discoveries
- **Index → dollars.** Single-basket hero panes should show $ basket market cap, not a normalized index — an index rebases to 100 per window (different shape per window) and the value is abstract. The synthesizers' `basket_mcap_usd` was itself artifacted (disagreed across windows + with the headline); fixed to honest daily $ sum with per-edition carry-forward across missing-snapshot days. Residual single-day dips (e.g. 04-21) are bad-ETL days — flagged for outlier-day suppression, not yet done.
- **Aggregate in Postgres, not Node.** PostgREST aggregates are disabled for anon and `exec_sql` is anon-401; the fix was a SECURITY-DEFINER RPC granted to anon. Large windows (1y/ALL) still scanned millions of rows for the over-time series → added the daily-totals MV.
- **`+` in compound edition_ids is a URL trap** (PostgREST reads `+` as space). supabase-js encodes it fine; the real bug was URL *length* from 500-ID `.in()` batches.
- **Editions are a TABLE, not a matrix** — most editions are single/distinct, so a set×tier grid is mostly empty. Sortable/filterable table instead.
- **Parallels: 22 drifting names → ~4 data-derived scarcity classes** (Base/Premium/Elite/Crown by circulation + premium, era-aware); keep the name as a badge; per-moment "parallel ladder"; encyclopedic glossary. Omega/Galactic are the crown jewels and must visibly outperform.
- **Thin trading history is the norm for the best moments** — show last sale + recency + liquidity indicator + provenance (who holds it); never a dead price-line. Scarcity reads as prestige.
- **Total Market Cap is the wrong hero** (won't trend up) — feature an index (Rookies; rail of Grail/TS-100/TS-15).
- **Process lesson (important):** late in the session the parallels mockup degraded — half the canvas was explanatory notes. Diagnosis: I let Q&A mode bleed into design mode and put rationale ON the surface (the exact meta-commentary leak already corrected once). Compounded by context saturation (~66%+). Hence this handover + cutover to a fresh session. **Hard rule: product surfaces only, no notes/rationale on the canvas; reasoning lives in the spec.**

## Current State & Next Steps
**Status: partially done.** `/market-cap` rebuilt + live; ETL crash fixed; redesign designed but not built. Cutting to a fresh session because design craft degraded at high context.

1. **Build landing "B" for real in the app** — hero (Rookies-featured index, not total cap) → Market Map (players, sized by cap / colored by 30d move) → expanded tier-segmented Activity (specific sales + movers). Mockup: `research/design-sprints/mockups/state-of-market-b-v2.html`. Surfaces only — no notes on canvas.
2. **Player page** next — `player-page-v3.html`: event-anchored chart, editions TABLE (low ask + avg sale 30d + last-traded liquidity), premium-parallels strip, named top holders.
3. **Parallels model** — implement the 4 scarcity classes + per-moment ladder + glossary; add avg-sale + last-sale fallback. (Treat `parallels-and-avgsale.html` content as canon, its layout as a negative example.)
4. **Data cleanup** — player dedup (for Market Map + player pages).
5. **Confirm upstream BQ freshness** — after the Node-22 fix, `market_caps` max(date) was still 2026-05-16; verify whether upstream BQ caps there or our sync still lags. `gh run list --workflow=etl-incremental-sync.yml`; check `max(date) FROM topshot.market_caps`.

Footguns: `next-env.d.ts` regenerates and blocks `git pull --rebase` (run `git checkout -- next-env.d.ts`). Remote has a snapshot cron pushing to main — always `git pull --rebase` before push. Pushes go straight to `main` (no PR); Vercel auto-deploys; verify on PROD not just local (caught me twice). Visual-companion server idles out (~30 min) and gets reaped — relaunch with `--foreground --host 0.0.0.0` via Bash `run_in_background:true`.

## Context Files
- `research/design-sprints/05-redesign-vision-handover.md` — **read first**, the design source of truth.
- `research/design-sprints/mockups/*.html` — open in a browser (B landing, player page, parallels).
- `research/design-sprints/04-where-we-are-and-the-reset.md` — the critique + reset plan.
- `research/doctrine.md`, `research/00-product-pillars-v3.md`, `research/00-foundation-v2.md` — locked product doctrine + persona + data taxonomy / API ceilings.
- `lib/supabase/queries/market-cap-landing.ts` + `supabase/market_cap_landing_rpc.sql` — how the live `/market-cap` data layer works.
- Live: https://topshot-data-portal.vercel.app/market-cap
- Git: branch `main`, all work pushed (latest `f757078`); clean except `.gitignore` (+`.superpowers/`) may be uncommitted.
