# V9 Charter Verification — Three-Round Cross-Vendor Dialogue + Opus Pass

**Verified:** 2026-05-19
**Author of V9:** Dexter (Anthropic-driven engineering agent on Roham's local Mac)
**Verifier:** OpenAI gpt-5 via `loop/v7/scripts/verify-via-openai.py` pattern, adapted for charter-scope artifact
**Third eye:** Opus adversarial review across the full dialogue
**Outcome:** PASS / convergence_reached: yes / no must-fix remaining

## What this artifact is

The V9 charter exists because Roham asked for an infinite-loop multi-agent prompt set that biases the Top Shot Data Portal loop toward POLISH + COMPLETE + DISCOVERABILITY of existing surfaces before adding new feature work. The V9 design was first drafted via the `thoth-prompter:agent` skill, then subjected to the V8 charter's own verification discipline (cross-vendor judge ×3 voting), but at charter-scope rather than per-iter scope.

The principle Roham named: *"engage in conversation with it so you can have multiple iterations and get to a truthful synthesis, not just a one-time one-shot."*

Three rounds of dialogue between Dexter and gpt-5, followed by one independent Opus pass.

## Round 1 — gpt-5 NEEDS-WORK / with_fixes

Highlights of what gpt-5 caught that Dexter missed:

1. **Iter-1 scope-vs-budget arithmetic error** — original spec called iter-1 effort "M (3-5h)" while §10 budget envelope capped iters at 90 min wall-clock. Without fixing this, iter-1 would have stalled on first cron tick.
2. **DISCOVERABILITY-GAP firing rule ambiguity for Haiku Track Selector** — "TopNav primary path" was vague; needed file-path-explicit greps.
3. **Multi-match precedence undefined** — when a surface fires multiple V9 tracks, which wins?
4. **CPO Persona Checker over-scope** — 12-step walk-through included affordances not yet in codebase; would FAIL every nightly run from day 1.
5. **Activation race risk** — directive consumed partway through a tick could leave V8 selector running V9 gates.

Full round 1 verdict: `cross-vendor-verdict-gpt5.txt` (sibling file in this directory).

## Round 2 — Dexter pushback + gpt-5 responses

Dexter accepted 6 must-fixes (A1-A6), rejected 3 over-engineered fixes (P1-P3), deferred 1 (P4), and surfaced 4 things gpt-5 missed (M1-M4).

gpt-5 conceded on 9 of 13 author positions:
- All 6 acceptances confirmed
- P1 (collapse Judges): conceded — Haiku-tier ×3 voting with prompt caching + escalation triggers preserves cross-vendor independence while controlling cost
- P2 (3:1 fairness scheduling): conceded — premature optimization
- M1 (iter ordering — home tile first, then ⌘K nav, then hero upgrade): conceded — matches Roham's "home page followed by navigation" verbatim
- M3 (V7 script path bug): conceded

gpt-5 held 5 positions (with refined rationale):
- P3 (Auditor/Planner separation): held but refined — keep separate roles, eliminate output duplication by demoting Auditor to inventory-only
- Queue schemas (round 2 surfaced): hold — need explicit `loop/v9/queues/*.json` schema with versioning + CI
- V8→V9 migration tool (round 2 surfaced): hold — V8 task-ledger has real items to migrate
- Voice-audit parity: refined — shared `banned-terms.yml` between Doctrine Checker and Deterministic Verifier
- Schema-version drift risk: hold

Full round 2 dialogue: `cross-vendor-verdict-gpt5-round2.txt` + `round2-author-response.md`.

## Round 3 — Dexter answers all 8 round-2 questions; gpt-5 PASS

Dexter conceded on every held item with concrete specs:
- Migration tool spec (TS file, mapping heuristics, soft MIGRATED flag per Opus pushback)
- Queue JSON schema (versioned, with status enum, audit trail fields)
- Shared `banned-terms.yml` with allowlist
- Mechanical quote-relevance check (≥2 content-word overlap) with LLM escalation only on architectural surfaces
- Discovery Auditor refactored to inventory-only
- Search resolver path configurability via `discoverability-rules.yml`
- M2 filename-rename audit before rename (conservative call: keep `00b-` prefix initially)
- Cron tick LOCK file shape
- Judge escalation triggers documented

gpt-5 round 3 verdict: **PASS / convergence_reached: yes / would_recommend_shipping_round3: yes / must_fix_remaining: []**.

Ship signoff: *"Proceed to activate V9: commit the migration tool and run it to generate loop/v9/queues/*.json and write loop/v9/MIGRATED; add banned-terms.yml, the queue schema + CI validator, the Discovery Auditor inventory output wiring, the Track Selector config for search resolver paths, the doctrine quote-matches-change check, the LOCK handling, and the judge escalation triggers. Then flip loop/v9/ACTIVE..."*

Full round 3 dialogue: `cross-vendor-verdict-gpt5-round3.txt` + `round3-author-final.md`.

## Opus pass — 6 findings, 5 folded into charter, 1 deferred

After convergence with gpt-5, Roham requested an asymmetric-coverage check via an Opus reviewer reading the full 3-round dialogue. The Opus review caught 6 things gpt-5 + Dexter both missed:

- **F1 (BLOCKING)** — DISCOVERABILITY-GAP firing rule, applied to literal codebase, does NOT fire on `/players` because `/players` IS linked from `components/TopNav.tsx` line 37 (Browse lane). Neither model spot-read the file against the rule. **Fix:** reclassified iter-1 from DISCOVERABILITY-GAP to POLISH-EXISTING (homepage doesn't surface `/players` as labeled entity in first viewport). Refined firing rules in CHARTER §5.
- **F2 (HIGH)** — Persona Checker nightly walk would FAIL every step on features not yet built (alert fatigue → trained ignore). **Fix:** added `loop/v9/config/persona-expected-state.yml` with SKIP semantics for `status: not_ready` steps.
- **F3 (MED, deferred)** — Loop has no feedback from real Pro Traders; converges on its own taste. **Fix:** non-blocking bookkeeping of page-views post-deploy; deferred to iter-5+ instrumentation work.
- **F4 (HIGH)** — V9 priority order (DISC > POLISH > VIZ) buries the handover §6 high-impact Pro Trader work (hover-crosshair, sparklines, multi-line Rookies). **Fix:** added VIZ-COMPLETENESS interleave rule in CHARTER §5 — when DISC+POLISH queues both have ≤2 open items, alternate 1:1 with VIZ.
- **F5 (HIGH)** — V8 was paused because meta-loop attention drained engineering. V9 adds more meta-loop artifacts (queues, schemas, migration tool, banned-terms, LOCK, exemptions, expected-state) — structurally amplifies the same failure. **Fix:** added meta-loop budget cap in CHARTER §5 — if >30% of rolling-10-iter window touches `loop/`, next iter MUST be POLISH or VIZ that does NOT touch `loop/`.
- **F6 (HIGH)** — No post-deploy prod-health check. A broken iter on `/` would compound into the next iter. **Fix:** added G10 gate (`loop/v9/scripts/prod-health-probe.sh`) — Playwright probe against PROD URL with auto-revert via `git revert HEAD && git push` if `/` fails.

Opus also flagged over-engineering in three round-3 concessions:
- Quote-matches-change LLM check → reduced to mechanical default (≥2 content-word overlap), LLM only on architectural surfaces
- MIGRATED hard gate → softened to "first 3 iters refuse with rationale, then proceed"
- 8-dispatch-per-iter cap → removed (LOCK file is the real safety)

## Files produced from this dialogue

All filed at `loop/v9/`:
- `CHARTER.md` (this directory's parent) — final charter
- `prompts/{discovery-auditor,cpo-persona-checker,track-selector-patch,doctrine-checker-patch}.md` — agent prompts
- `queues/{discoverability,polish,visual}.json` — V9 backlog
- `schemas/queue.schema.json` — queue validation
- `config/{discoverability-rules.yml,discoverability-exemptions.json,persona-expected-state.yml}` — runtime configs
- `lint/banned-terms.yml` — shared voice-doctrine source of truth
- `scripts/{validate-queue-schemas.sh,prod-health-probe.sh}` — verification primitives
- `tools/migrate-v8-queues.ts` — V8→V9 backlog migration

Activation: `loop/v9/ACTIVE` flag (atomic write) + `loop/v8/directives/inbox/v9-priority-<ts>.md` (V8 orchestrator picks up on next cron tick).

## What this dialogue teaches the loop itself

The same discipline that produced this charter — multi-round adversarial dialogue with concession-or-hold and a third-eye independent review — is what V9 must apply at iter-scope. The Cross-Vendor Judge ×3 voting verifier is the runtime equivalent; the Two-Stage Reviewer is the same shape; the Opus-on-architectural-changes escalation in §6 Doctrine Checker is the same principle.

If the loop produces a feature that an Opus pass would catch as wrong-shape, the loop has failed its own discipline. Every iter is a smaller version of this dialogue.
