# Loop Charter — Top Shot Data Portal v5 (Dexter-led)

**Purpose:** define the next autonomous build loop's evaluation surface, exit conditions, and division of roles. Authored 2026-05-16 by Dexter to replace the V4 daemon loop. The V4 loop's META-FAILURE-ANALYSIS (`~/dapper/claude-conversations/kaaos-knowledge/answers/topshot-data-portal-2026-05-14/META-FAILURE-ANALYSIS.md`) is the prior lesson this charter encodes.

This document is consulted at the start of every loop turn. When it disagrees with a turn's plan, this wins.

---

## 1. The single question the loop answers

> *Does a Top Shot pro trader land on the production URL, attempt the canonical sniping / portfolio / research journey, and complete it without hitting a `<ComingSoon>`, a 404, a broken time tab, or a value they don't trust?*

Every iteration improves the answer to that question by a measurable delta. Nothing else counts as progress.

---

## 2. What killed the prior loops (encoded so we don't repeat)

From the V4 META-FAILURE (2026-05-14):

- **Exit conditions joined by `OR` collapse to `OR-MIN` under model laziness pressure.** The V4 loop took the cheapest exit ("data ceiling somewhere") at 44 minutes of a 12-hour budget. → This charter uses `AND` for exits and a wall-clock floor.
- **"Looks done" beat "spent the budget."** The model has a complete-artifact instinct, not a consume-budget instinct. → Wall-clock is enforced externally; the loop runner kills sessions at the deadline.
- **Phase counts ≠ scope coverage.** Running Phase 0–8 once is not the same as running iteration loops N times. → Minimum iteration count is a first-class exit condition.

From the 2026-05-16 Supabase-loop handover:

- **The validator measured what it could (data drift), not what mattered (feature completeness).** 6 of 8 data checks failed, but the centerpiece `/moments` route was a 404 the whole time. → Judge evaluates persona journeys end-to-end on the deployed URL, not data correctness.
- **Two parallel loops diverged — neither shipped the goal.** Supabase loop fixed perf + data; V4 builder shipped UI fragments; no shared backlog. → One loop, one backlog (`features.json`), three roles (researcher / builder / judge), sequenced not parallel.
- **`npm run build` ≡ done.** Build pass is not feature completeness. → A feature flag flips only after the judge passes the journey on the deployed URL with a captured screenshot.
- **Infrastructure before product.** ETL, validation, IAM, cron — without the centerpiece grid. → Build user-visible thin slices first; instrument to keep them correct second.

---

## 3. Roles (sequenced, not parallel)

Three roles operate sequentially per turn. Fan-out across creative work decoheres canon (per the Sinbad lesson, `cgs-template-rg/THE-LEARNINGS.md` → `on-canon-decoherence-at-fan-out`). The loop is a state machine, not a multi-agent system.

### Researcher

- Reads the highest-priority unblocked feature in `features.json` (sorted by `priority` ascending where `passes: false` and `blocked: false`).
- Pulls OTM screenshot reference (under `research/otm-screenshots/`), evaluate.market / livetoken.co / collective.xyz current state, Top Shot Discord + r/nbatopshot last 7 days, public-API ceilings from `research/00-foundation-v2.md` §3.
- Outputs a per-feature research note at `research/features/<feature-id>.md`: target customer's verbatim words, the comparable's exact shape, the public-API ceiling that constrains us, recommended thin-slice scope.
- Does NOT write code. Does NOT decide priorities (the backlog already did).

### Builder

- Reads the per-feature research note + the existing codebase (`app/`, `components/`, `lib/`).
- Ships the thinnest possible version that lets a trader complete the canonical journey for that feature.
- Bias toward `topshot.<table>` direct reads over new MVs; bias toward existing components (`Card`, `TierChip`, `Num`, `Sparkline`, `EmptyState`) over new primitives.
- Writes one Playwright journey at `loop/judge/journeys/<feature-id>.spec.ts` that exercises the feature as a trader would.
- Commits + pushes + waits for Vercel deploy. Records the deploy URL in `progress.md` under "current iteration."

### Judge

- Reads the deployed URL (not local). Reads the journey spec.
- Runs the journey via headless Playwright. Captures screenshots at each step into `loop/judge/captures/<feature-id>/<timestamp>/`.
- Renders a vision-grounded report card via a vision-capable model: did the persona complete each step? Compared to the OTM screenshot reference, what's the gap on a 1–10 scale? Captures explicit pass/fail per step.
- If pass: flips `passes: true` and `passes_at: <ISO-8601>` in `features.json`. Appends a one-line entry to `progress.md` under "completed."
- If fail: writes a `loop/judge/reports/<feature-id>-<timestamp>.md` with the specific failure shape (screenshot, error, missing-element selector, narrative). Adds a `fail_reasons: []` entry to the feature's record. **Does NOT flip the flag.**
- The next loop turn re-enters at the researcher with the same feature, now informed by the failure report.

---

## 4. Backlog (`features.json` — the only priority queue)

The shape is documented in `features.json` itself. Rules:

- Every feature has a `passes` flag. **Never editable except by the judge.** The builder does not flip flags. The researcher does not flip flags. Per Anthropic multi-session-progress pattern.
- Every feature has an `acceptance` field — written as a trader task in pro-trader voice ("As a trader, I can filter all moments by player, sort by listing price, and click into a specific listing in under 10 seconds.").
- Every feature has an `otm_parity` flag — does this exist in the OTM reference (true/false/beyond).
- `priority` is integer 1..N where lower = sooner. The OTM-centerpiece (filterable Moments grid) is priority 1.
- A feature may have `blocked: true` if a public-API ceiling or upstream data gap prevents it. Blocked features must cite the ceiling reference. Blocked is NOT terminal — re-evaluate when ceilings change.

---

## 5. Exit conditions (ALL must hold to declare loop-done)

The loop is not done unless ALL of these are true:

- **(A) Wall-clock ≥ 10 hours elapsed** since the loop runner started, OR the runner was explicitly told `--stop`.
- **(B) Every OTM-parity feature has been ATTEMPTED at least once.** Attempted = a researcher note exists at `research/features/<feature-id>.md` AND a builder commit references that feature ID AND a judge ran at least one journey against it.
- **(C) No feature with `priority ≤ 5` AND `otm_parity: true` AND `blocked: false` has `passes: false`.** The top 5 OTM-parity features must pass before exit.

If (A) does not hold: pick the next unblocked feature, run another turn.
If (B) does not hold: a feature has never been touched — touch it before exit.
If (C) does not hold: the OTM-parity centerpiece is incomplete — keep building.

A FINAL commit message is only permitted when all three are true.

---

## 6. Anti-FINAL guard (the prompt-level safeguard)

Before any commit message containing the word `FINAL`, the builder runs:

```
node loop/runner/can-i-finalize.mjs
```

which prints PASS/FAIL on the three exit conditions and the count of attempted vs total features. If FAIL, the commit aborts. (Hook: `.git/hooks/commit-msg` — to be wired in iter-2.)

---

## 7. Persona-judge: what makes it different from the V4 critic

The V4 critic measured data correctness (Spearman correlation of player ranks vs BQ). This judge measures user-task completion:

1. **Opens the deployed URL** (not `localhost`, not the database). Treats it as a black box.
2. **Plays the persona** (pro trader from `research/personas/pro-trader.md`). The journey is written in trader vocabulary — "find a Wemby Common selling for less than $30 with serial below 1000."
3. **Captures the experience** — screenshot per step + DOM snapshot + console errors. Stored under `loop/judge/captures/`.
4. **Grades against the comparable** — vision model reads the captured screenshot side-by-side with the OTM reference (`research/otm-screenshots/`) and scores fidelity 1-10.
5. **Outputs structured pass/fail** — per step, with the failure shape callable from the next research turn.

The judge is the ONLY surface that flips `passes` flags in `features.json`. The judge is the loop's source of truth.

---

## 8. Wiki accretion

Each turn writes durable knowledge to `research/wiki/<category>/<topic>.md` if anything generalizable emerged. Categories:

- `patterns/` — UI patterns we want to reuse (depth ladder, persistent filter rail, time-tab discipline).
- `gotchas/` — Supabase / Next.js / Vercel / Top Shot taxonomy traps. ("`moment_status='LISTED'` is empty — use `listing_price_usd IS NOT NULL` as the canonical 'listed' predicate.")
- `personas/` — every learning about real Top Shot pros (verbatim quotes from Discord, observed behaviors).
- `comparable/` — what OTM, livetoken, evaluate, collective each do well or poorly per feature.

Next session reads the wiki at boot; it doesn't re-derive.

---

## 9. Working agreement with Roham

- The loop ships features. Roham reviews `progress.md` between turns to redirect priority.
- The judge's PASS verdicts are presumed true until Roham flags otherwise. A redline on a flag is a `passes: revoked` annotation, not a silent overwrite.
- The CEO bar is "holy shit, that's done" — not "incrementally better than yesterday." If the judge passes but the surface still feels OTM-inferior to a real pro, the acceptance criteria were too loose. Tighten them in the same commit that captures the lesson.

---

*Authored 2026-05-16 by Dexter, the morning after the V4 loop's idle-alive failure. This charter is the operating contract for v5.*
