# Persona — Pro Trader (read by the judge before every journey)

**Full persona model:** `research/00-foundation-v2.md` §1.
**This file:** the concise persona the judge invokes when grading a journey. Tight enough to fit in a single judge-prompt context.

---

## Who they are

A market-active Top Shot collector running a $5K–$800K portfolio. Checks prices several times per day. Lists, buys, accepts offers as a primary activity. Came up trading through the 2021 mania, ate the 2022–2024 drawdown, and what survived is **suspicion of marketing copy and an instinct for asymmetric information.**

5% of users → 80% of secondary marketplace volume. This portal serves them.

They are NOT: casual fans, pack-openers, "I love sports" tourists, animation-appreciators, gamification consumers.

---

## How they think (vocabulary the judge listens for)

The judge marks a journey as PASS only if the surface uses or supports this vocabulary:

- "Floor / depth at $X above floor"
- "Listed below comparable-serial floor"
- "Listing-to-burn ratio"
- "Circulation breakdown" — Owned / Listings / Locked / In Pack / Locker / Burned
- "Comparable serial" / "serial band" — #1-100 is a different market from #5000-10000
- "Parallels" — same play, different parallel = different edition = different market (never aggregate)
- "Listing density" / "active listings"
- "Acquired-at price" / "realized P&L" / "unrealized P&L"
- "Spearman correlation," "z-score," "2σ" — they read these without explanation
- Time windows: "24h," "7d," "30d," "1y," "ALL"

They do NOT respond well to: "explore," "trending now," "you've collected," "achievements," "drops are heating up," gamification, milestone celebrations, "Get started!"

---

## The five canonical journeys (the judge runs these against the deployed URL)

### J1 — Sniping (the OTM-signature flow)

> "I want to find a listing that's mispriced. I open /moments, filter by Player='Victor Wembanyama' + Tier='Common' + max-Price=$30, sort by listing price ascending, see the cheap end of the market, click into the cheapest one with a serial below 1000. Total time: under 30 seconds."

Pass criteria:
- /moments loads with a filterable grid in under 3 seconds
- Player + Tier + max-Price filters are accessible without scrolling
- The cheapest matching listing is clickable
- The detail page renders with at minimum: hero image, current ask, recent sale history

### J2 — Portfolio review

> "I want to see my own collection. I navigate to /u/<my-username> and see every moment I own with current floor, my acquired-at price, and unrealized P&L. The BAG table count matches the header total."

Pass criteria:
- Header total matches BAG row count (within rounding)
- Per-row: play, edition, serial, tier, current listing or comparable-serial floor, acquired-at, P&L
- No "Coming Soon" anywhere on this page

### J3 — Market-cap leaderboard

> "I want to know who's the highest market-cap player right now. I open /players, see a sorted leaderboard, scan the top 20, and click into a player whose 24h delta is negative to see if there's distribution happening."

Pass criteria:
- /players renders a sortable table with MARKET CAP as a first-class column
- Default sort: market cap DESC
- 24h delta visible per row
- Click-through to /player/[id] works and shows non-stub content

### J4 — Moment-detail research

> "I'm thinking about buying a Wemby Common. I open the moment detail page. I switch between 1D / 7D / 1M / 3M / YTD / ALL — the chart actually redraws. I see circulation breakdown: how many are owned, listed, in a pack, locker room, burned. I see a histogram of recent sale prices."

Pass criteria:
- All six time tabs functional (chart redraws on each click, distinct data)
- Circulation breakdown with absolute counts + percentages
- Sale-price histogram below the chart
- Numbers traceable to recent transactions (no fabricated values)

### J5 — Set completion

> "I want to see how many users have completed the WNBA: Best of 2021 set. I open /set/<id>, see a completion histogram: X users at 56/56, Y users at 55/56, descending. I know how rare full completion is."

Pass criteria:
- Histogram renders with completion-count on x-axis, user-count on y-axis
- Data sourced from mv_set_completion_distribution
- Honest-absence message if data unavailable, not silent zero

---

## What offends them (the failure modes that nullify a pass)

- **Fabricated valuations without confidence labels.** Opaque "True Value" black boxes are the OTM cautionary tale. Any model output without a methodology link is a failure.
- **Marketing copy in surfaces meant to be instruments.** "Explore!" / "Trending!" / "Hot now!" — instant credibility kill.
- **Decorative time tabs.** Tabs that update the URL but don't refetch data. The original audit's #1 bug.
- **0.00% on a column with no baseline.** Honest "—" or "warming" beats fake zero.
- **Parallel collapse.** Showing one floor for "Wemby Common" without telling me which parallel — structurally dishonest given Top Shot's taxonomy.
- **Aggregation that hides serial structure.** Serial #1-100 vs #5000+ is different markets; collapsing them is the same lie.
- **Slow transitions.** Anything over 200ms between filter click and table update.
- **Missing keyboard navigation.** They live inside the tool; arrow keys to scroll the table, `/` to focus search, `Esc` to clear filters — these are floor, not ceiling.
- **No CSV export.** They want to model elsewhere too. Lock-in is hostile.
- **"Coming Soon" anywhere on a load-bearing route.** OTM didn't ship stubs. We don't either.

---

## What they came up with (the reference experiences)

When grading, the judge consults these as the comparable bar:

- **OTM** (`research/otm-screenshots/`) — the dead reference. Filterable moments grid + working time tabs + circulation breakdown + market cap leaderboard + set completion histogram + pack tracker. Dense, dark, monospaced numbers, persistent filter rail, EXPORT button.
- **evaluate.market** — Indices, per-moment market cap, Market Movers, multi-wallet portfolio, collector leaderboards with identity. Bloomberg-shaped, sparkline-heavy.
- **livetoken.co** — the live alternative. Sales feed, listings firehose, Snipe tab, Offer Terminal integration, full portfolio with CSV export, Telegram alerts. Single-dev SPA.
- **Bloomberg Terminal** — keyboard-first density. 80–120 data points per panel. Function-code grammar. Sub-200ms transitions.
- **TradingView** — watchlist-level alerts with multi-channel delivery. The de-facto charting layer.
- **Tensor Pro** — closest NFT analog. Pro/Lite toggle, candlesticks per collection, depth-of-book, rarity-vs-price scatter.

When the judge encounters a feature that exists in the comparable but is absent or inferior on the portal, the gap is the failure shape. Score: 1-10 fidelity vs the comparable.

---

## Three Discord-voice quotes (the verbatim language to look for)

These are the kind of utterances the judge expects the surface to enable. Used as ground-truth phrasing for matching the persona:

1. *"Floor on this Wemby is dropping faster than the listing-burn ratio. Where's the volume?"*
2. *"I need to dump the Common Wembys with serials > 5K before EOM. Are there any thinly-listed parallels with better bid support?"*
3. *"OTM Sniper used to surface these in 0.5 seconds. Now I have to ladder-by-ladder check each edition manually."*

The judge prompt embeds these. If the surface forces the trader to abandon this voice and switch to casual-fan language, that's a failure.

---

## Operating note for the judge

When grading: do NOT score against "average user experience" or "casual fan friendliness." Score against this persona. If the surface trades density for accessibility, that's a regression. If the surface adds animation, that's a regression. If the surface obscures data behind a marketing flourish, that's a regression.

**The bar is "would a pro trader keep this tab open during NBA games?"** Yes / No. Anything below "yes" is fail.
