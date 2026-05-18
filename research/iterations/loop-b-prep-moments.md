# Loop B Prep — `/moments` Page Brief

**Status:** Pre-Loop-B brief. Phase B target #2 (after /players).
**Persona acceptance:** J1 Sniping (verbatim from `pro-trader.md`).
**Primary comparable:** OTM filterable moments grid (`research/otm-screenshots/10-filterable-moments-grid.png`). Secondary: NFL All Day search (`research/comparables/nfl-all-day/search.png`).

---

## §1 — Target page + scope

**One route, two sub-routes:**

1. **`/moments` (listing)** — the OTM-signature filterable grid with EXPORT. The J1 canonical sniping surface.
2. **`/moment/[id]` (detail)** — drill-down detail. Already partially shipped in V5 (`MomentPriceHistory.tsx` exists). Loop B reviews + brings to /market-cap-grade.

Both ship in the same Loop B iteration. Per doctrine §P2 the drill must work — V4's failure was 8 features judge-passed but visually broken; we don't re-do that here.

**Doctrine reconciliation:** `/moments` is itself a second-click drill from `/market-cap` (per §P2: "graphs first, density on drill"). Therefore the page can be MORE table-dense than the landing. BUT — to honor §0.1 landings canon — we still ship a chart strip at the top (3 mini-charts: sales volume / median price / active listings count over time) before the filter grid. Best of both: glanceable trend up top, OTM grid below.

**Out of scope (defer):**
- Sniper / mispricing surface (the OTM-Sniper port; doctrine canonical but separate route `/sniper`)
- CSV export of filtered results (P1 — most likely deferred to first DEEPENING iter)
- Watchlist-from-moment (requires user auth)

---

## §2 — Primary comparable + signature moves

### OTM `/moments` grid (the canonical port — `otm-screenshots/10`):

> "Left filter rail with collapsible accordions (Player / Tier / Series / Set / Parallel / Price range / Serial range / Listed-only toggle). EXPORT button top-left of grid. Table rows: circle-thumb-then-set-then-tier shape (small thumbnail circle + set name + tier chip + serial badge + player name + lowest-ask + 24h delta + listing count). Sort headers clickable, sort indicator visible. Persistent URL state on every filter + sort change. Lock-count badge per row when applicable."

### NFL All Day search (sibling Dapper product — `nfl-all-day/search.png`):

Used as a SECONDARY check on visual hygiene (Dapper's own newer pattern is the reference for typography + spacing + color in the Top Shot family).

### What we add (doctrine compliance):

- **Parallels-first row decoration** (§P5): every row shows which parallel (Base / Diamond / Anthology / etc.) — not aggregated.
- **Default 30D window** on the top chart strip (§P7).
- **🆕 NEW DROP opportunity framing** (§P8): rows where `circulation > 0` AND `listings = 0` render with NewDropTag — invitation, not absence.
- **Faithful floor display** (§P1): vanity 1-of-1 asks counted; no median-sale-as-default; no smoothing.

### What we reject:

- "Trending" / "Hot Now" / "Featured Drops" UI banners — pitch-deck framing on a trader instrument.
- True Value column (an opaque valuation model). Doctrine §P1.
- Hero card carousel above the grid — uses fold real-estate that should go to the chart strip.

---

## §3 — Data prerequisites (Loop A dependencies)

| Data | Source | Status | Loop A dep? |
|---|---|---|---|
| `moments` row data (3.5M rows) | already populated | ✅ | not blocking |
| `moments.listing_price_usd` filter | partial population (318,885 of 3.5M have listing prices) | ✅ usable | not blocking |
| `moments.tier_name`, `moments.player_name`, `moments.set_name` | populated | ✅ | not blocking |
| Parallel breakdown per row | `editions.parallel_id` collapsed to 0 (Base only) | ⚠️ partial | Loop A §P2.1 (sibling editions ETL) — ship with "Base" tag only until §P2.1; render parallel column as ghost when not Base |
| Sales volume / median price / active listings — top chart strip data | derive from `transactions` + `moments` joined; needs `mv_market_summary_30d` (already exists per Supabase schema) | ✅ | not blocking |
| 24h delta per row | derive from `mv_player_market_cap` or new `mv_moment_24h_delta` (doesn't exist) | ⚠️ | DERIVATIVE — Loop A §P3 work; ship without 24h delta column until then |
| Lowest-ask history per row (for sparkline) | `market_caps` 6.1M rows | ✅ derivable but EXPENSIVE per row | needs caching or new MV — ship without per-row sparkline in V1; add in DEEPENING |

**Critical-path Loop A blockers:** none. /moments can ship before any Loop A gap closes. Sibling-parallels (§P2.1) and per-moment 24h delta (§P3 DERIVATIVE) are nice-to-have-not-blocking.

**Earliest ship:** as soon as Loop B kicks off (Loop A handoff signal fires) AND /players has shipped (sequencing per Loop B prompt §8).

---

## §4 — Persona acceptance text (J1 verbatim)

> *"I want to find a listing that's mispriced. I open /moments, filter by Player='Victor Wembanyama' + Tier='Common' + max-Price=$30, sort by listing price ascending, see the cheap end of the market, click into the cheapest one with a serial below 1000. Total time: under 30 seconds."*

**Pass criteria (J1):**
- `/moments` loads with filterable grid in **under 3 seconds**
- Player + Tier + max-Price filters accessible **without scrolling**
- The cheapest matching listing is **clickable**
- The detail page renders with hero image, current ask, recent sale history ✅ (per §P2 — drill must work)

**Header subtitle (per §P6 paraphrase = code smell):** *"Filter. Sort. Snipe."*

---

## §5 — Chart cuts per cookbook §6 + §8

**Top chart strip (above the filter+grid — addresses §0.1 graph-first):**

| # | Chart card | Cookbook reference | Data source |
|---|---|---|---|
| 1 | **SalesVolumeStrip** — daily sales volume sparkline (30D default) | clone `TotalOverTimeChart.tsx` shape | `mv_market_summary_30d` |
| 2 | **MedianPriceStrip** — daily median sale price sparkline | new — sparkline | `transactions` grouped by day, median of `gross_amount_usd` |
| 3 | **ActiveListingsCountStrip** — daily count of `moments.moment_status = 'listed'` | new — sparkline | `moments` listed_at over time |

All three in a single row, 4-col-span each, ~80px tall (sparkline-only, no axes). Glanceable trend before the user enters the grid.

**Main surface (the OTM-signature filter+grid):**

| # | Block | Reference | Notes |
|---|---|---|---|
| 4 | **Left filter rail** (sticky, collapsible) | clone OTM screenshot 10 | Player / Tier / Series / Set / Parallel / Price range / Serial range / Listed-only / Burned-only |
| 5 | **Grid header**: EXPORT button + result count + sort dropdown | clone OTM | sort: lowest_ask asc / desc / serial / recent_sale / 24h_delta |
| 6 | **Grid rows** (~30-50 above fold) | clone OTM + parallel decoration | circle-thumb + set + tier + parallel-chip + serial + player + ask + 24h-delta + listings |
| 7 | **Pagination** (Link-based, not nuqs shallow) | clone /market-cap pattern | page=N in URL state |
| 8 | **MethodologyFooter** | reuse | n/a |

---

## §6 — Data layer design

`lib/supabase/queries/moments-landing.ts`:

```ts
export type MomentsLandingData = {
  topStrip: { volumeSeries: SparkPoint[]; medianSeries: SparkPoint[]; listingsSeries: SparkPoint[] };
  filterOptions: { players: string[]; tiers: string[]; series: string[]; sets: string[]; parallels: string[] };
  rows: MomentRow[];      // up to 50 per page
  totalCount: number;
};

export async function fetchMomentsLanding(filter: MomentsFilter, sort: SortKey, page: number): Promise<MomentsLandingData> {
  const sb = supabaseAdmin();
  const offset = (page - 1) * 50;

  const baseQuery = sb.from("moments").select("*, editions(*, parallel_types(*)), players(*)", { count: "exact" });
  // apply filters
  if (filter.playerId) baseQuery.eq("player_id", filter.playerId);
  if (filter.tierId) baseQuery.eq("tier_id", filter.tierId);
  if (filter.maxPrice) baseQuery.lte("listing_price_usd", filter.maxPrice);
  // ...

  const [rows, top, filters] = await Promise.all([
    baseQuery.order(sort.field, { ascending: sort.ascending }).range(offset, offset + 49),
    fetchTopStripSeries(sb, 30),   // last 30 days
    fetchFilterOptions(sb),
  ]);

  return shape(rows, top, filters);
}
```

**Key invariants:**
- `count: 'exact'` for pagination total (PostgREST Range-Unit header pattern)
- Filter joins on editions for parallel_id; on players for player_name
- Sort field validated against allowlist (no SQL-injection-by-URL)
- 50 rows per page (PostgREST hard cap is 1000; we're well under)

---

## §7 — URL state design

```ts
// lib/moments/filter.ts
export type MomentsFilter = {
  playerId?: string;
  tierId?: number;          // 1=common, 2=rare, 3=legendary, 4=ultimate
  seriesNumber?: number;
  setId?: string;
  parallelId?: number;
  maxPriceUsd?: number;
  minSerial?: number;
  maxSerial?: number;
  listedOnly?: boolean;
  burnedOnly?: boolean;
};

export type MomentsSort = "ask_asc" | "ask_desc" | "serial_asc" | "recent_sale" | "delta_24h";

export function parseFilter(searchParams: Record<string,string>): MomentsFilter { /* ... */ }
```

Example URL: `/moments?player=victor-wembanyama&tier=1&maxPrice=30&sort=ask_asc&page=1`

Every filter chip is a Link with the URL param appended/removed. Server component re-runs. No client state.

---

## §8 — Verification (B1-B8 axes)

| Axis | /moments target |
|---|---|
| **B1. Vision-diff fidelity** | ≥ 8 vs `otm-screenshots/10-filterable-moments-grid.png` |
| **B2. Data substance** | ≥ 30 grid rows render with real data; no skeleton; chart strip has 3 sparklines with real points |
| **B3. Interactivity** | Every filter/sort/pagination URL-stateful; in-URL filter set + sort + page round-trips |
| **B4. Doctrine** | P1 (faithful), P2 (graph strip + grid), P5 (parallel column), P7 (30D default), P8 (NewDropTag on empty rows) |
| **B5. Density** | ≥ 30 rows above fold; filter rail has all 9 facets; chart strip ≥ 90 data points combined |
| **B6. Perf+a11y** | LCP < 2.5s (grid is the LCP element); ≥ 80 perf / ≥ 95 a11y |
| **B7. Cross-vendor** | PASS via gpt-5.5 against OTM10 + signature-move text |
| **B8. CEO signal** | ✓ vote |

---

## §9 — Risk assessment

1. **`listing_price_usd` filter on 3.5M moments without an index → slow.** First page load could be 5s+. → Ensure migration includes `CREATE INDEX moments_listing_price_idx ON topshot.moments (listing_price_usd) WHERE listing_price_usd IS NOT NULL` (the partial-index pattern from `research/wiki/gotchas/nulls-last-qualifier-defeats-partial-index.md`). Match the existing /market-cap query pattern.

2. **Filter combinatorial explosion** — many filter combinations have 0 results. → Handle the empty state with §P8 framing: "No moments match. Try removing the price filter." Not "no results."

3. **Parallel column shows "Base" for all rows until Loop A §P2.1.** → Document in MethodologyFooter: "Sibling parallels (Diamond, Anthology, etc.) pending — see Loop A status." Doctrine §P1 honest-reflection compatible.

4. **The 24h delta column requires data we don't have per-moment.** → Ship without the column in V1 OR derive at query time from `mv_player_market_cap` (player-level proxy). Cookbook §10 anti-pattern #6 ("chart paths rendering flat") applies — don't ship a column that's always blank.

5. **EXPORT button on /moments will be expensive** (export 1000+ rows of moments). → Defer EXPORT to DEEPENING iter; ship the button visually but with "Coming soon" disabled state. Wait — doctrine §P1 rejects "Coming Soon" on load-bearing routes. → Either skip EXPORT in V1 (no button visible) OR ship a working CSV-of-current-page export only.

---

## §10 — Kickoff readiness

When ALL true:
- [ ] Loop A handoff signal fired
- [ ] `/players` shipped (sequenced before `/moments` per Loop B prompt §8)
- [ ] Roham redlines on this brief
- [ ] EXPORT scope decision: ship-V1-page-only OR skip-V1 (you decide)
- [ ] 24h delta column decision: ship-without OR derive-from-mv (you decide)

Loop B Researcher reads this → writes `loop-b-2-research.md` → Builder applies → vision-judge + gpt-5.5 → /admin/review.

---

*Committed at: `research/iterations/loop-b-prep-moments.md`. Awaiting Roham redlines.*
