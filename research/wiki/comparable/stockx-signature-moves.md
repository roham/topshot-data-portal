# StockX — Signature Moves

**Captures:** NONE in repo. StockX is public at stockx.com; could be WebFetch'd.
**Doctrine reference:** §0.2 — *"Size-as-market-segmenter — applied to our parallels. Each (set × tier × parallel) is its own market with its own ladder. Sold-history transparency."*
**Status:** Text-descriptive. Most relevant for /moment/[id] and /edition/[id] (Phase B+).

---

## §1 — Size-as-market-segmenter (the canonical move)

StockX's signature insight: a Jordan 1 in size 9 is a DIFFERENT MARKET than the same Jordan 1 in size 10. Different ask, different bid, different volume, different history. The same SKU is N markets (one per size).

The size selector on each product page is a horizontal pill row showing every available size + its current lowest ask. Click a size → entire product page re-renders for THAT size's market.

**Port — load-bearing for /moment/[id] and /edition/[id] per doctrine §P5:**

Each `(set × tier × parallel)` combination is its own market. A "Wemby Common" isn't ONE market — it's:
- Wemby Common Base parallel
- Wemby Common Diamond parallel
- Wemby Common Anthology parallel
- (...22 named parallels + Base)

= ~23 separate markets, each with its own floor, listings, sales history, depth ladder.

**Implementation:**
- /moment/[id] (when on a Common, for example) has a parallel selector at the top (like dapper.market's left vertical icon rail)
- Click a parallel chip → page re-renders for THAT parallel's edition_id
- Each parallel has its own price history, lowest ask, recent sales

**Reject:** aggregating "all parallels of this play" into a single mcap or price (doctrine §P5 explicit rejection). Each parallel is its own market.

---

## §2 — Sold-history transparency

StockX shows EVERY recent sale at the bottom of each product page:
- Sale price
- Size (which market)
- Date / time
- "Bid won" or "Ask hit" indicator

The transparency builds trust. Traders see the actual recent prints, not just the current ask.

**Port — load-bearing for /moment/[id] and /edition/[id]:**
- "Recent sales" table below the depth chart
- Per-row: sale price + tier + parallel + serial + buyer-display-name (if available) + completed_at
- Sort by recency descending; ≥ 20 rows visible
- Pagination for full history

**Reject:** hiding sales (the old True-Value-with-confidence-band approach is opaque); aggregating sales into "avg sale" only without showing individual prints.

---

## §3 — Bid / ask spread visualization

StockX prominently shows: highest bid | lowest ask | last sale. Three numbers, large, centered above the size selector.

**Port — adapted to our domain:**
- On /moment/[id] header: highest_offer (if available) | lowest_ask | last_sale_price
- Spread highlighted (e.g., "Spread: $42")
- For editions where offers aren't in our data: skip the bid column with honest disclosure ("Offers not in source — see methodology")

**Reject:** showing only the ask (loses the depth signal); using opaque "Fair Value" instead of true bid/ask.

---

## §4 — Price chart with volume bars

StockX shows a candlestick-like chart for each product over various time windows (1M / 3M / 6M / 1Y / ALL). Below the chart: volume bars showing daily sale count.

**Port — already partially shipped in V6:**
- /market-cap has TotalOverTimeChart for aggregate
- /moment/[id] has MomentPriceHistory.tsx per V6 handover
- Phase A iter 4 adds Listings-to-Burns Ratio Over Time
- DEEPENING candidate: per-moment candlesticks with volume

**Reject:** missing volume bars (the volume context IS the signal — was a quiet sale or a busy day?).

---

## §5 — The "ask" and "bid" buttons (we DON'T port)

StockX is a marketplace; we observe, not transact. Skip the buy/sell button UI.

**Port:** instead of "Buy at $X" CTA, show a "View on Top Shot" link that opens the moment's nbatopshot.com page in a new tab.

---

## §6 — Authentication / verification layer (we DON'T port)

StockX physically authenticates every sneaker before shipping. Their value-add is verification.

**Port:** doesn't apply — Top Shot moments are on-chain; no authentication required.

---

## §7 — The wedge: what we OUTCLASS StockX for our audience

1. **Cleaner segmentation logic** — StockX's size dimension is loose (multiple sizes can be the same "fit"); our parallel × tier × set segmentation is exact and on-chain.
2. **Per-parallel completion-rarity** — StockX doesn't have a set-completion analog; we do.
3. **Domain-specific verticals** — players + sets + plays + parallels are richer than StockX's brand × model × size hierarchy for OUR audience.

---

## §8 — What we DO port (load-bearing)

1. Size-as-market-segmenter → parallel-as-market-segmenter per §P5
2. Sold-history transparency (recent sales table on /moment/[id])
3. Bid/ask/last-sale prominent header on detail pages
4. Volume bars below price chart
5. The clean "this size, this market, this depth" framing — adapt to "this parallel, this market, this depth"

---

*Vision-judge invokes this catalog for /moment/[id] and /edition/[id] work (Phase B+). The segmentation logic per parallel is the most important port.*
