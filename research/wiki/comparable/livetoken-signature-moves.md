# LiveToken — Signature Moves

**Description:** `research/comparables/livetoken/description.md`
**Captures:** NONE available — JS-rendered SPA; not crawlable; no captures committed to repo.
**Doctrine reference:** §0.2 drill-down canon (the LIVE de facto pro-trader tool in May 2026)
**Source-of-truth:** description doc + URL inventory (`/`, `/listings`, `/deals`, `/offers`, `/challenges`, `/community-tools/fastfingers`, `/account-lookup`, `/top-gifters`, `/odd-sales`, `/leaderboards`, `/goto/:linkType/:payload`, `/m/:code`)

LiveToken is THE current Pro Trader tool. Per the description doc: built by a single dev ("Bonfire"), October 2024 official Top Shot partnership for Offer Terminal, Telegram alerts, Android app. **The portal must outclass LiveToken on the transparent-valuation + parallel-first-class + magazine-density + player-anchored axes** per the description doc's wedge list.

---

## §1 — The live sales feed (`/`)

Per description: every transaction in real-time. The homepage IS the sales firehose.

**Port (deferred — V1 doesn't ship live-feed):**
- /feed route (deferred to post-Phase-B) — uses our existing `mv_largest_sales_*` as a starting MV
- For V1: a "Recent activity" feed appears as a SECTION on /moments listing + on /u/[username] BAG; not the homepage

**Reject:** real-time WebSocket subscription (heavy infra). Polling-based with 30s refresh is acceptable.

---

## §2 — The Listings firehose (`/listings`, `/listings/auctions`)

Per description: every active listing.

**Port:** /moments page with `listedOnly=true` filter IS the listings firehose. Same data, doctrine-compliant filter URL.

**Reject:** separate /listings route; we keep /moments as the canonical filter+grid.

---

## §3 — The Deals / Snipe tool (`/deals`)

Per description: discounted listings ranked by gap to FMV.

**Port — deferred to /sniper route (post-Phase-B):**
- Our equivalent: listings where `lowest_ask < comparable_serial_floor × threshold`
- The comparable-serial-floor logic per persona doc: serial #1-100 is a different market from #5000+
- Sort by gap-to-comparable-floor descending

**Reject (per doctrine §P1):** opaque FMV. Our snipe threshold MUST be transparent — render the threshold formula publicly.

---

## §4 — The Offer Terminal (`/offers`)

Per description: official Top Shot partnership. Most-offered moments, largest offer/ask spread, per-moment offer activity.

**Port:** defer entirely. Offer data is not in our BQ source. Would require new ETL.

---

## §5 — The Showcase Challenge tracker (`/challenges`)

Per description: eligible moments owned vs required, progress %, cost-to-complete.

**Port:** defer to /challenges route (post-Phase-B). Challenge data is in Top Shot GraphQL `searchChallenges` (per `research/probes-v2/final-02-searchChallenges-envelope.json`); needs new ETL extension.

---

## §6 — The Portfolio (per-user route — described as integrated into the SPA)

Per description: moment, serial, tier, cost basis, current value, P&L (realized + unrealized), ROI, time-since-purchase, total portfolio valuation, sort/filter, **CSV export**.

**Port for /u/[username] — load-bearing:**
- This is the J2 canonical implementation reference
- Per-row: moment + serial + tier + cost basis (from `transactions.gross_amount_usd` where buyer matches) + current value + P&L + ROI + time-since-purchase
- Sort/filter columns (cost basis asc/desc, value asc/desc, P&L asc/desc, etc.)
- **CSV export** as a first-class feature (livetoken's signature move; doctrine §P6 "trader's verbatim ask is the spec")

**Reject:** ROI as the headline metric (we lead with floor + value; ROI is one column, not the focus). Anything that implies investment-grade returns.

---

## §7 — The Fast Fingers / Pack-Pull leaderboard (`/community-tools/fastfingers`)

Per description: pack-pull / drop / snipe speed leaderboard.

**Port:** defer; not core portal value.

---

## §8 — The Top Gifters leaderboard (`/top-gifters`)

Per description: leaderboard of users who give away the most moments.

**Port:** defer; out of doctrine scope (off the trader instrument axis).

---

## §9 — The Odd Sales anomaly detector (`/odd-sales`)

Per description: anomaly detector for wash trades / gifts / mispricing.

**Port — interesting deferred case:**
- Not in V1 scope (doctrine §P9 market-cap-first)
- Defer to /anomalies route in DEEPENING / Phase C
- Doctrinal note (§P1): "wash-trade filtering before display" is REJECTED. An anomaly DETECTOR (surface anomalies WITH the data) is different from anomaly SUPPRESSION (hide anomalies). The former is doctrine-compatible.

---

## §10 — Telegram alerts + Android app

Per description: out-of-band price-drop alerts. Android app.

**Port:** defer entirely. Out of V1+V2 scope.

---

## §11 — Plotly popup charts

Per description: high-density scientific-grade Plotly charts in modals.

**Port — adopt the DENSITY ambition, not the library:**
- We use Visx (per cookbook §1) — same dense scientific-grade output
- Modal pattern: drill from a chart card to a full-size detail view (already implicit in our `drillHref` pattern per ChartCard primitive)

**Reject:** Plotly itself (different library; we standardize on Visx for Top Shot data portal).

---

## §12 — The wedge over LiveToken (per description.md)

The portal MUST outclass LiveToken on these axes per the description doc:

1. **Transparent valuation (§P1)** — LiveToken's FMV is a black box; ours is published rules + editable on `/rules` (deferred-but-doctrine-aware)
2. **Per-moment depth-of-book** (J-P2) — order-book-style asks ladder; LiveToken shows offers but no full asks ladder UI
3. **Parallels-first-class** (§P5) — LiveToken doesn't treat parallels as first-class; we do everywhere
4. **Magazine-density editorial layouts** — LiveToken defaults to spreadsheet density; we use density APPROPRIATE to the surface (Polymarket-density on landings, Bloomberg-density on drill-downs)
5. **Player-anchored narrative bundling** — entirely missing from LiveToken; we bake into /players + /player/[id]

---

## §13 — Universal moment/account permalink

Per description: `/goto/:linkType/:payload` + `/m/:code` short-link redirector.

**Port:**
- /moment/[id] is already the canonical permalink
- /u/[username] is already the canonical collector permalink
- /m/[short] short-link is a DEEPENING add for sharing

---

*Vision-judge invokes this doc when scoring /u/[username] work (alongside evaluate-market description). Since both EM and livetoken have no rendered comparable image, the verdict is text+structure-based.*
