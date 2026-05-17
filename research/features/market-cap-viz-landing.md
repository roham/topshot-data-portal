# Research note — Market Cap Viz Landing (V6 first surface)

**Feature id:** `market-cap-viz-landing`
**Date:** 2026-05-17 19:30Z
**Doctrine reference:** `research/doctrine.md` v1.1 §P9 (start with market cap visualizations only). This is the entire V6 first-ship surface.

## 1. Trader's verbatim ask

Roham 2026-05-17 19:00Z, paraphrasing the audience's mental model: *"You just load it, and it's just a bunch of graphs."* The trader (MBL-shaped) lands during halftime, wants to see immediately what the market looks like across the dimensions they care about — without sorting a table.

Until MBL's actual Twitter quotes are sourced (his transaction data isn't in Supabase per doctrine §3 footnote), the canonical voice is *"show me the market — visually, fast, faithful."*

## 2. Comparables

**Primary (graph-first landing pattern):** **Polymarket** — cards-grid where each card has a probability sparkline as the dominant element. Signature move: chart-as-the-card, not chart-as-decoration-inside-a-card. Visit polymarket.com to see the pattern.

**Secondary (graph-first landing pattern):** **Card Ladder Pro** — home shows CL50 + CL100 + Rookie Index as big charts, then top movers as cards with sparklines, then category indices. Signature move: index-charts-as-hero, not as ornament.

**Tertiary (the OTM we replace):** **OTM (deceased)** — top gainers/losers cards with sparklines, market summary cards. Audience-fit was the killer feature; we honor it by being chart-first.

## 2b. Data viz pillar

This entire surface IS the data viz pillar. Chart kinds used:
- Horizontal bar (top-N by market cap; per tier/parallel/set/team)
- Stacked area / stacked bar (composition over time, where data permits)
- Time-series line (total mcap over the 4-day window we have)
- Treemap (team or set composition)
- Histogram (mcap distribution)
- Donut/pie (active vs retired player share)

Filter state: every chart has a 24H/7D/30D/ALL window selector (default 30D per P7). State in URL via nuqs.

## 3. Thin-slice scope (V1 ship)

A grid of ~8 chart cards on `/market-cap` (or `/` as the new landing — decide at build time):

1. **Top 20 players by market cap** (horizontal bar, sparkline per row) — `mv_player_market_cap` direct
2. **Market cap by tier** (vertical bar) — JOIN editions → latest `market_caps`
3. **Market cap by parallel** (vertical bar, "Base" gets 95% + named parallels get the rest; show what data we have, honest empty on un-backfilled parallels) — needs `editions.parallel_id`
4. **Top 20 sets by market cap** (horizontal bar) — JOIN sets → editions → market_caps
5. **Market cap by team** (treemap, visx) — JOIN players → editions → market_caps via player.last_known_team_id
6. **Total market cap over time** (line, 4 datapoints — honestly small window, label "since 2026-05-13") — daily sum of `market_caps.market_cap`
7. **30D movers** (top 5 gainers + top 5 losers, side-by-side bars — using the 4-day window we have as a proxy; honestly label) — diff per player between min(date) and max(date)
8. **Market cap concentration** (top-10 share / top-50 share / top-N curve) — derived from `mv_player_market_cap`

Each card is **chart on top, ONE-LINE caption below, "View details →" link at the bottom-right**. The drill-down for each goes to a per-cut detail page (deferred — for V1 the link can go to the existing `/players` or to a placeholder that says "drill-down coming").

## 4. Acceptance criteria (judge tests these)

- Page renders < 30s on cold Vercel.
- ≥ 6 chart cards visible above the fold (1440px viewport) — graphs are dominant; tables are NOWHERE on the landing.
- Each chart renders REAL data (per `research/wiki/gotchas/judge-journeys-must-assert-data-rendered.md`). No "honest empty" PASS on charts that should have data.
- Top 20 players chart: top row is Stephen Curry (per current `mv_player_market_cap`); count of bars = 20.
- Market cap by tier chart: ≥ 4 bars visible (Common, Rare, Legendary, Fandom or Ultimate).
- Time window selector defaults to 30D (per P7); URL has `?h=30d` or equivalent on landing.
- Each card has ONE-LINE caption + "View details →" link.
- No marketing copy ("Discover" / "Explore" / "Trending Now"). Senior-research-analyst voice.
- Mobile: works at 375px (cards stack 1-wide, charts render legibly).
- Visual diff vs Polymarket landing screenshot: fidelity score ≥ 7 (Opus vision review).

## 5. Data source

| Chart | Query |
|---|---|
| Top 20 players | `topshot.mv_player_market_cap ORDER BY total_market_cap_usd DESC LIMIT 20` |
| Mcap by tier | `JOIN editions ON e.edition_id = mc.edition_id GROUP BY tier_name SUM(market_cap)` on latest date |
| Mcap by parallel | `JOIN editions ON e.edition_id = mc.edition_id JOIN parallel_types ON e.parallel_id = pt.parallel_id GROUP BY pt.name` (un-backfilled = "Unknown") |
| Top 20 sets | `JOIN editions JOIN sets GROUP BY set_id SUM(market_cap)` |
| Mcap by team | `JOIN editions JOIN players GROUP BY last_known_team_id SUM(market_cap)` |
| Total mcap over time | `topshot.market_caps GROUP BY date SUM(market_cap)` |
| 30D movers | (latest_date mcap - earliest_date mcap) / earliest_date_mcap per player |
| Concentration | top-10 sum / total sum from mv_player_market_cap |

All read-only against `topshot.*` Supabase. Zero BQ at request time per architecture.

## 6. Reuse-first inventory

Existing primitives I reuse:
- `components/primitives/Card.tsx` — but adapted: for landing chart cards, the chart IS the hero, not below subtitle. May need a new `ChartCard` primitive that has `<title> + <chart-area> + <caption> + <link>` shape.
- `components/primitives/Num.tsx` — for any inline numbers in captions.
- `components/primitives/TierChip.tsx` — for the tier-mcap chart's color legend.
- `lib/supabase/server.ts` — server-side anon client for fetches.
- Recharts BarChart, LineChart for most charts; visx Treemap for team mcap.

New: `components/primitives/ChartCard.tsx` (chart-on-top layout), `components/charts/*` (per-chart components), `app/market-cap/page.tsx` (the landing).

## 7. Known gotchas applying

- **`research/wiki/gotchas/judge-journeys-must-assert-data-rendered.md`** — load-bearing. Each chart must render real data; honest-empty only for genuinely-empty entities.
- **`research/wiki/gotchas/nulls-last-qualifier-defeats-partial-index.md`** — avoid `.nullslast()` on indexed columns.
- **`research/wiki/gotchas/exec-sql-rpc-is-30x-slower-than-postgrest.md`** — never use exec_sql; always PostgREST native.
- 4-day mcap window is a real constraint. The "time-series" charts are 4 points wide. Label honestly; don't fake a longer window.

## 8. Prior failure to address

The /parallels v1 page (commit `e17bfd6`, reverted in `1381fcc`) shipped with bad information architecture. The lesson encoded in doctrine §4 REJECTS list: don't ship hardcoded fixtures, don't default-pick a person, don't use UUIDs as row identifiers, use a comparable's signature move as the gate. This surface explicitly honors all four.

Also: the previous "ship 23 features" approach failed across V1-V5 per `research/design-sprints/03-meta-analysis-why-the-loop-fails.md`. This is the V6 ONE surface — get it right before any next surface.
