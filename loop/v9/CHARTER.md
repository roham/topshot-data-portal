# Top Shot Data Portal — V9 Loop Charter

**Version:** V9 — Polish-First Discoverability Pipeline with Reality-Probe.
**Status:** ACTIVE on directive consumption.
**Predecessor:** `loop/v8/CHARTER.md` (architecture preserved; V9 patches tracks + roster + doctrine enforcement; adds prod-health probe + meta-loop budget cap).
**Authored:** 2026-05-19 by Dexter under Roham's reprioritization brief.
**Verified:** three-round cross-vendor dialogue with gpt-5 + one Opus pass; full audit trail at `loop/v9/charter-verification/2026-05-19-three-round-dialogue.md`.

---

## §0 — Thirty-second summary

V9 is V8 with a priority transplant + four reality-defenses. V8 was right about architecture (pipeline-of-pipelines, two-stage review, voting verifier, deterministic primitives, cost gates, dispatch validator). V8 was wrong about WHAT to ship next. The portal has 30+ live routes, a "very nice" Players page, working indices math — and a homepage that doesn't surface the existing visualization library.

V9 fixes the priority. Three new track tags (DISCOVERABILITY-GAP, POLISH-EXISTING, VIZ-COMPLETENESS) move ABOVE BACKFILL/DERIVATIVE/DEEPENING/DISCOVERY in the selector. NEW-COMINGSOON-CONVERSION moves to lowest, gated by an empty DISCOVERABILITY queue + empty POLISH queue. Two new agents (Discovery Auditor, CPO Persona Checker) bracket the implementer. Four reality-defenses: (1) meta-loop budget cap to prevent V8-pause recurrence, (2) post-deploy prod-health probe with auto-revert, (3) Persona expected-state manifest to prevent alert-fatigue, (4) VIZ-COMPLETENESS interleave to prevent Pro Trader starvation.

**The mission:** make the portal feel like TradingView crossed with PSA Set Registry, for the Pro Trader, by completing what's there before adding what isn't.

## §1 — Mission (pinned)

Make the Top Shot Data Portal — https://topshot-data-portal.vercel.app — feel like TradingView crossed with PSA Set Registry, for the Pro Trader. Priority: POLISH and COMPLETE what's already there (navigation, home, discoverability of existing surfaces, chart/table affordances on existing routes) BEFORE adding new features or converting more ComingSoon stubs.

Every page chart-first. Every chart hover-crosshair'd, sortable, filterable, parallel-aware, confidence-labeled. Bloomberg voice, not Coinbase. Honest absence beats fabricated presence.

## §2 — Audience (pinned)

Pro Trader: market-active NBA Top Shot collector running a $5K–$800K portfolio, checking prices several times per day, listing/buying/accepting offers as a primary activity, measuring every tool by whether it gives them an information advantage they cannot get elsewhere.

Offended by: fabricated valuations without confidence, generic Vercel-demo dashboards, animations that delay information, missing parallel-aware pricing, no keyboard shortcuts, no CSV export, marketing-speak in instruments.

## §3 — Five Pillars (pinned)

1. Data Visualization Is The Brand
2. Every Page Has A Comparable (primary + cross-domain)
3. Cross-Domain Learning Bank (Bloomberg, TradingView, Hyperliquid, PSA, Card Ladder, Glassnode, NYT Upshot, Pudding, Polymarket, StockX, Tensor, Magic Eden, Robinhood)
4. Best-In-Class Taxonomy + Browse (Series → Set → Edition → Moment with cross-cutting Tier / Parallel / Player / Team)
5. Deep Empathy For The Customer (verbatim asks, honest absence, no marketing, voice is senior research analyst)

## §4 — Inherits from V8 (verbatim)

- Pipeline-of-pipelines architecture (outer = infinite loop, inner = per-iter stage chain)
- Two-Stage Review (Completeness/Sonnet + Quality/Opus)
- Voting Verifier (Cross-Vendor Judge ×3, default Haiku-tier; escalation per §7)
- Deterministic verifier primitives (P3)
- Stop hook (P4)
- Subagent dispatch contract validator (P5)
- PreToolUse cost gates (P8)
- READ-ONLY vs READ-WRITE classification (P11)
- STOP file convention
- `/admin/review` surface, token `ab227a89a99f7b619e5111d693547f06`
- Cross-vendor judge via `loop/v7/scripts/verify-via-openai.py` — **NOTE:** path-cleanup pending (move to `loop/v8/scripts/` + symlink for backcompat; tracked as low-priority hygiene task).

## §5 — V9 Track Priority (REPLACES V8 §3 ordering)

```
META > CORRECTIVE > BUILD-FAILING > AUDIT-FAILING
  > DISCOVERABILITY-GAP   (NEW)
  > POLISH-EXISTING       (NEW)
  > VIZ-COMPLETENESS      (NEW)
  > BACKFILL > DERIVATIVE > DEEPENING > DISCOVERY > VERIFY
  > NEW-COMINGSOON-CONVERSION  (LOWEST — explicitly deprioritized)
```

### Track-firing rules (REVISED post-Opus F1 fix)

- **DISCOVERABILITY-GAP** (READ-WRITE) — route exists in `app/<route>/page.tsx` AND has zero matches for `href="/<route>"` in `components/TopNav.tsx` AND zero matches in `app/page.tsx` AND zero matches in any path listed in `loop/v9/config/discoverability-rules.yml`. **Strict** definition: literally unlinked from primary nav. Discovery Auditor pre-step required.
- **POLISH-EXISTING** (READ-WRITE) — fires when ANY:
  - surface lacks ≥1 of {hover-crosshair, sortable column, filter chips, sparkline in tabular rows, parallel-stratification, confidence label, mobile-responsive layout at 375px}
  - surface IS linked from TopNav but ONLY under a generic non-entity label (Browse, More, Explore, etc.) AND is not surfaced on the homepage as a labeled entity (this is the Players-page-needs-prominence case)
  - homepage doesn't surface a prominent existing directory/page that the Pro Trader would expect to see in first viewport
- **VIZ-COMPLETENESS** (READ-WRITE) — chart has wrong shape for its job (single-line where multi-line tells the story, no annotations where reference-lines would, no confidence band where sample is thin, no depth ladder where one belongs).
- **NEW-COMINGSOON-CONVERSION** (READ-WRITE) — BLOCKED while DISCOVERABILITY-GAP queue OR POLISH-EXISTING queue is non-empty. Doctrine Checker enforces structurally as backstop; Track Selector enforces as primary.

### Multi-match precedence

If a surface meets multiple V9 firing rules: **DISCOVERABILITY-GAP > POLISH-EXISTING > VIZ-COMPLETENESS** (most-restrictive wins; surfacing a hidden page beats polishing a visible page).

### VIZ-COMPLETENESS interleave (Opus F4 fix — Pro Trader starvation defense)

When BOTH `discoverability-queue.json` AND `polish-queue.json` have `status:open` counts ≤ 2: the Track Selector MUST interleave one VIZ-COMPLETENESS iter for every DISCOVERABILITY-GAP iter (1:1 alternation) until either queue grows again. This protects against the Roham-named priorities draining and the Pro-Trader-named priorities (hover-crosshair, sparklines, multi-line Rookies from handover §6) never getting attention.

### Meta-loop budget cap (Opus F5 fix — V8-pause-recurrence defense)

Across any rolling window of the last 10 iters: if MORE than 30% of iters touched files under `loop/`, the next iter MUST route to a forced VIZ-COMPLETENESS or POLISH-EXISTING task that does NOT touch `loop/`. This is the structural defense against the V8 failure mode where meta-loop attention drained engineering time from the visible surface and forced the operator to install a STOP file. The cap is rolling-window measured per-iter by the orchestrator from git log; trip count tracked at `loop/v9/state/meta-loop-ratio.jsonl`.

Track Selector loads V9 priority + firing rules from this charter + `loop/v9/prompts/track-selector-patch.md`.

## §6 — Agent Roster Delta from V8

### Added

**Discovery Auditor (Sonnet)** — `loop/v9/prompts/discovery-auditor.md`. Pre-Planner stage, ONLY on DISCOVERABILITY-GAP iters. Produces `loop/v9/state/iteration-<N>/discovery-audit.json` — inventory-only (linkage evidence per route). Planner consumes the inventory and produces the ranked plan.

**CPO Persona Checker (Opus)** — `loop/v9/prompts/cpo-persona-checker.md`. Two modes:
- **Per-iter** (in-budget): walks ONLY steps 1, 11, 12 (home cleanly renders, no marketing words on touched surfaces, mobile sanity at 375px on touched surfaces). Blocking.
- **Nightly** (out-of-iter-budget, separate cron): walks the full 12-step North Star against `loop/v9/config/persona-expected-state.yml` — steps marked `status: not_ready` return SKIP, not FAIL. Steps marked `status: ready` are checked. Findings file to a backlog file, NOT into live queues.

### Patched

**Track Selector (Haiku)** — `loop/v9/prompts/track-selector-patch.md`. New tracks + new priority + firing rules + queue-block primary enforcement + multi-match precedence + VIZ-interleave + meta-loop budget cap.

**Doctrine Checker (Sonnet)** — `loop/v9/prompts/doctrine-checker-patch.md`. In addition to V8 comparable + signature-move + doctrine-quote enforcement:
- Queue-block backstop (Track Selector enforces primary).
- Voice audit via shared `loop/v9/lint/banned-terms.yml`.
- Mechanical quote-relevance check (default): require ≥2 content-word overlap between cited doctrine quote and either touched-file basenames or commit-subject line. Cheap, deterministic.
- LLM quote-relevance check (escalation only): on architectural-change iters (touches `loop/`, `research/00-foundation*.md`, `research/00-product-pillars*.md`, or `components/TopNav.tsx`), additionally run a Sonnet check asking "does the cited doctrine quote materially constrain the change in the touched files?"

## §7 — Hard Constraints (every subagent prompt restates these)

1. **Bloomberg, not Coinbase.** No marketing copy. No "coming soon" on shipped pages. No apologetic absence — replace with honest absence + methodology link.
2. **Visual work must be SEEN.** Build pass ≠ working UI. Every READ-WRITE iter touching the rendered surface MUST produce multi-viewport screenshots (375 / 768 / 1280 / 1920) AND a Playwright probe confirming the new affordance is in the DOM AND interactive. Without this artifact, Deterministic Verifier returns FAIL.
3. **Comparable + signature move + doctrine quote** in every commit message. Doctrine Checker is structural. Quote-relevance is mechanically validated (default ≥2 content-word overlap; LLM check on architectural changes).
4. **Spot-read the load-bearing file** before declaring done. Nav iters → `components/TopNav.tsx`. Home iters → `app/page.tsx`. Chart iters → rendered chart HTML.
5. **Anti-shortcircuit rules** restated verbatim per dispatch (see §8).
6. **READ-ONLY fan out, READ-WRITE sequence.** DISCOVERY/VERIFY/META-diagnostic = parallel. POLISH/DISCOVERABILITY/VIZ = single-threaded.
7. **Lead with the live link.** Production URL first in every status output.
8. **P3/P4/P5/P8 stay binding.** Stop hook + cost gate + dispatch validator + deterministic verifier all enforced.
9. **Settled = settled.** Don't re-list anything already decided.

## §8 — Anti-Shortcircuit Rules (embed in every subagent prompt verbatim)

1. **NEGATIVE FINDINGS NEED PROOF.** Before declaring data unavailable, run schema introspection (`bq show --schema`, `psql \d`) proving the column/table doesn't exist. Cite the query. Absence-from-findings-library is NOT proof of data absence.
2. **SKILL NAMES DON'T TRANSIT.** If your task names a multi-step skill or pipeline, you MUST execute all steps, not just preparation. Document each step's output.
3. **NO SPEND/EFFORT CAP** within §10 budget envelope. No "I'll need to investigate further." Finish the investigation in this dispatch. If a query times out, optimize and retry. If a table is wrong, find the right one. Push through.
4. **MID-STREAM GATES.** Before synthesis, parse upstream data for "approximately/would suggest/TBD/likely" without numbers + queries. If found, kick back upstream.
5. **SPOT-READ.** Before declaring complete, read the largest file in your output end-to-end. Scan for hollowness markers. If found, the run is NOT complete.

## §9 — Verification Gates (Pipeline-pattern enforcement)

| Gate | Between | What it checks | Fail action | Retry cap |
|---|---|---|---|---|
| G1 | Track Selector → next stage | `00-track.md` has track tag + rw_class + queue_item + rationale; tag matches V9 firing rules; queue-block enforced | Re-run Track Selector with stricter prompt | 2 |
| G2 | Discovery Auditor → Planner | `discovery-audit.json` inventory complete with linkage evidence per route | Re-run Discovery Auditor | 2 |
| G3 | Planner → Implementer | `00-plan.md` 5-field dispatch contract complete; load-bearing file + spot-read target named | Re-run Planner | 2 |
| G4 | Implementer → Reviewers | Stage commit exists; diff non-empty; multi-viewport screenshots present | Re-dispatch Implementer with explicit screenshot requirement | 2 |
| G5 | Reviewers → Verifier | Both completeness AND quality PASS | Kick back to Implementer with combined report | 2 |
| G6 | Verifier → Judge | `03-verify.json` all 5 verdicts PASS (build, tsc, probe-evidence, screenshot, copy-audit via banned-terms.yml) | Kick back to Implementer with specific failed verdicts | 2 |
| G7 | Judge → Doctrine | ≥ 2/3 PASS (default Haiku voting; escalates to gpt-5 on reviewer disagreement / `viz_nuance_warning:true` / architectural change / Meta-Track active) | Re-dispatch Implementer; if 2nd FAIL → Meta-Track | 1 |
| G8 | Doctrine → Persona | Queue-block PASS + voice-audit PASS + quote-relevance PASS + 4 V8 fields complete | Re-dispatch Implementer with banned-terms.yml citation OR re-dispatch Track Selector if queue-block tripped | 1 |
| G9 | Persona → CEO Signal | Per-iter walk (steps 1/11/12) complete; in-scope FAILs filed | Re-dispatch Implementer for the specific failed step | 1 |
| **G10** | **CEO Signal → iter-complete (Opus F6 fix)** | **Post-deploy prod-health probe (`loop/v9/scripts/prod-health-probe.sh` runs Playwright against PROD URL; checks (a) `/` HTTP 200 + DOM-renders + 0 JS errors, (b) the iter's affordance is in DOM)** | **`git revert HEAD && git push` AUTO-REVERT; iter marked PROD-FAIL; orchestrator escalates to Meta-Track** | **1** |

Any gate failure → iter is marked FAIL, `failure_signature` written to `iteration-<N>.json`, program-database entry created. Meta-Track activates if `failure_signature` matches the immediately-prior iter's.

## §10 — Budget envelope

| Per-iter | Cap |
|---|---|
| Wall-clock | 90 min (timeout → kick to Meta-Track) |
| Token spend | $15 USD (cost-gate enforces; abort at $12) |
| Subagent dispatch | Soft budget tracked but not capped; LOCK file is the real safety |
| Commits | one per stage tag, max 10 per iter (now includes G10 prod-health) |

Per-day cap: $200 USD across all iters (orchestrator pauses at $180 and writes `state/cost-paused.flag`; Roham removes flag manually).

## §11 — Reentrancy + activation

### Activation flag

V9 is ACTIVE when ALL three are present in the repo:
- `loop/v9/CHARTER.md` (this file)
- `loop/v9/ACTIVE` (atomic flag; Roham or deploy-script writes)
- `loop/v9/MIGRATED` (soft marker; first 3 iters refuse to dispatch over its absence with rationale, but iter-4+ proceeds — keeps migration from being a hard block)

V8 orchestrator reads ACTIVE flag at top of cron tick. If present → load V9 prompts + queues. If absent → V8 behavior preserved.

### Cron tick reentrancy

`loop/v9/LOCK` written atomically at iter-start:
```json
{
  "iter_id": "<N>",
  "pid": <pid>,
  "started_at": "<iso>",
  "stage": "track-selector" | ...,
  "expected_completion": "<iso + 90min>"
}
```

Cron tick checks LOCK first; defers if present-and-not-expired; logs to `state/cron-deferred.jsonl`.

## §12 — First iter target (iter-1 of V9)

**Track: POLISH-EXISTING** (revised post-Opus F1).
**End-state:** the homepage `/` surfaces the `/players` directory as a labeled entity in the first viewport, NOT just behind a generic "Browse" tab. Implementation: a Players-teaser tile on `/` above the Grail+Rookies hero pair. List shape (6-8 rows, top by 24h volume, each with player name + team color + 24h volume + sparkline). Each row clickable to `/player/[id]`. Reuses existing `components/primitives/Sparkline.tsx` + `components/primitives/Card.tsx` primitives. Target effort: ≤60 min implementation.

**Comparable primary:** PSA Set Registry canonical entity-sidebar (top players visible).
**Comparable cross-domain:** Wikipedia infobox top-stats convention.
**Signature move:** entity-list-as-homepage-prominence (PSA pattern) reusing existing primitives — NO new chart-canvas, NO new sparkline component.
**Doctrine quote:** "Pillar 4 — Best-In-Class Taxonomy + Browse: the Player layer of Series→Set→Edition→Moment must have prominence on the homepage, not just navigation."
**Why this quote applies:** the change adds a Players entity tile to the homepage's first viewport, directly enacting the Pillar-4 "prominence" requirement for the Player taxonomy layer.

**Justification for POLISH-EXISTING (not DISCOVERABILITY-GAP):** `/players` IS linked from `components/TopNav.tsx` (Browse lane, line 37). The DISCOVERABILITY-GAP rule strict definition requires zero TopNav matches — so it doesn't fire on `/players`. The actual gap is *prominence/surfacing*, not *linkedness*: the homepage doesn't show `/players` as a labeled entity in first viewport. That's POLISH-EXISTING per §5's expanded firing rules.

**Iter sequence:**
1. **Iter-1 (POLISH-EXISTING, ≤60 min):** Players-teaser tile on `/`.
2. **Iter-2 (POLISH-EXISTING, ~75 min):** ⌘K command palette on TopNav with universal resolver + `/` keyboard shortcut bind + `?` shortcut help modal.
3. **Iter-3 (POLISH-EXISTING or VIZ-COMPLETENESS, ~75 min):** Players home tile upgraded to chart-canvas with Polymarket multi-line (one line per top-6 player) over `?w=` window. (May reclassify to VIZ-COMPLETENESS once iter-1 ships.)

This matches Roham's verbatim "home page followed by navigation" priority order.

## §13 — Phase transition

V9 inherits V7/V8 phase progression structure (Phase 1 → 4). V9 charter does NOT alter phase gates. Phase status remains computed from `loop/v8/state/phase-status.json`. Roham's `/promote-to-phase-N` only works when `eligible:bool == true`.

---

*Charter sealed 2026-05-19 after three-round cross-vendor dialogue + one Opus pass. Next update: only on Roham's redirect, or after 20 successful V9 iters justifying a V10 review.*
