# Top Shot Data Portal — V8 Loop Charter

**Version:** V8 — Daemon-Dispatched Pipeline-of-Pipelines with Two-Stage Review + Voting Verifier + AlphaEvolve Program Database.
**Status:** DRAFT — authored 2026-05-19, awaiting Roham sign-off before scripts/hooks land in `.claude/`.
**Predecessor:** `loop/v7/CHARTER.md` (active; this charter supersedes it on Roham's `/promote-to-v8` signal at `/admin/review`).
**Spec source:** `HANDOVER-topshot-portal-v8-launch-2026-05-19.md` §5; this file is the canonical realization of that spec.
**Q10 binding:** end-state = Phase 4 (pure autonomous, infinite). Staged path = ship Tier A in Phase 1 (current V7 surface), then ship Patches P1+P3+P4+P5+P8, then flip Phase 4 for Tier B onward.

---

## §0 — Thirty-second summary

V8 is V7 with a discipline transplant. V7 was right about architecture (two loops, multi-track, cross-vendor, /admin/review). V7 was wrong about discipline: rule 3's "no spend cap, push through" contradicted §5's budget, and the verifier was an LLM judge that could be talked into PASSing hollow artifacts (the V4-failure-mode-rehearsal, FM13).

V8 fixes both. Deterministic primitives run BEFORE the LLM judge (P3). Stop hook is a Claude Code-native blocker, not a sidecar (P4). Cost gates as PreToolUse hook bound the run (P8). Subagent launches are validated against a 5-field contract (P5). Task state lives in two files — outer + per-iter — not a transcript (P1). Each track is tagged READ-ONLY or READ-WRITE so READ-ONLY work can fan out without verifier overhead (P11). When a feature ships, a doctrine-checker subagent asserts it names a comparable + signature move + doctrine quote (P9). Every FAILed iter writes to a program database so the next planner learns from cousin failures (P6, AlphaEvolve).

**The infinite loop is genuinely infinite.** Tier A → Tier B → Tier C → Tier D → cycle into Loop A DISCOVERY iters that surface newly-exposed BQ columns and newly-cataloged Vaultopolis tags forever, with Loop B re-entering whenever Loop A signals new data worth visualizing. Discovery never terminates; the orchestrator never stops; cost gates cap the burn.

---

## §1 — Pattern selection

**Pattern: Daemon-Dispatched Pipeline-of-Pipelines with embedded Map-Reduce (DISCOVERY only) + Two-Stage Review + Voting Verifier.**

Justification:
- **Daemon-dispatched** — wall-clock-bound, >30 min per iter, hands-off overnight + between Roham sessions. Local subagents share parent context budget; kaaos-daemon VM is genuinely autonomous and already hosts Loop A's V7 substrate.
- **Pipeline-of-pipelines** — outer pipeline is the infinite loop (one iter per cron tick); inner pipeline is the per-iter stage chain (plan → implement → review → verify → judge → CEO-signal → archive). Each stage commits with a stage tag so progress is legible from `git log`.
- **Map-Reduce ONLY for DISCOVERY/VERIFY/META-diagnostic tracks (READ-ONLY per P11).** Loop A DISCOVERY across BQ tables fans out — N tables, one subagent each, reduce to a unified gap report. Everything else is sequential — practitioner-survey convergence: "single-threaded default, parallel only for read-only."
- **Two-Stage Review** between implementer and judge — Completeness Reviewer (Sonnet) catches under-scope; Quality Reviewer (Opus) catches incorrect-but-complete. One reviewer conflates the two.
- **Voting Verifier on cross-vendor judge** (P13) — 3 parallel gpt-5.5 instances with different seeds; PASS requires ≥ 2/3. Single-instance is too easy to flatter.

---

## §2 — Inherits from V7 (preserved verbatim)

- **Two-loop architecture** — Loop A (Data Quality) + Loop B (Visualization).
- **Multi-track selection with corrective priority** — V7 §3 ordering preserved: META → CORRECTIVE → BUILD-FAILING → AUDIT-FAILING → BACKFILL → DERIVATIVE → DEEPENING → DISCOVERY → VERIFY. V8 layers P11 tags on top (READ-ONLY vs READ-WRITE).
- **Cross-vendor judge** — gpt-5.5 via `loop/v7/scripts/verify-via-openai.py`, GSM key `topshot-loop-openai-api-key`. V8 wires this into the Stop hook (P4) and runs 3 instances voting (P13).
- **STOP file pattern** — `/home/r_dapperlabs_com/topshot-builder/topshot-data-portal/STOP`; orchestrator checks file existence at top of every tick, halts the loop if present.
- **`/admin/review` surface** — Roham's ✓/✗/🎨 votes; token `ab227a89a99f7b619e5111d693547f06`.
- **Phase progression structure** — Phase 1 (D) → 2 (B) → 3 (C) → 4 (A) per V7 §2. V8 revises the transition gates (P7) to deterministic computed signals in `phase-status.json`; Roham's `/promote-to-phase-N` only works when `eligible:bool == true`.

---

## §3 — Adopts from V8 practitioner survey (13 patches)

| Patch | Pre-Phase-4 required? | Implementation artifact |
|---|:-:|---|
| **P1 — two-ledger split** | ✅ | `loop/v8/state/task-ledger.json` (outer) + `loop/v8/state/iteration-<N>.json` (inner, Magentic-One 4 questions) |
| P2 — stall threshold 3→2 | ⬜ | Orchestrator code reads last 2 iter `failure_signature` fields; identical → META |
| **P3 — deterministic verifier primitives** | ✅ | `loop/v8/scripts/verify-deterministic.sh` runs build + tsc + probe-evidence + multi-viewport |
| **P4 — Stop hook wire** | ✅ | `.claude/settings.json` Stop hook → `loop/v8/scripts/stop-gate.sh` |
| **P5 — subagent dispatch contract** | ✅ | `loop/v8/scripts/dispatch-validator.mjs` rejects launches missing 5 fields |
| P6 — program database | ⬜ | `loop/v8/state/program-database/<iter-id>.json` for every FAILed iter |
| P7 — deterministic phase gates | ⬜ | `loop/v8/state/phase-status.json` computed from iter history |
| **P8 — PreToolUse cost gates** | ✅ | `loop/v8/scripts/cost-gate.mjs` reads `loop/v8/state/cost-ledger.jsonl` |
| P9 — doctrine checker subagent | ⬜ | Subagent in Stop-hook chain; rejects features missing comparable + signature-move + doctrine quote |
| P10 — remove V7 §9 rule 3 | ✅ | This charter REPLACES V7's "no spend cap"; budget envelope from §6 below is canonical |
| P11 — READ-ONLY vs READ-WRITE tags | ✅ | Track classifier; READ-ONLY skip verifier, READ-WRITE require it |
| P12 — transcript compression | ⬜ | Haiku compression at >100K tokens → `loop/v8/state/transcript-summary-<N>.md` |
| P13 — voting verifier | ⬜ | 3 parallel gpt-5.5 instances; PASS ≥ 2/3 |

**Load-bearing trio++ (P1 + P3 + P4 + P5 + P8 + P10 + P11) lands together as one PR before Phase 4 flips on.** The other six (P2, P6, P7, P9, P12, P13) land incrementally across iters 1-20 of the running loop; their absence doesn't gate autonomy, their presence improves it.

---

## §4 — Agent roster

| Role | Model | Input | Output | Lives where |
|---|---|---|---|---|
| **Orchestrator** | Sonnet | `task-ledger.json`, `phase-status.json`, STOP file | Per-iter dispatch decisions, stage commits | kaaos-daemon tmux session `topshot-loop-build` |
| **Track Selector** | Haiku | `task-ledger.json` + last 5 `iteration-N.json` | Track tag (META/CORRECTIVE/...) + READ-ONLY/READ-WRITE classification | Subagent dispatch from orchestrator |
| **Planner** | Opus | Track tag + handover §6 (Tier playbook) + program-database recent fails | `loop/v8/state/iteration-<N>/00-plan.md` with 5-field dispatch contract for each subagent it spawns | Subagent dispatch |
| **Implementer** | Sonnet | Plan + predecessor artifacts (full paths, per P5) | Code diff committed with stage tag `[V8 ITER-<N> IMPL]` | Subagent dispatch (single-threaded per iter) |
| **Completeness Reviewer** | Sonnet | Plan + diff | `loop/v8/state/iteration-<N>/01-completeness.md` — PASS/FAIL + missing-requirements list | Subagent dispatch |
| **Quality Reviewer** | Opus | Plan + diff + completeness report | `loop/v8/state/iteration-<N>/02-quality.md` — PASS/FAIL + correctness flags | Subagent dispatch |
| **Deterministic Verifier** | n/a (shell) | Working tree post-implementer | `loop/v8/state/iteration-<N>/03-verify.json` — build/tsc/probe-evidence/screenshot/copy-audit verdicts | Stop hook |
| **Cross-Vendor Judge (×3 voting)** | gpt-5.5 | Plan + diff + verifier output | 3× `loop/v8/state/iteration-<N>/04-judge-{a,b,c}.md` — PASS/FAIL + rationale per seed | Stop hook chain |
| **Doctrine Checker** | Sonnet | Diff + comparable claim from commit message | `loop/v8/state/iteration-<N>/05-doctrine.md` — comparable + signature move + doctrine quote verified | Stop hook chain |
| **CEO Signal Surfacer** | Sonnet | All artifacts above | `/admin/review` proposal row + waits for ✓/✗/🎨 with 72h timeout | Subagent dispatch |
| **META track** | Opus | Last 2-3 FAILed iter program-database entries | New plan that addresses the structural cause | Subagent dispatch on stall |

**Role-to-model rule:** judgment tasks (Planner, Quality Reviewer, META) get Opus. Generation + completeness checks get Sonnet. Track selection + cheap classification get Haiku. Deterministic checks are NOT model calls.

---

## §5 — Orchestration sequence (the per-iter pipeline)

```
              ┌──────────────────────────────────────────────────────────────┐
              │  CRON: every 30 min on kaaos-daemon (Phase 4)                │
              │  loop/v8/scripts/cron-tick.sh                                │
              └────────────────────────┬─────────────────────────────────────┘
                                       ▼
            ┌─────────────────────────────────────────────────────┐
            │ 0. Pre-flight                                       │
            │   - Read STOP file → halt if present                │
            │   - Read cost-ledger.jsonl → halt if daily cap hit  │
            │   - Read phase-status.json → confirm Phase 4 active │
            │   - Read task-ledger.json → next queue item         │
            └────────────────────────┬────────────────────────────┘
                                     ▼
            ┌─────────────────────────────────────────────────────┐
            │ 1. Track Selector (Haiku)                           │
            │   → tag track (META/CORRECTIVE/.../DISCOVERY)       │
            │   → tag READ-ONLY or READ-WRITE                     │
            │   → commit: [V8 ITER-<N> TRACK]                     │
            └────────────────────────┬────────────────────────────┘
                                     ▼
            ┌─────────────────────────────────────────────────────┐
            │ 2. Planner (Opus)                                   │
            │   → read program-database last 5 FAILs              │
            │   → propose iter plan with 5-field dispatch         │
            │     contracts for each subagent                     │
            │   → write 00-plan.md                                │
            │   → commit: [V8 ITER-<N> PLAN]                      │
            └────────────────────────┬────────────────────────────┘
                                     ▼
              ┌─────────────── if READ-ONLY (DISCOVERY/VERIFY) ──┐
              │ 3a. Map-Reduce fan-out                           │
              │   - N subagents, one per BQ table / per probe    │
              │   - reduce: gap report → 00-plan.md addendum     │
              │   - skip Stages 3b-6 (no diff written)           │
              │   - commit: [V8 ITER-<N> DISCOVERY-REPORT]       │
              └──────────────────────────────────────────────────┘
                                     ▼ if READ-WRITE
            ┌─────────────────────────────────────────────────────┐
            │ 3b. Implementer (Sonnet, single-threaded)           │
            │   → P5 dispatch validator gates entry               │
            │   → writes code + tests                             │
            │   → commit: [V8 ITER-<N> IMPL]                      │
            └────────────────────────┬────────────────────────────┘
                                     ▼
            ┌─────────────────────────────────────────────────────┐
            │ 4. Two-Stage Review                                 │
            │   4a. Completeness Reviewer (Sonnet)                │
            │       → 01-completeness.md PASS/FAIL                │
            │   4b. Quality Reviewer (Opus)                       │
            │       → 02-quality.md PASS/FAIL                     │
            │   ── if either FAIL → kick back to Planner ──       │
            │   commit: [V8 ITER-<N> REVIEW]                      │
            └────────────────────────┬────────────────────────────┘
                                     ▼
            ┌─────────────────────────────────────────────────────┐
            │ 5. Stop hook chain (P4, blocks until clean)         │
            │   5a. Deterministic Verifier                        │
            │       - npm run build                               │
            │       - npx tsc --noEmit                            │
            │       - probe-evidence (any "X unavailable" has     │
            │         adjacent SQL probe)                         │
            │       - multi-viewport screenshots 375/768/1280/    │
            │         1920px (Playwright)                         │
            │       - scripts/audit-copy.mjs --llm (0 P0 leaks)   │
            │       → 03-verify.json                              │
            │       - on FAIL: {"decision":"block","reason":...}  │
            │   5b. Cross-Vendor Judge VOTING (3× gpt-5.5)        │
            │       → 04-judge-{a,b,c}.md, PASS ≥ 2/3             │
            │       - on minority-FAIL: log to program-database   │
            │       - on majority-FAIL: {"decision":"block",...}  │
            │   5c. Doctrine Checker (P9, Sonnet)                 │
            │       → 05-doctrine.md                              │
            │       - must name comparable + signature move +     │
            │         doctrine quote                              │
            │   commit: [V8 ITER-<N> VERIFY]                      │
            └────────────────────────┬────────────────────────────┘
                                     ▼
            ┌─────────────────────────────────────────────────────┐
            │ 6. Deploy gate                                      │
            │   - git push origin main (Vercel auto-deploys)      │
            │   - poll prod URL until 200                         │
            │   - increment vercel-deploys in cost-ledger.jsonl   │
            │   commit: [V8 ITER-<N> DEPLOY]                      │
            └────────────────────────┬────────────────────────────┘
                                     ▼
            ┌─────────────────────────────────────────────────────┐
            │ 7. CEO Signal Surfacer (Sonnet)                     │
            │   - file proposal row at /admin/review              │
            │   - waits for Roham's ✓/✗/🎨 with 72h timeout       │
            │   - Phase 4 = post-apply (no pre-approval)          │
            │   - vote outcome → vote-log.jsonl                   │
            │   commit: [V8 ITER-<N> CEO-SIGNAL]                  │
            └────────────────────────┬────────────────────────────┘
                                     ▼
            ┌─────────────────────────────────────────────────────┐
            │ 8. Archive + ledger update                          │
            │   - write iteration-<N>.json (4 questions answered) │
            │   - update task-ledger.json (queue advance)         │
            │   - recompute phase-status.json (P7)                │
            │   - on FAIL: write program-database/<iter>.json     │
            │   - check P12 compression threshold                 │
            │   commit: [V8 ITER-<N> ARCHIVE]                     │
            └─────────────────────────────────────────────────────┘
                                     ▼
                          (back to cron tick)
```

**Stall replan (P2):** if `iteration-<N>.failure_signature == iteration-<N-1>.failure_signature`, the next tick routes to META track instead of advancing the queue. META reads program-database, proposes a new plan, writes it to task-ledger.json, increments `replan_count`. Hard halt at `replan_count == 5` (V7 inheritance preserved).

---

## §6 — Cost + cadence envelope (P8 + P10 replacement)

V7 §9 rule 3 ("no spend cap, no effort cap, push through") is REMOVED. The new rule:

> **Within the budget envelope below, treat compute as cheap. Outside, escalate to Roham via `/admin/review` before continuing.**

| Resource | Daily cap | Per-iter cap | Hook |
|---|---|---|---|
| BigQuery scanned | 50 GB | 5 GB | PreToolUse on `bq query` |
| Vercel production deploys | 10 | 1 | PreToolUse on `git push origin main` AND wall-clock since-last-push ≥ 5 min |
| gpt-5.5 calls (judge voting) | 100 (≈ 33 iters × 3-vote) | 3 | PreToolUse on OpenAI HTTP call |
| Anthropic tokens | $50 (≈ 25M Sonnet input or 5M Opus input) | $2 | PreToolUse on Claude SDK call |
| Wall-clock per iter | n/a | 60 min | Stop hook on timeout |

**Cron cadence:** every 30 min. Daily theoretical max = 48 iters; cost gates cap it earlier in practice (~25-30 iters/day at the Anthropic envelope). Cluster-recovery window respects existing degradation banner — if Supabase health endpoint returns "degraded," the orchestrator pauses Loop A heavy ops automatically.

---

## §7 — Verification gates (mid-stream, prevent hollow synthesis)

Per Anti-Shortcircuit Rule 4 (synthesis on hollow data is the dominant Pipeline failure):

**Gate A — between Planner and Implementer.** Reads `00-plan.md`. Rejects if:
- any subagent dispatch is missing one of the 5 P5 fields
- the plan contains "approximately" / "would suggest" / "TBD" / "should probably" without an accompanying probe
- the plan claims data unavailable without `bq show --schema` proof (per Anti-Shortcircuit Rule 1, FM3)

→ kicks back to Planner with stricter directives. Implemented as `loop/v8/scripts/dispatch-validator.mjs`.

**Gate B — between Implementer and Two-Stage Review.** Reads the diff. Rejects if:
- diff includes a TODO / FIXME / `// xxx` left for the reviewer
- new component shipped without a Playwright assertion
- new query shipped without a smoke test in `e2e/`

→ kicks back to Implementer. Implemented as the first check in the Completeness Reviewer's prompt.

**Gate C — between Two-Stage Review and Stop hook.** Reads `01-completeness.md` + `02-quality.md`. Rejects if either is FAIL. Routes to Planner if completeness FAILED (under-scope); routes back to Implementer if quality FAILED (wrong-implementation).

**Gate D — final orchestrator spot-read (Rule 5).** Before the CEO Signal Surfacer fires, orchestrator opens `00-plan.md` + the largest file in the diff and reads them end-to-end. Looks for hollowness markers ("approximately," "would suggest," "likely," "appears to," "cannot determine" without numbers + queries). If found, the iter is aborted at archive — `iteration-<N>.json.verdict = "ABORTED_HOLLOWNESS"`, program-database entry filed, next tick goes to META.

---

## §8 — Failure handling (FM1-FM14 → orchestration hook)

| FM | Name | Orchestration hook |
|---|---|---|
| FM1 | OAuth IDs as PII | Implementer's `bq-pull-*.mjs` MUST include 3-layer PII shape gate (pre-flight 20-sample / per-100K-row / post-write 20-sample). Doctrine checker (P9) flags any new BQ-write script lacking this. |
| FM2 | Trusted curated table list | Planner MUST `bq ls dapperlabs-data.production_sem_open.*` + `INFORMATION_SCHEMA.TABLES` enumeration before declaring "data unavailable." Verifier rejects negative findings without proof (Rule 1). |
| FM3 | Doubled down on challenged claim | Quality Reviewer is explicitly instructed: when a claim is challenged once, prove it; when challenged twice, recheck premise from sources. Compiles into 02-quality.md as `challenge-history`. |
| FM4 | 14K lines of doctrine before customer impact | Track Selector deprioritizes META/DISCOVERY tracks if last 3 iters were all META/DISCOVERY. Hard rule: at least 1 customer-visible deploy per 3 iters. |
| FM5 | Prior art discovered late | Planner MUST grep `research/` + `scripts/` + `lib/` for the touched-file basenames before proposing the diff. Output of grep → 00-plan.md §prior-art. |
| FM6 | In-memory Map → OOM | Doctrine checker (P9) flags any new bulk DB script using in-memory aggregation; rejects in favor of stream→file→bulk-load. |
| FM7 | Three writers racing | Implementer MUST acquire `/tmp/topshot-bulk-writer.lock` before any bulk DB op; PreToolUse hook on `psql` / `bq query` checks lock presence. |
| FM8 | VM IAP hiccup | Orchestrator retries IAP-tunneled SSH once silently; surfaces to Roham via `/admin/review` on second failure. |
| FM9 | Copy leaks to production | `scripts/audit-copy.mjs --llm` is part of Stage 5a deterministic verifier; 0 P0 customer-facing leaks is hard PASS criterion. |
| FM10 | Supabase auth path opaque | Pooler URL + sslmode=require is canonical (in `.env.local` and `loop/v8/state/connection.md`); never instruct Roham via UI clicks. |
| FM11 | Cluster resource exhaustion mid-write | Implementer uses `SET statement_timeout = 0` for COPY/UPDATE FROM JOIN; pre-chunks CSVs to ~7M-row pieces; PreToolUse hook reads Supabase health endpoint and pauses if degraded. |
| FM12 | Classifier misfires redundant ledgers | (Outside-this-repo problem in ~/agents/dexter/hooks/; surfaced for awareness, not a topshot-loop concern.) |
| **FM13** | **Hollow-PASS artifacts** | **P3 deterministic verifier + P4 Stop hook + P13 voting judge address this directly. Cannot Phase-4 without all three.** |
| FM14 | Wrong join key on grail-225 | Documented in `research/data-schema/grail-225-with-edition-ids-2026-05-19.csv`; doctrine checker (P9) enforces that any new "supply" claim cites either `market_caps.num_moments_in_circulation` (current circulation) OR `editions.mint_count` (lifetime cap) explicitly. |

---

## §9 — Phase progression gates (P7, deterministic)

`loop/v8/state/phase-status.json` is computed from iter history; `/promote-to-phase-N` only works when `eligible:bool == true`. Computed signals:

```json
{
  "current": 1,
  "phases": {
    "1": { "active": true,  "name": "live taste-daemon (pre-approval)",
            "graduate_to_2_when": {
              "consec_loop_a_pass_votes":   { "required": 10, "current": 0 },
              "consec_loop_b_pass_votes":   { "required": 5,  "current": 0 },
              "roham_explicit_promote":     { "required": true, "current": false }
            },
            "eligible": false },
    "2": { "active": false, "name": "post-apply review",
            "graduate_to_3_when": {
              "consec_loop_a_pass_votes":   { "required": 20, "current": 0 },
              "consec_loop_b_pass_votes":   { "required": 10, "current": 0 },
              "stall_count_last_50_iters":  { "max": 2, "current": null },
              "roham_explicit_promote":     { "required": true, "current": false }
            },
            "eligible": false },
    "3": { "active": false, "name": "post-apply with reduced cadence",
            "graduate_to_4_when": {
              "consec_loop_a_pass_votes":   { "required": 30, "current": 0 },
              "consec_loop_b_pass_votes":   { "required": 20, "current": 0 },
              "hollow_pass_count_last_100": { "max": 0, "current": null },
              "patches_shipped":            { "required": ["P1","P3","P4","P5","P8","P10","P11"], "current": [] },
              "roham_explicit_promote":     { "required": true, "current": false }
            },
            "eligible": false },
    "4": { "active": false, "name": "pure autonomous, infinite",
            "downgrade_when": {
              "consec_fail_votes": { "max": 3, "current": 0 },
              "stop_file_present": { "current": false }
            } }
  }
}
```

**Phase 4 ⇒ orchestrator applies without pre-approval; Roham reviews post-apply via `/admin/review`. Any 3 consecutive ✗ votes auto-downgrades to Phase 2.**

---

## §10 — Subagent dispatch contract (P5, hard-validated)

Every subagent dispatch MUST include all 5 fields. `loop/v8/scripts/dispatch-validator.mjs` is a PreToolUse hook on `Task` tool calls; rejects malformed launches.

```yaml
objective: "<one sentence — what this subagent must produce>"
output_path: "<absolute filesystem path — where the result is written>"
output_format: "<markdown template path OR JSON schema OR strict prose contract>"
tool_boundaries:
  allow: ["Read", "Grep", "Bash:psql:*", "Bash:bq:query"]
  deny:  ["Write:lib/**", "Edit:components/**"]
predecessor_artifacts:
  - "/Users/.../00-plan.md"
  - "/Users/.../research/data-schema/grail-225-vaultopolis-canonical-2026-05-19.csv"
  # full paths only, never summaries — Cognition share-full-context
```

**Every subagent prompt also embeds the five Anti-Shortcircuit Rules** (negative findings need schema proof / skill names don't transit / no spend cap doesn't transit / mid-stream verification gates / orchestrator spot-reads load-bearing file). Not optional. Not paraphraseable past unrecognizability.

---

## §11 — Spot-read protocol (Rule 5)

Before the CEO Signal Surfacer fires for each iter, the orchestrator MUST read end-to-end:

1. **`00-plan.md`** — does it name the comparable + signature move + doctrine quote? Does it cite the predecessor artifacts by absolute path?
2. **The largest file in the diff** — for Tier A items: the file in question per handover §6 (e.g., for A-1, `lib/indices/grail-synthesizer.ts`).
3. **`03-verify.json`** — were any deterministic checks SKIPPED rather than PASSED?
4. **`04-judge-{a,b,c}.md`** — did the minority FAIL flag something the majority missed? Log to program-database regardless of overall verdict.

Hollowness markers to scan: "approximately," "would suggest," "likely," "appears to," "cannot determine," "TBD," "for now," "fallback." Any of these without an adjacent number-or-query → iter is ABORTED_HOLLOWNESS, program-database entry filed, next tick goes to META.

---

## §12 — How the loop becomes genuinely infinite

The handover commits to Phase 4 = pure autonomous, infinite. The mechanism:

1. **Tier A ships** (6 items, ~5h, manual session under Phase 1 D).
2. **V8 Charter authoring + load-bearing patches (P1+P3+P4+P5+P8+P10+P11) land** (~6h, manual session under Phase 1 D).
3. **Roham types `/promote-to-phase-4`** at `/admin/review` once `phase-status.json` shows `eligible: true` (all 7 patches present + sufficient ✓ vote history under Phase 1).
4. **Phase 4 flips on.** Orchestrator now applies without pre-approval; Roham reviews post-apply.
5. **Tier B → Tier C → Tier D ship under Phase 4** (~15-21h total wall-clock, ~30 iters at 30-min cadence).
6. **After Tier D close, the loop cycles back to Loop A DISCOVERY** — there's always more BQ data to surface (the Vaultopolis topshot-data catalog ingest, asset_ownership_nba_moment_history at 197.8M rows, the 9 other unpulled NBA tables from BQ enumeration, locked-moments backfill, sibling parallels backfill, …).
7. **Loop A DISCOVERY surfaces a gap → Loop B re-enters** to visualize the newly-organized data. The two loops alternate forever.
8. **Discovery never terminates.** Top Shot mints new editions weekly; rookie classes refresh annually; Vaultopolis catalogs new tags; new BQ tables get exposed. The orchestrator never reaches "complete."

The "impactful" part: every loop ships customer-visible artifacts to `topshot-data-portal.vercel.app`. FM4 (14K lines of doctrine before impact) is structurally prevented by the Track Selector's "at least 1 customer-visible deploy per 3 iters" rule.

---

## §13 — Implementation manifest (what gets written when this charter ships)

Files to create (~6h focused doc-write + scripting):

```
.claude/settings.json                                            # Stop + PreToolUse hooks wired
loop/v8/CHARTER.md                                              # this file (already exists as draft)
loop/v8/scripts/cron-tick.sh                                    # the cron entrypoint
loop/v8/scripts/stop-gate.sh                                    # Stop hook orchestrator
loop/v8/scripts/verify-deterministic.sh                         # P3 — build + tsc + probe-evidence + multi-viewport + copy-audit
loop/v8/scripts/dispatch-validator.mjs                          # P5 — rejects malformed Task tool calls
loop/v8/scripts/cost-gate.mjs                                   # P8 — PreToolUse on bq/vercel/openai/anthropic
loop/v8/scripts/judge-vote.mjs                                  # P13 — 3× gpt-5.5 voting wrapper around verify-via-openai.py
loop/v8/scripts/orchestrator.mjs                                # the main loop driver
loop/v8/scripts/compress-transcript.mjs                         # P12 — Haiku compression at >100K tokens
loop/v8/state/task-ledger.json                                  # P1 outer ledger (seeded with Tier A queue)
loop/v8/state/phase-status.json                                 # P7 phase eligibility
loop/v8/state/cost-ledger.jsonl                                 # P8 ledger
loop/v8/state/program-database/.gitkeep                         # P6 FAILed iter archive
loop/v8/state/vote-log.jsonl                                    # CEO ✓/✗/🎨 log
loop/v8/prompts/orchestrator.md                                 # orchestrator system prompt
loop/v8/prompts/planner.md                                      # Planner system prompt (Opus)
loop/v8/prompts/implementer.md                                  # Implementer system prompt (Sonnet)
loop/v8/prompts/completeness-reviewer.md                        # Sonnet
loop/v8/prompts/quality-reviewer.md                             # Opus
loop/v8/prompts/doctrine-checker.md                             # Sonnet
loop/v8/prompts/ceo-signal-surfacer.md                          # Sonnet
loop/v8/prompts/meta-track.md                                   # Opus
```

Cron entry (kaaos-daemon, user `r_dapperlabs_com`):

```cron
*/30 * * * * cd /home/r_dapperlabs_com/topshot-builder/topshot-data-portal && \
  ./loop/v8/scripts/cron-tick.sh >> /var/log/topshot-loop/v8.log 2>&1
```

`.claude/settings.json` wiring:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash",        "hooks": [{ "type": "command", "command": "./loop/v8/scripts/cost-gate.mjs" }] },
      { "matcher": "Task",        "hooks": [{ "type": "command", "command": "./loop/v8/scripts/dispatch-validator.mjs" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "./loop/v8/scripts/stop-gate.sh" }] }
    ]
  }
}
```

---

## §14 — Why this design satisfies "precise, accurate, autonomous, impactful"

| Adjective | Mechanism |
|---|---|
| **Precise** | Every subagent dispatch validated against 5-field P5 contract; every artifact has an absolute filesystem path; every gate has a named rejection condition; every commit has a stage tag for `git log` legibility. |
| **Accurate** | Deterministic primitives run BEFORE the LLM judge (P3); voting verifier requires ≥ 2/3 PASS on three different seeds (P13); doctrine checker (P9) asserts every shipped feature names a comparable + signature move + doctrine quote; hollowness markers scanned at Gate D before CEO signal. |
| **Autonomous** | Cron-driven at 30-min cadence; no human in the loop at Phase 4 (post-apply review only); self-healing on stall (META track on identical failure_signature); self-improving via program-database (Planner reads recent fails); self-cost-bounded via PreToolUse cost gates (P8). |
| **Impactful** | Every iter ships to `topshot-data-portal.vercel.app`; Track Selector enforces ≥ 1 customer-visible deploy per 3 iters; Tier A→B→C→D cycle alternates with Loop A DISCOVERY indefinitely; new BQ data + new Vaultopolis tags + new Top Shot mints keep the discovery surface genuinely infinite. |

---

## §15 — Open questions for Roham

These three got deferred in V8 Q&A; defaults from recommendation apply unless overridden:

- **Q11 (deferred):** Should META track be allowed to modify CHARTER.md itself, or only task-ledger.json? **Default:** META modifies task-ledger.json only; CHARTER.md changes require explicit Roham edit + `/promote-to-v9`.
- **Q12 (deferred):** Should `program-database` retain ALL FAILed iters or only the most recent N? **Default:** retain all; size cap 100MB → oldest-first eviction once threshold hit.
- **Q13 (deferred):** Should the voting verifier use the same gpt-5.5 model with 3 seeds, or 3 different models (gpt-5.5, claude-sonnet-4.6, gemini-2.5-pro)? **Default:** same model, 3 seeds, temp=0.7 to capture variance; multi-model voting added if same-model voting still produces hollow-PASS.

Each lands as a one-line decision at `/admin/review` whenever Roham touches the loop next.

---

## §16 — Boot order for the session that ships V8 Charter

1. Read this charter end-to-end (~15 min).
2. Read `HANDOVER-topshot-portal-v8-launch-2026-05-19.md` §5 + §11 (~5 min) for the spec context.
3. Read `loop/v7/CHARTER.md` §2 + §3 (~5 min) for the inheritance baseline.
4. Write the 8 scripts in `loop/v8/scripts/` per §13 manifest.
5. Write the 8 prompt files in `loop/v8/prompts/` per §13 manifest.
6. Write the 4 state files in `loop/v8/state/` per §13 manifest (start in Phase 1 / not yet eligible / cost-ledger empty / program-database empty).
7. Write `.claude/settings.json` per §13 wiring.
8. Dry-run on kaaos-daemon: `./loop/v8/scripts/cron-tick.sh --dry-run` — should plan an iter, not apply it.
9. Wet-run one iter under Phase 1 (D — pre-approval) with Roham watching.
10. Once Roham votes ✓ on the wet-run output, install the cron line and commit `[V8 CHARTER LIVE]`.
11. Continue Phase 1 (D) for the rest of Tier A. Promote to Phase 4 only when phase-status.json shows `eligible: true` AND Roham types `/promote-to-phase-4`.

---

## §17 — Two-line summary

V8 is V7 with deterministic primitives running before LLM judges (P3+P4), a 5-field subagent dispatch contract (P5), PreToolUse cost gates (P8), two-ledger task state (P1), and a voting cross-vendor verifier (P13) — all wrapped around a Daemon-Dispatched Pipeline-of-Pipelines that runs every 30 min on kaaos-daemon, ships customer-visible artifacts to Vercel each iter, and cycles Tier A→B→C→D→Loop A DISCOVERY forever.

The "infinite" part isn't aspirational: Top Shot mints new editions weekly, BQ exposes new tables monthly, Vaultopolis tags new categories quarterly, and Loop A DISCOVERY surfaces those every cycle while Loop B visualizes them — discovery never terminates and cost gates cap the burn at $50/day Anthropic + 10 Vercel deploys + 100 gpt-5.5 calls + 50GB BQ.

— Dexter, 2026-05-19 (draft for Roham sign-off before scripts land in `.claude/`)
