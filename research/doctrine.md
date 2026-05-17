# Top Shot Data Portal — Doctrine v1 (STRAWMAN)

**Date:** 2026-05-17
**Status:** DRAFT. Drafted by Dexter from Roham's verbatim statements across the 2026-05-17 session + `research/00-foundation-v2.md` + `research/00-product-pillars-v3.md`. Awaits Roham's redline. Once Roham signs off, this is **load-bearing**: every Researcher reads it; every Builder honors it; every Judge tests against it.

The shape is borrowed from the lore-vault GDD V2 *Eight Reframings (Opus, 2026-04-27)* that worked. Lore-vault shipped one coherent page in one PR because doctrine was tight enough that the agent had only execution choices left, not interpretation choices. Same intent here.

---

## §0 — Load-bearing comparables (the soul)

Each named here is a product whose **specific signature moves** the portal must port. Not "inspired-by." Load-bearing. Per-feature comparable mapping lives in `features.json` and `research/00-foundation-v2.md` §9.

| Comparable | What we port | What we don't |
|---|---|---|
| **OTM (deceased)** | Audience-fit. Centerpiece grid + filter rail + EXPORT. Sniper interaction. Player Market Cap view. Time-tab grammar on moment-detail. Circulation breakdown block. | True Value black-box model (their fatal mistake). Marketing-speak "Discover" copy. |
| **Bloomberg Terminal** | Information density (80–120 data points per panel). Function-code grammar in the search bar. Keyboard-first navigation. Tabular numeric monospace. Sub-200ms transitions. | Subscription pricing model. Color theme. |
| **TradingView** | Chart engine for time-series. Watchlists as first-class objects. `/` palette to focus filter. Multi-time-window selector. Alert rules attached to symbols. | Indicator marketplace. Pine Script. |
| **Card Ladder Pro** | Portfolio dashboard density. CL50-style indices. Daily mover email digest cadence. Per-collector portfolio history. | The general-collector segment. |
| **PSA Set Registry** | Set completion as game mechanic. Pop-by-grade equivalent (we use circulation-by-tier-and-parallel). Per-set leaderboard. | Encapsulation/grading vocabulary. |
| **StockX** | Size-as-market-segmenter — applied to our parallels. Each (set × tier × parallel) is its own market with its own ladder. Sold-history transparency. | The drop/hype/release-calendar framing. |
| **Tensor (Solana)** | Depth chart (cumulative listings + bids by price). Rarity-vs-price scatter recast as serial-vs-price within an edition. Row-density treatment with sparklines. | Solana-specific terminology. |
| **OTM Sniper (deceased)** | The continuous scan-for-mispricing surface — most-loved feature in the dead-tool canon. We ship a TRANSPARENT, EDITABLE rules engine version. | Opaque model. |

A feature may cite more than one comparable; cross-domain references (NYT Upshot for annotated charts, FlightRadar24 for real-time strip, etc.) live in the foundation doc §7 and feed Pillar 3 of `00-product-pillars-v3.md`. The eight above are the **canonical anchors**.

---

## §1 — The doctrine (eight principles, verbatim-quotable)

### P1. Faithful display, never smooth

Floor market cap = `lowest_ask × circulation`, summed across editions. The principle: if someone has listed their 1-of-1 at $5M, **that IS the market for that moment.** Fans of other players can pump their floors by listing. We do not "fix" the metric by introducing avg-sale aggregation, wash-trade filtering before display, or anomaly-suppression as default. Honest reflection > smoothing artifacts away.

**Verbatim from Roham, 2026-05-17 16:50Z:** *"If someone has listed their moment for $5 million, and it's the only one of that moment, then that's what it is. If the fans of other players want to pump the lowest asks of their players, then they should come in and list their stuff too."*

**Comparable:** TradingView's raw bid/ask display; PSA's published pop without "outlier correction."
**Rejects:** avg-sale-rebased "market cap"; median-sale as a metric; pre-display wash filtering; AI-smoothed valuations without confidence bands.

### P2. Density is the brand

Every pixel earns its place. 80–120 data points per panel on Trader surfaces; magazine density on Analyst surfaces. Whitespace is not a feature. Empty states are dignified honest absences, not "Coming Soon" placeholders.

**Comparable:** Bloomberg Terminal panel density; Card Ladder Pro tables; FRED report layouts.
**Rejects:** Vercel-template aesthetic; generous padding; emotive headlines like "Discover" / "Trending Now" / "Explore"; surfaces that read like a product brochure.

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

### P9. One coherent portal, not 23 features

The trader's full journey end-to-end is the load-bearing test:
> *"I open the portal. I press `/` to search Wemby. I land on his player page. I see the editions matrix. I click a cell. I land on the edition. I see the depth ladder. I press `?` for shortcuts. I press `g h` for home. I see the live ticker."*

Every shipped feature is in service of that journey, not a standalone shelf item. **Excellence on five features before breadth on twenty-three.** The five are: `/players`, `/moments`, `/moment/[id]`, `/u/[username]`, `/` (home). Variants A/B/C/D, `/parallels`, packs, sniper, etc. — all DOWNSTREAM.

**Comparable:** lore-vault GDD V2 (one coherent page); Bloomberg's main monitor screen.
**Rejects:** feature factories; ship-count as success metric; declaring a feature "passed" when the trader's end-to-end journey breaks at a downstream step.

---

## §2 — Application notes (how the loop USES this)

1. **Researcher**: reads doctrine before any feature's research note. The note's sections 2 (Comparables — primary + cross-domain) and 2b (Data viz pillar) must cite the specific signature move from §0. Section 1 (Trader's verbatim ask) is verbatim per P6.
2. **Builder**: reads doctrine + research note. Cannot ship if any of P1–P9 is violated. P4 specifically: the journey MUST resolve a data-bearing entity (per `research/wiki/gotchas/judge-journeys-must-assert-data-rendered.md`).
3. **Judge**: tests acceptance + visual fidelity to comparable screenshot (under `research/otm-screenshots/` or a new sibling dir for non-OTM comparables). A vision-diff step grades fidelity 1–10; <7 is FAIL.
4. **Roham (CEO signal)**: reviews via `/admin/review` per V6 plan. Three buttons: ✓ ships / ✗ broken / 🎨 needs taste pass. Comments feed back to the next iteration.
5. **Loop track selection**: corrective work (REPAIR features that scored ✗) always wins over generative (SHIP next feature).

---

## §3 — Open questions for Roham (the Socratic 3)

Before this doctrine ships, three questions I can't answer alone — your call decides them:

### Q1 — The ONE specific person
Foundation-v2 §1 describes the "Pro Trader" as a market-active collector running a $5K–$800K portfolio. **Can you name a specific real person — by handle, or by name — who is the load-bearing target customer?** Someone whose feed you'd want to imagine reading the portal during the morning halftime check. Not "the pro trader segment" — one human. Without naming them, P6 (verbatim quote as spec) is hard to enforce.

### Q2 — The trade-off (axiom test)
P2 says "density is the brand." The Socrates skill asks: **"What are you willing to be WORSE at in order to be best at this thing?"** If density wins, what loses? Candidates I can think of: (a) onboarding clarity for non-pros — we accept being intimidating to casual fans; (b) mobile-tablet fluidity at narrow viewports — we accept best-on-desktop; (c) "delight" animations — we accept feeling like an instrument, not a toy. Which one(s)? Or another I haven't named?

### Q3 — The 5 features — confirm or redirect
P9 names the five-feature focus. **Confirm `/players`, `/moments`, `/moment/[id]`, `/u/[username]`, `/` as the canonical five for V6.** Or — if the right five are different — give me the corrected list. (Reasoning behind my five: they cover the journey from "search a player" → "browse moments" → "drill into a moment" → "check a collector" → "see the market at a glance." `/sets`, `/packs`, `/sniper` are excluded because they're downstream of those five being excellent.)

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
