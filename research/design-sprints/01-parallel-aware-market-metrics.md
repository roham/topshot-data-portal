# Design Sprint 01 — Parallel-Aware Market Metrics

**Date opened:** 2026-05-17
**Triggered by:** Roham, after the audit showing Podziemski $5M floor-mcap was a single 1-of-1 Ultimate at vanity ask, and Curry/LeBron/Jokić rankings flipped wildly between floor-based and avg-sale-based mcap.
**Status:** DRAFT — to be redlined by Roham, then encoded into features.json once shape settles.

---

## The problem in one paragraph

Top Shot's data model has four axes that all matter for pricing: **set, tier, parallel, serial**. The portal currently aggregates to **(set × tier)** in the player matrix and to **(player)** at the market-cap layer. Both collapse the parallel dimension. A "Common LeBron in Base Set Series 8" is not one market — it's potentially three or four (Base parallel, Crystal parallel, Anthology parallel, etc.) — each with its own circulation, its own listings, its own offers, its own sale prices. Aggregating across parallels is the same kind of error as aggregating LeBron Commons with LeBron Ultimates: same player, same set, totally different markets.

## Three metrics the portal must expose at every parallel-bearing level

Per Roham 2026-05-17 16:30Z, the canonical metric set is:

1. **Low ask** — current minimum listing price on the marketplace. The "what could I walk up and buy this for" number.
2. **Highest offer** — the standing top bid. The "what would I get if I needed to sell now" number. Together with low ask, these define the bid-ask spread.
3. **Average sale** — average gross USD price over a defined window (30d default). The "what did this actually transact at" number.

**Median sale is explicitly out of scope** (Roham 2026-05-17 16:32Z).

Three metrics × every level of the taxonomy = a metric cube. Every cell of the cube must be computable, displayable, and URL-shareable.

## The taxonomy levels each metric must roll up to

For a given player, the metric cube has these levels (from finest to coarsest):

| Level | Key | Cardinality per player | Today's status |
|---|---|---|---|
| Serial | `(set, tier, parallel, serial)` | thousands | Only low_ask exposed per serial (via /moment/[flowId]) |
| Parallel | `(set, tier, parallel)` | dozens-to-hundreds | **Not exposed anywhere — the gap** |
| Tier | `(set, tier)` | low tens | Matrix cell — currently aggregates parallels (BROKEN) |
| Set | `(set)` | tens | Matrix row total — also parallel-blind |
| Player | `()` | 1 | Market cap leaderboard — uses floor formula (BROKEN per audit) |

The Pillar-5-#6 rule says parallels are first-class. That means **the parallel level is the canonical aggregation unit** — everything coarser (tier, set, player) is a *sum / display rollup* of parallel-level numbers, never a direct aggregate over moments.

## The data-shape question

For each `(player_id, set_id, tier_id, parallel_id)` cell, the portal needs to compute:

```
low_ask        = MIN(listing_price_usd) over moments in this cell where listed
highest_offer  = MAX(offer_price_usd) over open offers in this cell  ← may not be in current schema, see below
avg_sale       = SUM(gross_amount_usd) / COUNT(*) over SUCCEEDED tx in last 30d in this cell
circulation    = num_moments_in_circulation in this cell (from market_caps, but keyed at edition level today)
listings_count = COUNT moments in this cell where listing_price_usd IS NOT NULL
offers_count   = COUNT open offers in this cell  ← if available
sales_30d      = COUNT SUCCEEDED tx in this cell in last 30d
```

The reason the parallel level isn't exposed today is that `topshot.editions.edition_id` is *already keyed at (set × tier × parallel × play)* per the BQ source. So per-parallel data exists at the edition level — but the portal's surfaces don't currently surface parallel as a first-class axis.

**The fix is largely a UI fix, not a data fix** — the data is parallel-keyed; the views need to honor it.

## Open question: highest offer

Per `research/00-foundation-v2.md` §3 ceiling #10: "No offer / bid data of any kind — any 'bid spread' feature is structurally impossible from the public API." That ceiling applies to the *public* API. This portal is Dapper-internal and reads from BQ-sourced Supabase, which **may have offer/bid data the public API doesn't expose**.

**Action item:** before designing the highest-offer surface, run an audit:
- Does `topshot.transactions` carry open-offer state, or only accepted-offer transactions?
- Is there a separate `topshot.offers` / `topshot.bids` table?
- If neither: highest-offer is provisionally **OUT OF SCOPE** until ETL adds an offer-state source, and the portal surfaces only low_ask + avg_sale (with honest absence on the offer side).

If the data exists, design proceeds with all three. If it doesn't, the design ships two-of-three with a clear "highest offer pending data backfill" annotation.

## UI shape options for the player page

### Option A — three-axis matrix (rows = set, columns = tier × parallel)

```
              | Common-Base | Common-Crystal | Rare-Base | Rare-Diamond | Legendary-Base | ...
Base Set 8    |    $X.XX    |     $Y.YY      |   $Z.ZZ   |    $W.WW     |     $V.VV      |
2026 Playoffs |             |                |           |              |                |
```

- **Pro:** every parallel visible at a glance; no drill-down needed
- **Con:** column count can explode (some tiers have 4-6 parallels); horizontal scrolling required; matrix becomes sparse and hard to scan
- **When it wins:** for power users who want full visibility in one viewport

### Option B — drill-down (default tier view, expand cell → parallel breakdown)

```
              | Common  | Rare  | Legendary | ...
Base Set 8    | $X.XX▼  | $Y.YY | $Z.ZZ     |
              | └─ Base parallel: $X.XX (circ 10K)
              | └─ Crystal:       $X.XX (circ 500)
              | └─ Anthology:     $X.XX (circ 50)
2026 Playoffs | ...
```

- **Pro:** at-a-glance scan stays clean; full detail one click away; matches Basketball-Reference's expandable career-stats pattern
- **Con:** parallels aren't visible until clicked; risk users forget they exist; aggregate-cell value is still a parallel-collapsed approximation
- **When it wins:** for default view balanced for both glance + drill

### Option C — separate parallel-view route

```
/player/<id>           → current (set × tier) matrix, parallel-collapsed (with badge "N parallels")
/player/<id>/parallels → flat table, one row per (set × tier × parallel), sortable by every metric
```

- **Pro:** clean separation; the at-a-glance view stays simple; the parallel-aware view is exhaustive for analysts
- **Con:** two routes to maintain; the (set × tier) view still risks misleading users about aggregation
- **When it wins:** when the analyst persona is heavy and wants exhaustive tables

### Option D — composite cell (the recommended default)

Each `(set × tier)` cell renders the aggregate AND a sparkline-of-parallels:

```
$8.71              ← aggregate low_ask (min across parallels)
$26.0K             ← aggregate avg_sale market cap (sum across parallels)
●●●○○              ← five dots, one per parallel; filled = has listings, hollow = no market
×N badge           ← N parallels in this cell, hover for breakdown
```

Click the cell → expand inline to show per-parallel rows beneath.

- **Pro:** keeps the matrix at-a-glance, but signals parallel structure visually with sparkline-of-parallels; one click to expand; honors Pillar 1 (data viz density) and Pillar 5 #6 (parallels first-class) simultaneously
- **Con:** requires designing the parallel sparkline carefully; more component complexity
- **When it wins:** when the design budget allows for a composite primitive

**Recommendation: Option D as the default player-page matrix + Option C as the secondary `/parallels` exhaustive route.** Option C is the analyst's mode; Option D is the trader's at-a-glance.

## Market cap formula proposal

Replace the current `SUM over editions of (circulation × lowest_ask)` with:

**Per parallel (canonical unit):**
```
parallel_mcap = avg_sale_30d × circulation
```
when avg_sale_30d is computable (≥1 sale in window). When not (cold parallel):
```
parallel_mcap = MIN(low_ask, avg_sale_year) × circulation
```
when avg_sale_year is computable. When neither — the parallel has **no market activity for a year**:
```
parallel_mcap = NULL (do not contribute to player aggregate; surface as "cold market" tag)
```

**Per player:**
```
player_mcap = SUM(parallel_mcap) across all parallels where parallel_mcap is not NULL
player_cold_market_count = COUNT(parallel_mcap IS NULL)
```

This means:
- Vanity 1-of-1 Ultimate listings with no sales contribute **zero** to the player aggregate (the cold-market case)
- Real liquid markets contribute their avg_sale × circulation
- Semi-liquid markets (no 30d sales but some 1-year sales) contribute the conservative min(ask, year-avg)
- The leaderboard surfaces both `player_mcap` AND `player_cold_market_count` so users can see how much of a player's footprint is in dead markets

**Crucially:** this formula self-corrects the Podziemski problem. His $5M Ultimate has zero sales in any window → parallel_mcap = NULL → excluded from his player_mcap. His real markets sum to $17.9K. Rankings reflect what's actually trading.

## Browsing requirements per Pillar 4

The parallel-aware view must support these browse axes (all URL-encoded):

- **Filter by tier** — show only Common / only Legendary / etc.
- **Filter by parallel** — show only Base parallel / only Crystal / etc. across all sets
- **Filter by set** — narrow to one set
- **Filter by has-listings** — hide cold-market cells
- **Filter by has-30d-sales** — hide cells with no recent activity
- **Sort columns** — every numeric column (low_ask, highest_offer, avg_sale, circulation, mcap)
- **Cross-player parallel browse** — `/parallels?parallel_id=X` shows top players within one specific parallel (e.g., "show me everyone's Anthology Common floor across all sets")

Persistent left filter rail on `/parallels` route. URL state via nuqs. Per Pillar 4.

## Acceptance criteria for the loop

When this design lands as a feature in `features.json`, the acceptance text should mandate:

1. Player page renders Option D composite cells (aggregate value + parallel sparkline + ×N badge + expandable)
2. `/parallels` route ships with full (set × tier × parallel) flat table, sortable on every column, filterable per Pillar 4
3. Player market cap leaderboard re-ranks per the proposed formula; `player_cold_market_count` column visible; toggle to switch between floor-based (current) and parallel-aware (new) for forensic comparison during the transition
4. Cold-market cells visually distinct (faded, with a "no recent activity" tag) — not the same DOM as data-bearing cells (per `research/wiki/gotchas/judge-journeys-must-assert-data-rendered.md`)
5. Per-cell breakdown drill-down works on click; URL updates to capture the open state (`?expand=set:base-set-8/tier:common`)

## Open questions for Roham's redline

1. **Highest offer** — should we audit the data first (this iteration), or ship without it and add when ETL catches up?
2. **Cold-market threshold** — is "no 30d sales AND no 1-year sales" the right cold-market trigger, or should it be tighter (e.g., "no sales ever")?
3. **Default view** — Option D (composite cell) confirmed, or do you want Option C (separate routes) as the default with the matrix being parallel-blind by design?
4. **Series 8 brand-new sets** — empty rows where LeBron HAS editions but zero listings exist anywhere yet. Cold-market rule above handles this gracefully (NULL → excluded). Confirm that's the right treatment.
5. **Cross-player parallel browse** — is `/parallels?parallel_id=X` (one parallel across all players) a v1 feature, or v2 after the player page lands?

Once these are resolved, the design becomes a set of features in features.json with concrete acceptance text, and the loop ships them.
