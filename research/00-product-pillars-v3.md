# V3 Product Pillars — what every iteration must honor

**Date:** 2026-05-17
**Authored by:** Roham (principal) + Dexter (orchestrator)
**Status:** load-bearing — every Researcher reads this; every Builder honors it; every Judge grades against it.

This document supersedes the implicit-pillar pattern in `research/00-foundation-v2.md` §7/§9 (which scattered comparables and patterns across catalog entries). The pillars below are the explicit version. When this document and an artifact disagree, this wins.

---

## Pillar 1 — Data Visualization Is The Brand

A best-in-class data portal for NBA Top Shot collectors is FIRST a data visualization product. Charts are not a feature; charts are *the substance the user shows up for*. The Pro Trader and the Analyst both spend most of their session reading visualizations and making decisions from them.

**What this means concretely, per feature:**

- Every feature that surfaces price, volume, ownership, circulation, P&L, or any time/distribution-keyed quantity MUST evaluate whether a chart belongs. If no chart is present, the research note states why explicitly (one sentence). Default-no is wrong; default-evaluate is right.
- Every chart MUST support filtering — time window (1D/7D/1M/3M/YTD/ALL where time-keyed; tier/parallel/set/serial-band where domain-keyed), and the filter state MUST live in the URL (per artifact 09 J-X2) so the user can share what they see.
- Every chart MUST honor the parallels-are-first-class rule (foundation-v2 §10). Aggregating across parallels in a chart is structurally dishonest — color/series each parallel separately, or chart one parallel at a time.
- Every chart MUST have a confidence layer when sample size matters — comp count, days-on-market, sample-size legend in the corner. Bare lines without confidence labels are the OTM True Value mistake (foundation-v2 §1).

**The viz vocabulary we expect across the portal** (the loop SHOULD produce features that use these — not all at once, but the catalog grows iteration by iteration):

| Viz kind | Use for | Primary comparable | Cross-domain comparable |
|---|---|---|---|
| Time-series line | Price history per moment/edition; market-cap over time | TradingView, StockX historical | Bloomberg terminal, FRED |
| Candlestick | Edition floor with high/low/open/close per day | TradingView, Tensor | Hyperliquid order book |
| Histogram / bar | Sale price distribution; set completion levels; serial-band density | OTM moment detail histogram | Glassnode supply distribution |
| Scatter (rarity × price → serial × price) | Within-edition serial premium pattern | Tensor rarity-vs-price | Polymarket order ladder |
| Depth chart | Cumulative listings + bids by price | Magic Eden, Blur, Tensor depth | Hyperliquid order book, IBKR DOM |
| Heatmap | Calendar archive (J-A5); player-tier matrix; volume by hour-of-day | GitHub contribution graph, Robinhood activity heatmap | NYT Upshot, FiveThirtyEight |
| Sparkline | Inline trend in ranking rows | Magic Eden, Tensor row sparklines | Bloomberg watchlist sparkline |
| Sankey / flow | Holder concentration shifts; pack-open contents flow | NFTGo WCI longitudinal | NYT graphics, Sankeymatic |
| Stacked area | Circulation breakdown over time (Listed / Owned / Locked / Burned) | OTM circulation block | Glassnode supply categories |
| Ladder / treemap | Portfolio composition by edition/tier; market depth | Card Ladder portfolio | StockX treemap, Robinhood positions |
| Cumulative dist (ECDF) | Serial-rank vs price distribution | Tensor rarity rank | TradingView volume profile |
| Anomaly band | Wash-trade flagging on transaction stream | Hildobby Dune dashboards | Chainalysis Reactor, FlightRadar24 anomaly |

If a feature's viz kind isn't in this vocabulary, the Researcher proposes adding it AND cites the cross-domain origin of the pattern. The vocabulary grows iteration by iteration.

---

## Pillar 2 — Every Page Has A Comparable (Mandate)

Every feature that ships, every page on the portal, MUST be designed against an explicit comparable. The comparable is the visual + interaction reference for the initial cut; the portal can exceed it but cannot ship without one. "Designed from scratch" is the failure mode that produces generic Vercel-template surfaces.

**The mandate per feature:**

1. **Primary comparable** — the one product whose surface most closely matches the feature's job. Usually OTM (because of audience match), but not always (Sniper → OTM Sniper; Indices → PWCC 500; Watchlist → NFTGo; Real-time Feed → Nansen).
2. **At least one cross-domain comparable** — from a different industry, drawing on either a *trading* surface (TradingView, Bloomberg, Hyperliquid, IBKR, Polymarket) or a *collecting* surface (PSA Set Registry, Bring a Trailer, Goldin, Card Ladder, eBay sold, StockX). The cross-domain reference forces the design out of NFT-bubble defaults.
3. **Cite the comparable's specific signature move** — not "TradingView" abstractly, but "TradingView's hover-crosshair with locked y-axis read." Specificity is what propagates the comparable into shippable code.

**Where the comparable lives:**
- `features.json[feature].comparable_primary` — one-line string
- `features.json[feature].comparable_cross_domain` — array of strings
- The Researcher's note section 2 ("Comparables") expands these into shape + signature moves the Builder ships against.

**Why this matters:** OTM is dead. We can copy its surface — but we must beat it. The way to beat it is to fuse OTM's audience-fit with cross-domain depth. A Top Shot portal that reads like Bloomberg (density), trades like TradingView (charting), tracks like Card Ladder (portfolio), and verifies like PSA (provenance) is a thing OTM never was.

---

## Pillar 3 — Cross-Domain Learning Bank

The Pro Trader and the Analyst aren't naive about software. They've used trading platforms (RobinHood at minimum, TradingView/Bloomberg/IBKR likely); they've collected physical goods (PSA, Goldin, eBay); they've read data journalism (FiveThirtyEight, NYT Upshot, The Pudding). The portal's standard is what *survived* in each of those domains — not what the NFT industry settled for.

The learning bank — read these names + their signature moves before designing any new feature:

**Trading**
- **Bloomberg Terminal** — amber bar, function-code grammar, sub-200ms transitions, 80–120 data points per panel, fixed layouts the user owns (Launchpad).
- **TradingView** — `/` palette, watchlists-as-first-class-objects, alert grammar (price/cross/study), multi-pane charts.
- **Hyperliquid** — CEX-class responsiveness on-chain; the proof that on-chain finance can feel like Robinhood.
- **IBKR / Interactive Brokers** — Mosaic flexible layout, quick-search, depth-of-market column.
- **Polymarket** — depth ladder with quantity weighting; share-modal-as-first-class artifact.
- **Robinhood** — onboarding clarity, watchlist density, positions table simplicity.

**Collecting**
- **PSA Set Registry** — set-completion-as-game-mechanic, pop-report-as-floor-context, the canonical "X/Y owned" surface (also the right model for `set-completion-histogram`).
- **Bring a Trailer** — comment threads as social proof; comments on the asset itself; sold-archive permalink discipline.
- **Goldin (Heritage)** — auction-result density, hammer + buyer's premium transparency, comp-table-with-link-to-source.
- **Card Ladder Pro** — Bloomberg-shaped surface for sports cards; collector pays $200/yr for it; CL50 index; daily mover email digest.
- **StockX** — size-as-market-segmenter (parallels are our size); sold history with sneaker-grade transparency.
- **eBay sold listings** — the universal "what did this trade for" surface; date / price / shipping / condition all visible at a glance.

**Data Viz / Editorial**
- **NYT Upshot** — annotated charts with the human cause embedded (election charts, vaccine rollout); ReferenceLine-as-storytelling.
- **FiveThirtyEight** — uncertainty bands as standard; the model is shown, not just the prediction.
- **The Pudding** — long-form scroll-driven data essays; the canonical "data + narrative" pattern.
- **Glassnode** — on-chain supply-distribution charts; the cohort-by-age methodology that maps onto Top Shot's "scarred OGs vs. re-activating gamblers" segmentation.
- **Nansen** — wallet-labeling + smart-money feeds; named entities (not just hex addresses) is what makes it readable.
- **Dune Analytics** — community-built dashboard culture; the methodology-is-public-and-editable principle that the rules-engine (J-P7) ports.

**Community / Reference**
- **Wikipedia infoboxes** — the canonical "every entity has the same 8 stats at the top" pattern (port to player/team/edition pages).
- **GitHub contribution graph** — calendar heatmap for on-this-day archive (J-A5).
- **FlightRadar24** — real-time strip + map for activity feeds (J-P5 cross-domain reference).

The Researcher's note doesn't need to enumerate every domain — but it MUST cite at least one trading + at least one collecting reference for features that involve price or ownership. Pillar 2 mandates one cross-domain comparable; Pillar 3 is the bank to draw from.

---

## Pillar 4 — Best-In-Class Taxonomy + Browse

The portal MUST be obviously navigable. A new visitor lands and within 10 seconds knows where Moments / Players / Sets / Packs / Editions / Tiers / Parallels live; the keyboard fluency comes after, but the eye-fluency comes first.

**The taxonomy that matters** (per foundation-v2 §2):
- **Series → Set → Edition → Moment** is the canonical drill-down.
- **Tier and Parallel** are cross-cutting dimensions that filter every list.
- **Player → Team** is the real-world anchor layer.
- **Pack → Edition** is the supply/origin relationship.

**Browse discipline (every directory page must satisfy):**
1. **Persistent left filter rail** — collapsible accordions per dimension (Player / Team / Tier / Parallel / Set / Series / Price range / Listed-only / Owned-by-me). State in URL via nuqs.
2. **Sortable column headers** — single-click sort, double-click reverse, persistent across navigation.
3. **Pagination is per page; total count is visible** — "1–50 of 12,873" not "Next →" alone.
4. **Breadcrumb back-out at the top of every detail page** — Series 4 / Base Set / Wemby Layup / #128.
5. **Search is exact-on-name and forgiving-on-typo** — but per foundation-v2 §3 ceiling 1, server-side username search is exact-only. Surface that ceiling honestly (per Pillar 5 below).
6. **EXPORT button on every grid** — table-stakes (foundation-v2 §7 #11).
7. **Empty states are honest** — "No moments match your filters" with a one-click "clear filters." Never "Coming Soon."

---

## Pillar 5 — Deep Empathy For The Customer's Desires

The Pro Trader has a portfolio worth $5K–$800K and checks prices several times a day. The Analyst is the editorial-curious sibling — same audience, softer density. Both have been burned by OTM dying, NFTBank Black-boxing, and the 2022–2024 drawdown. They are *suspicious of marketing copy* and have an instinct for asymmetric information.

**Every feature ships with the trader's verbatim ask at the top of the research note.** Not paraphrased. Quote from `research/personas/pro-trader.md`. If the persona doc doesn't carry verbatim quotes for the feature's domain, the Researcher quotes from Discord / r/nbatopshot / Top Shot Twitter — and adds those quotes to the persona doc as a side-effect.

**Empathy mandates per feature:**
1. **The trader sees their question answered in <5 seconds.** Information density is the brand. Whitespace is not a feature. Test: open the live URL on mobile + desktop; can a real trader answer their question in the first viewport without scrolling?
2. **Honest absence beats fabricated presence.** If a public-API ceiling blocks a feature, document it on `/methodology` with positive proof (the introspection query that proves the column doesn't exist). Pretending data exists is the credibility kill (per foundation-v2 §3 + §10).
3. **No marketing copy on pro surfaces.** No "Explore!", "Trending Now!", "Discover!". Caption every number with a single sentence that earns it. The voice is senior research analyst — Bloomberg, not Coinbase.
4. **Show confidence labels.** Comp count, days-on-market, sample size, model coverage gap. Trust the audience to handle uncertainty; insult them by hiding it.
5. **Let the trader edit your model.** OTM's True Value was opaque; that was the structural mistake. J-P7 (transparent editable rules engine) is the moat. Every model the portal ships, the trader can inspect, modify, and save as their own.
6. **Parallels are first-class.** Every chart, every floor, every leaderboard treats each (tier × parallel) cell as its own market. Aggregating across parallels collapses the market.
7. **Use real marks.** Player headshots from `cdn.nba.com`, moment media from `assets.nbatopshot.com`, team colors from a canonical registry. No placeholder gradients, no fabricated logos, no AI fill.

---

## How the loop uses these pillars

Per iteration, the Researcher:
1. Reads this file (it's added to the Researcher's READ FIRST list).
2. For the feature being researched, identifies which pillars apply (typically all five — they compose, not partition).
3. Produces a research note whose section 2 (Comparables) names: primary + at least one cross-domain comparable, with the specific signature move from each.
4. If the feature is data-viz-shaped (any of: price, volume, ownership, time-series, distribution), the note identifies the viz kind from Pillar 1's vocabulary AND cites the comparable for that viz kind.

Per iteration, the Builder:
1. Honors the comparable's signature move in the implementation (not just the surface — the *interaction*).
2. Adds filter rail + URL state for any new directory page (Pillar 4).
3. Verifies parallels are not aggregated (Pillar 5 #6).
4. Adds confidence labels where sample size matters (Pillar 5 #4).

Per iteration, the Judge:
1. Plays the trader's verbatim journey, captured as quoted in the research note's section 1.
2. Visually grades the rendered output against the screenshot of the primary comparable. Side-by-side. 1-10 fidelity per element of the comparable's signature move.
3. If a chart was supposed to ship and is missing or unfilterable: FAIL (regardless of whether other acceptance criteria pass).
4. If a comparable is absent from the research note: the Researcher's note is incomplete; loop kicks back to Researcher.

---

## What good looks like

A pro trader visits `https://topshot-data-portal.vercel.app`, instinctively presses `/` and searches for a player, lands on the player page, sees the editions matrix (rows: sets; columns: tiers; cells: floor × parallel), clicks a cell, lands on the edition page, sees the depth chart (cumulative listings + bids) and the serial-vs-price scatter, presses `?`, sees the shortcut menu, presses `g h` to go home, sees the live ticker of what's happening *right now*. They never see a `<ComingSoon>`, never hit a 404, never see a marketing word, never see a chart without confidence labels, never see parallels aggregated. They export their watchlist as CSV. They check on mobile during halftime; it works.

That is what the loop is shipping toward. Every iteration measures itself against that picture.

---

*This file is canonical; the loop reads it on every iteration. Updates happen via PR (or direct push in the prototype regime). If a pillar conflicts with a feature's acceptance text, the pillar wins — the acceptance text gets updated.*
