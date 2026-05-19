# Phase 1 — Performance Findings (Code Quality + Architecture)

Two agents (`comprehensive-review:code-reviewer` + `comprehensive-review:architect-review`) reviewed in parallel. Findings converged hard on the same top wins.

## Critical — multi-second blocking on every cold cache miss

### C1. Synthesizer cache key includes `lookbackDays`, so every pill click is a separate cold path
Each of `30D / 90D / 6M / 1Y / 2Y / ALL` re-runs the full basket resolution + history fan-out. Steps 1-3 (CSV parse, edition metadata, current mcap) are window-independent and account for ~3-4 of the ~25s on 1Y cold.
**Fix:** split cache into `getGrailBasketResolved()` (window-independent) + `getGrailSeries(lookbackDays)` (only window-dependent).

### C2. History pagination is strictly sequential — 67 pages × 400ms = 27s for 1Y
**Fix:** probe `count`, then `Promise.all` paged requests with `p-limit(4-8)`. **Saves ~20s on 1Y cold-start.**

### C3. `/sniper` per-edition floor lookups are uncached above the function level
`fetchSniperFeed` is called inside `Suspense` but has no `unstable_cache` wrapper.
**Fix:** wrap in `unstable_cache(['sniper-feed', window], 120s)`.

## High — silent failure modes hiding perf regressions

### H1/H2/H3. Pagination + query layer swallow errors → truncated cached values
`grail-synthesizer.ts:177` and `rookies-synthesizer.ts:140` capture `data` but not `error`. A transient PostgREST error returns `[]`, the loop breaks, cache stores a truncated series for 1hr. THIS IS THE EXACT BUG that caused Roham's "drop at 06-12" — partial fetch cached as truth.
**Fix:** explicit error capture in pagination loops + throw to bubble to `.catch(() => null)` in `IndexHeroPair`.

### H4. CSV parsed on every cache miss
Hoist to module scope or pre-build to JSON at build time. ~10-30ms × cache-misses.

### H5. `O(N log N)` baseline derivation runs per-edition — should be single O(N) pass
`allHistory` is already sorted by date ASC from the supabase query. The current `sortedDates = Array.from(dmap.keys()).sort()` per-edition is wasted work.
**Fix:** single forward pass.

### H6. Same data sorted 3 times across the synthesizer
Set construction + `Array.from` + `.sort()` on a date set that comes pre-sorted from the query.

## Medium — abstraction debt that compounds future cost

### M1/F1. Three near-identical synthesizers (~280 lines each)
ts50 + grail + rookies share the math kernel. H5 / C2 / H1 each need fixing in all three or they drift.
**Fix:** extract `lib/indices/synthesizer-core.ts` with a `BasketStrategy` interface; each index becomes ~30 LOC of strategy + result mapping.

### M4/F5. Single `<Suspense>` blocks the whole hero region
`IndexHeroPair` does `Promise.all([grail, rookies])` — if Grail is slow (25s), Rookies (4s) waits.
**Fix:** push Suspense to the MiniHero level. Two boundaries, each streams independently.

### M5/F6. `/indices/[slug]` blocks the whole page on one await
Hero + constituents + methodology all wait for the synthesizer.
**Fix:** Suspense per section; constituents could even be a separate cached query.

### F8. Cache key versioning is manual + already drifted (grail at v4, rookies at v2, ts50 unversioned)
**Fix:** SHA-derive the version from `fetchInner.toString()`. Code change → automatic cache bust.

### F10. Cache tags emitted but no `/api/revalidate` endpoint to consume them
**Fix:** `app/api/revalidate/route.ts` that ETL POSTs to after `REFRESH MATERIALIZED VIEW`.

## Critical / Strategic — the permanent solve

### F2/F11/F12/F15. Move to daily-grain materialized views
The whole synthesize-on-read approach is the wrong shape. Right answer:

- `mv_index_daily(slug, date, adjusted_ratio, basket_mcap_usd)` — one row per (index, day)
- `mv_sniper_<w>_candidates(...)` — push mispricing computation to DB
- `mv_whales_<w>(user_name, side, total_usd, ...)` — DB-side aggregation
- Reduce 22 per-window MVs to ~8 per-day MVs with date-range query parameter

After this lands, the synthesizer is a thin 50-line wrapper over a single `SELECT ... WHERE slug=$1 AND date >= $2`. ~100x speedup, eliminates the timeout class entirely.

**Effort: large** (~2-3 weeks engineering, migrations + dual-run + cutover). Tracked in `.full-review/PERF-BACKLOG.md`.

---

## Findings count
- Critical: 3 (C1, C2, C3 + the strategic F2 marked separately)
- High: 9 (H1-H6, F8, F10, F15)
- Medium: 8 (M1-M6, F11, F12)
- Low: 4 (L1-L4)

## Critical Issues for Phase 2 Context
The codebase has multiple perf-critical paths in the hot loop. Security review can deprioritize — the perf wins are the focus of this sprint per `--performance-critical` flag. Phase 2A (security) skipped per scoped decision.

## Quick-wins recommended for THIS sprint (next push)
1. **M4/F5 (Suspense per hero)** — biggest perceived-perf win, smallest diff. ~6x faster first paint.
2. **C2 (parallel pagination)** — ~20s saved on cold 1Y.
3. **H1/H2/H3 (error bubbling)** — eliminates the silent-truncation class that caused Roham's "drop" bug.
4. **H5 (single-pass baseline)** — ~500ms saved per cold miss.
5. **F8 (SHA cache key)** — eliminates manual version-bumping.

Backlogged for follow-up: F2 (`mv_index_daily`), M1 (shared synthesizer extraction), F10 (revalidate API), F11 + F12 (sniper / whales MVs), F15 (window proliferation).
