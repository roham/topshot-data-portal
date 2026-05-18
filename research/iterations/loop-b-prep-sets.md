# Loop B Prep — `/sets` Page Brief

**Status:** Pre-Loop-B brief. Phase B target #3 (after /players, /moments).
**Persona acceptance:** J5 Set Completion (verbatim from `pro-trader.md`).
**Primary comparable:** Card Ladder Pro per-category index (`research/comparables/card-ladder-pro/dashboard-02.png` — Star Wars index shape). Secondary: OTM set completion histogram (`research/otm-screenshots/07-set-completion-histogram.png`). Tertiary: PSA Set Registry concept (doctrine §0.2; no captures, just structural reference).

---

## §1 — Target page + scope

**Two routes ship together:**

1. **`/sets` (listing)** — Card-Ladder-Pro-style listing of all sets. Dense rows: set name + series + tier mix + total mcap + 30D Δ% + completion-rarity. Sort by mcap default. Filter rail: series / tier mix / completion-difficulty.

2. **`/set/[id]` (detail)** — per-set dashboard. Card-Ladder-Pro `dashboard-02` STATS shape PLUS the OTM-canonical completion histogram. KPIs + hero chart + completion distribution + per-moment list.

Both ship together. Per §P2 the drill must work.

**Out of scope (defer):**
- "Most complete collectors of this set" leaderboard — needs `moments.owner_flow_address` (Loop A §P0.1) — defer to first DEEPENING iter after owner data lands
- Challenge-mode set tracking (Top Shot's `challenges` API) — defer; needs new ETL
- Set-completion-cost calculator ("how much to complete from your current position") — depends on owner data; defer

---

## §2 — Primary comparable + signature moves

### Card Ladder per-category (`dashboard-02` Star Wars index — the canonical /set/[id] port):

> "Header: set name + small logo. Tabs: STATS | MOMENTS (Card Ladder has STATS | CARDS). LEFT column under STATS: INDEX DATA — 8 KPIs in 2-col grid (Starting Value / Current Value / Rate of Growth +96.75% green / Real Value Change +25,542 green / Low Value / High Value / Average Value / Total Moments). RIGHT: hero line chart, daily index total over time, ~3-6 month default range, time-range pill selector (3 months / 6 months / 1Y / ALL). BELOW: SALES VOLUME section with 5 KPIs (Low Daily Volume / High / Average / # Sales 24H / Market Cap) + chart of daily volume."

### OTM set completion histogram (`otm-screenshots/07` — the J5 canonical):

> "Histogram with completion-count on x-axis (0/56, 1/56, ..., 56/56), user-count on y-axis. Bar chart with descending right-skew (most users have few completed; rare full-completions form the right tail). Sourced from mv_set_completion_distribution. Hover shows exact count. Click bar → drill to leaderboard of users at that completion level (deferred)."

### PSA Set Registry concept (doctrine §0.2 — structural reference, no capture):

> "Set completion as game mechanic. Per-set leaderboard of collectors by completion %. Pop-by-grade equivalent (we use circulation-by-tier-and-parallel)."

### What we add (doctrine compliance):

- **Parallels-first surfacing** (§P5): each set's tier-breakdown chart treats Base / Diamond / Anthology / etc. as separate stack segments.
- **Default 30D** time range on hero chart (§P7).
- **🆕 NEW DROP framing on empty completion bars** (§P8): if `0/N` completions exist, render with positive framing — "🆕 First completion available."
- **Floor/avg-sale toggle** at page level.

### What we reject:

- "Trending sets" / "Featured collections" UI banners.
- True Value across the set (opaque valuation aggregation).
- Hero card carousel of set thumbnails (uses fold real-estate that should go to STATS + hero chart).

---

## §3 — Data prerequisites

| Data | Source | Status | Loop A dep? |
|---|---|---|---|
| `sets` table (268 rows) | populated | ✅ | not blocking |
| `mv_set_completion_distribution` | exists per Supabase schema dump | ✅ | not blocking |
| `mv_set_24h_activity` | exists | ✅ | not blocking |
| Set-level market cap over time | needs new `mv_set_market_cap_daily` (per-set, per-day) | ❌ missing | Loop A DERIVATIVE (~1.5hr) |
| Set-level sales volume over time | needs new `mv_set_daily_volume` | ❌ missing | Loop A DERIVATIVE (~1hr, similar to player MV) |
| Tier-mix breakdown per set | derive at query time from `editions` joined to `moments` | ✅ derivable | not blocking |
| Completion-rarity per set (% of users at full completion) | derive from `mv_set_completion_distribution` | ✅ | not blocking |
| Per-set "completion-cost-to-finish" | requires owner data | ❌ | Loop A §P0.1 — DEFERRED, not in V1 |

**Critical-path Loop A blockers for V1:** `mv_set_market_cap_daily` + `mv_set_daily_volume` (both DERIVATIVE — same shape as the player MVs in Loop A §P1.2 backlog). Either Loop A adds these to its scope OR we ship V1 with the hero chart using set-level aggregations of `market_caps` directly (slower but functional). Default to the latter; promote to MV after first DEEPENING.

---

## §4 — Persona acceptance (J5 verbatim)

> *"I want to see how many users have completed the WNBA: Best of 2021 set. I open /set/<id>, see a completion histogram: X users at 56/56, Y users at 55/56, descending. I know how rare full completion is."*

**Pass criteria (J5):**
- Histogram renders with completion-count on x-axis, user-count on y-axis ✅
- Data sourced from `mv_set_completion_distribution` ✅
- Honest-absence message if data unavailable, not silent zero ✅ (per §P1)

**Header subtitle (§P6):** *"Track who's closest to completion. Snipe the gap."*

---

## §5 — Chart cuts per cookbook §6 + §8

### `/sets` listing (graph-first landing with leaderboard density):

| # | Chart card | Cookbook reference | Data source |
|---|---|---|---|
| 1 | **TopSetsByMcapChart** | clone `TopSetsChart.tsx` (already exists!) | `sets` joined `market_caps` aggregate |
| 2 | **SetsByTierMixChart** — stacked bar showing tier composition per set | new — stacked bar | `sets` joined `editions.tier_id` |
| 3 | **CompletionRarityScatter** — x: total moments, y: % at 100% complete | new — scatter | `mv_set_completion_distribution` |
| 4 | **TopSetsBy30dVolume** — bar chart of recent activity | clone shape of `TopPlayersChart.tsx` | `mv_set_24h_activity` |
| 5 | **SetsBySeriesTreemap** — series 1, 2, 3, 4, WNBA, etc., proportional area | new — treemap | `sets.series_name` × total mcap |
| 6 | **NewestSets** — recently-released | new — card grid (4 columns) | `sets` sorted by `created_at` desc, top 8 |
| 7 | **AllSetsLeaderboard** — dense table, ~30 rows above fold | clone `dashboard-04` shape | sets with mcap, tier mix sparkline, completion rarity |
| 8 | **MethodologyFooter** | reuse | n/a |

### `/set/[id]` detail (Bloomberg-tier drill):

| # | Block | Reference | Notes |
|---|---|---|---|
| 1 | Set header: name + series + thumbnail + tier mix chip-row | clone `dashboard-02` | full-width |
| 2 | Tab nav: STATS | MOMENTS (defer MOMENTS) | shadcn tabs | |
| 3 | INDEX DATA KPI grid (8 cells) | clone `dashboard-02` STATS | total mcap, 30D Δ%, total moments minted, total burned, low ask, high ask, avg sale, completion-rarity-pctile |
| 4 | Hero mcap-over-time chart | new `SetMcapOverTime.tsx` | needs daily MV OR aggregate query |
| 5 | Time-range pills | clone `MoverWindowToggle.tsx` Link-based | default 30D |
| 6 | **CompletionHistogram** — J5 canonical | clone `otm-screenshots/07` shape — bar chart | `mv_set_completion_distribution` |
| 7 | SALES VOLUME section: 5 KPIs + chart | clone `dashboard-02` SALES VOLUME | |
| 8 | TierMixBreakdown — donut or horizontal-stacked-bar | new | editions in this set grouped by tier_id |
| 9 | ParallelMixBreakdown — same per parallel (per §P5) | new | editions × parallel_id (placeholder if sibling parallels not in DB yet) |
| 10 | Recent activity feed — last 20 transactions in this set | derive from `transactions` joined `moments.set_id` | last 20 with /moment/[id] link |
| 11 | MethodologyFooter | reuse | n/a |

---

## §6 — Data layer design

`lib/supabase/queries/sets-landing.ts`:

```ts
export async function fetchSetsLanding(formula: SetsFormula): Promise<SetsLandingData> {
  const sb = supabaseAdmin();
  const [setsAggregated, completionRarity, tierMix, leaderboard, ...] = await Promise.all([
    // top sets by mcap
    pagedFetch(sb.from("sets").select("*, editions(*, market_caps(market_cap))"), 500, 100),
    sb.from("mv_set_completion_distribution").select("*"),
    sb.from("editions").select("set_id, tier_id, count").group("set_id, tier_id"),
    // ...
  ]);
  return shape(...);
}
```

`lib/supabase/queries/set-detail.ts`:

```ts
export async function fetchSetDetail(setId: string, formula: SetDetailFormula): Promise<SetDetailData> {
  const sb = supabaseAdmin();
  const [set, completion, tierMix, parallelMix, mcSeries, salesSeries, recentTx] = await Promise.all([
    sb.from("sets").select("*").eq("set_id", setId).maybeSingle(),
    sb.from("mv_set_completion_distribution").select("*").eq("set_id", setId),
    // ... etc
  ]);
  return shape(...);
}
```

---

## §7 — URL state

```ts
export type SetsFormula = {
  mcap: "floor" | "avg_sale";
  window: "30d" | "90d" | "1y" | "all";
  sort: "mcap_desc" | "activity_desc" | "completion_rarity_desc" | "name_asc";
  series?: number;
  tierFilter: "all" | "common-heavy" | "ultimate-only" | "mixed";
};

export type SetDetailFormula = {
  mcap: "floor" | "avg_sale";
  window: "30d" | "90d" | "1y" | "all";
  tab: "stats" | "moments";
};
```

Example: `/sets?mcap=avg_sale&sort=completion_rarity_desc&series=4`

---

## §8 — Verification (B1-B8)

| Axis | /sets listing | /set/[id] detail |
|---|---|---|
| **B1. Vision-diff** | ≥ 8 vs `dashboard-04` (basketball list shape) | ≥ 8 vs `dashboard-02` (star wars index) + ≥ 8 vs `otm-screenshots/07` for histogram block |
| **B2. Data substance** | ≥ 30 leaderboard rows + 7 chart cards rendered | KPI grid filled, histogram has ≥ 5 bars, hero chart ≥ 30 points |
| **B3. Interactivity** | Filter rail + sort + window toggle URL-stateful | Tab nav + window toggle + mcap toggle URL-stateful |
| **B4. Doctrine** | P1, P2, P5 (parallel mix chart), P6 (J5 verbatim), P7 (30D), P8 (NEW DROP on 0-completion bars) | same |
| **B5. Density** | ≥ 30 leaderboard rows above fold | ≥ 80 data points across KPI + hero + histogram + tier-mix |
| **B6. Perf+a11y** | LCP < 2.5s, a11y ≥ 95 | same |
| **B7. Cross-vendor** | PASS | PASS |
| **B8. CEO signal** | ✓ vote | ✓ vote |

---

## §9 — Risk assessment

1. **`mv_set_market_cap_daily` doesn't exist** → ship V1 with on-the-fly aggregation of `market_caps` per set. Slow (~3-5s) but works. After ship, add MV in DEEPENING.

2. **CompletionHistogram has only 268 sets × N bars** — bars per set may be sparse. If a set has 56 moments and only 5 completion levels populated (e.g., only users at 12/56, 28/56, 40/56, 55/56, 56/56), render the gaps with the §P8 framing: "🆕 First completion at 13/56 available."

3. **TierMixBreakdown collapses across parallels** until Loop A §P2.1. → Render as Base-only stacked-bar with disclosure; doctrine §P1 honest-reflection compatible.

4. **Set names not normalized** — some sets in BQ source have weird casing (`set_name = "WNBA: Best of 2021"` vs `"wnba best of 2021"`). → Use `set_name` verbatim; let URL-slug be a separate column derived in our ETL.

5. **Sorting by `completion_rarity_desc`** requires joining `mv_set_completion_distribution` to count "users at 100%" per set. If the MV doesn't include that aggregate, derive at query time (cheap — only 268 sets).

---

## §10 — Kickoff readiness

- [ ] Loop A handoff signal fired
- [ ] /players + /moments shipped (sequenced before /sets per Loop B prompt §8)
- [ ] Decision: ship V1 with on-the-fly mcap aggregation OR wait for `mv_set_market_cap_daily` — **default: ship V1 with on-the-fly; promote to MV in DEEPENING**
- [ ] Roham redlines

---

*Committed at: `research/iterations/loop-b-prep-sets.md`.*
