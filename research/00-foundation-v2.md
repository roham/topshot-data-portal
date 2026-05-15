# V2 Foundation — NBA Top Shot Data Portal

This document is the V2 build loop's standing reference. Future iterations consult it before designing a surface, scoping a feature, or arguing a trade-off. It distills ten research artifacts (`research-v2/01-…10-…`) into the load-bearing facts. When this document and an artifact disagree, the artifact wins; flag it and update here.

---

## 1. Pro Trader audience model

The Pro Trader is a market-active Top Shot collector running a $5K–$800K portfolio, checking prices several times per day, listing / buying / accepting offers as a primary activity, measuring every tool by whether it gives them an information advantage they cannot get elsewhere (per artifact 01 §Persona 2). Underneath, they collapse three of the five auth-portal archetypes — A1 Scarred OG Whales, A4 Market Strategists, and the finance-leaning slice of A3 Re-Activating Gamblers — into one super-persona along the *what-they-want-from-data* axis. They came up trading through the 2021 mania, ate the 2022–2024 drawdown, and what survived in them is suspicion of marketing copy and an instinct for asymmetric information. They are the audience V2 is built for first; the Analyst is served by the same surfaces at a softer density (per artifact 01 §dual-surface).

What offends them is well-documented and consistent across artifacts 01 §Persona-2-failure-modes, 06 §1, and 05 §7. Fabricated valuations without confidence labels are an instant credibility kill — opaque AI engines (NFTBank, NFTGo GoPricing, OTM True Value at the end) are the cautionary tale (artifact 05 §2.7). Generic dashboards that look like Vercel demo templates. "Slick" animations that delay information by 200ms. Missing parallel-aware pricing — collapsing parallels into a single "base" floor is structurally dishonest given Top Shot's taxonomy (artifact 02 §2.4). No keyboard shortcuts when they are going to live inside the tool. No CSV export when they want to model elsewhere too. Marketing-speak — "Explore!", "Trending Now!" — in surfaces meant to be instruments not brochures.

Their expectations were shaped by a specific set of products that V2 must match in shape even when it cannot match in depth. Bloomberg Terminal is the gold standard for keyboard-first density, function-code grammar, and sub-200ms transitions (artifact 06 §2.1). TradingView is the de-facto charting layer and the gold standard for watchlist-level alerts with multi-channel delivery (artifact 06 §2.2). Hyperliquid is the proof that on-chain finance can be CEX-class responsive (artifact 06 §2.4). Tensor Pro is the closest existing NFT analog — explicit Pro/Lite toggle, candlesticks per collection, depth-of-book, the rarity-vs-price scatter that V2 will recast as serial-vs-price (artifact 05 §2.6). Blur taught the dual depth ladder (bids on left, listings on right) (artifact 05 §2.10). StockX taught that the asset variable must be re-keyed: a Jordan in size 9 is a different market from size 11 (artifact 07 §3.1) — Top Shot parallels deserve the same respect. OTM's Sniper is the most-loved feature in the dead-tool canon and the interaction pattern V2 must port (artifact 03 §3.2). Card Ladder Pro is the existence proof that hobbyists pay $200/yr for a Bloomberg-shaped surface on a niche asset class (artifact 07 §2.1).

---

## 2. Top Shot taxonomy that matters

The hierarchy is **Series → Set → Edition → Moment** (per artifact 02 §2). A Series is a release-window cohort (Series 1 = 2020-2021 OG era, then 2, 3, 4, etc.). A Set is a themed collection of plays within a series identified by `setID`/`setFlowID` (Base Set, Cosmic, Anthology, Spotlight, Metallic Gold LE, etc.). An **Edition** is the unit of pricing — a `(set × play × tier × parallel)` combination with a fixed circulation identified by `editionID`/`editionFlowID` (artifact 02 §2.3). "What's a Tatum Layup worth" is malformed; "what's *this specific edition* of a Tatum Layup worth" is the right question. A **Moment** is the actual NFT, identified by `flowId` plus `flowSerialNumber` — uniquely owned, uniquely serialed, the only true unit of ownership (artifact 02 §2.6). Holdings, portfolios, P&L all operate at moment-level.

Two cross-cutting dimensions sit beside the hierarchy. **Tier** is an enum — `COMMON`, `FANDOM`, `RARE`, `LEGENDARY`, `ULTIMATE`, `METALLIC_GOLD_LE` — driving circulation (Common 10K–60K, Rare 99–499, Legendary 25–99, Ultimate 3–15, Metallic Gold LE 49) (artifact 02 §2.5). **Parallel** is a numeric `parallelID` for the visual/mechanical variant within a set — same play, different parallel = different edition, different circulation, often dramatically different price (artifact 02 §2.4). **Parallels cannot be aggregated.** Every (tier × parallel) cell for a given play is its own market.

The real-world anchor layer is Player (`playerID`, often the NBA ID; ~2,083 players, dedupe `allPlayers`), Team (`teamID`, the NBA's), and Play (`playID`/`playFlowID` — the basketball event with `stats.dateOfMoment` and opponent metadata). Game is *not* a first-class entity — must be inferred client-side by grouping plays on date + teams (artifact 02 §1.3). Collector identity splits between custodial (`User` with `dapperID` + `username` + `flowAddress`) and non-custodial (`NonCustodialUser`, flowAddress only); the `ownerV2` union must alias `flowAddress` across the two variants (artifact 02 §3.1). Marketplace state per moment is exposed via `forSale` (bool) and `lowAsk` (which is edition-floor, not per-listing) (artifact 02 §3.6). Aggregating across parallels collapses the market; aggregating across serials within an edition is fine for floor questions but loses the serial-premium structure that drives J-P6 (the jersey serial, the #1, the sub-100 ladder).

---

## 3. The ten public-API ceilings (artifact 02 §7)

Every iteration respects these. Pretending the data exists is a credibility kill.

1. **No `searchUsers`** — username search is exact-case only.
2. **No transfer history per moment** — only `lastPurchasePrice` + `acquiredAt`; everything before the most recent acquisition is hidden.
3. **No filter on `searchMarketplaceTransactions`** — global recent sales only; no per-moment / per-player / per-edition server-side slice.
4. **No `MomentListing.price`** — only `id` and existence; per-listing prices are not exposed.
5. **No `Edition.lowestAsk`** — edition floor requires sampling serials, which is expensive.
6. **No `highBid` / `currentAsk` / per-listing prices** — only `lowAsk` per moment, which is edition-floor.
7. **No collector identity on leaderboards** — `LeaderboardEntry` returns `rank` + `score` only.
8. **No historical time-series** — no `priceHistory`, no `volumeHistory`. V2 accumulates snapshots from launch day forward.
9. **No GraphQL introspection** — schema discovery is via probe + error-message leakage.
10. **No offer / bid data of any kind** — any "bid spread" feature is structurally impossible from the public API.

---

## 4. Five open API questions (Phase 1 probe — artifact 02 §8)

1. Does `MintedMoment.lockStatus` (or equivalent) exist? Required for locked/unlocked filtering (J-X3 locking dashboard).
2. Does `MintedMoment.dateOfMoment` (game date) come through reliably for per-game retrospectives (J-A7)?
3. Is there *any* query that exposes per-edition sale-count over a window without paginating the entire global transactions feed?
4. Is there a `getEditionMinted` / `getEditionCirculation` endpoint that returns full holder distribution in one call?
5. Are challenge rewards / staking state queryable (for J-X3 locking + J-P9 set completion)?

---

## 5. What killed the prior analytics tools (artifact 03)

**Evaluate.market** was the financialized Bloomberg-shaped data terminal — Indices, per-Moment market cap, Market Movers, multi-wallet portfolio with all-time/90/30/7d P&L, collector leaderboards with identity, multi-chain expansion to 800+ ETH collections, and an embedded link from inside the Top Shot marketplace itself (artifact 03 §2.1–2.4). $4M institutional seed, 11-person team, peak Discord 7K+. As of 2026-05-14 neither `evaluate.market` nor `evaluate.xyz` resolves in DNS. The proximate cause was the November 2022 pivot to live NFT swap chat — they diluted analytics focus at exactly the wrong time, then bear-market volume collapse compressed their economics on both sides simultaneously (artifact 03 §2.5). **Lesson for V2:** depth is buildable but a third-party analytics business cannot survive a 95% host-platform volume drawdown. V2 is Dapper-built, product-funded, not subscription-funded — the structural reason V2 can ship depth Evaluate couldn't sustain.

**OwnTheMoment (OTM)** was the community-and-analytics hybrid — 50/50 newsletter/podcast/fantasy/tools, founded by Justin Herzig and TJ Laessig in 2021 (artifact 03 §3.1–3.6). Its flagship True Value engine was a per-serial GBM trained on every transaction; Sniper surfaced listings where True Value diverged from market price and was the most-praised feature in the canon. The Jolly Joker LIFETIME NFT was an interesting NFT-as-membership mechanic. OTM didn't die in a single event — it *decayed*. $120K raised, never institutionally funded; the economic engine (subs + Jolly Joker mint + fantasy rake + sponsorships) was Top Shot-volume-correlated. As of 2026-05-14 `otmnft.com` resolves but the host times out. **Lesson for V2:** community wrapping is not optional but cannot save you alone, and the GBM black-box is *not* the lesson to port — the *act of believing in a model that disagreed with the market* is. V2 ships the disagreement-with-market interaction (Sniper) and makes the model transparent and editable, which OTM never did (per artifact 09 §truth-four).

**The OTM Sniper is canonical-best** for the Pro Trader. Continuous scan over watched editions, flag listings where user's fair-value diverges from market price by ≥ N%, list sorted by % discount + time-on-market + total $ delta. V2 ships this as J-X1 once J-P7 (transparent rules engine) lands.

---

## 6. Current state of the world (artifact 04)

The May 2026 ecosystem is a clear two-tool oligopoly plus one officially-embedded incumbent plus a dying long tail (artifact 04 §1). **LiveToken** (livetoken.co) is the de-facto Pro Trader tool — Vue SPA, single dev "Bonfire," October 2024 official partnership with Top Shot for the Offer Terminal. Ships live sales feed, listings firehose, Deals/Snipe tab, Showcase Challenge tracker, full portfolio (Account Lookup with CSV export, realized + unrealized P&L), Fast Fingers / Top Gifters / Odd Sales community tools, Telegram alerts, Android app, Plotly charts (artifact 04 §2.1). Weak on: narrative layer (zero Analyst fit), serial-specific scarcity framing, mobile-web responsiveness (`maximum-scale=1, user-scalable=no` blocks pinch-zoom), and FMV transparency (black box). Single point of failure — one dev, one codebase. **Collective.xyz** (formerly MomentRanks) is the watchlist + fantasy tool — MomentHQ valuation engine (ML, opaque), multi-account watchlist with sort by Total Value / Lifetime Profit / ROI / Avg Moment Value / # Moments, the "Play" daily fantasy game, Shot Talkin' podcast (artifact 04 §2.2). Weak on: drift from Top Shot focus since the Collective rebrand, intermittent reliability, no published model methodology. **Evaluate.market / evaluate.xyz** still has direct links inside every Top Shot moment page, premium tier exists (2025 Annual Report behind paywall), 700+ NFT projects multi-chain (artifact 04 §2.3). Weak on: center-of-gravity shifted off Top Shot, annual-report cadence is too slow for Analyst, click-out not embed.

The long tail: **OTM NFT** (otmnft.com, current) is thin cross-product daily gainers/losers + challenges (artifact 04 §2.4). **Momentum Labs** is the strongest editorial cadence in the ecosystem — Flash Challenge live tracker + Trade Tickets + weekly DFS-style blog posts (artifact 04 §2.5). **Intangible Market** ships the deal-finder with the 67% rule, bulk Dapper-wallet importer/exporter, 3D Moment cube (artifact 04 §2.6). **CryptoSlam** and **DappRadar** are generic NFT analytics where Top Shot is one collection among many — weak on Top Shot taxonomy (artifact 04 §2.7–2.8). **The First Mint** podcast (LG Doucet, 6K+ subs) and **Minted Moment** Substack (Taylor Stein, 2K+ subs) are the editorial layer no data product has matched (artifact 04 §2.9–2.10). 12+ formerly-listed tools are dead or dormant (MomentWatch, OwlScout, ScoutApp, AiSports, RookShot, TopShoters, mr.play, TopMoment, MomentNerd, Rayvin, Topshot Explorer dormant, etc. — artifact 04 §2.11).

The opening for V2 is structural (artifact 04 §4–5): the Analyst persona has *no* native data product — they currently route through Substacks and podcasts. Per-player/per-team factoid bundles, "on this day" archive, magazine-density data UI, shareable artifacts, per-moment market depth as a full ladder, floor-compression detection, transparent valuation engine, keyboard shortcuts, parallel-aware data — each is empty or partial across every current tool.

---

## 7. Patterns to port

**Universal pro-trader principles** (artifact 06 §1):

1. Information density is the brand — every pixel earns a job; 80–120 data points per panel is the Bloomberg-baseline.
2. Keyboard-first navigation is the floor, not the ceiling.
3. Command/symbol entry is a command line, not a menu (Bloomberg amber bar, TradingView `/` palette, IBKR quick-search).
4. Sub-200ms transitions or it isn't pro.
5. Dark mode is the default.
6. Green-up / red-down is sacred.
7. Layouts are user-owned (Bloomberg Launchpad, IBKR Mosaic, TradingView multi-chart).
8. Order book has two visualizations side-by-side — DOM table + continuous depth curve.
9. Watchlists are first-class objects with row-level sparklines and quick-action columns.
10. Alerts are persistable rules attached to symbols / watchlists, deliverable via app/email/webhook.
11. CSV / API export is table stakes.

**The eight universal collectibles primitives** (artifact 07 §1):

1. Asset Detail Page — one canonical URL per asset (hero media, identity strip, live price strip, history chart, comps table, scarcity surface, share button).
2. Price-history chart with selectable windows (7d / 1m / 3m / 6m / 1y / All), grade/condition-filtered, volume bars below.
3. Comparable-sales table — sortable, filterable, with date / price / condition / sale venue / source link.
4. Population / scarcity surface — pop grid in graded markets, circulation-and-listed-count in non-graded.
5. Set / collection containers tracking ownership against a defined list.
6. Portfolio / "my collection" tracker — sum value, change-over-time, P&L vs cost basis, alerts.
7. Indexes / leaderboards / "what's hot" — market-level summary tickers (PWCC 100, CL50, StockX 500).
8. Community / comment layer on the asset itself — Bring a Trailer is the gold standard.

**Most leverageable NFT-analytics patterns** (artifact 05):

- **Depth chart** (cumulative listings + cumulative bids by price) — Magic Eden, Tensor, Blur all carry. Mandatory for J-P2 and J-P3 (artifact 05 §4.3).
- **Tensor's rarity-vs-price scatter recast as serial-vs-price** within an edition — the single most adaptable Tensor pattern to Top Shot's edition-fungible structure (artifact 05 §4.4).
- **Whale Concentration Index** (top-20 holders' share, NFTGo) — adopt as a headline stat per edition / per player / per team (artifact 05 §4.6).
- **OpenSea three-tab pattern** Trending / Top / Watchlist on ranking grids with time windows down to 5m/15m (artifact 05 §2.4).
- **`?` opens shortcut menu** — universal pro-trader expectation (artifact 05 §5.1).
- **Wash-trade filter discipline** — Hildobby methodology, publish wash-filtered numbers by default with raw-volume toggle (artifact 05 §2.12, §7.2).
- **Days-on-market alongside floor** — never floor-price-worship without comp recency (artifact 05 §7.1).
- **Sparklines in ranking rows** + delta-arrow with colored cell background — Magic Eden + Tensor (artifact 05 §4.11).
- **Wallet labeling / smart-money** — Nansen discipline, applied to Top Shot's named-handle collectors (artifact 05 §2.3, §5.8).

---

## 8. V1 → V2 audit

V1 at `/opt/kaaos-daemon/topshot-data-portal/` shipped 23 routes: `/`, `anomalies`, `archive`, `changelog`, `collectors`, `compare`, `leaderboards`, `methodology`, `moment/[flowId]`, `movement`, `on-this-day`, `players`, `player/[id]`, `rules`, `set/[id]`, `sets`, `specials`, `team/[id]`, `teams`, `trends`, `u/[username]`, `watching`, `whales`. Stack is Geist fonts (must swap to **Inter** + **JetBrains Mono** per artifact 09 §design-system; tabular-nums everywhere), empty `next.config.ts` (must add image `remotePatterns` for `cdn.nba.com` and `assets.nbatopshot.com`), minimal deps: next, react, tailwind, clsx, lucide-react, class-variance-authority, tailwind-merge.

**Missing from V2 starter stack** (per artifact 08 + 09): shadcn primitives, Tremor (Analyst stats + 80% Trader charts on Recharts), visx + raw D3 (depth ladder, candlestick, scatter, Sankey), @tanstack/react-table + @tanstack/react-virtual (non-negotiable for any grid), @uiw/react-heat-map (calendar archive), cmdk (function-code command palette), nuqs (URL-encoded filter state — artifact 09 J-X2), framer-motion (ticker scroll), next-share + html-to-image + @vercel/og (shareable artifacts — J-A8).

**Likely-rework routes** (the V1 implementation predates the V2 personas and density discipline): `/` (must become dual-density homepage with live ticker — J-A3), `/rules` (extend with per-edition overrides + save-as-named-config + history view — J-P7), `/u/[username]` (Bloomberg-density portfolio with TanStack Virtual + treemap — J-P1), `/moment/[flowId]` (add depth tab + parallel-selector that re-keys page like StockX size selector — J-P2), `/leaderboards` (anonymize per ceiling 7, scope filters), `/methodology` (must now also document each ceiling with positive proof).

**Likely-extend routes** (V1 shape was directionally right, V2 deepens): `/player/[id]`, `/team/[id]`, `/set/[id]`, `/sets`, `/players`, `/teams`, `/compare` (J-P8), `/on-this-day` and `/archive` (J-A5), `/trends`/`/movement` (J-P4, J-P11), `/watching` (J-P5, J-P10), `/whales` (J-A6 with WCI).

**New routes to add**: `/edition/[id]` with depth view (J-P3), `/moment/[flowId]/depth` (J-P2), `/movers` (J-P4 — replacing or absorbing `/trends` + `/movement`), `/feed` and `/feed/burns` (J-P5, J-X4), `/sniper` (J-X1), `/indices` (J-X7), `/locking` (J-X3), `/alerts` (J-P10), `/parallel/[parallelID]`, `/tier/[name]`, `/series/[n]` (per artifact 02 §5 route table).

---

## 9. V2 starting jobs catalog

Per artifact 09 §3 — the seed catalog. The catalog grows as iterations surface new JTBDs; this is the starting set.

**Analyst (J-A*)**

- **J-A1 — Per-player factoid bundle** (`/player/[id]` Analyst). Iter-1 comparable: ESPN Stats & Info player pages + OTM Players view with NBA stats integration (artifact 03 §3.2 feat. 14).
- **J-A2 — Per-team factoid bundle** (`/team/[id]` Analyst). Comparable: ESPN team pages.
- **J-A3 — Live "what's happening now" ticker** (`/` Analyst hero). Comparable: Bloomberg amber ticker + Polymarket homepage activity strip.
- **J-A4 — Event-anchored trend lines** (player + edition charts with `ReferenceLine` at game dates). Comparable: FiveThirtyEight election charts. **Top Shot-unique moat** per artifact 09 §truth-three.
- **J-A5 — "On this day" archive** (`/archive/[mm-dd]` + homepage carousel). Comparable: GitHub contribution graph + OTM Locking dashboards.
- **J-A6 — Biggest collectors per scope** (`/leaderboards` filtered by player/team/tier/set/parallel; anonymized per ceiling 7). Comparable: NFTGo top holders + OpenSea top owners.
- **J-A7 — Per-game retrospective** (`/game/[teamA]-[teamB]-[date]`). Comparable: ESPN game pages.
- **J-A8 — Shareable artifacts** (cross-cutting: `@vercel/og` cards + permalinks + copy-to-clipboard + `next-share`). Comparable: Polymarket share modals + ESPN Stats & Info Twitter cards.

**Pro Trader (J-P*)**

- **J-P1 — Full portfolio dashboard** (`/u/[username]` Trader). Comparable: Card Ladder Pro + LiveToken portfolio + NFTBank.
- **J-P2 — Per-moment market depth** (`/moment/[flowId]/depth`). Comparable: Hyperliquid order book + Magic Eden Pro depth + Tensor depth.
- **J-P3 — Floor compression / thin-market detection** (`/edition/[id]/depth`). Comparable: Blur depth ladder.
- **J-P4 — Top movers with delta context** (`/movers` with Trending/Top/Watchlist tabs). Comparable: TradingView screener + OpenSea time-window rankings.
- **J-P5 — Watched-wallet activity feed** (`/feed` Trader). Comparable: Nansen smart-money feeds + OTM Sales Feed.
- **J-P6 — Per-player / per-edition analytics dive** (Trader-mode of player + edition pages, with serial-vs-price scatter). Comparable: Tensor per-collection trading page.
- **J-P7 — Transparent editable rules engine** (`/rules` extended). Comparable: nothing in industry — moat per artifact 09 §truth-four.
- **J-P8 — Cross-collector comparison** (`/compare/[u1]/[u2]`). Comparable: nothing — Top Shot edition-fungibility unique.
- **J-P9 — Set-completion with cost-to-complete** (`/u/[username]/sets` + `/set/[id]/complete`). Comparable: PSA Set Registry + OTM Challenge Tracker.
- **J-P10 — Alert thresholds** (`/alerts`, on-portal-state-only in V2). Comparable: NFTGo Alert Service + LiveToken Telegram.
- **J-P11 — Volume / liquidity intelligence** (`/volume`). Comparable: CryptoSlam rankings + NFTGo WCI.
- **J-P12 — Time-series with portfolio anchoring** (`/u/[username]/history`). Comparable: Card Ladder portfolio history.

**Loop-discovered (J-X*)** — seed extensions from artifact 09 §loop-discovered

- **J-X1 — Sniper / mispricing alerts** (`/sniper`). Comparable: OTM Sniper.
- **J-X2 — URL-encoded filter state everywhere** (cross-cutting). Comparable: OTM's URL grammar (artifact 03 §3.4).
- **J-X3 — Locking dashboard** (`/locking`). Comparable: OTM 5-Days-of-Locking.
- **J-X4 — Burn feed** (`/feed/burns`). Comparable: OTM Burn Feed.
- **J-X5 — Concentration shift over time** (per-edition tab). Comparable: NFTGo WCI longitudinal.
- **J-X6 — Per-asset comment threads** (deferred to v2.5+). Comparable: Bring a Trailer.
- **J-X7 — Indices** (`/indices` — TS100, Rookie, Ultimate, weighted by `circulationCount × floorPrice`). Comparable: PWCC 500 + Card Ladder CL50.
- **J-X8 — Daily mover email digest** (deferred to v2.5+ — needs email infra + auth). Comparable: Card Ladder daily email.
- **J-X9 — Function-code command bar** (cross-cutting, `cmdk`). Comparable: Bloomberg amber bar.
- **J-X10 — Wash-trade filter discipline** (cross-cutting). Comparable: Hildobby Dune dashboard.

---

## 10. Operating principles distilled

- **Honest absence beats fabricated presence.** When a public-API ceiling blocks a feature, document it with positive proof on `/methodology` and ship the partial that respects the ceiling. Pretending data exists is the credibility kill (artifacts 02 §7, 05 §7.3, 09 §truth-four).
- **Senior-research-analyst voice.** No marketing copy in pro surfaces. No "Explore!", no "Discover!", no "Trending Now!". Caption every number with a single sentence that earns it (artifact 06 §1, artifact 01 §Persona-2-voice).
- **Every pixel earns its place.** Information density is the brand. Whitespace is not a feature for the Pro Trader; magazine density is dense by web standards for the Analyst (artifact 06 §1.1, artifact 09 §truth-five).
- **Keyboard first.** `?` opens the shortcut menu, `/` focuses filter, `j`/`k` row nav, `g h` home, function-code command bar for jumps (artifacts 05 §5.1, 06 §1.2, 09 §J-X9).
- **Trust the audience.** Show comp counts, confidence bands, days-on-market, sample size. Let the Pro Trader edit your valuation rules and save their own model — the goal is *their* model not yours (artifacts 05 §7.3, 09 §truth-four).
- **Use real marks; never synthesize.** Player headshots from `cdn.nba.com`, moment media from `assets.nbatopshot.com`, team colors from a canonical registry — no placeholder gradients, no fabricated logos, no AI fill (per the TOPSHOT-PORTAL-V2 official-marks principle in recent commits).
- **Parallels are first-class everywhere.** Aggregating across parallels is structurally dishonest. Every floor, every chart, every leaderboard treats each (tier × parallel) cell as its own market (artifacts 02 §2.4, 04 §4 gap 9, 09 §truth-two).
- **The catalog grows.** The 30 starting jobs in §9 are a seed. Iterations surface new JTBDs through mid-run research kicks; the catalog grows; plateau-based scoring with `AND` exit conditions (not `OR`) governs when a job is done (artifact 09 §scoring + §loop-exit). Forbidden vocabulary until exit: "FINAL", "complete", "done", "production-ready", "shipped" (artifact 09 §forbidden-vocabulary).
