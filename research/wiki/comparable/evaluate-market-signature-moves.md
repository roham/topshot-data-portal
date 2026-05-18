# Evaluate.market — Signature Moves

**Description:** `research/comparables/evaluate-market/description.md`
**Captures:** NONE available — both domains (evaluate.market and evaluate.xyz) dead since 2026-05-14. Wayback never captured the JS-rendered chart data. This catalog is therefore TEXT-DESCRIPTIVE only.
**Doctrine reference:** §0.2 drill-down canon (Bloomberg-shaped data terminal for Top Shot; the dead reference)
**Status:** Pro Trader persona is **mostly EM-shaped** per `description.md`. We port the SURFACE concepts; the actual visual chrome must be re-invented from the structural intent.

---

## §1 — The financialized portfolio view (J2 canonical)

Per description: multi-wallet portfolio with USD totals + per-collection breakdown. Per-moment: True Value, market cap %, my-acquired-at price, USD P&L (realized + unrealized), holding period. Profit/Loss charting all-time / 90-day / 30-day / 7-day. Collector identity at /accounts/<address>.

**Port for /u/[username]:**
- Multi-wallet aggregation: defer to post-V1; V1 supports one address per username
- USD totals: KPI grid with Total Cost Basis / Total Value / Unrealized P&L / Realized P&L (lifetime)
- Per-moment table with: play / edition / serial / tier / acquired-at / current floor / unrealized P&L / holding period (days)
- Profit/Loss charting with **30D default** (not 7D — doctrine §P7)
- Public collector view (anyone can see anyone's bag) per V1 scope

**Reject (the EM fatal mistake):** **True Value engine.** Opaque valuation = doctrine §P1 violation. We render floor + comparable-serial floor + (optionally) avg-sale, never an opaque model.

---

## §2 — The /accounts/<address> permanent URL pattern

Per description: persistent URL for any collector. Stable, shareable.

**Port:** `/u/[username]` with `[username]` resolved to flow_address server-side. Same URL persistence pattern. URL shareable by anyone.

---

## §3 — Per-moment market cap display

Per description: market cap per moment shown with: total market cap, % owned, % of packs, sale-price + volume trends.

**Port for /moment/[id] detail:**
- Per-moment KPI: total market cap (this edition × circulation × floor) + % owned (across known collectors) + % in packs (locked vs. circulating)
- Sale-price + volume trends as the secondary chart pattern
- This is the J4 canonical view per `pro-trader.md`

**Reject:** True Value's "estimated fair price" widget.

---

## §4 — Market Movers — discovery primitive

Per description: filterable leaderboard with Avg Floor Today, % Change 24h, Floor Volume. Used to spot spikes/breakouts.

**Port:**
- `MoversCardGrid` already shipped on /market-cap with meme-coin styling
- On /players + /sets, similar Movers section per the cookbook
- Default 30D window per doctrine §P7 (NOT 24h — though we add 24h as a secondary toggle)

**Reject:** "Hot Now" / "Trending" framing in the Movers card titles.

---

## §5 — Indices page (the most-ambitious EM surface)

Per description: composite "S&P 500 of Top Shot" with market cap, floor index, segment indices (S1/S2/Rookies/Stars). Most ambitious surface, lost to Wayback (chart data was client-rendered, never indexed).

**Port — into /market-cap and /players:**
- Concept: aggregate index composed from constituent moments
- We don't ship a literal "CL50" or "TS50" composite in V1 — we ship the underlying data (Top players, Top sets, By tier breakdown)
- A composite index can be a DEEPENING iter post-Phase-B (define constituent list from doctrine + persona)

**Defer:** the literal indices product.

---

## §6 — Rarity rankings + trait drill-down

Per description: rarity rankings with trait drill-down. Volume data across multiple timeframes.

**Port:**
- Rarity surfaced via tier_id + parallel_id (we already do this in editions chart)
- Trait drill-down: not directly applicable (Top Shot doesn't have arbitrary traits like ETH NFTs); the analog is parallel_id × serial_number × tier_id
- Multiple timeframes: 30D / 90D / 1Y / ALL — standard pattern per §P7

---

## §7 — CSV export

Per description: CSV export on every dense view.

**Port:**
- EXPORT button on /moments grid (the J1 canonical)
- EXPORT button on /u/[username] BAG (the J2 canonical via livetoken pattern)
- Defer EXPORT on /players and /sets to V1.1 (less critical there)

**Doctrine compliance:** trader's verbatim ask is the spec (§P6) — pro-trader.md explicitly names CSV export as a floor not ceiling.

---

## §8 — What EM did that we DON'T port

- **True Value engine** — opaque proprietary valuation. THE fatal mistake. Doctrine §P1 explicitly rejects.
- **Ad/donation/sub revenue model** — we're not monetizing in V1
- **800+ ETH collections coverage** — out of scope (we're Top Shot focused per doctrine §P9)
- **/nbatopshot/content** curated content tab — defer / consider for /docs route

---

## §9 — Lessons for V2/V3/V4 (and now V7) — per description

> "EM nailed depth — per-moment market cap, % in circulation, indices, multi-wallet portfolio, USD-vs-DUC, profit/loss graphs over 7/30/90/all. The portal can directly adopt these — and outclass on the ownership-graph wedge that EM had (named identity at user-page level) but couldn't fully exploit."

**Our wedge over EM:**
1. **Transparent valuation** (doctrine §P1) — floor × circulation, vanity 1-of-1 counted, never a True Value black box
2. **Per-parallel surfacing** (doctrine §P5) — EM never made parallels first-class; we do everywhere
3. **Named-identity ownership graph** — once Loop A §P0.1 lands, /u/[username] is the EM-equivalent we can fully execute

---

*Vision-judge invokes this doc when scoring /u/[username] work — but since there's no rendered comparable image, the verdict relies on structural+textual alignment with this doc + the description.md.*
