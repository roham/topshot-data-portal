# Review Scope — Performance Optimization Sprint

## Target

Performance audit of the topshot-data-portal Next.js 16 app. Focus on the hot paths surfaced today:

1. **Index synthesizers** (`lib/indices/`) — value-weighted index computation paginating against Supabase. **Already-known issue:** 1Y Grail synthesizer pulls 48,550 rows via ~49 paginated PostgREST calls, hitting Vercel function timeouts and serving partial cached data for 1hr.
2. **Homepage `/`** — composes IndexHeroPair (Grail + Rookies) + SupabaseHomepageStrip + LegacyCascade. First-paint critical path.
3. **`/indices/[slug]` detail page** — same hot path as the homepage hero plus constituent table.
4. **The six new lane pages** (`/movers`, `/sniper`, `/on-this-day`, `/leaderboards`, `/portfolio`, `/whales`) — all leverage Supabase MV reads via existing query helpers.
5. **Supabase query layer** (`lib/supabase/queries/*.ts`) — used by everything above.

## Files

- `lib/indices/grail-synthesizer.ts`
- `lib/indices/rookies-synthesizer.ts`
- `lib/indices/ts50-synthesizer.ts`
- `components/IndexHeroPair.tsx`
- `components/IndexTimeWindowPills.tsx`
- `app/page.tsx`
- `app/indices/page.tsx`
- `app/indices/[slug]/page.tsx`
- `app/movers/page.tsx`
- `app/sniper/page.tsx`
- `app/on-this-day/page.tsx`
- `app/leaderboards/page.tsx`
- `app/whales/page.tsx`
- `app/editions/page.tsx`
- `lib/supabase/queries/top-players.ts`
- `lib/supabase/queries/most-active-editions.ts`
- `lib/supabase/queries/largest-sales.ts`
- `lib/supabase/helpers.ts`
- `next.config.ts`

## Flags

- Security Focus: no
- Performance Critical: **yes** (the focus of this sprint)
- Strict Mode: no
- Framework: Next.js 16 (App Router, RSC, Turbopack build, Vercel)

## Review Phases — Performance-Scoped

Per `--performance-critical` flag, prioritize Phase 1 (code quality affecting perf) + Phase 2B (performance analysis itself). Phase 2A (security) runs because the orchestrator pairs them, but findings deprioritize. Phase 3 + 4 deferred unless user opts in at the checkpoint.

1. Phase 1 — Code Quality & Architecture (parallel: code-reviewer + architect-review)
2. Phase 2 — Security & Performance (parallel: security-auditor + general-purpose performance engineer)
3. **CHECKPOINT** — present perf findings, ask whether to continue to Phase 3-4 or stop and act on findings
4. Phase 3 — Testing & Documentation (optional, gated on checkpoint)
5. Phase 4 — Best Practices (optional)
6. Phase 5 — Consolidated Report

## Known Perf Issues (going in)

- Grail/Rookies synthesizers paginate ~49 supabase calls @ ~500ms = ~25s for 1Y window
- Vercel default function timeout was 10s; bumped to 60s in `maxDuration` on `/` and `/indices/[slug]`
- No materialized view exists for index series — recomputed per cache-miss
- 30-second `maxDuration` set on the six new lane pages too — same shape of issue could appear under load
- `topshot.market_caps` is daily-grain but synthesizers fan out per-edition, multiplying rows
- The legacy homepage cascade also runs `recentSalesBulk(2000)` — large upfront pull
