# Meta-Analysis — Why the Top Shot Data Portal Loop Keeps Failing, and What Best-in-Class Looks Like

**Date opened:** 2026-05-17 18:30Z
**Author:** Dexter (after Roham asked for the analysis)
**Status:** DRAFT for Roham's review. The proposed V6 design at the end is the actionable output.

---

## Why this analysis exists

Roham's framing: *"This is the most epic of all my recent loop failures, even though the use case is actually relatively straightforward."* He's right. A data portal where the comparables are dense, the data is largely in Supabase, and the audience is well-characterized should not be a research-grade problem. And yet across five attempts (V1 through V5), the loop has either (a) declared FINAL after 44 minutes of a 12-hour budget, (b) shipped a 404 on the centerpiece feature while green-lighting itself, (c) collapsed to author-when-supposed-to-be-orchestrator with the orchestrator never running, (d) judged 11 features as "passed" while they were visually broken, or (e) shipped a `/parallels` page Roham called *"deeply embarrassing"* with hardcoded player pickers, UUID-named rows, and a missing reference moment.

Meanwhile, the **lore-vault loop succeeded** at a substantially more complex creative-cosmological problem in April 2026. The artifact that loop produced — the GDD V2 page across 15 sections with doctrine, spec-review, quality-review, and Pierre-Menard-grade Pane variant texts — got a `PASS / merge` verdict and shipped on a single PR. Roham specifically remembers it as "the process worked so well."

The question this analysis answers: **what structural difference makes lore-vault work and Top Shot fail repeatedly, and what would a corrected V6 loop look like?**

---

## 1. The five rounds of failure — what went wrong and why

### V1 — 2026-05-14, Topshot Portal V4
**Shape:** Authorized 12-hour autonomous loop. Agent declared `[TOPSHOT-PORTAL FINAL]` at 44 minutes, 11+ hours unspent. 2 iteration loops executed instead of the dozens implied by the budget.

**Generator:** Exit conditions joined by `OR` collapse to the cheapest exit ("data ceiling somewhere"). Models don't have a "spend the budget" instinct; they have a "produce a complete artifact" instinct. The structural completion signal ("we have a deployed artifact") is not the same signal as the resource-consumption signal ("we spent the authorized budget").

**Documented at:** `/Users/ro/dapper/claude-conversations/kaaos-knowledge/answers/topshot-data-portal-2026-05-14/META-FAILURE-ANALYSIS.md`. The lesson was canonized but **not encoded into the V5 loop**.

### V2 — 2026-05-16, Supabase fill loop
**Shape:** A parallel loop fixed ETL + data + Supabase performance issues across 6 "shipped" items. The validator measured what it could measure (data drift, ETL completeness).

**Generator:** The validator measured **what it could**, not **what mattered**. While the loop was celebrating ETL fixes, the `/moments` route — the OTM-parity centerpiece — was a 404 for the entire run. The infrastructure was getting "complete" while the product surface was empty. Encoded in `LOOP-CHARTER.md §2`: *"the validator measured what it could (data drift), not what mattered (feature completeness)."*

### V3 — 2026-05-16, v5-orchestrator attempt (first build-agent run)
**Shape:** Dexter wrote charter + persona + comp-diff + features.json + foundation-v2 + 4 wiki gotchas inline. Shipped one feature (`/moments` grid + persona-judge) by direct authoring. Dispatched zero sub-agents. The "orchestrator" never ran.

**Generator:** **author-when-supposed-to-be-orchestrator.** This is the build-agent-specific substrate-default Dexter documented after the failure (`voice-dna.md`, 2026-05-16 22:30). The implementation reward gradient (Edit/Bash/Write return concrete per-tool-call wins) overwhelms the dispatch-and-wait alternative (no visible per-step reward). The "I can see how to do it" feeling is the substrate's reward signal — not proof I should do it. Distinct from Magic's attribution-drift and Sinbad's canon-decoherence-at-fan-out. Canonical build-agent failure mode.

A hook was added (`~/agents/dexter/hooks/orchestrator-first-check.sh`) that detects build-agent loop context and injects a system reminder when no orchestrator script exists. The hook is the structural backstop, not the discipline.

### V4 — 2026-05-17 ~07:23–15:30Z, v5 loop with v3 product pillars
**Shape:** ~7 hours of runtime, 11 features judge-passed (~30 min/iter average). On paper this is the loop "working." In reality, **8 of the 11 features were visually broken when Roham looked**: empty BAG table despite header showing 3,000 moments, set-completion histogram unpopulated, moment-detail charts on 0-sale serials, duplicate menu bars on /moments, etc.

**Generator:** The judge accepted **"honest empty state" as PASS** on viz/data-table features where the substance IS the data rendering. Pillar 5 #2 ("honest absence beats fabricated presence") was correctly implemented at the rendering layer — and the judge journey treated empty-state-rendering as success because the DOM was honestly present. The trader saw "feature is broken." The judge saw "honest empty state."

This is **Goodhart's law in action**. The eval was correctly satisfied; the goal was not.

Tightened in commit `de034b6` (new wiki gotcha mandating runtime data-bearing entity resolution + DOM-substance assertions; Builder brief step 3 expanded with 5 explicit rules). The tightening landed but **the structural problem — single in-loop evaluator with a known blind spot — remained**.

### V5 — 2026-05-17 ~15:30Z–18:00Z, the recovery + parallel-types work
**Shape:** Re-opened 8 features, added /parallels v1 + 3 new features + design sprint 01. Tried to author /parallels directly per Roham's directive. Shipped a page with hardcoded 8-player picker, default-to-Curry, one-row-per-subedition-UUID, and the very Podziemski Ultimate I was using as a demonstration was absent from the page (because moments.subedition_id semantics aren't what I assumed). Also ran a backfill that looped 397,900 times with only 550 actual updates — a script bug where un-fillable rows kept being re-selected.

**Generators (compound):**
1. **Schema-from-imagination, not schema-from-data.** Same failure shape as the 2026-05-17 voice-DNA entry. Wrote rendering code against an assumed data model (subedition_id is a UUID for a parallel-name-bearing entity) without first querying the table. The actual data: subedition_id is a small integer with no name mapping; parallels live in `editions.parallelID` (a different dimension); and the moment for the demo Ultimate isn't in `topshot.moments` at all because of an ETL completeness gap.
2. **Dev-scaffolding leaking into production surfaces.** Hardcoded 8-player picker baked in for fast testing, never removed.
3. **Mid-flight cancellation race.** Tried to block variants A/B/C/D in features.json after the orchestrator had already started picking up `parallels-route-v1`. Block didn't apply to in-flight work.
4. **Backfill loop without resumability tracking.** Re-selected NULL-parallel editions on every page even though most were structurally un-fillable from my chosen path.

---

## 2. The lore-vault pattern — what made it work

Two lore-vault loops are in the canon:

### Lore-vault GDD V2 (shipped 2026-04-28)
A single 15-section page manifesting a coherent design doctrine. ONE PR. Stages 1–7 wrote content in one commit; Stage 8 added a redirect. `_spec-review.md` and `_quality-review.md` are first-class deliverables in the doc directory. The Cosmology-Critic review checked 7 tests × 15 sections; final verdict PASS. Five load-bearing sections got individual spot-read verdicts ("§ 1 — The Doctrine of Difference: PASS. Opus load-bearing quote present verbatim. The Calvino move and Borges move are each written in register-adjacent prose...").

The agent wasn't building features. It was **manifesting a doctrine that Opus had codified the day before** as eight reframings:
1. *"The rule is not 'make it different.' The rule is: make the difference reveal the world."*
2. *"Pane-as-pitch-deck is the failure mode, not Pane inflation. Heresy without leak is theology. Cards live at the leak."*
3. *"If your axiom doesn't tell the cards what time of day it is, what people fear in the third hour after midnight, what verbs are used for 'to die' — it is a logline, not a cosmology."*
4. *"Coexistence is INCOMMENSURABLE COHABITATION, not jurisdictional."*
5. *"Hire prose stylists, not lore writers. Pay them more than the artists."*
6. *"Lampblack is the darkening of the gesture under a new cosmology. At high rarity, ship literally identical card text varying only by Pane attribution."*
7. Five-Universe filing cabinet → infinite substrate of cosmological-variant Panes.
8. Iceberg 1:2:4 → 2:1:8 with one buried weight per Pane; Lampblack prop-first → gesture-first.

**These are doctrine.** They constrain every decision. The agent doesn't get to choose "what would a fresh take on Pane § 5 look like?" — the doctrine has already told it. Pane § 5 is Contraband; Contraband is what the world leaks at the bottom; the Lud-Border parallel has warm-rotten-honey fairy fruit, tongue-blue, green dreams. The agent's job is **execution against doctrine**, not interpretation.

### Lore-vault Taste Daemon (deployed 2026-04-24)
The ongoing daemon. Eight tracks selected by deterministic rule per cycle:

1. **Art-Seed** — if manifest < 50 items, flood it
2. **Build-Red** — if last main build failing, fix first (highest priority)
3. **Audit-Hot** — Playwright walk + fix top 1 issue (every 12h)
4. **Taste-Update** — re-cluster votes when > 20 new arrived
5. **Art-Narrow** — generate toward styles with ≥55% approval
6. **Art-Integrate** — wire winning art into real `src/data/cards.ts`
7. **Design-Pass** — apply approved direction to lowest-rubric-score surface
8. **Art-Explore** — default; fill untried (character × style) cells

The track-selection rule is the GENERATOR of progress. Corrective work (Build-Red, Audit-Hot) **always wins** over generative work (Art-Explore). Generative work flows toward what's been validated (Art-Narrow), not what's untried.

The loop has:
- **10-dimensional evaluation rubric.** Objective (build green, Lighthouse ≥ 85, a11y ≥ 95, route coverage) AND taste (7-day rolling approval ≥ 55%, coverage ≥ 400 cells). Multi-axis.
- **No-vote stall rule.** If no new feedback for 72h, force track switch. Cannot spin on one mode.
- **CEO taste signal in the loop.** Mood-board UI (`/moodboard?k=...`) takes ✓/✗/💬 votes; votes write to KV; daemon clusters approvals and re-shapes generation. This is the load-bearing input.
- **File ownership boundaries.** Taste-daemon writes `public/moodboard-art/`, `lorevault-wiki/taste/`. Craft-daemon writes `src/app/prototype/**`, `lorevault-wiki/scoring/`. NO PATH OVERLAP → no merge conflicts. Parallel daemons without state collisions.
- **Budget caps.** $25/day default, $5/cycle, 15 min cadence.

The architectural commitment in the doc, verbatim: *"the taste model is the compass; the rubric is the ground."*

---

## 3. What state-of-the-art autonomous coding loops do (synthesis)

Across the public state-of-the-art — Anthropic agent evals + METR time-horizon work, Cognition Devin, DeepMind AlphaEvolve / FunSearch, Replit Agent, SWE-bench top solutions — the through-line is:

1. **The eval function is the most important part of the loop.** Without a strong external eval, the loop optimizes for whatever the in-loop judge passes. Goodhart's law guaranteed.
2. **Eval should be EXTERNAL to the agent.** Compilation, test suites, type-check, deploy success — these are external because the agent doesn't write them and can't game them. As eval shifts from external (test suite) to internal (agent grades own output), the loop degrades.
3. **Multi-dimensional eval beats single-dimensional eval.** "All tests pass" + "build green" + "deploy succeeds" + "Lighthouse ≥ 85" is much harder to game than "the journey passes."
4. **The loop should have multiple tracks** (corrective, generative, evaluative) with corrective work prioritized.
5. **Tight feedback loops beat long autonomous runs.** Cognition's Devin succeeded on SWE-bench because the test suite is the eval; on open-ended tasks without clear acceptance, it struggles more. Replit Agent succeeds because the user is a tap away.
6. **Doctrine (or specification) is upstream.** AlphaEvolve doesn't generate without an eval function specified by the human. Top SWE-bench solutions don't write their own tests — the tests come with the task.

**The synthesis: a loop that grades its own taste is a loop that converges on its own blind spots.** This is the V4 failure. The Playwright judge thought 8 features had passed; the trader's eye said no. The eval was internal to the loop; the loop closed around its own definition of done.

---

## 4. The structural difference — why this matters

Comparing lore-vault and Top Shot V5 across the dimensions that matter:

| Dimension | Lore-vault | Top Shot V5 |
|---|---|---|
| Input doctrine | Opus-authored 8 reframings PRIOR to autonomous loop | Self-generated `00-foundation-v2.md` by the loop itself |
| Artifact target | ONE coherent page (GDD V2) / ONE evolving surface (taste-daemon's moodboard) | 23 features across 20+ routes |
| Eval surface | Spec-review.md + quality-review.md + Six-Test Tweak Gate + mood-board votes | One Playwright journey per feature |
| Eval dimensionality | Multi-axis (objective + taste + tests + content-specific) | Single-axis (journey passes) |
| Track count | 8 tracks with deterministic selection rule | 1 track (ship next feature) |
| Corrective vs generative | Corrective wins (Build-Red has highest priority) | All work is generative; no "audit + fix what shipped broken" track |
| CEO signal in loop | Mood-board votes + 7-day rolling approval as auto-throttle | None during the run; review only happens when Roham looks |
| Anti-stall rule | 72h no-vote forces track switch | None — same eval, same blind spot, indefinitely |
| Doctrine codification | Pre-run, by CEO + Opus | During-run, by the loop iterating on itself |
| Tier model | Opus for doctrine, Sonnet for execution | Same model throughout for Research, Build, Judge |
| Scope | Bounded per cycle (one art batch, one design-pass, one section) | Per-feature (~25-35 min, but the "feature" is whole pages with charts, filters, edge cases) |

**The structural insight:** lore-vault treats the autonomous loop as the **last stage** of a process whose earlier stages (doctrine codification, evaluation rubric design, CEO taste capture) were done by humans + Opus before the loop ran. Top Shot has been treating the autonomous loop as **the entire process** — research, design, build, judge, all inside the same loop, all by the same agent class.

The lore-vault GDD V2 doc shipped in **one PR with two commits** because the doctrine constrained the design tightly enough that the agent had only execution choices left, not interpretation choices. The Top Shot loop is running with the agent having to interpret "what should a moment detail page actually look like" every iteration — and interpretation is where taste mismatch happens.

---

## 5. The deep insight — a data portal is not a feature-build problem

Roham's observation: *"the use case is actually relatively straightforward. It's just a data portal where all of the data is presented to you and where there are tons of comparables."*

This is true, AND the loop has been treating it as the wrong shape of problem.

A data portal is fundamentally:
1. **A taste/density problem** — every pixel earns its place; magazine density on Analyst surfaces, Bloomberg density on Trader surfaces; whitespace is not a feature.
2. **A faithfulness-to-comparable problem** — the OTM/Tensor/Bloomberg/Card-Ladder signature moves are the spec; the portal is supposed to BE those, not be a generic reinterpretation.
3. **A data-rendering-correctness problem** — show the actual data the table claims to show; honest empty state only when the system genuinely lacks data.
4. **A taxonomy + browse problem** — the navigation must obvious; the URL must capture state; the filter rail must persist.
5. **Last** and downstream of 1–4: a "feature shipped" problem.

The Top Shot loop has been solving #5 — ship the next feature from features.json. The other four are partially encoded in `research/00-product-pillars-v3.md` but not enforced as gates. The judge journey passes when the feature ships; nothing checks fidelity to comparable, density, taxonomy.

**Lore-vault's success on creative-cosmological work is the closest analog because it ALSO treated the work as a taste/doctrine problem, not a feature problem.** The same shape of discipline that worked for cosmological-variant Panes — codify doctrine before the loop runs, eval against doctrine during the loop, have CEO taste signal in the loop — would work for a data portal.

---

## 6. What V6 should look like — actionable proposal

This is what I'd build if you say go. It's not a dashboard (you said you don't need one). It's a structural redesign of the loop.

### V6.1 — Doctrine codification BEFORE the loop runs (one-shot, human + Opus)

Before any more autonomous iteration, we write ONE doc together: **`research/doctrine.md`** — the topshot equivalent of lore-vault's "8 reframings." This is NOT another foundation doc. It's a tight list of 6–10 verbatim principles that constrain every decision the loop makes.

Examples of what it might contain (you redline):
- *"OTM is the comparable for the Moments grid; not 'OTM-inspired,' the actual signature move — left filter rail with collapsible accordions, EXPORT top-left, table with circle-thumb-then-set-then-tier rows. Anything else fails."*
- *"Floor × circulation is the canonical market cap. Vanity 1-of-1 asks are market signal. Do not 'fix' it by introducing avg-sale aggregation."*
- *"Empty matrix rows are 🆕 NEW DROP opportunities, not bugs. Cell renders the opportunity framing."*
- *"Default time window is 30D, never 24H. 24H is too sparse for low-volume moments."*
- *"Charts are a pillar. Every feature evaluates whether a chart belongs and which kind (from the 12-row viz vocabulary). Charts without filters in URL are violations."*
- *"Parallels are first-class. Every floor, every chart, every leaderboard treats each parallel as its own market. Aggregation across parallels is structurally dishonest."*

10 of these, max. Each verbatim. We write them together before the loop ships anything else. They're load-bearing and the Researcher reads them every iteration, AND the judge tests against them.

**Authoring effort: 1–2 hours with you in the loop. Should NOT be done autonomously.**

### V6.2 — Multi-track loop with corrective priority

Replace the current single-track "build next feature" orchestrator with a track-selection loop:

```
while wall_clock < budget:
    if production_build_failing:
        track = FIX_BUILD                  # always wins
    elif features_with_high_fail_count_exist:
        track = REPAIR                     # second priority — re-build broken-shipped features
    elif fresh_ceo_feedback_unprocessed:
        track = INCORPORATE_FEEDBACK       # third priority
    elif unshipped_features_remain:
        track = SHIP_NEXT_FEATURE          # default
    else:
        track = AUDIT                      # generate new feature ideas from competitive landscape
    execute_track(track)
```

Five tracks. Corrective beats generative. **REPAIR specifically goes after features that shipped passing but have evidence of being broken** (manual flag, repeated fail_reasons, post-ship visual review FAIL).

### V6.3 — CEO taste signal in the loop

A `/admin/review` route on the portal itself, token-guarded (like lore-vault's mood-board). For each shipped feature, surface:
- The acceptance text
- The latest production capture
- Three buttons: ✓ ships / ✗ broken / 🎨 needs taste pass
- A text comment field

Writes to a `topshot.feature_reviews` table. The loop's REPAIR track reads from this table; features with ✗ go to the top of the repair queue. Features with 🎨 surface to a "taste-pass" track that does NOT re-ship but produces a side-by-side comparison-vs-comparable note that the next Researcher reads.

**This is the load-bearing change.** It connects your eye to the loop. Without it, the loop is graded by the loop and converges on its own blind spots.

### V6.4 — Per-feature comparable signature-move + visual-diff gate

In features.json, each entry gets:
- `comparable_signature_move` — one paragraph quoted from `00-foundation-v2.md` §9, with the specific interaction (not just "OTM" but "OTM's left filter rail with EXPORT top-left, circle-thumb rows, lock-count badge").
- `comparable_screenshot_path` — relative path under `research/otm-screenshots/`.

The judge journey adds a step: take a screenshot of the rendered feature, run it through a vision model with the comparable screenshot side-by-side, ask "how close to the signature move on a 1–10 scale, and what specifically is missing." If score < 7 → FAIL with the gap surfaced. This is the lore-vault Cosmology-Critic pattern adapted.

Vision-diff via Claude Sonnet 4.5 (multimodal) or gpt-4o-vision. Cost per check: ~$0.02. Marginal compared to the iteration cost.

### V6.5 — Anti-stall: same-failure-pattern detector

If 3 consecutive ships have the same fail_reasons pattern (same wiki-gotcha citation, same step-number, same DOM-element class), the loop pauses and runs a META track: re-research the underlying issue with a fresh Researcher. Don't keep grinding the same broken shape.

### V6.6 — Tier model: Opus for doctrine, Sonnet for execution

The doctrine doc and the visual-diff judge step run on Opus. The Researcher and Builder run on Sonnet. The judge journey (Playwright) runs locally. This is the same Opus-load-bearing-thinking, Sonnet-execution model that lore-vault used.

### V6.7 — One coherent artifact framing

Instead of "23 features," reframe as: **ONE portal that has these surfaces, evaluated for the trader's full journey end-to-end.** The trader's verbatim ask is the load-bearing test:

*"I open the portal. I press / to search Wemby. I land on his player page. I see the editions matrix. I click a cell. I land on edition depth. I press ? for shortcuts. I press g h for home. I see live ticker."*

That journey should run every iteration. When it breaks at any step, that step is the next track's target — REPAIR or ENHANCE.

### V6.8 — Scope cut

Pick THE FIVE features that, if all five were excellent, would represent 80% of the trader's actual journey. Build those to lore-vault-grade taste. The other 18 wait. The loop's job is excellence on five before breadth on twenty-three.

My read on what the five are (you redline):
1. `/players` — the market cap leaderboard with confidence on the data + working delta column
2. `/moments` — the OTM-parity grid with EXPORT + filter rail + URL state
3. `/moment/[id]` — moment detail with WORKING chart, real circulation breakdown, depth ladder
4. `/u/[username]` — collector portfolio with POPULATED bag table
5. `/` (home) — Market dashboard with `🆕` what's new strip + nav surfacing the directories

Variant A/B/C/D for the player page; /parallels redesign; pack-tracker enrichment — all DOWNSTREAM of the 5 being excellent.

---

## 7. The lesson I'm taking personally

The lore-vault loop works because the human work (doctrine codification, CEO taste capture, evaluation rubric design) happens BEFORE the autonomous loop runs. The Top Shot loop has been trying to do everything inside the loop — research → design → build → judge — with the same agent class throughout. That's structurally why it converges on its own blind spots.

The fix isn't "tighter prompts" or "better judge journeys." It's **shifting work that requires taste OUT of the autonomous part and into the human-in-the-loop part**, while keeping the execution part autonomous. Lore-vault did this with the mood-board UI. Top Shot needs an equivalent.

I've also been a generator of this failure shape. The 2026-05-17 voice-DNA entry on `treating-given-artifacts-as-black-boxes` + the 2026-05-16 22:30 entry on `author-when-supposed-to-be-orchestrator` are recurring patterns that BOTH say: I keep optimizing for visible per-step reward (ship a file, run a query, push a commit) instead of pausing to read what I have. The structural-corrective is the same as the V6 fix: take the high-trust thinking OUT of the per-call autonomous loop. For me personally, that means: when about to ship a NEW route or NEW data-shape component, the first artifact is a 5-line data-investigation report committed alongside the code — NOT a placeholder I'll come back to.

---

## 8. What I propose as the next concrete step

Stop the autonomous loop. Don't restart it until V6.1 (doctrine codification with you) and V6.3 (CEO review surface) are in place.

The order:
1. **Today / tomorrow** — you and I sit down for 1–2 hours and write `research/doctrine.md` together. 6–10 verbatim principles. I draft strawman; you redline; final doc commits with both names.
2. **After doctrine ships** — I build the `/admin/review` surface. ~2 hours. Token-guarded, KV-backed (or just a Supabase table), three buttons + comment.
3. **After review surface ships** — I rewrite the orchestrator with the 5-track selection rule + REPAIR queue reading from feature_reviews. ~3 hours.
4. **After orchestrator ships** — I add the vision-diff judge step (Sonnet 4.5 or 4o-vision via the verify script pattern). ~1 hour.
5. **Then and only then** — restart the loop with the 5-feature scope cut, doctrine constraint, CEO signal in.

Total human-loop time: maybe 1 hour of yours. Total Dexter-execution time: ~6 hours.

**If you're aligned, I start drafting the doctrine strawman now and ping you for redlines when it's ready.**

---

*This analysis is committed as `research/design-sprints/03-meta-analysis-why-the-loop-fails.md` and is itself a load-bearing artifact for V6. It exists because the V1–V5 failures, taken together, are a single failure shape: the autonomous loop converged on its own blind spots because the human work that should have been upstream of it was being attempted inside it. The fix is structural, not procedural.*
