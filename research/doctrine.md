# Top Shot Data Portal — Doctrine v1.1 (post-Roham redline 2026-05-17 19:00Z)

**Date:** 2026-05-17 19:00Z
**Status:** DRAFT v1.1 — incorporates Roham's three Socratic answers from 19:00Z. Still awaits a final read before lock. Once locked, this is **load-bearing**: every Researcher reads it; every Builder honors it; every Judge tests against it.

The shape is borrowed from the lore-vault GDD V2 *Eight Reframings (Opus, 2026-04-27)* that worked. Lore-vault shipped one coherent page in one PR because doctrine was tight enough that the agent had only execution choices left, not interpretation choices. Same intent here.

**v1.1 changes from v1:**
- ICP named: **Michael Levy (MBL)**. (Data-availability caveat in §3 footnote.)
- P2 (Density) inverted to **Graphs first, density on drill**.
- P9 (Scope) narrowed to **start with market cap visualizations only; expand from there**.
- §0 adds **Polymarket** and **Card Ladder Pro** as the canonical graph-first comparables.

---

## §0 — Load-bearing comparables (the soul)

Each named here is a product whose **specific signature moves** the portal must port. Not "inspired-by." Load-bearing. Per-feature comparable mapping lives in `features.json` and `research/00-foundation-v2.md` §9.

### §0.1 — Graph-first landings (the load-bearing pattern)

Three products land their visitors on **a grid/wall of charts**, not on a table:

| Comparable | The signature move | Why we port it |
|---|---|---|
| **Polymarket** | Cards-grid of bet markets, each card with a probability time-series chart prominently. Click a card → market detail with deeper chart + order book. Tables are second-click. | Audience match: people checking "what's moving" want to SEE the move, not sort a table. Mirrors how OTM landed when alive. |
| **OTM (deceased) — homepage** | Top gainers/losers cards each with a sparkline. Index charts. Featured market summary cards. The information IS chart-first. | Same audience we're building for; we are the OTM that lives. The dead one knew. |
| **Card Ladder Pro** | CL50/CL100 index chart at top of home. Below: top movers as cards with sparklines. Category-index charts. Tables in second-click views. | $200/yr collector tool that survived because the chart-first landing was the right shape for the collector mindset. |

**These three are the foundational pattern.** Tables and density still exist, but they're **second-click** drill-downs from a graph-first landing. Per Roham 2026-05-17 19:00Z: *"the first level should be graphs, almost like Polymarket graphs (that's what OTM was). You just load it, and it's just a bunch of graphs."*

### §0.2 — Second-click reference comparables

Once a user drills in from a graph, the data layer comes from these:

| Comparable | What we port | What we don't |
|---|---|---|
| **OTM (deceased) — detail surfaces** | Audience-fit. Centerpiece /moments grid + filter rail + EXPORT. Sniper interaction. Player Market Cap view. Time-tab grammar on moment-detail. Circulation breakdown block. | True Value black-box model (their fatal mistake). Marketing-speak "Discover" copy. |
| **Bloomberg Terminal** | Density on drill-down screens (80–120 data points per panel). Function-code grammar in the search bar. Keyboard-first navigation. Tabular numeric monospace. Sub-200ms transitions. | Bloomberg-density on the LANDING (per §0.1 inversion). |
| **TradingView** | Chart engine for time-series. Watchlists as first-class objects. `/` palette to focus filter. Multi-time-window selector. Alert rules attached to symbols. | Indicator marketplace. Pine Script. |
| **PSA Set Registry** | Set completion as game mechanic. Pop-by-grade equivalent (we use circulation-by-tier-and-parallel). Per-set leaderboard. | Encapsulation/grading vocabulary. |
| **StockX** | Size-as-market-segmenter — applied to our parallels. Each (set × tier × parallel) is its own market with its own ladder. Sold-history transparency. | The drop/hype/release-calendar framing. |
| **Tensor (Solana)** | Depth chart (cumulative listings + bids by price). Rarity-vs-price scatter recast as serial-vs-price within an edition. Row-density treatment with sparklines. | Solana-specific terminology. |
| **OTM Sniper (deceased)** | The continuous scan-for-mispricing surface — most-loved feature in the dead-tool canon. We ship a TRANSPARENT, EDITABLE rules engine version. | Opaque model. |

A feature may cite more than one comparable; cross-domain references (NYT Upshot for annotated charts, FlightRadar24 for real-time strip, etc.) live in the foundation doc §7 and feed Pillar 3 of `00-product-pillars-v3.md`. The three in §0.1 are the **landing-page canon**; the seven in §0.2 are the **drill-down canon**.

---

## §1 — The doctrine (eight principles, verbatim-quotable)

### P1. Faithful display, never smooth

Floor market cap = `lowest_ask × circulation`, summed across editions. The principle: if someone has listed their 1-of-1 at $5M, **that IS the market for that moment.** Fans of other players can pump their floors by listing. We do not "fix" the metric by introducing avg-sale aggregation, wash-trade filtering before display, or anomaly-suppression as default. Honest reflection > smoothing artifacts away.

**Verbatim from Roham, 2026-05-17 16:50Z:** *"If someone has listed their moment for $5 million, and it's the only one of that moment, then that's what it is. If the fans of other players want to pump the lowest asks of their players, then they should come in and list their stuff too."*

**Comparable:** TradingView's raw bid/ask display; PSA's published pop without "outlier correction."
**Rejects:** avg-sale-rebased "market cap"; median-sale as a metric; pre-display wash filtering; AI-smoothed valuations without confidence bands.

### P2. Graphs first, density on drill (INVERTED from v1)

The first level of every page is a **wall of relevant graphs** — not a table, not a hero, not marketing copy. The user loads the page and immediately sees the data visualized. Tables, raw rows, and Bloomberg-density panels are **second-click** drill-downs from any graph. The trade-off accepted: we are **WORSE at instant raw-data scanning** (you need one click to reach the spreadsheet view), in exchange for being **immediately legible** the moment a page loads.

**Verbatim from Roham, 2026-05-17 19:00Z:** *"I think we should hide the density and the sort of tables and stuff behind one click. I think the first level should be graphs, almost like Polymarket graphs (that's what OTM was). You just load it, and it's just a bunch of graphs."*

**Comparable:** Polymarket cards-grid (each card a probability sparkline); OTM landing (gainers/losers cards with sparklines); Card Ladder Pro home (CL50 + mover cards + sparklines).
**Rejects:** table-first landings (the current `/players` table as a first-class landing IS this anti-pattern); hero-with-marketing-copy at the top; "Get Started" or "Explore" CTAs above the data; Bloomberg-density on the LANDING (Bloomberg-density on the second-click drill-down is right).

### P3. Every page has a comparable, and the comparable is load-bearing

For every shipped feature, the research note names ONE specific signature move from a named product (from §0 above) and the Builder ports that specific interaction. Not "TradingView-inspired" — **"TradingView's hover-crosshair with locked y-axis read."** If the implementation doesn't honor the specific move, the feature fails.

**Verbatim from Roham, 2026-05-17 (initial brief):** *"Ideally, for every page or feature set on the site, you have a comparable."*

**Comparable:** the per-feature comparables catalog in `research/00-foundation-v2.md` §9.
**Rejects:** "inspired-by" prose without naming a specific move; original UI inventions before mastering the canon; generic shadcn templates.

### P4. Charts are substance, not decoration

Every feature evaluates whether a chart belongs. If yes, the chart MUST: (a) render real data on a data-bearing entity; (b) be filterable; (c) have filter state in URL; (d) treat each parallel as its own series, never aggregated. Honest empty state is acceptable when the entity genuinely lacks data (brand-new collector with 0 moments; API ceiling blocking the column); honest empty state on a data-bearing entity where the page just failed to fetch IS a bug.

**Verbatim from Roham, 2026-05-17 (initial brief):** *"Charts are very important. We need a pillar of work just on data visualization, best-in-class data visualization."*

**Comparable:** TradingView for time-series; Tensor depth ladder for liquidity; Magic Eden sparklines for ranking rows; Glassnode for supply-distribution; NYT Upshot for annotated charts.
**Rejects:** non-filterable static charts; charts without filter state in URL (no shareable view); aggregated-across-parallel chart lines; placeholder-shaped charts that don't render real data.

### P5. Parallels are first-class

Each `(set × tier × parallel)` is its own market. Every floor, every chart, every leaderboard, every cell treats it that way. Parallel names (Base, Explosion, Diamond, Anthology, Diced, …, Omega — the 22 named ones from Top Shot GraphQL + Base sentinel) are visible everywhere a moment is shown. Aggregating across parallels in any display is structurally dishonest.

**Comparable:** StockX size-as-market-segmenter. Different size = different market.
**Rejects:** edition-aggregated floors that collapse parallels; row-grouping that hides parallel structure; "the Common floor" without specifying which parallel.

### P6. The trader's verbatim ask is the spec

Every feature's acceptance text opens with a direct quote from `research/personas/pro-trader.md` OR from Discord/r/nbatopshot. We render what they SAID they want, not what we imagine they want. Paraphrase is a code smell.

**Comparable:** Jobs-to-be-Done method (Christensen). Bring a Trailer auction listings written in the seller's voice, not a copywriter's.
**Rejects:** paraphrased trader voice; pitch-deck framing on pro surfaces; "elevated experience" prose; marketing-shaped acceptance text.

### P7. Default 30D, not 24H

Every time-window selector defaults to 30D on landing. 24H is too sparse for low-volume moments — most rows show "—" on 24H deltas. 30D captures real activity.

**Verbatim from Roham, 2026-05-17 14:40Z:** *"24 hours is not a short enough window or not a long enough window. That's no problem. Let's just default to showing 30-day windows."*

**Comparable:** TradingView default window for sparse-volume securities.
**Rejects:** 24H defaults anywhere; daily-newspaper-cadence assumptions on low-volume moments; "today's movers" tiles on the homepage at 24H window.

### P8. Opportunity framing on empty markets

When circulation > 0 but listings = 0 in a cell, render **"🆕 NEW DROP / be first to list"** — not a dash, not "Coming Soon." Empty rows are invitations, not bugs.

**Verbatim from Roham, 2026-05-17 17:10Z:** *"make it visually positive don't hide, emphasize the exciting part if it exists."*

**Comparable:** Stripe Atlas onboarding empty-states; Linear's first-time-experience banners.
**Rejects:** silent blank cells; "no data available" labels; collapsing empty rows into a footer that hides them.

### P9. Start with market cap visualizations only. Earn the right to expand.

V6 ships ONE thing first: **a graph-first landing visualizing different forms of market cap** — and nothing else, until that one thing is genuinely excellent. The doctrine is: don't earn breadth before you've earned depth on one canonical surface.

**Verbatim from Roham, 2026-05-17 19:00Z:** *"In terms of the scope, we should just start with visualizing different forms of market cap and then go from there."*

**The first surface (working name: `/` or `/market-cap`):** a wall of charts, each chart a different cut of "market cap as the data." Click any chart → drill into its underlying table (per P2). Examples of what cuts are possible (Researcher narrows + ranks before authoring):
- Top players by market cap (time-series chart, top 10 lines)
- Market cap concentration (Gini / top-N share over time)
- Market cap by tier (stacked area: Common / Rare / Legendary / Ultimate)
- Market cap by parallel (stacked area: Base / Diamond / Anthology / ...)
- 30D market cap movers (bar chart: top % gainers + losers, side-by-side)
- Market cap vs. floor-price-distribution (scatter)
- Per-set market cap (bar chart, top 20 sets)
- Per-team market cap (treemap)
- Market cap concentration by collector (top wallets' share of total)
- Series 1 vs Series N market cap (multi-line over time)

Each chart on this surface is its own load-bearing artifact, tested independently for fidelity to its comparable (Polymarket / Card Ladder Pro / NYT Upshot / Glassnode / FRED depending on chart type). When all of these are excellent + clickable into the second-click drill-down, doctrine permits expanding to the next surface.

**Comparable:** Polymarket market-cards-grid; Card Ladder Pro home with CL50 + indices + movers; lore-vault GDD V2 (one coherent surface as the entire artifact).
**Rejects:** shipping `/players` + `/moments` + `/sets` + 18 other routes in parallel before any ONE of them is excellent; feature factories; ship-count as success metric.

---

## §2 — Application notes (how the loop USES this)

1. **Researcher**: reads doctrine before any feature's research note. The note's sections 2 (Comparables — primary + cross-domain) and 2b (Data viz pillar) must cite the specific signature move from §0. Section 1 (Trader's verbatim ask) is verbatim per P6.
2. **Builder**: reads doctrine + research note. Cannot ship if any of P1–P9 is violated. P4 specifically: the journey MUST resolve a data-bearing entity (per `research/wiki/gotchas/judge-journeys-must-assert-data-rendered.md`).
3. **Judge**: tests acceptance + visual fidelity to comparable screenshot (under `research/otm-screenshots/` or a new sibling dir for non-OTM comparables). A vision-diff step grades fidelity 1–10; <7 is FAIL.
4. **Roham (CEO signal)**: reviews via `/admin/review` per V6 plan. Three buttons: ✓ ships / ✗ broken / 🎨 needs taste pass. Comments feed back to the next iteration.
5. **Loop track selection**: corrective work (REPAIR features that scored ✗) always wins over generative (SHIP next feature).

---

## §3 — Resolved Socratic answers (2026-05-17 19:00Z)

### Q1 — The named ICP: **Michael Levy (MBL)**

Roham 2026-05-17 19:00Z: *"The one specific real person that I think you'll have the most data on is Michael Levy (MBL)."*

**Data-availability footnote (Dexter 19:15Z):** verified against `topshot.*` Supabase tables; **MBL's transaction data is NOT currently in our DB.** `transactions.buyer_safe_name` exists in schema but ETL never populates it (every row is NULL). Same shape as the Podziemski Ultimate ETL gap. Until either (a) we get MBL's flow_address from outside the DB and look up his moments via `moments.owner_flow_address`, or (b) extend the BQ→Supabase ETL to populate `buyer_safe_name` / `seller_safe_name`, MBL serves the doctrine as a VERBATIM-VOICE anchor (his public posts on Twitter / Discord become the trader-voice source we quote) but not as an in-portal data subject yet.

This means P6 is enforceable by quoting MBL's public statements as the spec text. The acceptance bar: *"would Michael Levy (a) find this rendered correctly, (b) want to share the URL, (c) recognize it as the surface a pro Top Shot collector deserves?"*

### Q2 — The trade-off: **we are WORSE at instant raw-data scanning**

Roham 2026-05-17 19:00Z: *"I think we should hide the density and the sort of tables and stuff behind one click. I think the first level should be graphs, almost like Polymarket graphs."* See P2.

### Q3 — Scope: **market cap visualizations first, expand from there**

Roham 2026-05-17 19:00Z: *"In terms of the scope, we should just start with visualizing different forms of market cap and then go from there."* See P9.

---

## §4 — What this doctrine REJECTS as a category

To make this load-bearing, I name what doctrine excludes — so the loop can't drift back into the failure modes V1–V5 exhibited:

- **REJECTED: a "build the next feature" loop without a doctrine gate.** The loop is not authorized to ship a feature whose research note doesn't cite a specific signature move from §0. Generic acceptance text is a reject.
- **REJECTED: the judge passing on "honest empty state" alone.** A viz feature ships only if it renders REAL data on the resolved data-bearing entity. See `research/wiki/gotchas/judge-journeys-must-assert-data-rendered.md`.
- **REJECTED: parallel-agnostic aggregation in any display.** Every floor, every chart, every leaderboard surfaces the parallel dimension explicitly.
- **REJECTED: median-sale anywhere.** Roham 2026-05-17 verbatim: *"never talk about median sale."*
- **REJECTED: building 4 variants without a doctrine gate before each.** Variant proposals must each map to a specific comparable's signature move; they're alternatives over the SAME doctrine, not random shape explorations.
- **REJECTED: hardcoded fixture data in production routes.** Player pickers, default-to-X, mock pack data. All such surfaces are dev-only; production routes derive from real data or surface honest absence.

---

## §5 — Lineage

This doctrine inherits from:
- `research/00-foundation-v2.md` (the 10-artifact research foundation; pro-trader persona; 30 jobs catalog with comparables; 10 public-API ceilings; 7 universal pro-trader patterns)
- `research/00-product-pillars-v3.md` (the 5 pillars: Data Viz Is The Brand; Every Page Has A Comparable; Cross-Domain Learning Bank; Best-In-Class Taxonomy + Browse; Deep Empathy)
- The lore-vault GDD V2 *Eight Reframings* pattern (Opus, 2026-04-27)
- `research/design-sprints/03-meta-analysis-why-the-loop-fails.md` (V5 meta-analysis identifying the structural fix this doctrine is part of)

It supersedes them at the gate layer: when the loop runs, this doctrine is the contract. The foundation + pillars stay as the long-form reference; this doc is the short-form quotable canon.

---

*Awaiting Roham's redline. Once signed off, commit message: `[v5 loop] doctrine v1 — signed off by Roham`. Subsequent edits are PR-only with explicit reasoning.*
