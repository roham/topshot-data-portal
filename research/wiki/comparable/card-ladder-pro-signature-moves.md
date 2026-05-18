# Card Ladder Pro — Signature Moves

**Captures:** `research/comparables/card-ladder-pro/dashboard-{00..06}.png` (7 captures of dashboard + index pages + categories list).
**Deep walk:** `research/comparables/card-ladder-pro/deep-walk.md`
**Description:** `research/comparables/card-ladder-pro/description.md`
**Doctrine reference:** §0.1 (graph-first landing canon)

This doc names the SPECIFIC moves we port. The vision-judge invokes these by name; the Loop B Researcher cites them in each /research note.

---

## §1 — The persistent left nav (every page)

Vertical icon-and-label rail, ~64-200px wide depending on collapsed state. Items in order: DASHBOARD / COLLECTION / SALES HISTORY / SHOP / LADDER / PROFILES / SHOWCASE / INDEXES / PLAYERS / WATCHLIST / COMPARE / FEED / INDUSTRY / COLLAPSE. Active item has a colored left-border accent + bold label.

**Port for the portal:**
- Same persistent left nav on every Phase B page (collapsible toggle at bottom)
- Items: MARKET CAP / PLAYERS / MOMENTS / SETS / BAG (this maps to /u/[username]) / WATCHLIST (deferred) / COMPARE (deferred) / DOCS (links to doctrine.md publicly hosted) / COLLAPSE
- Active item has a left-border + bold + electric blue accent (cyan-400 per palette)

**Reject:** dropdown-style nav, hamburger menu hiding it, top-level horizontal nav.

---

## §2 — The hero chart on the dashboard (`dashboard-00`)

Above-the-fold hero is a "MONTHLY VOLUME" line chart spanning ~28 months. Clean, single-line, electric green/teal color. Y-axis $-formatted, X-axis month labels rotated 45°. No grid lines beyond major.

**Port for /market-cap (already shipped) + /players + /sets landings:**
- Hero chart in row 1, full-width, ~280-320px tall
- Single-line for primary metric (market cap total OR top-N aggregate)
- Single accent color from `chart-palette.ts` (cyan or rank-gradient[0])
- Time-range pill selector below (3M / 6M / 1Y / ALL — per doctrine §P7 default 30D for our trader audience, not 6M like CL)

**Reject:** multi-line spaghetti chart at the landing (use for drill-down only), gridded background, default ALL window (we default 30D).

---

## §3 — The right-column metrics block (`dashboard-00`)

Compact 4-cell stat block to the right of the hero chart: TOTAL SALES ADDED 215,416 / TOTAL SALES VERIFIED 1,922 / SALES VERIFIED AMOUNT $1.1M / CL VALUE ACCURACY 74.25%. Tabular numeric, monospace, large font for value.

**Port:**
- 4-cell KPI strip beside the hero on landing pages
- Items per page: /market-cap = Total Mcap / 30D Δ% / Active Players / Top Mover Δ%
- Items for /players = Total Players / Total Mcap / Top 10 Share % / 30D Top Mover
- Items for /sets = Total Sets / Total Mcap / Highest Completion-Rarity / Most-Active Set 24H

**Reject:** CL Value Accuracy (an opaque True Value confidence metric — doctrine §P1 rejects).

---

## §4 — Section sub-headers + "View All →" links (`dashboard-00`)

Each section ("SHOP" / "LADDER HEADLINES" / "COLLECTION" / "INDEX SNAPSHOT") has a small header bar with the title + a "View All →" link top-right. Sections stack vertically.

**Port:**
- Section headers in this style across landings
- Each section's "View All →" link drills to the dense second-click view (a table page)
- Per cookbook §2 — chart cards have `drillHref` to the second-click table

**Reject:** "View All" without an actual destination (the V5 /parallels failure); empty "View All →" link state.

---

## §5 — The INDEX SNAPSHOT tile (`dashboard-00`)

A 4-cell row at the page bottom: Index Value 21,065 / Daily Change +0.16% (green) / Monthly Change +3.46% (green) / Quarterly Change +9.33% (green). Color-coded change indicators (green up, red down).

**Port:**
- Bottom-of-page summary tile on /market-cap + /players (already present implicitly in V6 build)
- Color from `DIRECTION_COLOR` palette
- Items: Total Floor Mcap / 24h Δ / 30d Δ / 90d Δ

**Reject:** Daily Change as 24h default (doctrine §P7 — use 30D as primary; 24h secondary).

---

## §6 — The per-index STATS page (`dashboard-02` Star Wars)

Per-index drill-down. Header has index logo + title. Tabs: STATS | CARDS. Under STATS, LEFT column has 8 KPIs in 2-col grid (Starting Value / Current Value / Rate of Growth ±% / Real Value Change ± / Low Value / High Value / Average Value / Total Cards). RIGHT (or below): hero line chart with date range below + linear/log toggle.

**Port — load-bearing for /player/[id] + /set/[id] detail pages:**
- Header structure: large title + small logo
- Tab nav: STATS | <SECONDARY> (MOMENTS for player, MOMENTS for set)
- LEFT KPI grid: 8 cells in 2-col arrangement, large monospace values, small uppercase labels above each
- RIGHT large hero chart, ~360px tall, single-line, default 90D window (Card Ladder default 3M = 90D — coincides)
- Time-range pills at chart-bottom-right: 3M / 6M / 1Y / ALL
- Linear / Log toggle for the chart's y-axis scale

**Reject:** 6M default window (use 30D per §P7); two-axis combo charts; tab labels with marketing copy.

---

## §7 — The SALES VOLUME secondary section (`dashboard-02`)

Below the hero INDEX DATA section, a second nearly-identical block titled "SALES VOLUME" with 5 KPIs (Low Daily Volume / High Daily Volume / Average Daily Volume / # of Sales 24H / Market Cap) + a chart of daily volume over time. Same shape, different metric.

**Port:**
- Same structural pattern under every /<page>/[id] detail
- For /player/[id]: SALES VOLUME block with player-level metrics
- For /set/[id]: SALES VOLUME block with set-level metrics
- Per cookbook — repeat the dashboard-02 shape rather than inventing new chrome

**Reject:** different visual treatment between the primary and secondary sections (consistency over novelty).

---

## §8 — The dense LIST/INDEX page (`dashboard-04` Basketball)

CARDS tab on the per-category page shows a dense list of every card in the category. Per row: thumbnail (small, ~64×84 image) + descriptor block (year + brand + player + grade chip) + Last Sold ($18.00k) + Value ($18.62k) + Score (+92.79 with green up-arrow). Tabular numeric, monospace, ~25-30 rows above the fold.

**Port — load-bearing for /players + /sets listings + the BAG table on /u/[username]:**
- Same row structure: small thumb circle + descriptor block + 3-4 numeric columns + delta indicator
- Filter rail collapsed by default; click to expand
- Sort columns clickable
- ~25-30 rows above fold (Bloomberg-tier density per §P2)
- Sparkline column per row (we add this — Card Ladder doesn't but it's a /market-cap pattern §6)

**Reject:** card-grid layout (large image-first cards) — that's the SHOP page pattern, off-doctrine for the trader instrument.

---

## §9 — Color + typography

- Background: pure white (#FFFFFF) — Card Ladder is light-mode; we're dark-mode (slate-950)
- Accent: electric green (#10B981 ish) for positive change — we map to `DIRECTION_COLOR.gainer_strong`
- Numerics: monospace, large for values, small uppercase for labels — we use `tabular-nums` + the existing font stack
- Section dividers: subtle horizontal rules between sections — we use `border-slate-800`

**Port:** dark theme equivalents from our palette; otherwise structurally identical.

**Reject:** any color outside the established palette in `lib/chart-palette.ts`.

---

## §10 — What Card Ladder does that we DON'T port

- **True Value engine + Value Accuracy KPI** — opaque valuation model. Doctrine §P1 rejects.
- **POTENTIAL PROFIT framing** in the COLLECTION block — speculative; doctrine rejects pitch-deck framing on instruments.
- **LADDER HEADLINES newsfeed** — off-doctrine for the trader instrument (Roham can re-evaluate post-Phase-B).
- **SHOP marketplace** — Card Ladder is also a marketplace; we don't transact, we observe.
- **PROFILES + SHOWCASE social features** — defer until post-Phase-B.

---

*Vision-judge prompt template (in `loop-b-rubric.md §3`) cites this doc when scoring fidelity for any /players or /sets or /u/ work.*
