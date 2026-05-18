# TradingView — Signature Moves

**Captures:** `research/comparables/tradingview/markets.png` (markets overview) + `markets-indices.png` (indices listing).
**Deep walk:** `research/comparables/tradingview/deep-walk.md` (13-URL WebFetch capture).
**Description:** `research/comparables/tradingview/description.md`
**Doctrine reference:** §0.2 drill-down canon (chart engine, watchlists, time-window selector, alert rules)

---

## §1 — The compact "6-card-row" pattern for category landing (`markets.png`)

Every market category (Indices, US stocks, Crypto, Futures, Forex, Bonds, ETFs, Economy) on the Markets page is rendered as a 6-card row showing the top 6 instruments. Each card: logo + name + chart-launch icon on hover. Below the 6-card row: a 6-row table (Symbol | Market cap OR price + change %).

**Port for /market-cap landing (already shipped) + /players + /sets:**
- 6-card row at the top of each section
- 6-row dense table below
- "See all" link top-right

**Reject:** more than 6 in a row (Card Ladder fits 4; TradingView's 6 is dense but legible; we cap at 6).

---

## §2 — The Time-window pill selector (`markets.png` Forex section)

Standard time-window selector: **1D | 1W | 1M | 3M | 6M | YTD | 1Y | 5Y | All**. Compact, monospace, single-row pill UI. Active pill has a filled background.

**Port — load-bearing on every chart card:**
- Standard ordering: 24H / 7D / 30D / 90D / 1Y / ALL
- Active pill: cyan-500/20 background, cyan-300 text
- Inactive: text-slate-400 hover:text-slate-200
- Link-based (server-component re-runs)
- Default selection: 30D per doctrine §P7

**Reject:** Y as a primary window (we don't have enough data for 1-year-ago granular comparisons in some MVs); custom-range picker (deferred).

---

## §3 — The Market Summary tile (`markets.png` top)

The top of TradingView's Markets page shows the S&P 500 with a sparkline + percent change. Then a horizontal scrolling carousel of major indices (Nasdaq 100, Japan 225, etc.). Below: crypto market-cap with Bitcoin dominance breakdown.

**Port:** the /market-cap landing already does this conceptually with the KPI tile + concentration chart. The pattern reinforces that "Market Summary" is a tile-and-chart combo, not just a number.

---

## §4 — The gainers/losers tabbed split (`markets.png` Stocks section)

Gainers and losers shown as TWO separate columns, each a small table of ~6 rows. Above the tables: **Regular hours | Pre-market | After-hours** toggle (we don't have this directly; ours is per time-window).

**Port:**
- MoversCardGrid (already shipped on /market-cap) uses meme-coin styling, but the TradingView pattern of side-by-side gainers/losers tables is the FALLBACK shape for second-click drill-down from movers
- For /players: TopMoversList shows gainers + losers side-by-side in a second-click view

**Reject:** mixing gainers and losers in the same column with color-coding only — separate columns are scannable.

---

## §5 — The "Earnings Calendar" / event-stream pattern (`markets.png` Stocks)

8-row table: company logo | ticker/name | Actual | Estimate | date badge. Compact, scannable, "See all events" link bottom-right.

**Port — adapt for portal as a "Recent Drops" or "Upcoming Drops" feed on /sets:**
- Same 8-row event-stream pattern
- Columns: drop logo + set name | drop start | total moments | drop status
- "See all drops" link

**Reject:** modal calendar widget (too heavy); separate /drops route (deferred).

---

## §6 — The Yield Curve widget + Bond table (`markets.png` Bonds)

Yield curve chart with "Customize curves" link + tables for US bonds (Symbol | Price & chg % | Yield %) + Major 10Y bonds. Multi-dimension data per row in dense table.

**Port — applicable to /set/[id] detail page:**
- Tier-yield analog: tier on x-axis (Common / Rare / Legendary / Ultimate), value on y-axis. A curve-chart equivalent for set tier distribution.
- Multi-column dense tables for the per-set moments breakdown

**Reject:** "Customize curves" — defer; not in V1 scope.

---

## §7 — The footer with social + multi-column nav (`markets.png` bottom)

Social icons (X, Facebook, YouTube, LinkedIn, Telegram, etc.) above a multi-column nav (More than a product, Community, Ideas, Pine Script, Tools & subscriptions, Trading, Special offers, About company, Merch, Policies & security, Business solutions, Growth opportunities).

**Port:** SIMPLIFIED — our footer has 3-4 columns max:
- Methodology / Doctrine / Wiki / About
- Twitter / Discord / GitHub
- No marketing-funnel sections

**Reject:** social-icon overkill; multi-column nav with marketing copy.

---

## §8 — The header search bar + Get started CTA (`markets.png` top)

Center search input ("Try Wemby" placeholder style — predictive search). Blue "Get started" button on the right.

**Port:**
- `/` (the search overlay) — `cmd+K` / `/` keypress invokes a search palette
- Search across players, sets, moments
- NO "Get started" CTA — we don't sign people up; this is an instrument

**Reject:** signup-prompt UI; marketing CTAs.

---

## §9 — The watchlist concept (described but not captured)

TradingView's signature watchlist pattern is per `description.md`: per-symbol alerts + multi-channel delivery + chart embed.

**Port — deferred to post-Phase-B:**
- /watchlist route with user-curated player + moment + set lists
- Alert rules attached to floor crossings, percent moves
- Email + Discord delivery (long-term)

**Reject in V1:** any auth/user-state work. Watchlist is post-Phase-B.

---

## §10 — Color + typography (light mode → our dark mode)

- TradingView is light mode; we invert
- Their accent: blue (#2962FF) for CTAs — we use cyan-500 (#06B6D4)
- Tabular numerics: monospace, large-value-small-label pattern
- Sparkline density: TradingView fits ~30 points in 80px-tall sparklines — we match

---

## §11 — What we DON'T port

- Pine Script editor / Indicators marketplace (TradingView's monetization wedge)
- Broker integrations (not relevant)
- Idea cards (community trading ideas) — defer; not on doctrine
- "Polaris Dawn" / aspirational hero imagery (marketing layer not appropriate for instrument)

---

*Vision-judge invokes this doc for /market-cap deepening and /sets second-click views.*
