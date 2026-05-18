# Loop B Prep — Phase A: /market-cap Deepening

**Status:** Pre-Loop-B brief. **Phase A target — THE FIRST Loop B iter** per Roham Q2 = A-then-B.
**Persona acceptance:** /market-cap is already the V6 reference benchmark. Phase A's job is to make it Polymarket-grade across every axis.
**Primary comparables:** Polymarket cards-grid landing (doctrine §0.1; capture pending) + Card Ladder Pro dashboard (`research/comparables/card-ladder-pro/dashboard-00.png`) + Glassnode-style supply concentration (cookbook §6 group 3).
**Sequencing:** Phase A → Phase B requires `/market-cap` weighted_overall ≥ 90 AND Roham types `/promote-to-phase-b`.

---

## §1 — What Phase A is NOT

Phase A is NOT a redesign. The V6 /market-cap surface is at "holy shit, that's done" grade per the V6 handover. Phase A is **deepening** — additive iteration to close the remaining gaps, NOT rewriting what exists.

Out of scope:
- Replacing the existing 8 chart components
- Changing the page-level layout (chart-card-grid + drill stays)
- Removing the floor↔avg-sale toggle or window toggle
- Rebuilding the data layer

In scope:
- Adding new chart cuts (more dimensions; market cap by X for X not yet covered)
- Adding drill-down targets for each chart card (V6 ships placeholder `drillHref` — Phase A wires them up)
- Polymarket-style cards-grid for the top mover row (the V6 MoversCardGrid is meme-coin-styled; Polymarket is calmer probability-card style — A/B candidate)
- Vision-diff against Polymarket to identify remaining gaps
- Sub-time-windows per chart (each chart card can independently override the page-level window for its data)
- Better empty-state framing on placeholder parallels (§P8 NEW DROP)
- 90D mover MV once Loop A §P1.2 closes (currently blocked)

---

## §2 — V6 state assessment + what to add

Reading the V6 handover §6 reveals what /market-cap shipped:

| V6 component | State | Phase A action |
|---|---|---|
| `TopPlayersChart.tsx` | ✅ shipped | Verify against Polymarket card-grid — add per-card mini-sparkline (Polymarket signature move) |
| `ByTierChart.tsx` | ✅ shipped | Add sub-time-window toggle (chart-level, not page-level) |
| `ByParallelChart.tsx` | ✅ shipped with placeholder rows | Once Loop A §P2.1 lands, real parallels populate; until then, keep §P8 NEW DROP framing |
| `TopSetsChart.tsx` | ✅ shipped | Add drill-down (clicking a set row goes to /set/[id] — but /set/[id] doesn't exist yet; defer drill to Phase B) |
| `ByTeamTreemap.tsx` | ✅ shipped | Add per-team hover-detail panel with top 3 players from that team |
| `TotalOverTimeChart.tsx` | ✅ shipped, 28-month series | Add NYT-Upshot-style annotations on key events (e.g., "Wemby debut Oct 2024") — doctrine §0.2 NYT mention |
| `MoversCardGrid.tsx` | ✅ shipped meme-coin styled | **A/B test**: keep meme-coin style OR shift to Polymarket cards-grid (Roham votes) |
| `ConcentrationChart.tsx` | ✅ shipped with 50%/80% reference lines | Add Gini coefficient as KPI tile + per-tier concentration sub-chart |

**New chart cuts to add (~5 more):**

| New chart | Cookbook group | Data source |
|---|---|---|
| **Mcap by Serial Band** — bar chart showing total mcap held in serial #1-100 vs #101-1000 vs #1001+ | distribution | `moments.serial_number` × `market_caps` |
| **Mcap by Player Tenure** — bar chart by how long the player's been in the league (rookie / 2-4yr / 5-9yr / vet 10+yr) | distribution | `players` joined `moments` + `market_caps` |
| **Top-10 Player Share Over Time** — line chart of "% of total mcap held by top 10 players" over 28 months | time series | derive from `mv_player_market_cap_daily` (needs Loop A DERIVATIVE) — V1 ships with daily aggregation from `market_caps` |
| **Listings-to-Burns Ratio Over Time** — line chart of `listings / burns` per day | time series | `moments` joined with timestamps |
| **24h Activity Heatmap** — calendar heatmap of daily volume (GitHub-contribution-style) for last 365 days | time series | `transactions` grouped by day |

That brings /market-cap to **13 chart cards** total. Cookbook §6 named 8 as the canonical count; 13 is acceptable on a /market-cap-deepening surface because it IS the doctrine §P9 anchor surface — depth before breadth.

---

## §3 — Polymarket vision-diff (the load-bearing fidelity check)

**Status:** we don't have a Polymarket capture in the repo. Loop B iter 0 / Phase A iter 0 first task: **capture Polymarket landing page**. Either:
1. Roham screenshots polymarket.com home (current state) and drops the PNG in `research/comparables/polymarket/landing.png`
2. Loop B uses Playwright headless to capture the page (WebFetch had Cloudflare 403 on some sites; check if Polymarket allows)

The vision-judge against the captured Polymarket landing then scores fidelity for /market-cap. Target: ≥ 8.

**What to look for in the diff:**
- Card-grid layout with per-card probability sparkline (Polymarket signature)
- Tablez of bet markets as second-click (mirrors our chart-as-hero, table-as-drill)
- Density: ~12-15 bet-cards above the fold
- Color: green/red probability indicators

Expected gaps the vision-judge will surface:
- Our cards may be too text-heavy at the top (Polymarket has minimal text per card; chart IS the card)
- Our hover-detail may be missing
- Our 24H tab may default behavior differs from Polymarket (Polymarket defaults to "now" probability)

---

## §4 — Persona acceptance (the J* mapping)

/market-cap doesn't have a single canonical J* journey in `pro-trader.md` — it's the cross-cutting market view. The applicable persona vocabulary:

- *"Floor / depth at $X above floor"* (J1 + J4)
- *"Circulation breakdown — Owned / Listings / Locked / In Pack / Locker / Burned"* (J4)
- *"Comparable serial — #1-100 is a different market from #5000-10000"* (J1 + J4)
- *"Parallels — same play, different parallel = different edition = different market (never aggregate)"* (J1 + J4 + every persona surface)

**Header subtitle (§P6):** *"Faithful floor. Parallels first. No median sale. No True Value."*

---

## §5 — Sub-time-windows per chart card (new pattern)

Currently `/market-cap` has a single page-level window toggle (15D / 30D / 90D) for movers, and a separate `?mcap=` for floor/avg-sale.

**New pattern:** each chart card has its own time-window override:
- Page-level window: default 30D
- Per-chart-card override: if set, that chart uses its own window
- URL state: `?w=30d&topPlayersW=90d&conc=1y` etc.

**Why:** sometimes a trader wants TOP PLAYERS at 90D and CONCENTRATION at 1Y in the same view. Polymarket allows per-card time on the bet-card. Adds density without cluttering page-level.

**Implementation:** extend `lib/market-cap/mcap-formula.ts` to parse per-chart overrides; each ChartCard accepts an optional `windowOverride` prop.

---

## §6 — Drill-down resolution

V6 ships ChartCard primitives with `drillHref` and `drillPending` props. /market-cap's chart cards currently have a mix:
- `TopPlayersChart` → `/players?sort=mcap_desc` (works once Phase B ships /players)
- `MoversCardGrid` → `/players?sort=mover_30d_desc` (works once /players ships)
- `ByTierChart` → no current drill target; could go to `/moments?tier=X`
- `ByParallelChart` → no current drill target; could go to `/parallels` (but that route is broken from V5)
- `TopSetsChart` → `/set/[id]` (per row — works once Phase B /sets ships)
- `ByTeamTreemap` → `/team/[id]` (route doesn't exist; defer)
- `TotalOverTimeChart` → no drill (it IS the deepest view); show methodology footer link instead
- `ConcentrationChart` → `/players?sort=mcap_desc` (top-N table view)
- (5 new charts) — each needs `drillHref` per cookbook §3

**Phase A action:** wire `drillHref` for every chart card. Where the target route doesn't exist yet, set `drillPending = true` (honest absence per doctrine §P8). Phase B opens those routes.

---

## §7 — Verification (B1-B8)

| Axis | Phase A /market-cap target |
|---|---|
| **B1. Vision-diff** | ≥ 8 vs Polymarket landing (once captured) |
| **B2. Data substance** | All 13 chart cards render real data; ≥ 200 numeric cells above fold; ConcentrationChart has filled Gini KPI |
| **B3. Interactivity** | Page-level window + per-chart window overrides + mcap toggle all URL-stateful; every drillHref either works or shows `drillPending` |
| **B4. Doctrine** | P1 (faithful), P2 (graphs first), P5 (parallels surfaced — even as ghost), P7 (30D default), P8 (NEW DROP on empty parallels), P9 (THIS IS the market-cap-first scope) |
| **B5. Density** | 13 chart cards visible across ≤ 2 fold heights |
| **B6. Perf+a11y** | LCP < 2.5s (same as V6 baseline) |
| **B7. Cross-vendor** | PASS via gpt-5.5 against Polymarket + Card Ladder + doctrine |
| **B8. CEO signal** | ✓ vote — when Roham votes ✓ on Phase A complete, `/promote-to-phase-b` fires |

---

## §8 — Risk assessment

1. **Polymarket capture missing.** First iter 0 of Phase A must capture it. Without it, B1 is structural-text-only (lower confidence). → Surface this as a dependency on Roham (paste a PNG) OR have iter 0 attempt Playwright capture.

2. **`drillPending` proliferation** — wiring all 13 chart cards to drillHrefs when most Phase B routes don't exist yet means most show `drillPending`. → That's fine per doctrine §P8 (honest absence framing). The CTA copy on `drillPending` is "Coming in Phase B" — neutral, not marketing.

3. **Per-chart window override URL bloat** — `?w=30d&topPlayersW=90d&conc=1y` URLs get long. → Use short param names; document the schema in MethodologyFooter; consider URL-shortening for shareable links in DEEPENING.

4. **Concentration KPI Gini coefficient calculation** — straightforward but needs the Lorenz curve data. Should be cached/MV'd. → V1 ships with on-the-fly Gini calc from `mv_player_market_cap`; promote to MV in DEEPENING if perf hits.

5. **A/B between meme-coin movers and Polymarket-style movers** — Roham's call. Default: keep meme-coin styling (it shipped in V6 and Roham didn't redline); add Polymarket-style as a `?moverStyle=polymarket` URL toggle for A/B.

---

## §9 — Phase A → Phase B promotion criteria

Phase A is complete when:
- All 13 chart cards render real data (or honest-absence per §P8)
- Polymarket vision-diff scores ≥ 8
- gpt-5.5 verifies PASS
- Roham votes ✓ via /admin/review
- Then Roham types `/promote-to-phase-b` in any /admin/review comment

That fires Loop B to start Phase B iter 1 = /players (per `loop-b-prep-players.md`).

---

## §10 — Iter sequencing for Phase A

Phase A is itself a sequence of small iters (5-8 expected):

1. **iter 0** — Capture Polymarket. Establish baseline vision-diff against current /market-cap.
2. **iter 1** — Add `Mcap by Serial Band` chart card.
3. **iter 2** — Add `Mcap by Player Tenure` chart card.
4. **iter 3** — Add `Top-10 Player Share Over Time` time series (uses on-the-fly aggregation; promotes to MV later).
5. **iter 4** — Add `Listings-to-Burns Ratio Over Time`.
6. **iter 5** — Add `24h Activity Heatmap`.
7. **iter 6** — Wire `drillPending` for all chart cards + per-chart window overrides.
8. **iter 7** — Polymarket vision-diff polish iter — close remaining gaps from B1 verdict.
9. **iter 8 (optional)** — A/B mover-style toggle if Roham wants it.

Each iter follows the normal Loop B per-iter loop per `loop-b.md §2`.

Estimated wall clock: 8 iters × ~45-90min each = 6-12 hours of Loop B compute. Plus Roham vote latency.

---

*Committed at: `research/iterations/loop-b-prep-phase-a-marketcap-deepening.md`. This is THE first brief Loop B reads when handoff fires.*
