# Polymarket — Signature Moves

**Captures:** NONE in repo. The only Polymarket-related image is `kaaos-knowledge/lazio-polymarket-apr2026.jpeg` which is a SportsPro article ABOUT Polymarket, NOT Polymarket's actual UI.
**Doctrine reference:** **§0.1 — THE FIRST CANONICAL LANDING REFERENCE.** Per Roham 2026-05-17 19:00Z: *"the first level should be graphs, almost like Polymarket graphs (that's what OTM was). You just load it, and it's just a bunch of graphs."* Polymarket IS the doctrine reference for /market-cap and every Loop B Phase B page's landing.
**Status:** **CRITICAL** — Phase A iter 0 (per `loop-b-prep-phase-a-marketcap-deepening.md §3`) must capture Polymarket landing for the vision-judge baseline. This catalog is text-descriptive until that capture lands.

---

## §1 — The cards-grid landing (the load-bearing pattern)

Polymarket's home page is a **grid of bet-market cards**. Each card is a single bet (e.g., "Will X happen by Y?") with:
- The question as a 1-2 line header
- A **probability time-series sparkline** as the dominant visual (~60-70% of the card height)
- The current probability (large numeric, e.g., "67%")
- Daily/weekly change (color-coded ± %)
- Volume traded ($-formatted)
- Small "X traders" / "Y volume" meta line at bottom

Cards laid out in a 3-4-column grid, ~16-20 cards above the fold. Tables of all markets are SECOND-CLICK from each card.

**Port for /market-cap (the doctrine §0.1 reference):**
- ChartCard primitive (already shipped V6) implements this shape
- Each card has: title + chart-as-hero (~280px) + drill-down link
- We render 8-13 cards per page (less dense than Polymarket's 16-20 because our charts are more complex than sparklines)
- Each card's chart is the primary visual — title is small + above

**Port for /players, /moments, /sets landings:**
- Same cards-grid pattern at the top of each page (per cookbook §2 + §6)
- Per-card data is the page-specific aggregation (top players, top moments, top sets)
- Tables remain second-click

**Reject:** card layout with text-dominant cards (text first, chart second). Polymarket's signature is **chart-IS-the-card**.

---

## §2 — The market-detail second-click

When a user clicks a Polymarket bet-card, they land on a market-detail page with:
- LARGER version of the probability chart (full-width, ~500px tall, more granular)
- Order book to the right (bid / ask ladder)
- Trade history below
- Market metadata (resolution date, source, etc.) in a collapsed accordion

**Port for /market-cap drill-downs:**
- Each /market-cap chart card drills into a second-click table view (per cookbook §3 — `drillHref`)
- The drill view has: larger chart + density table + filter rail (the OTM pattern adapts here)
- /players / /moments / /sets drill from /market-cap follow this same shape

**Reject:** modal popups for drill-down (less shareable URL state); single-page-app with no URL changes (defeats Link-based pattern).

---

## §3 — The probability indicator coloring

Polymarket uses GREEN/RED for probability direction:
- Probability increasing → green
- Probability decreasing → red
- Daily change shown with arrow (▲ for up, ▼ for down)

**Port:** we already have `DIRECTION_COLOR.gainer/loser` palette per `lib/chart-palette.ts`. Apply consistently across MoversCardGrid + KPI tiles + table delta columns.

**Reject:** color-coding without numeric context; using probability-language for our domain (we're not a betting market).

---

## §4 — The minimal text-per-card philosophy

Polymarket cards have ~20-30 chars of text + chart + numerics. Almost no marketing copy. The MARKET IS the content.

**Port — load-bearing for /market-cap deepening:**
- Chart card titles: 2-5 words max ("Top Players by Market Cap", "30-Day Movers", "Concentration")
- Subtitle (optional): 1 line, 8-10 words explaining the metric
- NO marketing-copy descriptions on the landing
- Methodology details: in the page-bottom MethodologyFooter, NOT on the cards

**Reject:** verbose card copy ("Discover the top players in NBA Top Shot by market capitalization — see how your favorite stars stack up!" — all wrong per persona doc).

---

## §5 — The dark-on-light vs dark-on-dark palette

Polymarket is mostly dark text on light/cream background. Cards have subtle borders + slight elevation. Hovering a card slightly raises it (shadow grows).

**Port — but we're dark-mode:**
- Equivalent treatment: subtle border (`border-slate-800`), slight bg lift on hover (`bg-slate-900` → `bg-slate-800/50`)
- Card shadow: `shadow-md` baseline, `shadow-lg` on hover
- Maintain the "card-as-unit-of-thought" affordance

**Reject:** flat cards (no border / no hover state — defeats affordance signal).

---

## §6 — Categorization + filter chips at the top

Polymarket landing has top-level category chips: Politics / Sports / Crypto / etc. Click one filters the cards-grid to that category. Active chip highlighted.

**Port for /market-cap:**
- Top-level chips for: All / Players / Sets / Tiers / Parallels — clicking one filters the chart-cards-grid to that domain
- Active chip: cyan-500/20 background
- Inactive: text-slate-400 hover:text-slate-200
- Link-based (URL: `?focus=players` etc.)

**Reject:** dropdown category-selector (less scannable); multi-select chips (overcomplicates V1).

---

## §7 — The trending-section + featured-card hybrid

Polymarket has a "Trending" carousel above the main grid with a few featured markets that are hot RIGHT NOW.

**Port — controversial:**
- /market-cap could have a "Trending Movers" strip above the main 8-card grid
- BUT — doctrine §P6 rejects "Trending" framing as marketing copy
- COMPROMISE: rename to "30D Top Movers" with verbatim trader-vocabulary
- The MoversCardGrid already shipped serves this role; keep it

**Reject:** "Hot Now" / "🔥 Trending" labels — marketing per persona doc.

---

## §8 — Time-to-resolution countdowns (NOT applicable to us)

Polymarket has prominent countdown timers ("Resolves in 3d 4h") because their markets have hard end dates.

**Port:** doesn't apply to Top Shot data portal — our domain has no resolution dates. SKIP.

---

## §9 — The wedge: where we OUTCLASS Polymarket for our audience

1. **Density** — Polymarket's cards are sparkline-only. We can use full Visx charts because our trader can handle 8 cards of density (vs Polymarket's general audience needing 20 simpler cards). Bloomberg-tier on drill > Polymarket-tier on landing.

2. **Faithful display** (§P1) — Polymarket implicitly smooths probabilities; we never smooth floors. Vanity 1-of-1 asks counted.

3. **Parallels-first surfacing** (§P5) — no analog in Polymarket; unique to our domain.

4. **Trader vocabulary** (§P6) — Polymarket uses general-audience language; we use Discord-source trader-verbatim per `pro-trader.md`.

---

## §10 — What we DON'T port

- Bet-market resolution metadata (no analog)
- Order book widget on detail pages (we have lowest-ask history charts instead)
- USDC payment integration (no transactions)
- AMM liquidity pool visualizations (no analog)
- Politics/Sports/Crypto categorization (we have NBA-only doctrine §P9)

---

*This catalog is the FALLBACK reference when the actual Polymarket capture doesn't exist. The vision-judge uses this text + the description + the Card Ladder Pro capture together to score /market-cap fidelity. Phase A iter 0 task: capture polymarket.com home page.*
