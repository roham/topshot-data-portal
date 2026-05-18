# Loop B Prep — `/u/[username]` Page Brief

**Status:** Pre-Loop-B brief. Phase B target #4 (after /players, /moments, /sets).
**Persona acceptance:** J2 Portfolio Review (verbatim from `pro-trader.md`).
**Primary comparable:** evaluate.market portfolio (per `research/comparables/evaluate-market/description.md` — Bloomberg-shaped, USD totals, P&L vs purchase price, multi-wallet). Secondary: livetoken portfolio (per `research/comparables/livetoken/description.md` — cost basis + ROI + CSV export). Tertiary: OTM Bag (described in pro-trader.md §6; no specific capture).
**HARD BLOCKER:** This page cannot ship until **Loop A §P0.1 (owner_flow_address backfill) completes**. The page reads from `moments.owner_flow_address`. Without that data, the BAG table is empty → V4 failure shape repeated.

---

## §1 — Target page + scope

**One route:**

**`/u/[username]`** — collector portfolio. The J2 canonical "I want to see my own collection" surface.

URL identifier is `username` (the Top Shot display name), resolved server-side to `flow_address` via a lookup table (TBD — Loop A may add `topshot.collectors` table OR we use a query against the current Top Shot GraphQL `searchUsers` at FILL time, then cache the result).

**Three modes:**
1. **`/u/[username]` (own portfolio, future)** — requires user auth; defer to post-Phase-B
2. **`/u/[username]` (public collector view)** — V1 scope. Anyone can view any collector's bag publicly, since Flow addresses + moments are on-chain
3. **Self-attestation mode** — Roham viewing MBL's bag; MBL viewing his own — same UI, no auth distinction in V1

**Out of scope (defer):**
- Owner authentication (we don't manage Top Shot auth)
- Wallet-connect import flow
- Multi-wallet aggregation per user (one collector → many flow addresses) — defer; V1 = one address per user lookup
- "Compare two collectors" — defer to /compare route

---

## §2 — Primary comparable + signature moves

### evaluate.market portfolio (described, no Wayback capture):

> "Multi-wallet portfolio with USD totals + per-collection breakdown. Per-moment: True Value, market cap %, my-acquired-at price, USD P&L (realized + unrealized), holding period. Profit/Loss charting all-time / 90-day / 30-day / 7-day. Collector identity at /accounts/<address>. The most-ambitious portfolio surface in the Top Shot canon. Both domains dead 2026-05-14."

### livetoken portfolio (described):

> "Portfolio table per moment with: moment, serial, tier, cost basis, current value, P&L (realized + unrealized), ROI %, time-since-purchase, total portfolio valuation. Sort/filter columns. **CSV export.** Plotly popup charts for high-density scientific-grade visualization. Series 1-4, 2023-24, 2024-25, 2025-26, WNBA support."

### OTM Bag (described in pro-trader.md):

> "BAG table count matches the header total. Per-row: play, edition, serial, tier, current listing or comparable-serial floor, acquired-at, P&L. No 'Coming Soon' anywhere on this page."

### What we add (doctrine compliance):

- **Parallels first-class per row** (§P5): every BAG row has a parallel chip
- **Floor / avg-sale toggle** at page level (same `McapFormulaToggle` pattern)
- **Default 30D window** on portfolio-value-over-time chart (§P7)
- **Transparent valuation** (§P1): floor + circulation, no opaque True Value engine. evaluate.market's True Value was their fatal mistake; we don't repeat it

### What we reject (per doctrine + persona doc):

- **Opaque "True Value" valuations** (§P1; evaluate.market's fatal mistake)
- **Pitch-deck framing** like "your potential gains" / "you've achieved!" / milestone celebrations (persona doc §"What offends them")
- **Gamification** — achievements, badges, streaks
- **Marketing copy on this surface** — "Discover your collection!" "Explore your moments!" → instant credibility kill per persona

---

## §3 — Data prerequisites

| Data | Source | Status | Loop A dep? |
|---|---|---|---|
| `moments.owner_flow_address` populated | currently 0% of 3.5M rows | ❌ **HARD BLOCKER** | **Loop A §P0.1** must complete (~15h backfill in progress as of 2026-05-18 04:30Z) |
| Username → flow_address lookup | doesn't exist | ❌ | new ETL OR live Top Shot GraphQL `searchUsers` call at fill time (one-time per username, cached) |
| Collector display name + avatar | live Top Shot GraphQL | ⚠️ doctrine violation per §3 footnote (no live GraphQL at request time) | OPTIONS: (a) ETL once at username resolution + cache forever; (b) accept violation as legacy edge case |
| Acquired-at price per moment | derived from `transactions` where buyer matches owner | ⚠️ partial | requires `transactions.buyer_safe_name` or `buyer_flow_address` populated (currently 0%) — Loop A §P0.2 |
| Current floor per moment (for unrealized P&L) | `moments.listing_price_usd` OR `mv_player_market_cap` for parent edition floor | ✅ | not blocking |
| Portfolio-value-over-time series | derive from current bag × `market_caps` joined on `edition_id` × `date` | ✅ derivable | needs new MV `mv_collector_portfolio_daily` OR on-the-fly | DERIVATIVE |

**Critical-path Loop A blockers:** §P0.1 (owner_flow_address) AND §P0.2 (buyer_safe_name for acquired-at price). Both P0 — both must close before /u/[username] can ship.

**Earliest ship:** ~16-20 hours after Loop A iter 2 backfill completes (assuming Loop A then closes §P0.2 buyer_safe_name in 1-2 iters).

---

## §4 — Persona acceptance (J2 verbatim)

> *"I want to see my own collection. I navigate to /u/<my-username> and see every moment I own with current floor, my acquired-at price, and unrealized P&L. The BAG table count matches the header total."*

**Pass criteria (J2):**
- Header total **matches** BAG row count (within rounding) — auditable
- Per-row: **play**, **edition**, **serial**, **tier**, **current listing OR comparable-serial floor**, **acquired-at**, **P&L**
- **No "Coming Soon" anywhere** on this page (§P1 + persona §"What offends them")

**Header subtitle (§P6):** *"Your moments. Faithful floor. No opaque True Value."*

---

## §5 — Chart cuts per cookbook §6 + §8

**`/u/[username]` portfolio surface:**

| # | Block | Reference | Notes |
|---|---|---|---|
| 1 | **Collector header**: avatar + username + flow_address (truncated) + acquisition span ("collecting since 2021") | clone evaluate.market header concept | full-width |
| 2 | **Portfolio KPI grid** (8 cells): Total Moments Owned / Total Market Cap (floor) / Total Cost Basis / Unrealized P&L (with color) / Realized P&L (lifetime) / Total Spent on Floor Today / Highest-Value Moment / # Distinct Players Collected | clone Card Ladder `dashboard-02` KPI grid | doctrine-compliant — no True Value here |
| 3 | **Portfolio value over time** — hero line chart | new `PortfolioValueChart.tsx` | needs `mv_collector_portfolio_daily` OR on-the-fly derive; default 30D window |
| 4 | **P&L over time** — secondary line chart with realized + unrealized split | new | same data source |
| 5 | **Tier breakdown of bag** — donut chart | clone `ByTierChart.tsx` pattern | bag moments × tier_id |
| 6 | **Parallel breakdown of bag** — stacked-bar (§P5) | new `ByParallelChart.tsx` clone | bag moments × parallel_id |
| 7 | **Top 10 by individual mcap** — dense table | clone `dashboard-04` shape | bag sorted by current floor desc |
| 8 | **Recent activity in this bag** — last 20 buys/sells | derive from `transactions` filtered by `buyer_flow_address` or `seller_flow_address` = owner | last 20 with /moment/[id] link |
| 9 | **BAG table** — the J2-canonical dense list. Sort/filter. Every moment in the bag. | clone OTM Bag concept + livetoken pattern | Per-row: thumbnail + play + edition + serial + tier + parallel-chip + current floor + acquired-at + unrealized P&L (with color) + holding period (days) |
| 10 | **EXPORT button** — CSV of bag (livetoken signature move) | new | doctrine-compliant; trader's verbatim ask. Defer to V1.1 if blast radius too large; V1 ships visible button with current-page-only export |
| 11 | **MethodologyFooter** | reuse | n/a |

**Density target:** the BAG table is ≥ 20 rows above the fold; the KPI grid + chart strip live above it. Total above-the-fold data points ≥ 100 (Bloomberg-tier per §P2).

---

## §6 — Data layer design

`lib/supabase/queries/collector-portfolio.ts`:

```ts
export async function fetchCollectorPortfolio(username: string, formula: PortfolioFormula): Promise<PortfolioData> {
  const sb = supabaseAdmin();

  // 1. Resolve username → flow_address (cached lookup)
  const { data: collector } = await sb.from("collectors")
    .select("flow_address, display_name, avatar_url, first_seen_at")
    .eq("username", username).maybeSingle();
  if (!collector) return { error: "collector not found", suggest: "verify spelling" };

  // 2. Single query for the BAG
  const bagQuery = sb.from("moments")
    .select("moment_id, play_id, edition_id, serial_number, tier_id, listing_price_usd, " +
            "editions(parallel_id, set_id, edition_name), players(full_name)", { count: "exact" })
    .eq("owner_flow_address", collector.flow_address);

  // 3. Parallel fetches for everything else
  const [bag, acquiredAtMap, kpis, valueSeries, recentActivity] = await Promise.all([
    pagedFetch(bagQuery, 50000, 1000),
    fetchAcquiredAtPrices(sb, collector.flow_address),  // joined from transactions where buyer matches
    fetchPortfolioKpis(sb, collector.flow_address, formula),
    fetchPortfolioValueOverTime(sb, collector.flow_address, formula.windowStart),
    fetchRecentActivity(sb, collector.flow_address),
  ]);

  return shape(bag, acquiredAtMap, kpis, valueSeries, recentActivity);
}
```

**Key invariants:**
- `pagedFetch` for the BAG — collectors with 1000+ moments are real (MBL among them); we need to paginate.
- `Promise.all` for everything that doesn't depend on the BAG result.
- AcquiredAt is a JOIN through `transactions.buyer_flow_address = owner_flow_address` AND `moment_id = bag.moment_id`.
- If `acquiredAt` is NULL for a row (moment acquired before transaction history coverage), render P&L column as "—" with a tooltip explaining the data coverage limit.

---

## §7 — URL state

```ts
export type PortfolioFormula = {
  mcap: "floor" | "avg_sale";       // reuse pattern
  window: "30d" | "90d" | "1y" | "all";
  bagSort: "value_desc" | "acquired_asc" | "pnl_desc" | "tier" | "serial";
  bagFilter: {
    tierId?: number;
    parallelId?: number;
    minValue?: number;
    listedOnly?: boolean;
  };
};
```

Example: `/u/mbl?mcap=floor&window=90d&sort=pnl_desc&tier=4`

---

## §8 — Verification (B1-B8)

| Axis | /u/[username] target |
|---|---|
| **B1. Vision-diff** | ≥ 7 vs evaluate.market description text + livetoken description (no PNG to diff against; structural diff via text) — this is the WEAKEST B1 case, mitigated by stronger B4 doctrine compliance |
| **B2. Data substance** | BAG ≥ 20 rows above fold; KPI grid filled; portfolio chart ≥ 30 data points; header total === BAG count |
| **B3. Interactivity** | sort/filter/window/mcap toggles URL-stateful; EXPORT button works |
| **B4. Doctrine** | P1 (faithful floor, no True Value), P5 (parallel chip per row), P6 (J2 verbatim acceptance), P7 (default 30D), P8 (NEW DROP framing if bag is empty — "🆕 No moments yet; start your collection") |
| **B5. Density** | ≥ 100 data points above fold |
| **B6. Perf+a11y** | LCP < 3.5s (acceptable bump given paginated bag query); a11y ≥ 95 |
| **B7. Cross-vendor** | PASS — gpt-5.5 evaluates against description docs (no rendered comparable image) |
| **B8. CEO signal** | ✓ vote with MBL's bag as the test case ("would Michael Levy find this rendered correctly?") |

**Acceptance test case:** MBL. Doctrine §3 names MBL as the canonical ICP. Once owner_flow_address is populated, look up MBL's flow_address, render his /u/[mbl-username], capture screenshot, ship to Roham for validation.

---

## §9 — Risk assessment

1. **Username → flow_address lookup MV doesn't exist.** Decision: (a) build `collectors` table in Loop A DISCOVERY/DERIVATIVE — populated from Top Shot GraphQL `searchUsers` per known username, cached forever; (b) for V1, accept that we only support N hand-curated usernames (Roham, MBL, cuteknick, veerman per doctrine §3) — manually seeded.
   **Recommendation:** ship V1 with hand-seeded `collectors` table (8-10 known usernames). Promote to dynamic lookup in DEEPENING.

2. **AcquiredAt may be NULL for many rows** because `transactions.buyer_flow_address` (renamed from `buyer_user_id`?) is currently 0% populated. → Loop A §P0.2 (buyer_safe_name) may or may not solve this — depends on root cause investigation. If buyer_flow_address is the field we need (not buyer_safe_name), it's a separate gap. → Surface honestly in the BAG table: "Acquired-at not available for this moment (pre-coverage)."

3. **MBL's transaction data is NOT currently in our DB** per V6 handover. Even after Loop A §P0.1 + §P0.2, MBL specifically may have no buy history if he's not in our `transactions` rows. → Surface MBL's bag without P&L; the bag itself + floors + tier mix are still valuable.

4. **Doctrine §3 footnote violation pre-existed in V5** — old `/u/[username]` route used live Top Shot GraphQL at request time. → V7's port must read only from Supabase; the old route should be deleted or rewritten. Note: don't inherit the V5 implementation; clean clone from cookbook.

5. **Pagination across large bags** (1000+ moments per collector) — PostgREST 1000-row cap requires `pagedFetch`. With 4-5 chunks of 1000 = 4-5 round trips → 3-5s load. → Acceptable. Or pre-aggregate to `mv_collector_bag_<flow_address>` if a specific collector page becomes hot.

6. **No image to vision-diff against** — evaluate.market is dead, livetoken has no public capture. → B1 falls back to text-based structural review by gpt-5.5 against the description markdown docs. Mitigate by stronger B4 doctrine + a §P6 verbatim acceptance text check.

---

## §10 — Kickoff readiness

When ALL true (this is the most-blocked of the 4 Phase B briefs):
- [ ] Loop A handoff signal fired
- [ ] **Loop A §P0.1 owner_flow_address backfill COMPLETE** (~3.5M rows populated)
- [ ] Loop A §P0.2 buyer_safe_name root cause known + addressed (or formally deferred with disclosure plan)
- [ ] `topshot.collectors` lookup table seeded with at least: roham, MBL (Michael Levy), cuteknick, veerman + a username column added — or dynamic lookup wired
- [ ] /players + /moments + /sets shipped (sequenced before /u/[username] per Loop B prompt §8)
- [ ] Roham redlines on this brief — specifically: collectors-table-seeded vs dynamic-lookup decision
- [ ] MBL test case identified: which username + flow_address corresponds to MBL? **Roham knows this; surface during loop-b-4-research.md authoring**

---

*Committed at: `research/iterations/loop-b-prep-u-username.md`. Most-blocked Phase B target — wait on Loop A.*
