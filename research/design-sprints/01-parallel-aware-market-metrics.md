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

## Data-model finding (2026-05-17 17:15Z)

`topshot.editions` does NOT have a `parallel_id` / `parallel_name` column. `edition_id` is keyed at `(set × play)` only — collapsing across parallels.

**But `topshot.moments.subedition_id` IS the parallel column.** Parallels are captured at the moment grain. To roll up per-parallel data:

```sql
-- per-parallel (subedition) aggregation pattern
SELECT
  m.set_id,
  m.subedition_id,
  e.tier_name,
  COUNT(*) AS circulation,                  -- # moments in this parallel
  MIN(m.listing_price_usd) AS low_ask,      -- lowest current listing
  COUNT(m.listing_price_usd) AS listings    -- # actively listed
FROM topshot.moments m
JOIN topshot.editions e ON e.edition_id = m.edition_id
WHERE m.set_id = $set AND e.player_id = $player AND m.subedition_id IS NOT NULL
GROUP BY m.set_id, m.subedition_id, e.tier_name;
```

`highest_offer_price` from `market_caps` is keyed at `edition_id`, NOT subedition. So offer data may aggregate across parallels — needs ETL extension to surface per-subedition open offers. **Provisional approach:** display edition-level offer with a "spans N parallels" caveat until subedition-keyed offer ETL lands. avg_sale per subedition is computable from transactions → moments → subedition_id join.

This is a real ETL/data-model item, not just a UI item. Surfaced as a separate feature for the loop.

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

## Market cap formula — KEEP CANONICAL (Roham 2026-05-17 16:50Z)

Floor-based market cap stays the canonical aggregation formula:

```
parallel_mcap = circulation × lowest_ask
player_mcap   = SUM(parallel_mcap) across all parallels
```

Principal's reasoning (verbatim): *"if someone has listed their moment for $5 million, and it's the only one of that moment, then that's what it is. If the fans of other players want to pump the lowest asks of their players, then they should come in and list their stuff too. I mean, every player has one-on-ones, and so I think by showing low ask market cap faithfully, I think that's the best approach."*

The implication: vanity 1-of-1 Ultimate asks are not a bug, they're a market signal. A listing represents a willingness-to-sell at that price; if no one beats it, the market is genuinely thin and the asker has the floor. Equal treatment across players means equal exposure to that mechanic. Faithfulness > smoothing.

The audit-driven re-ranking (Jokić / Luka / Kyrie rising on an avg-sale formulation) is therefore **descriptive context**, not a fix-to-apply. The avg-sale numbers stay useful as a *display column* per parallel (see below) but do NOT replace the floor formula at the player-aggregate level.

What this re-frames in the rest of this doc:
- "Cold market" is not a state that excludes a parallel from the aggregate. It's a tag in the display layer ("no 30d sales") for trader awareness, but the floor still contributes its `lowest_ask × circulation` to the player total.
- The Podziemski $5M and Angel Reese $1M floor-mcaps are correct. Their rank position is a faithful read of who-has-listed-what — not a metric flaw.
- The parallel-aware rollup is still the right *structural* change (so traders see per-parallel low_ask + offer + avg_sale instead of edition-keyed only). The formula above just operates at the parallel grain instead of the edition grain — which is mathematically identical today since `edition_id` already encodes parallel.

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

## Open questions — ALL RESOLVED 2026-05-17 17:10Z

1. ~~Highest offer data audit~~ → **AVAILABLE.** `topshot.market_caps.highest_offer_price` exists; 55.2% coverage on latest snapshot (5,074 of 9,194 editions have a non-zero open offer). 317,841 all-time SUCCEEDED OFFER transactions, 36,053 in last 30d. Ships as a first-class metric.

2. ~~Empty Series 8 rows treatment~~ → **POSITIVE VISUAL FRAMING.** Don't hide; emphasize the opportunity. Treatment: cell renders with a "🆕 NEW DROP" tag (or similar visual delight — green accent, upward arrow, "be first to list" CTA). The empty cell is repositioned as "fresh market — your listing sets the floor." Per Roham 2026-05-17 17:10Z: *"make it visually positive don't hide, emphasize the exciting part if it exists."*

3. ~~Default player-page UI option~~ → **BUILD ALL FOUR (A/B/C/D), SHOW SIDE BY SIDE.** Per Roham 2026-05-17 17:10Z: *"i dont know, make all variations and show me."* Implementation: `/player/<id>` is current view; `/player/<id>/variant-a`, `/variant-b`, `/variant-c`, `/variant-d` are the four design options. A top-of-page picker lets the user toggle. Once Roham picks, the chosen variant becomes the canonical `/player/<id>` and the others retire.

4. ~~/parallels cross-player route~~ → **SHIP V1 NOW.** Per Roham 2026-05-17 17:10Z: *"i dont know, show me."* Implementation: `/parallels` with the flat per-parallel table; filter rail (tier / parallel type / set / has-listings / has-offers). URL state via nuqs.

All four resolutions encoded as features in features.json. Loop ships them; first scaffolds authored directly so principal can click within minutes.
