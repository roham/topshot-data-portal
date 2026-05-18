# Loop B Prep — `/players` Page Brief

**Status:** Pre-Loop-B research brief. Loop B has NOT kicked off yet (waiting on Loop A handoff signal). This brief is the input Loop B's Researcher will consume when it dispatches `/players` as Phase B target #1.

**Author:** Dexter, 2026-05-18
**Awaiting Roham redlines on:** chart cut priority order; vision-diff target score; data dependencies cut.

---

## §1 — Target page + scope

**Two routes, sequenced:**

1. **`/players` (listing)** — graph-first directory. Card-Ladder-Pro-Basketball-page pattern (`dashboard-04`). Dense scannable list of all players with key stats per row + sparkline. Above the fold: 30-row table. Click row → drill to detail.

2. **`/player/[id]` (detail)** — per-player dashboard. Card-Ladder-Pro-Star-Wars-Index pattern (`dashboard-02`). KPI grid + hero market-cap chart + secondary sales-volume chart + recent activity feed.

Both ship together in the same Loop B iteration. Listing without working drill-down violates doctrine §P2 (graphs first, density on drill — the drill must be REAL, not a 404).

**Out of scope (defer to later iter):**
- /player/[id] sub-tabs beyond STATS (Card Ladder has CARDS tab; our equivalent would be MOMENTS — defer)
- Compare-players multi-select (Card Ladder's COMPARE feature) — defer to /compare route
- Watchlist integration — defer

---

## §2 — Primary comparable + signature move

**Comparable:** Card Ladder Pro `/index/<category>` and `/index/basketball` (the listing) — captures in `research/comparables/card-ladder-pro/dashboard-{00,02,04,...}.png`.

**Signature moves to port verbatim:**

### For `/players` listing (clone `dashboard-04` basketball list):

> "Dense list of cards [→ players for us]. Each row: thumbnail (small, circular) + descriptor block (year + brand + player + grade — for us: player name + position + team) + Last Sold column ($18.00k, monospace) + Value column (our market cap, monospace) + Score column (our 30D Δ%, with green up-arrow or red down-arrow indicator). Tabular numeric, monospace. Many rows fit per page — ~25-30 above the fold. Filter rail collapsed by default."

### For `/player/[id]` detail (clone `dashboard-02` index page):

> "Header: PLAYER NAME large + photo (we use Top Shot's `player_image_url` or fallback to team logo). Tabs: STATS | MOMENTS (Card Ladder has STATS | CARDS). STATS tab below: LEFT column has INDEX DATA — 8 KPI cells in 2 columns (Starting Value / Current Value / Rate of Growth / Real Value Change / Low Value / High Value / Average Value / Total Moments). RIGHT (or right of KPI block): hero line chart, ~300px tall, market cap over time (default 90D; toggle 30D / 90D / 1Y / ALL). Below: SALES VOLUME section, similar shape — 5 KPIs (Low Daily Volume / High Daily Volume / Average Daily Volume / # Sales 24h / Market Cap) + chart of daily volume."

### What Card Ladder is missing that we add (doctrine compliance):

- **Parallels surfaced per player.** Card Ladder lumps all cards; we MUST break by parallel per doctrine §P5. Add a "Mcap by parallel" stacked-area chart OR a "Top moments by parallel" mini-table on the detail page.
- **Default 30D, not 24H** (doctrine §P7). Card Ladder defaults to 24h on some surfaces; we default to 30D.
- **Floor / avg-sale mcap toggle** at the page level (we already have this on /market-cap; reuse `McapFormulaToggle`).

### What we don't port (rejects):

- Card Ladder's "CL Value Accuracy" KPI (a confidence metric on their proprietary True Value engine). Doctrine §P1 rejects opaque valuations. We don't ship a True Value engine; we don't ship its accuracy metric.
- "POTENTIAL PROFIT" framing in the collection block. Speculative; doctrine rejects pitch-deck framing on instrument surfaces.
- Newsfeed "LADDER HEADLINES" sub-section on the dashboard. Off-doctrine for the trader instrument.

---

## §3 — Data prerequisites (Loop A dependencies)

For the listing AND detail to render with substance, the following Supabase data must be in place:

| Data | Source | Status | Loop A dep? |
|---|---|---|---|
| `mv_player_market_cap` | already exists (1,275 rows, $82M attributed) | ✅ usable, but only covers ~$82M of $117M total | Loop A §P2.2: address $35M unattributed (not blocking — can ship with footnote) |
| `mv_player_movers_15d/30d` | already exists (667 / 829 rows) | ✅ usable | not blocking |
| `mv_player_movers_90d` | timed out, doesn't exist | ❌ missing | **BLOCKS 90D toggle on detail page** — Loop A §P1.2 |
| Player market-cap over time (per-player time series) | `market_caps` 6.1M rows joined to `editions.player_id` | ✅ derivable but EXPENSIVE on the fly | Probably need a new MV: `mv_player_market_cap_daily` (per-player per-day) — Loop A DERIVATIVE work |
| Player sales-volume over time (per-player) | derived from transactions + moments | ✅ derivable | Needs `mv_player_daily_volume` — Loop A §P1.2 dep |
| 24H/30D/90D delta per player | `mv_player_market_cap` has 24h_pct_change and 30d_pct_change cols; 90D needs the missing MV | mostly ✅ | Loop A §P1.2 |
| Per-player parallel breakdown | NOT YET ORGANIZED | ❌ missing | Loop A §P2.1 sibling-editions ETL must complete first |

**Critical path:** Loop A §P0.1 (owner_flow_address) is NOT a dependency for `/players` — it's only needed for `/u/[username]`. So `/players` can ship as soon as Loop A's §P1.2 (daily-grain MVs) and §P2.2 (player attribution) close.

**Estimated Loop A blockers before /players can ship:**
- §P1.2 `mv_player_daily_volume` + `mv_player_movers_90d` (DERIVATIVE, ~2hr Loop A work)
- §P2.2 player attribution audit + fix for 320 unattributed editions (INVESTIGATE, ~1hr)

**Without sibling parallels (§P2.1, ~3hr work):** ship `/players` with a footnote that the parallel breakdown shows only Base editions until §P2.1 closes. Doctrine compliance partial.

---

## §4 — Persona acceptance text (verbatim from pro-trader.md J3)

> *"I want to know who's the highest market-cap player right now. I open `/players`, see a sorted leaderboard, scan the top 20, and click into a player whose 24h delta is negative to see if there's distribution happening."*

**Pass criteria (from J3):**
- `/players` renders a sortable table with MARKET CAP as a first-class column ✅
- Default sort: market cap DESC ✅
- 24h delta visible per row ✅ (and 30D, 90D per doctrine §P7 default-30D)
- Click-through to `/player/[id]` works and shows non-stub content ✅

**Per doctrine §P6 — paraphrase = code smell:** the page header subtitle on `/players` quotes J3 verbatim: *"Sort the leaderboard. Click a name. Watch the distribution."*

---

## §5 — Chart cuts per the /market-cap cookbook §6 + §8

**`/players` LISTING — graph-first landing (8 cuts):**

| # | Chart card | Cookbook reference | Data source | Notes |
|---|---|---|---|---|
| 1 | **TopPlayersByMcapChart** | clone `TopPlayersChart.tsx` | `mv_player_market_cap` top 20 by floor mcap | hero, full-width row 1 |
| 2 | **MoversCardGrid** | reuse `MoversCardGrid.tsx` | `mv_player_movers_30d` top gainers + losers | full-width row 2, meme-coin style |
| 3 | **ByTierChart** | clone `ByTierChart.tsx` | derive from `mv_player_market_cap` joined to `editions.tier_id` | row 3 left half |
| 4 | **ByTeamTreemap** | clone `ByTeamTreemap.tsx` | `mv_player_market_cap` × `players.last_known_team_id` | row 3 right half |
| 5 | **PositionDistributionChart** (new) | new — bar chart by position | `mv_player_market_cap` × `players.last_known_primary_postion` | row 4 left half |
| 6 | **ActivePlayerCountByTier** (new) | new — bar chart | `editions.tier_id` × `editions.player_id` distinct | row 4 right half |
| 7 | **Top20PlayersTable** (the dense leaderboard) | clone `dashboard-04` shape | `mv_player_market_cap` sorted with sparkline per row | row 5 full-width, ~30 rows; this is the J3-canonical view |
| 8 | **MethodologyFooter** | reuse from /market-cap | n/a — links to doctrine + comparable | footer |

**`/player/[id]` DETAIL — drill-down density (Bloomberg-tier per doctrine §P2):**

| # | Block | Reference | Notes |
|---|---|---|---|
| 1 | Player header: name + photo + team + position + jersey | players + teams | full-width |
| 2 | Tab nav: STATS | MOMENTS | shadcn tabs | MOMENTS defers to later iter |
| 3 | INDEX DATA KPI grid (8 cells) | clone `dashboard-02` STATS column | mv_player_market_cap |
| 4 | Hero market-cap-over-time chart | new `PlayerMcapOverTime.tsx` | needs `mv_player_market_cap_daily` from Loop A |
| 5 | Time-range selector: 30D / 90D / 1Y / ALL | clone `MoverWindowToggle.tsx` Link-based pattern | default 30D per P7 |
| 6 | SALES VOLUME section: 5 KPIs + chart | clone `dashboard-02` SALES VOLUME | needs `mv_player_daily_volume` |
| 7 | "Top moments owned by this player's collectors" — mini-table | derive from moments + transactions | parallel-aware per §P5 |
| 8 | "Recent activity" feed | transactions filtered by moment.player_id | last 20 with link to /moment/[id] |
| 9 | MethodologyFooter | reuse | n/a |

---

## §6 — Data layer design

`lib/supabase/queries/players-landing.ts`:

```ts
export type PlayersLandingData = {
  kpis: { totalPlayers: number; totalMcap: number; topMover30d: { id: string; pct: number } };
  topPlayers: PlayerRow[];   // top 20 by floor mcap
  movers15d: MoverRow[];
  movers30d: MoverRow[];
  movers90d: MoverRow[] | null;  // null until Loop A §P1.2 closes
  byTier: TierBreakdown[];
  byTeam: TeamBreakdown[];
  byPosition: PositionBreakdown[];
  countByTier: { tier: string; count: number }[];
  leaderboard: PlayerRow[];   // top 50 with sparkline data
};

export async function fetchPlayersLanding(formula: PlayersFormula): Promise<PlayersLandingData> {
  const sb = supabaseAdmin();
  const [mc, m15, m30, m90, ...] = await Promise.all([
    pagedFetch(sb.from("mv_player_market_cap").select("*").order("player_market_cap", { ascending: false }), 50000, 1000),
    sb.from("mv_player_movers_15d").select("*"),
    sb.from("mv_player_movers_30d").select("*"),
    sb.from("mv_player_movers_90d").select("*").maybeSingle().catch(() => null),  // null if MV missing
    // ... etc
  ]);
  return shape(mc, m15, m30, m90, ..., formula);
}
```

`lib/supabase/queries/player-detail.ts`:

```ts
export async function fetchPlayerDetail(playerId: string, formula: PlayerDetailFormula): Promise<PlayerDetailData> {
  const sb = supabaseAdmin();
  const [player, mcSeries, salesSeries, recentTx, topMoments, parallelBreakdown] = await Promise.all([
    sb.from("players").select("*").eq("player_id", playerId).maybeSingle(),
    pagedFetch(sb.from("mv_player_market_cap_daily")
      .select("*").eq("player_id", playerId).gte("date", formula.windowStart), 5000, 1000),
    pagedFetch(sb.from("mv_player_daily_volume")
      .select("*").eq("player_id", playerId).gte("date", formula.windowStart), 5000, 1000),
    sb.from("transactions").select("*, moments(*)")
      .eq("moments.player_id", playerId)
      .order("completed_at", { ascending: false })
      .limit(20),
    // ... top moments owned, parallel breakdown
  ]);
  return shape(player, mcSeries, salesSeries, ..., formula);
}
```

**Key invariants (per cookbook):**
- Single `fetchLandingData()` per page (one round-trip)
- `pagedFetch` always for `mv_player_market_cap` (1,275 rows fits, but pattern consistency matters)
- `Promise.all` for parallel queries
- `.order()` deterministic chunking

---

## §7 — URL state design

```ts
// lib/players/formula.ts
export type PlayersFormula = {
  mcap: "floor" | "avg_sale";     // reuse pattern from /market-cap
  window: "30d" | "90d" | "1y";   // default 30D per P7
  sort: "mcap_desc" | "mover_30d_desc" | "name_asc";
  tier: "all" | "common" | "rare" | "legendary" | "ultimate";
  position: "all" | "G" | "F" | "C" | "PG" | "SG" | "SF" | "PF";
};

// Toggles are Link-based, NOT nuqs shallow
// PlayersFormulaToggle.tsx, WindowToggle.tsx, TierFilter.tsx — all use <Link href={...}>
```

```ts
// lib/players/detail-formula.ts
export type PlayerDetailFormula = {
  mcap: "floor" | "avg_sale";
  window: "30d" | "90d" | "1y" | "all";
  tab: "stats" | "moments";  // moments defers to later iter
};
```

**URL state requirements:**
- Every interactive element changes URL params
- Server component re-runs on URL change (no nuqs shallow)
- Sharable URLs: `/players?mcap=avg_sale&window=90d&sort=mover_30d_desc&tier=legendary` is a valid one-link bookmark for a pro

---

## §8 — Verification (Loop B B1-B8 axes)

| Axis | /players listing target | /player/[id] detail target |
|---|---|---|
| **B1. Vision-diff fidelity** | ≥ 8 vs `dashboard-04` (basketball list) | ≥ 8 vs `dashboard-02` (star wars index) |
| **B2. Data substance** | DOM substance probe: ≥ 50 numeric cells, no placeholders, no flat chart paths | ≥ 50 numeric cells in KPI grid + chart points |
| **B3. Interactivity** | mcap toggle / window toggle / tier filter / position filter / sort all change URL + re-render | tab nav / window toggle / mcap toggle all URL-stateful |
| **B4. Doctrine** | P1 (faithful), P2 (graph-first), P3 (cite CL Pro), P5 (parallels surfaced), P6 (J3 verbatim), P7 (default 30D) | same |
| **B5. Density** | ≥ 30 rows visible above fold in leaderboard | ≥ 100 data points visible in KPI grid + chart combined |
| **B6. Perf+a11y** | Lighthouse ≥ 80, a11y ≥ 95, LCP < 2.5s | same |
| **B7. Cross-vendor (gpt-5.5)** | PASS (or NEEDS-WORK with explicit tie-break to Roham) | PASS |
| **B8. CEO signal** | ✓ vote from Roham OR rolling approval ≥ 55% | ✓ vote |

**Composite PASS** = all axes meet threshold AND B1 ≥ 7 AND B2 PASS AND B7 PASS.

---

## §9 — Risk assessment

**Hidden failure modes Loop B's Researcher should guard against:**

1. **Empty `mv_player_market_cap_daily`** — this MV doesn't exist yet. If Loop A hasn't built it, /player/[id] detail will render empty hero chart. → Block /player/[id] until Loop A §P1.2 closes. Ship /players listing first if needed; mark detail "Coming Soon" is doctrine-rejected, so we wait.

2. **Player attribution gap (320 unattributed editions)** — affects 35M of 117M total mcap. The leaderboard will show $82M attributed. → Ship with a methodology-footer disclosure: "$35M of $117M total market cap is across editions not yet attributed to a single player (multi-player highlight reels, etc.)." Doctrine §P1 compatible — honest reflection.

3. **`/player/[id]` route doesn't exist yet** — the V5 loop attempted player-detail variants (the contaminated commits) but those are off-doctrine. Need a clean implementation. → Loop B Researcher should NOT inherit the V5 variant code; start from cookbook.

4. **Parallel breakdown placeholder** — without §P2.1 (sibling editions), the parallel chart shows only Base. → Render as ghost bars with caption "Sibling parallels (Diamond, Anthology, etc.) pending — see Loop A §P2.1." Doctrine-compliant per the pattern set in /market-cap's `ByParallelChart`.

5. **Performance with 1,275 player table render** — sparkline per row × 30 visible rows × 30 data points = 900 SVG paths. → Lazy-render sparklines below the fold (intersection observer) or use sparkline-as-canvas. Cookbook doesn't address this — first new pattern Loop B will need to establish.

---

## §10 — Loop B kickoff readiness checklist

When ALL of these are true, /players can be the first Phase B target:

- [ ] Loop A handoff signal fired (`loop/v7/state/handoff.json` exists)
- [ ] `mv_player_daily_volume` exists (Loop A §P1.2)
- [ ] `mv_player_market_cap_daily` exists (Loop A DERIVATIVE — may need to be added to P2/P3 backlog)
- [ ] `mv_player_movers_90d` exists OR explicitly marked as deferred (Loop A §P1.2)
- [ ] Player attribution audit complete (Loop A §P2.2) — at minimum, the methodology disclosure text is finalized
- [ ] Roham redlines on this brief: chart cut priority, vision-diff target score, deferral decisions

When ready: Loop B Researcher reads this file as primary input, writes `research/iterations/loop-b-1-research.md` (the implementation note), Builder applies, vision-judge runs, gpt-5.5 verifies, /admin/review votes.

---

*Awaiting Roham's redlines before locking. After lock, this becomes the contract Loop B's Researcher reads. Committed at: `research/iterations/loop-b-prep-players.md`.*
