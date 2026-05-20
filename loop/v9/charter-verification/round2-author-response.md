# Dexter's response to gpt-5 round-1 verdict

I'm the design author. I've read your NEEDS-WORK verdict. Here is my position on each finding. Some you got right and I'm folding in. Some I think are over-engineered or misread the design. And a few things you missed that I want you to react to.

## Findings I accept (load-bearing, fold in before ship)

### A1. Iter-1 scope vs 90-min budget — ACCEPTED
You're right. I called it M (3-5h) in the seed task and capped iters at 90 min in §10. That's arithmetic-broken. Splitting DISC-001 into two iters:

- **DISC-001A** (iter-1, ≤60 min implementation): add a "Players" anchor in the Browse lane mega-menu OR a single Players-teaser tile on `/` (linked-list shape, reusing existing `Sparkline` component, top 6 by 24h volume). Pure discoverability. No new chart-canvas. Comparable: PSA Set Registry sidebar canonical entity-list.
- **DISC-001B** (iter-2, ~90 min): chart-canvas Players hero with Polymarket multi-line. Comparable: Polymarket multi-line outcomes.

This is correct because the cron tick is 25 min and a backed-up queue is fine. Two small iters beat one stalled big one.

### A2. Firing rule precision — ACCEPTED with refinement
You're right that "TopNav primary path" is vague for a Haiku-tier classifier. Refined:

```
DISCOVERABILITY-GAP fires when ALL true:
  - file exists at app/<route>/page.tsx
  - AND grep -F "href=\"/<route>\"" components/TopNav.tsx returns empty
  - AND grep -F "href=\"/<route>\"" app/page.tsx returns empty
  - AND grep -F "/<route>" components/SearchResolver.tsx returns empty (or wherever search lives)
  - AND route NOT in loop/v9/state/discoverability-exemptions.json (footer, /misc, etc.)
```

Precedence on multi-match: DISCOVERABILITY-GAP > POLISH-EXISTING > VIZ-COMPLETENESS (because surfacing a hidden page yields more user value than polishing an already-visible page). Encoded explicitly in the Track Selector patch.

### A3. Queue-block enforcement moved earlier — ACCEPTED PARTIALLY
You're right that enforcing at Doctrine wastes an iter. I'll move PRIMARY enforcement to Track Selector (Haiku reads the 3 queue JSONs; refuses NEW-COMINGSOON-CONVERSION while either is non-empty). Doctrine Checker stays as backstop because the queues could be raced/corrupted; defense in depth.

### A4. CPO Persona Checker over-scope — ACCEPTED with version split
You're right. The 12-step walk-through includes affordances (`/` palette, `?` modal, `g h` shortcut, live ticker) that DON'T EXIST YET in the codebase. Running them as per-iter gates would flood the next-iter task queue with N "your iter caused a regression on a feature that wasn't there to begin with" entries.

Revised:
- **Per-iter Persona (in-budget):** steps 1, 11, 12 only (land on `/` cleanly, no marketing words on touched surfaces, mobile sanity at 375px on touched surfaces). Blocking.
- **Nightly Persona (out-of-budget, separate cron):** all 12 steps. WARN-level findings go to a backlog file, not into the live queues. Surfaced to Roham via `/admin/review` weekly digest.

### A5. Activation race — ACCEPTED
Real risk. Adding `loop/v9/ACTIVE` atomic flag file. Track Selector reads it once per tick at top-of-cycle. Activation commit writes prompts + queues + ACTIVE flag in a single git commit. No partial-state runs.

### A6. Kick-back matrix per gate — ACCEPTED
Adding explicit fail→target table:

| Gate | Fail action | Retry cap |
|---|---|---|
| G1 | Re-dispatch Track Selector with stricter prompt | 2 |
| G2 | Re-dispatch Discovery Auditor | 2 |
| G3 | Re-dispatch Planner | 2 |
| G4 | Re-dispatch Implementer with explicit screenshot requirement | 2 |
| G5 | Kick back to Implementer with combined Reviewer report | 2 |
| G6 (build/tsc) | Implementer | 2 |
| G6 (probe/screenshot/copy) | Implementer with deterministic-verifier diagnostic | 2 |
| G7 | Re-dispatch Implementer; if 2nd FAIL → Meta-Track | 1 |
| G8 (queue-block) | Re-dispatch Track Selector (forced next-priority) | 1 |
| G8 (voice) | Re-dispatch Implementer with banned-terms.yml citation | 1 |
| G9 (persona steps 1/11/12) | Re-dispatch Implementer for the specific failed step | 1 |

After cap: Meta-Track activates; failure_signature written.

## Findings I push back on

### P1. "Collapse Judges to single-judge or conditional" — REJECTED
This defeats the voting verifier. The ×3 Map-Reduce is the architectural defense against Claude-judging-Claude convergence per V4 Learning. Single-judge regresses to FM13.

I agree the cost concern is real. Counter-proposals:
- Move Judges to Haiku-tier (gpt-5-mini equivalent) for routine iters; reserve full gpt-5 voting for high-stakes (architectural changes, doctrine edits).
- Run Judges ONCE at iter-end (after G9), not per-gate. (Current design already does this — re-read §3 G7.)
- Cache the verifier prompt across iters via prompt caching to cut token cost ~10x.

Question for you: are you holding the "collapse" position, or does Haiku-tier voting + caching satisfy the cost concern?

### P2. "3:1 scheduling for queue fairness" — REJECTED as premature
The DISCOVERABILITY queue has a finite ceiling — there are ~30 routes total, ~5-7 currently undiscoverable. It will drain in 5-10 iters. Solving starvation before observing it is premature optimization. If after 15 iters the POLISH queue is dry-aging, then add fairness. Not before.

Hold: I'd rather observe and react than encode a scheduler that will likely be wrong.

### P3. "Merge Discovery Auditor into Planner" — REJECTED
This is the FM-2.6 failure (strategic decomposition gap that the V4 Learning specifically called out). Merging the two stages collapses the load-bearing separation between inventory (Sonnet, mechanical, comprehensive) and decomposition (Opus, judgment, prioritized). Different model tiers, different output schemas.

You're right that on read-only inventory iters they could be one role, BUT the discovery-audit JSON is also consumed by the future Persona Checker nightly run as the canonical "what's reachable" source-of-truth. It's not just Planner input.

Pushing back: keep them separate.

### P4. "Voice-audit expansion to repo-wide + DOM scan" — DEFERRED, not rejected
You're right that diff-only grep misses pre-existing marketing words. But this is a DIFFERENT FAILURE CLASS — historical accumulation vs new regression. The per-iter Doctrine Checker exists to prevent NEW marketing words from landing. Pre-existing words are an ETL-style cleanup task that's better as its own POLISH-EXISTING iter.

Compromise: ship per-iter diff grep now; file "voice-audit baseline pass" as a P0 polish task that fires once on iter-1+ to clean repo. After that, the diff grep prevents regression.

## Things you missed (I want your reaction)

### M1. The Players-page-as-home-hero may not be the right iter-1 even after downscoping
On reflection: Roham named "highest priority to fix: home page followed by navigation." Iter-1 as DISC-001A surfaces Players in the BROWSE LANE MEGA-MENU (a navigation fix), not on home (a home-page fix). I think iter-1 should be home, iter-2 nav — preserving Roham's stated order.

Revised iter-1: a single Players-teaser tile on `/` above the existing Grail+Rookies hero pair. List shape (PSA-sidebar comparable), reusing existing primitives. ≤60 min implementation.

Iter-2: ⌘K command palette on TopNav (navigation polish).

Iter-3: Players hero upgrade to chart-canvas (full DISC-001B).

Does this preserve the order Roham named?

### M2. State-file numbering convention
My design uses `00-track.md → 00b-discovery-audit.md → 00-plan.md → ...`. The 00b inflicts ordering on a conditional stage. Cleaner: drop numbers from conditional-stage outputs, use `discovery-audit.md` plain. Orchestrator manages stage order; filesystem doesn't need to encode it.

### M3. The `loop/v7/scripts/verify-via-openai.py` reference in V8 charter
V8 charter still points to v7 path. V9 should update or symlink. Either:
- Move script to `loop/v8/scripts/verify-via-openai.py` and update charter references
- Or symlink for backward compat

This isn't V9-introduced sloppiness; it's V8 sloppiness V9 should clean up. Flag it.

### M4. The doctrine-quote requirement may not transit through the budget envelope
Implementer commits need comparable + signature move + doctrine quote in the message. Under a 60-min budget for iter-1, the Implementer might shortcut by stuffing a doctrine quote that doesn't actually justify the change. Doctrine Checker should validate the QUOTE matches the change, not just that A quote exists. Is that what your design check expects?

## Question back to you

Given the accepted fixes (A1-A6), the rejected positions (P1-P3) where I'm pushing back, the deferred item (P4), and the missed items (M1-M4) — do you concede on the rejections, refine your position, or hold? Specifically:

1. On Judges-voting: hold "collapse" or accept "Haiku-voting + caching"?
2. On Discovery-Auditor-vs-Planner: hold "merge" or accept "keep separate"?
3. On M1 (Iter-1 should be home not nav): agree or disagree?
4. On M4 (Doctrine Checker validates quote-matches-change, not just quote-exists): is this what the V9 design needs?

Return your round-2 verdict in the same JSON schema as round-1, with `verdict_delta` field listing which round-1 findings you've revised + a `conceded_findings` array + a `held_findings` array.
