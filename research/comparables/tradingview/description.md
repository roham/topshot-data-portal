---
topic: comparable-tradingview
side: target
kind: comparable
last_ingested: 2026-05-15T19:00:00Z
last_linted: 2026-05-15T19:05:19Z
source_iters:
  - v2-iter-15
  - v3-iter-1
source_docs:
  - design/03-comp-anchors.md
  - iter/14-comp-anchors/tradingview-deep-walk.md
confidence: high
validity: live
superseded_by: null
contradictions: []
owner_writes: wiki-keeper
---
## Claim

**TradingView is the portal's PRIMARY anchor.** Verified open, verified dense, verified consistent across every public surface walked (9 of 13 walked URLs returned rich content directly via WebFetch in `iter/14-comp-anchors/tradingview-deep-walk.md`). Anchors the homepage, screener pages, indices page, symbol pages (which we map to edition/moment/player pages), and the feed.

**TradingView universal design language (9 properties verified):**
1. **Persistent chrome** wraps every page — logo + 4 primary nav items + center search + one blue CTA.
2. **12-column screener tables** at 28-30px rows; ~70-100 rows above the fold on 1440px.
3. **Column-set tabs** swap visible columns over the same row set (Overview / Performance / Valuation / Dividends / Technicals).
4. **Defining metric at column 2.** Gainers: column 2 = `Chg %`. Most-active: column 2 = `Price × vol`.
5. **6-card / 6-row atomic block** on every markets-overview section, each ending with "See all …" link. Never 3 or 12 — always 6.
6. **8-window timeframe ribbon** on every symbol page: 1d / 5d / 1m / 6m / YTD / 1y / 5y / 10y.
7. **Breadcrumb is the navigational spine.** AAPL: Markets / USA / Stocks / Electronic Technology / Telecom Equipment / AAPL.
8. **Ideas woven through every surface.** Community card (thumbnail / title / symbol badge / Long-Short / author / comments / likes) appears identically on homepage, markets pages, symbol pages, dedicated `/ideas/` feed.
9. **No paywall on data exploration.** Paywall lives behind charting workspace features (custom indicators, alerts, multi-chart), not data.

**Color discipline:** Green up, red down. Flat color on numerics only. No gradients in tables.

**Mapping to portal screens:**
- `/` ← `tradingview.com/markets/` — 6-card sections, every section with See-all
- `/movers`, `/movers-down`, `/volume` ← `tradingview.com/markets/stocks-usa/market-movers-{gainers,losers,active}/`
- `/indices` ← `tradingview.com/markets/indices/`
- `/edition/[id]`, `/moment/[flowId]`, `/player/[id]` ← `tradingview.com/symbols/{SPX,NASDAQ-AAPL}/`
- `/feed` ← `tradingview.com/ideas/`
- `/screener/` infra ← `tradingview.com/screener/` (JS-app behavior; pattern by inference)

**Dimensions to beat on `/` (homepage):**
1. Above-the-fold 1h / 24h / 7d / 30d index strip (beat Card Ladder which shows daily only)
2. 6-card atomic sections, every section with See-all link
3. Top-of-screen breadcrumb that's navigable
4. No paywalls anywhere
5. Named featured collector card — leans into ownership-graph wedge that TradingView's universe (fungible securities) structurally cannot

**V2 iter-15 was the homepage rebuild against TradingView's `markets/` anchor.** V3 iter-1 was the rationale-per-choice-disciplined hybrid synthesis (6-block tournament). Iter-1 met the structural requirement but kick-back on data wiring (P0-1..P0-4 in critique/iter-1.md).

## Evidence

- design/03-comp-anchors.md §"Primary anchor: TradingView": full 9-property design language + screen mapping.
- design/03-comp-anchors.md §"`/` (homepage)" Rationale + Dimensions to beat: full TradingView anchor application.
- iter/14-comp-anchors/: parallel WebFetch-verified deep walks of TradingView URLs.
- iter/v3-iter-1/spec.md §1: "Anchor: design/03-comp-anchors.md § `/` → tradingview.com/markets/" — six atomic blocks honor the 6-card discipline.
- iter/v3-iter-1/world-comparison.md §3: dimensions-to-beat scoring.

## Open questions

- The 4 JS-app surfaces (`screener/`, `chart/`, `heatmap/`, `calendar/`) returned no rich content via WebFetch — patterns are inferred. Does this matter for the screener page anchor? Probable: low risk; the screener's column-set-tab pattern is already documented on the walkable surfaces.
- TradingView Ideas feed pattern requires user-generated content (Long/Short directional declarations). The portal doesn't have user-content infrastructure as of 2026-05-15. Does `/feed` require user input or can it be entirely activity-derived?

## Last change

2026-05-15: initial seed. Primary anchor pinned; iter-15/iter-1 alignment documented.
