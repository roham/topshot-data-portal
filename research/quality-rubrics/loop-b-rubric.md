# Loop B — Multi-Axis Quality Rubric (Visualization & Design)

**Status:** Load-bearing for the Loop B orchestration. Every iteration grades itself against these axes BEFORE declaring complete.
**Inheritance:** Inverts the V4 "Playwright journey passes" single-axis failure. Eight of eleven V4 features shipped passing-but-broken because the judge accepted "honest empty state" as PASS. This rubric makes that failure structurally impossible.

The V6 /market-cap surface IS the reference benchmark. Loop B's job is to produce work that scores ≥ /market-cap-grade across every axis.

---

## §1 — The eight axes

| Axis | Question it answers | How it's measured | Pass threshold | Weight |
|---|---|---|---|---|
| **B1. Visual fidelity to comparable** | Does the rendered page port the specific signature move from its named comparable? | Vision-diff: rendered page screenshot side-by-side with comparable screenshot. Claude Sonnet 4.5 (vision) scores 1–10 + lists specific gaps. | Score ≥ 7. All P0 gaps from doctrine §0 closed. | 25% |
| **B2. Data substance** | Does the page render real data on a resolved data-bearing entity? | DOM substance assertion: count of rendered numeric cells; check for placeholder/skeleton class names; verify chart paths have real coords (not flat or fixture). | All charts on the page render real data. No "Coming Soon" / "—" / "0.00%" without baseline. Per V4 wiki gotcha `judge-journeys-must-assert-data-rendered.md`. | 20% |
| **B3. Interactivity completeness** | Are all filters, toggles, time-windows actually functional + URL-state-aware? | Playwright journey: click each interactive element, assert URL updates, assert server re-renders, assert DOM delta. | 100% of interactive elements on the page change rendered data. URL state captures every filter / sort / time-window. `<Link>` or `shallow: false` on every nuqs usage. | 15% |
| **B4. Doctrine compliance** | Does the page honor every applicable doctrine principle? | Manual checklist vs. doctrine §1 (P1–P9). Auto-checks where possible (default 30D check; parallel-aware checks; opportunity-framing on empties). | All doctrine principles applicable to the page = PASS. Specific anti-patterns (median-sale anywhere; parallel-collapse; 24H defaults; "Coming Soon"; marketing copy) = 0 occurrences. | 15% |
| **B5. Layout density (Bloomberg grade on drill, Polymarket grade on landing)** | Does the page deliver the right information density for its level? | Data points per visible area (above-the-fold). Comparable benchmark from the named comparable. | Landing: ≥ comparable density. Drill: Bloomberg-tier (80–120 data points per visible panel). Whitespace is not the feature. | 10% |
| **B6. Performance + a11y** | Does the page meet web vital + a11y minimums? | Lighthouse run on production build. axe-core scan. | Lighthouse perf ≥ 80. a11y ≥ 95. LCP < 2.5s. CLS < 0.1. INP < 200ms. | 5% |
| **B7. Cross-vendor visual review** | Does an INDEPENDENT model agree the page renders well? | OpenAI gpt-5.5 (vision) gets the same screenshots as B1, returns structured verdict. | Cross-vendor PASS + Claude vision-diff PASS = composite PASS. Disagreement = NEEDS-REVIEW (route to Roham via /admin/review). | 5% |
| **B8. CEO taste signal** | Does Roham approve? | `/admin/review` ✓/✗/🎨 vote. | ✓ from Roham OR 7-day rolling approval rate ≥ 55% (lore-vault pattern after Phase 1). | 5% |

**Pass overall:** ≥ 75% weighted score AND B1 ≥ 7 AND B2 = PASS AND B7 = PASS AND (in Phase 1: B8 = ✓).

---

## §2 — Per-comparable signature moves (B1 detail)

Each page in scope cites ONE primary comparable + ports its specific signature move. The vision-judge tests against the comparable screenshot.

### Landing pages (graph-first canon per doctrine §0.1)

| Page | Primary comparable | Signature move | Screenshot path |
|---|---|---|---|
| `/market-cap` (V6 benchmark, already shipped) | Polymarket | "Cards-grid of bet markets, each card with a probability time-series chart prominently. Click a card → market detail with deeper chart + order book. Tables are second-click." | `research/comparables/polymarket/landing.png` (TO CAPTURE) |
| `/players` (Phase B target #1) | Card Ladder Pro | "CL50 / CL100 index chart at top of home. Below: top movers as cards with sparklines. Category-index charts. Tables in second-click." | `research/comparables/card-ladder-pro/landing.png` (TO CAPTURE) |
| `/moments` (Phase B target #2) | OTM landing | "Top gainers/losers cards each with a sparkline. Index charts. Featured market summary cards. The information IS chart-first." | `research/otm-screenshots/10-filterable-moments-grid.png` |
| `/sets` (Phase B target #3) | Card Ladder Pro categories | "Category-index charts — each set is a category." | `research/comparables/card-ladder-pro/categories.png` (TO CAPTURE) |
| `/u/[username]` (Phase B target #4) | OTM Bag / evaluate.market portfolio | "Multi-wallet portfolio with floor + my-acquired + unrealized P&L, EXPORT button." | TO CAPTURE |

### Drill-down surfaces (density canon per doctrine §0.2)

| Surface | Primary comparable | Signature move | Screenshot path |
|---|---|---|---|
| `/moment/[id]` | **dapper.market** (the new Dapper site — we have a capture) + OTM detail | 3D holographic card render center; dense right panel with parallel selector, price tiers, activity tabs; activity timeline with set-context cards | `research/comparables/dapper-market/moment-detail-15340.png` ✅ |
| `/player/[id]` | Bloomberg Terminal | Density on drill-down screens (80–120 data points per panel); function-code grammar; keyboard-first navigation; tabular numeric monospace; sub-200ms transitions | TO CAPTURE |
| `/edition/[id]` | StockX + Tensor | Size-as-market-segmenter (each parallel = its own market); depth chart (cumulative listings + bids by price) | TO CAPTURE |
| `/set/[id]` | PSA Set Registry | Set completion as game mechanic; per-set leaderboard | TO CAPTURE |
| Pack tracker | OTM Sniper (deceased) | Continuous scan-for-mispricing surface with TRANSPARENT, EDITABLE rules engine | `research/otm-screenshots/05-pack-tracker-whats-left.png` |
| Set completion | OTM histogram | Histogram with completion-count on x-axis, user-count on y-axis | `research/otm-screenshots/07-set-completion-histogram.png` |

**Comparable capture is a Loop B Phase 0 task:** before any page enters scope, its primary comparable must have a screenshot in `research/comparables/<name>/`. Loop B will refuse to grade a page whose comparable isn't captured.

---

## §3 — Vision-judge prompt template (B1)

```
You are an expert visual design reviewer evaluating whether a portal page faithfully ports the signature move from its named comparable.

INPUTS:
- COMPARABLE SCREENSHOT: <attached image: research/comparables/<name>/<file>.png>
- COMPARABLE NAME: <e.g., "Polymarket landing page">
- SIGNATURE MOVE TO PORT: <verbatim from §2 of loop-b-rubric.md — e.g., "Cards-grid of bet markets, each card with a probability time-series chart prominently. Click a card → market detail.">
- RENDERED PAGE SCREENSHOT: <attached image of our portal page>
- PAGE URL: <e.g., https://topshot-data-portal.vercel.app/players>

TASK:
Compare the rendered page to the comparable. Identify:
1. Does the rendered page PORT THE SIGNATURE MOVE? (Y/N)
2. Visual fidelity score on a 1–10 scale (10 = indistinguishable adaptation; 7 = recognizable port; 4 = inspired-by but missing key moves; 1 = nothing in common).
3. Specific gaps: what moves from the comparable are MISSING on the rendered page? List each.
4. Specific extras: what's on the rendered page that doesn't belong (off-doctrine additions, marketing copy, etc.)?
5. Density verdict: does the rendered page meet the comparable's data density?

OUTPUT (JSON only, no prose):
{
  "ports_signature_move": true|false,
  "fidelity_score": <1-10>,
  "gaps": [{ "what": "...", "severity": "P0|P1|P2", "specific_fix": "..." }],
  "extras_to_remove": [{ "what": "...", "reason": "..." }],
  "density_verdict": "below|matches|exceeds",
  "doctrine_violations": [{ "principle": "P1..P9", "what_breaks_it": "..." }],
  "verdict": "PASS|FAIL|NEEDS-WORK",
  "would_ship": true|false,
  "one_line_summary": "..."
}

Pass criteria: ports_signature_move = true AND fidelity_score ≥ 7 AND density_verdict ∈ {matches, exceeds} AND zero P0 gaps AND zero doctrine_violations.

Be specific. Do not say "looks good." Cite specific elements: header positioning, chart style, color palette, typography hierarchy, button affordance, filter rail behavior. Say which exact OTM/Polymarket/etc. element is missing. The portal cannot improve without specific feedback.
```

This prompt is invoked by the orchestrator after each Loop B iteration ships. Output is parsed; if FAIL, the iteration re-dispatches to its builder with the gaps as input.

---

## §4 — Cross-vendor (gpt-5.5) review for Loop B

Mirror of Loop A's cross-vendor pattern, with viz-specific inputs:

```
You are an independent visual design reviewer. A different model (Claude Sonnet 4.5) has already reviewed this page; your job is to verify or override.

INPUTS:
- Same as the Claude vision-judge (comparable screenshot, signature move, rendered page screenshot, URL)
- CLAUDE's VERDICT JSON: <paste the Claude vision-judge output>

TASK:
1. Do you AGREE with Claude's fidelity_score? If not, what would you score it?
2. Did Claude MISS any gaps? List them with severity.
3. Did Claude FABRICATE any gaps (i.e., claim a gap exists that doesn't)? List them.
4. Independent verdict: PASS / FAIL / NEEDS-WORK.
5. If your verdict differs from Claude's, what's the load-bearing reason?

OUTPUT (JSON):
{
  "agree_with_claude": true|false,
  "your_score": <1-10>,
  "missed_gaps": [{ "what": "...", "severity": "..." }],
  "fabricated_gaps": [{ "what": "...", "why_wrong": "..." }],
  "verdict": "PASS|FAIL|NEEDS-WORK",
  "disagreement_reason": "..." | null
}
```

**Decision logic:**
- Both PASS → composite PASS, ship.
- Both FAIL → composite FAIL, re-dispatch builder.
- One PASS, one FAIL → composite NEEDS-WORK, escalate to /admin/review for Roham (CEO break-tie).

---

## §5 — DOM substance check (B2 detail)

Before vision-judge runs, a deterministic substance check parses the rendered DOM. This kills the V4 "honest empty state passes" failure shape.

```js
// Loop B substance probe (Playwright)
async function assertSubstance(page, feature) {
  // 1. Numeric cell count — should be >= feature.expectedNumericCells (e.g., 50 for a market cap chart page)
  const numericCells = await page.locator('[data-testid*="num"]:not(:empty), .tabular-nums:not(:empty)').count();
  if (numericCells < feature.expectedNumericCells) {
    return { pass: false, reason: `numeric cell count ${numericCells} < expected ${feature.expectedNumericCells}` };
  }

  // 2. No placeholder / skeleton class names present
  const placeholderCount = await page.locator('.skeleton, .placeholder, [aria-busy="true"]').count();
  if (placeholderCount > 0) {
    return { pass: false, reason: `${placeholderCount} placeholder/skeleton elements still rendered` };
  }

  // 3. No "Coming Soon" / "—" / "0.00%" without context
  const comingSoonCount = await page.locator('text=/Coming Soon|Coming soon|TBA|Get Started/').count();
  if (comingSoonCount > 0) {
    return { pass: false, reason: `${comingSoonCount} "Coming Soon"-class strings detected` };
  }

  // 4. Chart path lengths — each <svg path> on the page should have substantive d="" content (not flat, not single-point)
  const flatPaths = await page.locator('svg path').evaluateAll(paths =>
    paths.filter(p => {
      const d = p.getAttribute('d');
      return d && d.length < 30; // flat or single-point paths
    }).length
  );
  if (flatPaths > 0) {
    return { pass: false, reason: `${flatPaths} chart paths render flat/single-point (likely empty data)` };
  }

  return { pass: true };
}
```

A page with B2 = FAIL cannot proceed to B1 (vision-judge). The page is structurally not data-bearing.

---

## §6 — Multi-track selection rule for Loop B

| Priority | Track | Trigger condition |
|---|---|---|
| 1 | **BUILD-FAILING** | `npm run build` returns non-zero. Fix first. |
| 2 | **VISION-DIFF-FAIL** | Any shipped page has Claude vision-judge FAIL within last 72h. Re-build to close gaps. |
| 3 | **CROSS-VENDOR-DISAGREE** | Cross-vendor verdict differs from Claude verdict. Re-investigate. |
| 4 | **CEO-CORRECTIVE** | `/admin/review` has any ✗ vote on a Loop B page within last 72h. Repair. |
| 5 | **TASTE-PASS** | `/admin/review` has any 🎨 vote (taste pass needed). Re-shape per comment. |
| 6 | **DERIVATIVE** | Phase B page not yet built (sequenced: /players → /moments → /sets → /u/[username]). Build per /market-cap pattern. |
| 7 | **DEEPENING** | All Phase B pages shipped + cleared. Add more chart cuts to existing surfaces per doctrine §9. |
| 8 | **META** | Same fail-shape 3 consecutive iterations OR no CEO vote 72h. Pause, re-research. |

---

## §7 — Tier model (Loop B)

| Role | Model |
|---|---|
| Orchestrator | Claude Opus 4.7 |
| Researcher (per page) | Claude Sonnet 4.5 |
| Builder (per page) | Claude Sonnet 4.5 |
| Mechanical (lint, typecheck, build, deploy) | Node tooling — no LLM |
| DOM substance prober | Haiku (programmatic; Playwright wrapper) |
| Vision-judge | Claude Sonnet 4.5 (vision) |
| Cross-vendor reviewer | OpenAI gpt-5.5 (vision) |
| Quality reviewer (Stage 2) | Claude Opus 4.7 |

---

## §8 — Loop B's file ownership

Loop B writes:
- `app/**` (page routes)
- `components/**` (chart components, primitives)
- `lib/supabase/queries/**` (data-layer functions consumed by pages)
- `lib/chart-palette.ts`, `lib/market-cap/**` (shared chart primitives)
- `e2e/**` + `loop/judge/journeys/**` (vision-diff + DOM substance journeys)

Loop B does NOT write:
- `scripts/etl/**` (Loop A territory)
- `supabase/migrations/**` (Loop A territory; Loop B reads, never writes)
- `research/data-schema/**` (Loop A territory)
- `research/doctrine.md` (CEO + Opus territory)

If Loop B encounters a data shape that requires a migration, it files a request to Loop A via `loop/v7/state/loop-b-requests-loop-a.jsonl` and pauses the affected page until Loop A satisfies.

---

*This rubric supersedes the V5 single-axis judge model for Loop B's artifacts. Six independent axes + cross-vendor + CEO signal = the corrective for V4's Goodhart's-law convergence.*
