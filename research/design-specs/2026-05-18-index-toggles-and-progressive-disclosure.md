# Spec — Index Toggles + Progressive Disclosure UX (2026-05-18)

**Author:** Design subagent (fresh context).
**Doctrine:** v1.1 §0, §1.P1–P9.
**Audience:** Pro trader-collector (MBL persona). 5% of users → 80% of secondary volume.
**Pre-reqs in repo today:** `TS50IndexHero` on `/` and `/market-cap`; `McapFormulaToggle` (floor vs avg_sale, URL: `?mcap=`); `INDICES` registry already lists TS500 + tier/series/team variants but no Grail; `lib/indices/ts50-synthesizer.ts` is the only synthesized index hooked into the hero.
**Out of scope:** model code, ETL changes, table-drill-down layout (that's its own spec).

---

## §1 — Grail Index — 3 candidate definitions

The Grail Index needs to answer one trader question: *"how is the top of the market doing relative to everything else?"* It is the high-beta, low-float read on Top Shot — the inverse of TS50 (which is the broad-tape index). Three candidates, ranked.

### Candidate A — **Ultimate-Only Grail** (tier-pure)

**Definition.** Value-weighted index across every edition whose tier = `Ultimate`. Same weighting math as TS50 (`w_i = mcap_i / Σ mcap_j`, normalized first-snapshot = 100). Floor or avg-sale per the global mcap toggle (§3).

**Edge cases — well-handled:**
- Tier is a clean, structurally-stable Top Shot taxonomy primitive — no curation drift over time.
- Maps to a real trader mental model ("how are Ultimates trading?") — Ultimates are the closest thing to a Top Shot blue-chip cohort.
- Survives new drops automatically — every new Ultimate joins on its first ETL snapshot.
- Honors P1 (faithful display): if someone lists their 1-of-1 Ultimate at $5M, it counts.

**Edge cases — poorly-handled:**
- Excludes Legendary 1-of-1s, Anthology Anniversary pulls, key playoff Legendaries that the lore treats as grails. A LeBron Cosmic Legendary or a Zion Anthology 1-of-1 is grail-canon even though tier ≠ Ultimate.
- Low circulation count → high single-listing variance. Two Ultimates listed at $5M each can dominate the basket and make the chart unreadable. Mitigation: floor formula already absorbs this; avg-sale formula will look more stable but at the cost of P1 fidelity for thinly-traded Ultimates.
- "Ultimate" is partly an issuance-time tier label; it doesn't fully overlap with what traders *call* grails in Discord.

### Candidate B — **Sub-100 Circulation Grail** (circulation-floor)

**Definition.** Value-weighted index across every edition where `circulationCount ≤ 100`. Same weighting math. The threshold is the trader-canonical scarcity line — "low-pop" in collector vocab maps to ≤100, often ≤25 for the truly thin.

**Edge cases — well-handled:**
- Catches the actual grail surface area: Ultimates (1-of-1 to 99), Legendary Anthology pulls, low-mint Anniversary, special playoff serial-matchers, all the 1-of-1 challenge rewards.
- Definition is *measurable from data we already have* — no curator label needed.
- Naturally re-weights as new low-mint editions ship without manual maintenance.
- Aligns with §1.P5 (parallels are first-class) — a Diamond parallel with circulation 12 IS a different market and IS a grail, regardless of base-tier label.

**Edge cases — poorly-handled:**
- Threshold is a design choice that needs defense (≤100? ≤50? ≤25?). Recommend ≤100 default with an admin-tunable knob; document choice in methodology card per §1.P3.
- Includes a long tail of low-pop *but-not-coveted* editions — e.g., random Common Diamond parallels with circulation 47 that nobody trades — which can dilute the "feels like grail" signal.
- High Σ when one mega-listing exists, since circulation × max-ask × value-weight makes a single moment outweigh dozens of real grails.

### Candidate C — **Curated Grail-12** (community-named, composite-defensible)

**Definition.** A hand-curated basket of 12–20 named "grail editions," locked at index inception with a documented inclusion methodology. The seed list:
1. LeBron — Cosmic dunk (Series 1 Cosmic, the canonical Top Shot grail)
2. Zion — Windmill (Cosmic)
3. Ja Morant — Throwdown (Cosmic)
4. LeBron — Holo Icon (any Ultimate)
5. Giannis — From Way Downtown (Series 1 Holo Icon)
6. Wemby — debut Anthology Ultimate
7. Steph — Logo three (Holo Icon)
8. Kobe tribute (any tier where one exists as 1-of-1)
9. KD — Series 1 Hustle and Show (Cosmic)
10. Luka — Triple-Double (Anthology)
11. Jordan — From the Top, Series 4 (any Ultimate)
12. Joker — Triple-Double Ultimate

(Researcher confirms inclusion against historical sales + Discord grail-threads; locked list ships in research artifact.)

**Same value-weighting math.** Index methodology card cites the inclusion list publicly.

**Edge cases — well-handled:**
- Matches what traders *actually mean* by grails. Highest persona-fit per P6.
- Mirrors PSA Set Registry's curated key-card lists (PSA defines what's "key" per set; we define what's "grail" per the lore).
- Stable basket → readable chart. Low single-listing noise because the basket is curated, not threshold-driven.
- Marketing-grade communicable: "the LeBron Cosmic, the Zion Windmill, the Ja Throwdown…" reads like the S&P 500's component story.

**Edge cases — poorly-handled:**
- Curation = subjective. Violates the spirit of P1 (raw faithful display) at the basket-construction layer, even if intra-basket math is faithful. Defensible only with a published inclusion methodology + governance cadence (rebalance quarterly?).
- Doesn't auto-update for new grails. Wemby's next 1-of-1 isn't in the basket until governance adds it.
- Bootstrap risk: Discord disagreement on what counts. Mitigation: ship V1 of the list with a "methodology" link to the inclusion criteria + a `[propose addition]` button feeding research backlog.

### Recommendation

**Ship B (Sub-100 Circulation Grail) as the default Grail Index. Carry C (Curated Grail-12) as a second-class index visible in the dropdown.** Skip A.

Why:
- **B is most faithful to doctrine.** P1 (raw display), P3 (every page has a comparable — Glassnode's supply-distribution buckets), P4 (parallels first-class). It's a measurable cut of real Top Shot data, no curation required.
- **C is most faithful to the persona.** P6 (trader voice). It reads like the canon. But it requires governance from day one, which is more weight than V1 should carry.
- **A is dominated by B.** Ultimate-only is a strict subset of low-circulation; the thing it adds (the Ultimate label) is a marketing artifact, not a market structure.

Ship-order: Grail (= Sub-100 Circulation) goes live in the hero dropdown alongside TS50. Curated Grail-12 ships in week 2 as `?index=grail-curated` once the inclusion list is reviewed. Don't block on it.

---

## §2 — Multi-index dropdown UX

### The interaction primitive: **segmented pill row, NOT a dropdown**

A dropdown is the wrong primitive for ≤6 indices. It hides the option set behind a click and forces a re-scan every visit. The pro-trader workflow is "TS50, TS50, Grail, TS50, TS50, Custom" — switching is muscle memory and needs to be one-click-no-aim.

**Recommended primitive:** a horizontal segmented pill row sitting in the Card header, replacing the static title `TS50 Index`. Looks like:

```
[ TS50 ] [ Grail ] [ Ultimates ] [ + Custom ]    | "value-weighted · 30d history · as of 2026-05-18"  | [methodology]
```

- Active pill = surface-3 background + foreground text (matches the existing `McapFormulaToggle` styling already in the codebase — same visual grammar means zero new design tokens).
- Inactive pills = text-dim, hover lifts to text + surface-2.
- 11px monospaced data-label tracking — same as the existing toggle.
- `[+ Custom]` is a deferred affordance — open a small popover for custom basket assembly (week 3+; out of scope here, but the slot reserved).

**Where index name lives:** The pill IS the title. The Card's `title` prop is the pill row; `subtitle` becomes the methodology one-liner. No redundancy. Saves vertical pixels for the chart, which is the substance (P4).

**Tabs vs pills vs dropdown — why pills win:**
- **Tabs** carry a content-switch convention (one section's whole body changes). That's actually closer to what we want, but tabs visually compete with the page-level nav and look heavier than this needs to be.
- **Dropdown** loses muscle memory and is worse for ≥3 options. Polymarket uses pills above its category grid for the same reason.
- **Pills** are the OTM-mover-card pattern, the Polymarket category-filter pattern, the TradingView watchlist-tab pattern. Triple-comparable; takes the design decision out of the air.

### Chart animation between indexes

**Hard recommendation: cross-fade with normalized y-axis re-rebase, NOT morph.**

The two indexes are different baskets. A morph implies continuity that doesn't exist — TS50 day 0 ≠ Grail day 0. A morph is a smoothing lie (P1-adjacent).

- On pill click: chart fades out (~120ms), data refetches, chart fades in (~120ms). Total ≤300ms (P pro-trader's <200ms-per-transition bar is for filter-on-table-update; a basket swap that hits the network earns a small budget extension, but cap it at 300ms).
- y-axis re-rebases independently — both indexes are normalized to start = 100, so the y-axis numbers are comparable in shape even if the path is different.
- Time-window selector state persists across index swap (if you're on 90d on TS50, you stay on 90d on Grail).
- KPI strip (latest value, %Δ, basket mcap) hard-cuts to the new values with monospace tabular-nums — no number-roll animation. Pro traders read tabular numbers; rolling digits are decoration (P4).

### Methodology disclosure update

The Card's `methodology` prop is per-index. The `[methodology]` link in the Card header (or a small `(i)` glyph) opens a popover with:
- The verbatim definition (e.g., "Value-weighted, all editions where circulationCount ≤ 100")
- The basket size + last-snapshot timestamp
- The comparable cited (Glassnode supply-distribution for Grail; CL50 for TS50)
- A `[show basket]` link → drill into a table of the constituent editions, weighted (this is the P2 second-click density payoff)

### Default index when arriving fresh

**TS50.** Three reasons:
1. **Onboarding gradient.** TS50 is the "the whole market" read — sets context for a new visitor before they drill into a niche.
2. **Continuity.** Anyone with the page in a tab already sees TS50; quietly swapping their default to Grail would be a hostile change.
3. **Persona match.** MBL's first glance is "is the market up or down today?" — TS50 answers that; Grail answers a narrower follow-up.

Re-evaluate post-launch: if log analytics show >40% of sessions switch to Grail within 5 seconds of landing, flip the default.

### URL state

**`?index=<slug>` is the right shape. No cookie, no localStorage.**

Why:
- Doctrine §P4 mandates URL-shareable chart state. Index choice is chart state.
- Cookies introduce session-non-determinism (link Roham sends to MBL renders different charts in their respective sessions) — that's the OTM-style failure of "you have to be logged in / set up to see what I see."
- nuqs already in the codebase (per `McapFormulaToggle.tsx` comment trail) — use the same param-state pattern. Slugs: `ts50` (default, omitted from URL), `grail`, `grail-curated`, `ultimates`, eventually `custom-<hash>`.

Server component re-render via `<Link>` navigation (same pattern as `McapFormulaToggle` for the same reason — `getTS50Index()` and the equivalent `getGrailIndex()` will live as server-side fetches).

---

## §3 — Avg-sale vs floor toggle — global pattern

### Component shape

**Keep `McapFormulaToggle` as the canonical primitive. Promote it to a global header control.** It's already the right shape (segmented 2-state, URL-bound). Don't introduce a second visual grammar for the same decision.

Two visual upgrades to the existing component:
1. **Add a single character glyph in front of each label** so the toggle is scannable peripherally: `⌄ Low ask | x̄ Avg sale (30d)`. Optional — A/B in dev.
2. **Tighten the label vocabulary** (see naming below).

### Placement

**Sticky in the page-level data-controls strip — top-right of the page, right of breadcrumb / nav.** NOT per-card.

The pro-trader objection to per-card placement: it implies the choice is local; in fact the choice is a *worldview* ("am I looking at listing-side or sale-side data right now?"). Worldview controls live at page level, not card level. Compare: TradingView's timeframe selector is global to the workspace, not per-chart.

For surfaces with mixed cards (e.g., a comparison card showing both formulas side-by-side), the page-level toggle DOES NOT apply to that comparison card — the comparison card overrides explicitly with its own inline label ("Floor vs Avg Sale, last 30d"). One override slot beats per-card chaos.

### Stickiness behavior

- Sticky at top of viewport on scroll, with a `border-bottom` shadow once it's detached from the page header (Apple System Settings pattern — header gets a hairline when scrolled).
- Hides on the moment-detail page and other surfaces where the floor/avg distinction doesn't apply (the toggle should disappear, not gray out — graying out is noise; absence is honest).

### URL state

**`?mcap=floor` (default, omitted) vs `?mcap=avg_sale`.** Already implemented. Don't change.

Persist NOT in cookie. Same reasoning as §2: shareable URLs > stateful sessions. (Doctrine §P4.)

### Behavior on cards showing both metrics

Per above: the global toggle does not apply to explicit comparison cards. Those cards render both regardless and label inline. Examples:
- A "floor vs avg" delta chart that's specifically about the gap — always renders both.
- A two-column table where col 4 = floor mcap, col 5 = avg-sale mcap — always renders both.

The global toggle DOES apply to:
- The TS50/Grail hero (single-value series at a time).
- Per-player market cap tiles.
- Treemap / bar charts of market cap (only one cap formula is rendered).
- Index basket constituent tables.

Rule of thumb: if a card shows ONE mcap value per row/series, the toggle applies. If it shows two side-by-side intentionally, the toggle is overridden inline.

### Default

**Floor.** Doctrine §1.P1 is non-negotiable. Avg-sale is an option; floor is the canon. Document this in the toggle's `title=` attribute so hovering the avg-sale option reveals: "Smoother visualization. Less faithful to current listings. Doctrine default = floor."

### Naming / label

Three candidates I considered:
- "Floor / Avg Sale" — what `McapFormulaToggle` ships today. Accurate but slightly clinical.
- "Listed / Sold" — viscerally clear ("what's listed right now" vs "what actually trades"). Pro-trader native. But "Listed" loses the lowest-ask precision — "Listed" could imply average-listing.
- "Low ask / Avg sale" — the current label in the component code. Closest to MBL's literal voice. Maps 1:1 to the `floor` and `avg_sale` formula names.

**Recommend keep current: `Low ask` / `Avg sale (30d)`.** It's already pro-trader native. The `(30d)` qualifier is load-bearing — without it the avg-sale window is ambiguous. Optional improvement: add a subtitle inside the hover tooltip: `"Low ask = lowest open listing × circulation. Doctrine default."` and `"Avg sale = mean of last 30d sales × circulation. Smoother but not P1-faithful."`

---

## §4 — Clean-first / power-behind-toggle pattern

The doctrine bar: graphs-first landing (§P2), Bloomberg-density second-click (§0.2). The clean surface is for the 0.5-second glance; the density is for the 5-minute session. Both must be one click apart.

### Named comparables (the actual primitives, not vibes)

| Comparable | The specific signature move | What we port |
|---|---|---|
| **Polymarket** market-detail | Probability chart hero; below it, an order book + comment thread that scroll into view. The order book is full Bloomberg-density but invisible above the fold. | Below-the-fold density. The chart fits one viewport; scroll = drill. |
| **Stripe Atlas** dashboard | The page IS a stack of cards, each card a single number with a `details →` link. Click drills into a sub-page with the full table. Nothing on the landing is dense. | The "details →" affordance as the canonical drill action. |
| **Apple System Settings** (Ventura+) | Two-pane layout. Left = curated category list (clean). Right = the dense panel for the selected category, but only ONE panel visible at a time. | The "one dense panel at a time" rule. Don't open 4 drawers at once. |
| **Linear** command palette (Cmd-K) | Press one key, get the entire app's surface area accessible by typing. No menus, no clutter. | A `/` palette as the keyboard-first density entry point. |
| **Notion** slash-menu | Inline contextual menu that surfaces only when you ask for it. Zero footprint when you don't. | The principle: density does not occupy pixels unless invoked. |

### Concrete drawer / disclosure inventory for V6

Three "drawers" exist on a typical market-cap surface. Each is a clean-first card whose density is one click behind.

**1. The "show basket" drawer** (per index hero)
- Affordance: `[show basket]` micro-link in the hero's methodology popover OR a `[N constituents →]` chip in the Card header.
- Behavior: opens an inline expanding panel below the chart (NOT a modal — modals are hostile to pro traders who want to keep the chart visible). The panel is the Bloomberg-density table: ticker, edition, parallel, weight, current floor, 30d %Δ, contribution to index. Sticky header. Sortable.
- Close: same affordance toggles closed. Esc closes.
- URL state: `?basket=open` for shareable density-on view.

**2. The "compare formulas" drawer** (when mcap toggle is engaged)
- Affordance: A tiny `⇆ compare` link beside the global mcap toggle.
- Behavior: instead of switching the page formula, splits the chart into two faint overlaid lines (floor solid, avg_sale dashed). Hover-crosshair (the TradingView-locked-y-axis move) reveals both values at the same x.
- This is the only place the page violates "one mcap formula at a time" — and it's invoked, not default.

**3. The "details" drill** (per chart card)
- Affordance: bottom-right of every chart card: `details →`
- Behavior: navigates to a dedicated drill-down route (`/market-cap/players` from the per-player chart card; `/market-cap/sets` from the per-set treemap, etc.). The drill-down is the Bloomberg surface — filterable table, EXPORT button, keyboard nav. (Per P2 + the OTM-detail-surface canon in §0.2.)
- This is the primary P2 drill path. Every chart card has it.

### Hover / click affordances

- **Hover anywhere on a chart card:** crosshair locks to nearest data point; tooltip shows date, index value, %Δ from start. Cursor changes to crosshair (TradingView-canonical).
- **Hover the methodology popover trigger:** standard pointer; reveals popover on click (not hover — pop-on-hover triggers accidentally during sniping flow).
- **Hover the index pill row:** background lift only; no popover.
- **`/` keyboard:** focuses the global filter / search box (per pro-trader persona — "they live inside the tool"). Out of scope here but the affordance budget reserves the keystroke.
- **`Esc`:** closes any open drawer / popover. Mandatory.
- **`?` key:** opens a keymap cheatsheet popover. Linear-canonical. Defer to week 2.

### Recommended primitives (concrete, namable in code)

1. `<IndexPillRow indexes={INDICES} active={current} />` — the §2 segmented control. Lives in `components/indices/IndexPillRow.tsx`. Replaces the static `title` prop on the `TS50IndexHero` Card.
2. `<GlobalMcapToggle />` — promote `McapFormulaToggle` from `components/market-cap/` to `components/global/` and mount it in the page-level header strip.
3. `<MethodologyPopover content={...} basketHref="..." />` — the consistent `(i)` glyph used on every chart card.
4. `<DrillLink href="/market-cap/players">details →</DrillLink>` — the canonical drill affordance. Standardized link style: 11px mono, accent color, right-aligned in card footer.
5. `<BasketDrawer indexSlug="grail" />` — the inline-expanding constituents panel.

All five primitives are sized small (≤80 LOC each). Each ships with one comparable cited in its component doc-block (per P3).

---

## §5 — Open questions for Roham to decide

1. **Grail definition lock-in for V1.** Recommended: ship Sub-100 Circulation (Candidate B) as the default; queue Curated Grail-12 (C) for week 2. Confirm or pick differently.
2. **Curated Grail-12 inclusion list.** If we ship C, the seed list of 12 names needs your sign-off. Recommend a research artifact + Discord cross-check before going live.
3. **Circulation threshold for Candidate B.** Recommend ≤100. Could be ≤50 (tighter, more grail-feel, smaller basket) or ≤25 (very tight, prone to single-listing volatility). One-line answer is enough.
4. **Default index on fresh arrival.** Recommend TS50. Alternative: Grail (more on-brand, narrower lens). Pick one for ship.
5. **Mcap toggle naming.** Recommend keep `Low ask / Avg sale (30d)`. Open to `Listed / Sold` if you want the more visceral pro-trader voice — but this loses "lowest-ask" precision.
6. **Sticky global mcap toggle vs per-page placement.** Recommend page-level sticky strip. Open to keeping it in the chart card header if global sticky feels too "app-shell-y" for V6's surface-count-of-one scope (§P9).
7. **Compare-formulas drawer (§4 drawer #2).** Useful or feature-creep at V6? My read: useful and cheap; ship behind a feature flag. Confirm.
8. **`/` palette + `?` keymap.** Pro-trader-persona-mandatory long-term. Defer to week 2 vs ship in V6? Recommend defer; in V6 we earn the right via §P9.
9. **Custom-basket affordance (`[+ Custom]` pill).** Reserve the slot in the pill row now even though week 3+? Or hide entirely until built? Recommend reserve the slot — it telegraphs the roadmap and costs nothing.
10. **Animation budget.** 300ms cross-fade on index swap acceptable, or do you want the harder TradingView <200ms cut? Trade-off: hard cut is more pro-trader-faithful; cross-fade is more legible during the actual basket swap. Recommend 300ms cross-fade; defensible because it crosses a network boundary, not a local-filter boundary.
