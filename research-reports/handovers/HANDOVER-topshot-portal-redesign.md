# Handover: Top Shot Data Portal — critique, market-cap rebuild, ETL fix, redesign vision
**Date:** 2026-05-29 17:20

## Objective
Rehydrate on the Top Shot Data Portal (https://topshot-data-portal.vercel.app), critique how far it had drifted from its goal (a pro-trader terminal for NBA Top Shot), get it back on track, then iteratively improve it — fix the broken flagship page, make the time-filter UX best-in-class, and brainstorm a fundamental redesign from first principles. Repo: `roham/topshot-data-portal` (local: `/Users/ro/dapper/topshot-data-portal`).

## What Was Done
**Critique + reset plan**
- `research/design-sprints/04-where-we-are-and-the-reset.md` — diagnosis: signed doctrine (graphs-first, one-surface scope) was ignored; 49 routes, table-first homepage, dead `/admin/review` gate. Reset = collapse to one graph-first surface, gate every promotion on Roham's eye.

**`/market-cap` rebuilt + shipped to prod**
- Hero: TS50 → `IndexHeroPair` (GRAIL+ROOKIES), then **index → dollar basket market cap** (the index showed +404% that didn't exist in the dollars). `components/IndexHeroPair.tsx`, `TS50IndexChart.tsx` (`currency` prop), `lib/indices/rookies-synthesizer.ts` + `grail-synthesizer.ts` (honest daily raw-$ sum + per-edition carry-forward across gap days).
- Fixed empty ROOKIES basket: 500-ID `.in()` batch overran URL length, error swallowed → chunk at 100, throw. Added draft-year filter (`?ry=`, `lib/indices/rookie-years.ts`, `components/RookieYearSelect.tsx`).
- **Fixed the 504:** replaced ~261K-row / ~250-roundtrip pagination with RPC `topshot.market_cap_landing(window_days)` (`supabase/market_cap_landing_rpc.sql`) + MV `mv_market_cap_daily_totals`. 120s → ~140ms. `lib/supabase/queries/market-cap-landing.ts`.
- Time-window UX: whole-page window-keyed `<Suspense>` + skeletons + shared transition (`components/global/WindowTransition.tsx`, `WindowPendingVeil.tsx`, `useTimeWindow.ts`), instant shell. Nav/buttons → accent-pill controls.

**ETL fixed**
- 13-day-stale data root cause: `etl-incremental-sync` failed every run on Node 20 (`@supabase/supabase-js` now needs native WebSocket). Bumped all 12 workflows to **Node 22**; set sync cron to **1×/day 09:00 UTC**; added the daily-totals MV to `scripts/etl/bq-refresh-mvs.mjs`.

**Redesign vision + (separately) the build of B**
- `research/design-sprints/05-redesign-vision-handover.md` (design source of truth) + `research/design-sprints/mockups/*.html`.
- **Landing "B" was then built for real** by the autonomous side off doc 05 — `0cab0fb` PR #12, route **`/state-of-the-market`** (`app/state-of-the-market/page.tsx`, `components/state-of-market/*`, `lib/state-of-market/*`). Hero index + switcher, Market Map, tier-tab Activity, live ticker. tsc clean; product-voice only.

All committed + pushed to `origin/main`.

## Key Decisions & Discoveries
- **Index → dollars** for single-basket hero panes (index rebases to 100 per window → incomparable + abstract). Synthesizers' `basket_mcap_usd` was artifacted; fixed to honest daily $ sum + carry-forward. Residual single-day dips (e.g. 04-21) are bad-ETL days — outlier-day suppression still TODO.
- **Aggregate in Postgres, not Node** (anon can't use PostgREST aggregates or `exec_sql`) → SECURITY-DEFINER RPC granted anon; daily-totals MV for large windows.
- **`+` in compound edition_ids** is read as space by PostgREST; real bug was URL *length* from big `.in()` batches.
- **Editions = sortable TABLE, not a matrix** (most editions are single/distinct).
- **22 parallel names → ~4 data-derived scarcity classes** (Base/Premium/Elite/Crown, era-aware); name stays as a badge; per-moment "parallel ladder"; encyclopedic glossary. Omega/Galactic are the crown jewels.
- **Thin trade history is normal for the best moments** → last sale + recency + liquidity indicator + provenance, never a dead price-line.
- **Total Market Cap is the wrong hero** → feature an index (Rookies; rail Grail/TS-100/TS-15).
- **Process lesson:** the parallels mockup degraded (half the canvas was explanatory notes — Q&A mode bled into design mode, plus context saturation ~66%). **Hard rule going forward: product surfaces only, no rationale on the canvas.** This handover + a fresh-session cutover was the response. The handoff worked — another session built B from doc 05.

## Current State & Next Steps
**Status: market-cap shipped; ETL fixed; landing B built (`/state-of-the-market`); player page + parallels still to build.**

1. **Verify landing B in prod** — open `/state-of-the-market`; PR #12 noted map coloring + sales feed depend on `market_caps`/`transactions` reads that were "failing in local env, populate in prod." Confirm they render live.
2. **Build the player page** — `research/design-sprints/mockups/player-page-v3.html`: event-anchored cap chart, editions TABLE (low ask + avg sale 30d + last-traded liquidity), premium-parallels strip, named top holders.
3. **Implement the parallels model** — 4 scarcity classes + per-moment ladder + glossary; avg-sale + last-sale fallback. (`parallels-and-avgsale.html` content is canon; its layout is a negative example.)
4. **Player-data cleanup/dedup** (for Market Map + player pages).
5. **Confirm upstream BQ freshness** — after Node-22 fix, `max(date) FROM topshot.market_caps` was still 2026-05-16; verify upstream BQ vs our sync. `gh run list --workflow=etl-incremental-sync.yml`.
6. **Branch reconciliation** — `dexter/state-of-market-b` is the (now-merged) feature branch; several stale feature branches exist. Confirm before pruning.

Footguns: `next-env.d.ts` regenerates and blocks `git pull --rebase` → `git checkout -- next-env.d.ts`. A snapshot cron pushes to `main` — always `git pull --rebase` before push. Pushes go straight to `main`; verify on PROD not just local. Visual-companion server idles out (~30 min) and gets reaped — relaunch with `--foreground --host 0.0.0.0` via Bash `run_in_background:true`.

## Context Files
- `research/design-sprints/05-redesign-vision-handover.md` — **read first**, the design source of truth.
- `research/design-sprints/mockups/*.html` — open in a browser (B landing, player page, parallels).
- `app/state-of-the-market/page.tsx` + `components/state-of-market/*` + `lib/state-of-market/*` — the built landing B.
- `research/design-sprints/04-where-we-are-and-the-reset.md` — critique + reset plan.
- `research/doctrine.md`, `00-product-pillars-v3.md`, `00-foundation-v2.md` — doctrine, persona, data taxonomy / API ceilings.
- `lib/supabase/queries/market-cap-landing.ts` + `supabase/market_cap_landing_rpc.sql` — live `/market-cap` data layer.
- Live: https://topshot-data-portal.vercel.app/market-cap and `/state-of-the-market`
- Git: `main` (all work pushed, tip `0cab0fb` = landing B PR #12).
