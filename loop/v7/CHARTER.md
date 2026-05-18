# Top Shot Data Portal — V7 Loop Charter

**Version:** V7 — two-loop architecture with cross-vendor review + CEO taste-daemon signal.
**Status:** Authoritative. Every Loop A / Loop B iteration reads this before dispatch.
**Inheritance:** Supersedes V5's single-track LOOP-CHARTER. Adopts lore-vault multi-track + corrective priority + anti-stall + tier model. Closes V1–V5 failure shapes.

---

## §1 — Architecture

Two independent loops run **sequentially** per Roham's Q3=A:

- **Loop A (Data Quality) — scope = C per Roham 2026-05-17:** Discovery + Fix + Organize. Means three responsibilities:
  - **DISCOVERY** — probe every BQ view in `dapperlabs-data.production_sem_open.*`, identify columns we're NOT yet pulling, propose ETL extensions. Source-of-truth coverage EXPANDS over time, not contracts.
  - **FIX** — close every confirmed gap from `source-of-truth-mapping.md §5` (owner_flow_address, buyer/seller_safe_name, 2-year transaction backfill, etc.).
  - **ORGANIZE** — design new Supabase tables/MVs/RPCs to organize data for portal needs (sibling editions from Top Shot GraphQL, parallels lookup, daily-grain aggregations like `mv_player_daily_volume`, pack provenance, set completion derivatives).

  Runs to "complete enough" signal per `research/quality-rubrics/loop-a-rubric.md §8`. Then drops to maintenance + ongoing-discovery cadence (one DISCOVERY iter / day to find newly-exposed BQ columns).

- **Loop B (Visualization)** — kicks off when Loop A signals. Two phases: Phase A (/market-cap deepening) then Phase B (clone pattern to /players, /moments, /sets, /u/[username]).

Both loops share:
- `/admin/review` surface (CEO signal infrastructure)
- Cross-vendor (OpenAI gpt-5.5) review at end of each iteration
- Multi-axis rubric (Loop A: 7 axes; Loop B: 8 axes)
- Multi-track selection with corrective priority
- Anti-shortcircuit rules embedded per dispatched subagent

---

## §2 — Roham's role progression (per Q4 answer)

**Phase 1 — D (live taste-daemon, votes are PRIMARY eval signal):**
- Loop A surfaces every PROPOSED CHANGE to `/admin/review` BEFORE applying (proposal-approval).
- Loop B surfaces every shipped page to `/admin/review` AFTER deploy preview (vote-on-output).
- Roham clicks ✓ / ✗ / 🎨 + comments.
- Anti-stall: no CEO vote 72h → orchestrator pauses + routes to META track.

**Phase 1 → Phase 2 transition trigger:**
- 10 consecutive ✓ votes on Loop A proposals AND
- 5 consecutive ✓ votes on Loop B pages AND
- Roham types `/promote-to-phase-2` in any /admin/review comment field

**Phase 2 — B (/admin/review surface with vote signal in-loop):**
- Same surface; same vote semantics.
- Difference: orchestrator applies changes WITHOUT pre-approval if cross-vendor verdict = PASS. Roham reviews POST-apply.
- ✗ vote on a post-apply change triggers a REPAIR track (revert + redo).
- Anti-stall: no vote 72h → orchestrator continues at reduced cadence (1 iteration/4hr instead of 1/cycle).

**Phase 2 → Phase 3 transition trigger:**
- ≥ 80% ✓ vote rate over last 30 iterations AND
- Roham types `/promote-to-phase-3`

**Phase 3 — C (daily standup + redirect):**
- Loop runs autonomously.
- STOP file at repo root pauses immediately.
- Nightly digest auto-generated → `loop/v7/digests/YYYY-MM-DD.md` with: iterations run, tracks taken, gaps closed, audit deltas, screenshots of shipped pages.
- Roham reviews next morning, redirects via:
  - Editing `features.json` priorities
  - Adding entries to `loop/v7/backlog.json`
  - Setting `next_track_force` in `loop/v7/state/redirect.json`

**Phase 3 → Phase 4 transition trigger:**
- Roham types `/promote-to-phase-4` after a digest

**Phase 4 — A (pure autonomous + PR notifications):**
- No CEO signal in-loop.
- All work goes through PR.
- Roham reviews PRs at his pace; loop continues regardless.

---

## §3 — Multi-track selection rule

The orchestrator picks ONE track per iteration. Priority order is deterministic — lowest-numbered eligible track wins.

### Loop A tracks (priority order) — scope C: Discovery + Fix + Organize

1. **BUILD-FAILING** — `npm run build` returns non-zero. Fix.
2. **AUDIT-FAILING** — Last audit run has any P0 probe at FAIL. Re-run + fix.
3. **CEO-CORRECTIVE** — `/admin/review` has any ✗ vote on a Loop A artifact in last 72h. Address.
4. **CORRECTIVE (FIX)** — Any P0 gap from `source-of-truth-mapping.md §5` still open.
5. **BACKFILL (FIX)** — Any P1 gap (time range, name coverage).
6. **DERIVATIVE (ORGANIZE)** — Any P2/P3 gap (sibling parallels, daily-grain MV, edition-parallel lookup, etc.).
7. **DISCOVERY** — Probe BQ schema for new columns we're not yet pulling. Per scope C, this runs continuously: 1 iter / day during active loop; 1 iter / week during maintenance.
8. **VERIFY** — Audit clean, no votes pending, no gaps. Re-run audit to regress-check.
9. **META** — Same fail-shape 3 consecutive iterations OR no CEO vote 72h.

### Loop B tracks (priority order)

1. **BUILD-FAILING** — same
2. **VISION-DIFF-FAIL** — Any shipped page has Claude vision-judge FAIL within 72h. Re-build.
3. **CROSS-VENDOR-DISAGREE** — Cross-vendor verdict differs from Claude. Re-investigate.
4. **CEO-CORRECTIVE** — Any ✗ vote on a Loop B page in last 72h. Repair.
5. **TASTE-PASS** — Any 🎨 vote (taste pass needed). Re-shape.
6. **DERIVATIVE** — Phase B page not yet built (sequenced: /players → /moments → /sets → /u/[username]).
7. **DEEPENING** — All Phase B pages shipped + cleared. Add chart cuts to existing surfaces per doctrine §9.
8. **META** — Same fail-shape 3 consecutive iterations OR no CEO vote 72h.

---

## §4 — Anti-stall protocol

Triggered when ANY of:
- 3 consecutive iterations have the same `failure_signature` (same axis FAIL, same root cause).
- No CEO vote (Phase 1 / 2) for 72h consecutive.
- Cross-vendor reviewer disagrees with Claude for 3 consecutive iterations on the same axis.
- Build has been red for > 4 hours.

**Anti-stall actions:**
1. Log incident to `loop/v7/state/anti-stall-events.jsonl`.
2. Pause all generative tracks.
3. Switch to META track:
   - Re-read doctrine + rubric + the failing artifact.
   - Author a "what's actually broken here" diagnostic to `loop/v7/state/diagnostics/<timestamp>.md`.
   - Post to `/admin/review` with one button: ✓ proceed with diagnostic recommendation.
4. Wait for Roham vote OR a /redirect file. Do not silently continue.

The lore-vault loop used this pattern — no-vote stall rule prevented spinning on dead-end work.

---

## §5 — Budget caps + cost discipline

Per Roham's prototype project context ("$100/op without asking"):

| Cap | Loop A | Loop B |
|---|---|---|
| Per-iteration LLM spend | $5 | $5 |
| Per-day LLM spend | $50 | $50 |
| Per-iteration wall-clock | 30 min | 60 min |
| Per-day wall-clock | 12 hr | 12 hr |
| BQ scan per query | 10 GB | 10 GB |
| Daemon-VM hours per day | 24 | 24 |
| External-API calls per day | 10,000 | 1,000 (vision API specifically) |

**Hard stops:**
- Iteration exceeds $5 → mark as INVESTIGATE, no commit, escalate to /admin/review.
- Day exceeds $50 → orchestrator pauses, logs `[BUDGET-EXCEEDED]`, waits for Roham.
- BQ query exceeds 10 GB → query is killed (matches ETL CONFIG.bqMaxBytesBilled).

Costs are tracked in `loop/v7/state/cost-ledger.jsonl` (one row per LLM call: `{iteration, role, model, input_tokens, output_tokens, cost_usd}`).

---

## §6 — File ownership boundaries

The lore-vault loop succeeded partly because paralle daemons had non-overlapping file write boundaries. We adopt the pattern even though our loops are sequential, because the boundary discipline prevents accidental cross-loop damage.

### Loop A writes (data layer)

- `scripts/etl/**`
- `supabase/migrations/**`
- `scripts/probes/**`
- `loop/v7/scripts/**` (audit + verify scripts)
- `loop/v7/state/loop-a-*.json`
- `research/data-schema/**` (regenerated by Loop A probes)
- `research/audits-baseline/**` (re-run + commit)

### Loop B writes (presentation layer)

- `app/**` (page routes)
- `components/**` (chart components, primitives)
- `lib/supabase/queries/**` (data-layer functions consumed by pages)
- `lib/chart-palette.ts`, `lib/market-cap/**` (shared chart primitives)
- `e2e/**` + `loop/judge/journeys/**` (vision-diff + DOM substance journeys)
- `loop/v7/state/loop-b-*.json`
- `research/comparables/**` (visual reference library)
- `research/patterns/**` (Loop B cookbook updates)

### CEO + Opus territory (neither loop writes; PRs only)

- `research/doctrine.md`
- `research/quality-rubrics/**` (the rubric is doctrine — only Roham or Opus may edit)
- `loop/v7/CHARTER.md` (this file)

### Inter-loop communication

- `loop/v7/state/loop-b-requests-loop-a.jsonl` — Loop B writes requests; Loop A reads + addresses next iteration.
- `loop/v7/state/loop-a-blocking-loop-b.json` — Loop A signals "I am still working on data X that Loop B page Y depends on."
- `loop/v7/state/handoff.json` — Loop A signals "data complete enough; Loop B may proceed."

---

## §7 — Tier model (per loop)

| Role | Model | Why |
|---|---|---|
| Orchestrator | Claude Opus 4.7 | Track selection + spot-read load-bearing files + multi-track coordination |
| Researcher (per iteration) | Claude Sonnet 4.5 | Schema lookup, gap discovery, fix design |
| Builder (per iteration) | Claude Sonnet 4.5 | Apply migrations, run backfills, build MVs (Loop A); build pages, charts (Loop B) |
| Mechanical probes | Claude Haiku | Single-query probes, type-checks, lints, format. High-volume Map operations. |
| Vision-judge | Claude Sonnet 4.5 (vision) | n/a Loop A; Loop B B1 axis |
| Cross-vendor reviewer | OpenAI gpt-5.5 | Independent verdict |
| Quality reviewer (Stage 2) | Claude Opus 4.7 | Reviews cross-vendor + substantive change |

---

## §8 — /verification-before-completion (gpt-5.5, no fallback) — LOAD-BEARING GATE

**This is the ONE step every iteration MUST pass before commit.** Named explicitly: `/verification-before-completion`. Implemented via `loop/v7/scripts/verify-via-openai.py`. Model: **gpt-5.5 ONLY — NO FALLBACK** (per Roham 2026-05-17). If gpt-5.5 is unavailable, the verdict is FAIL.

The structural rationale (per V4 meta-analysis): single in-loop evaluator with a known blind spot is the V4 failure mode. /verification-before-completion is the EXTERNAL judge that breaks the convergence. It is not optional. It is not a polish step. It is the gate.

**Script:** `loop/v7/scripts/verify-via-openai.py`
**Model:** `gpt-5.5` (no fallback)
**OpenAI API key source:** GSM secret `topshot-loop-openai-api-key` in project `dl-ai-pantheon`. Orchestrator pulls at boot:
```bash
export OPENAI_API_KEY=$(gcloud secrets versions access latest \
  --secret=topshot-loop-openai-api-key --project=dl-ai-pantheon)
```
Service account `941997949640-compute@developer.gserviceaccount.com` AND `sinbad-agent@dl-kaaos.iam.gserviceaccount.com` are granted `roles/secretmanager.secretAccessor` per Dexter's 2026-05-17 wiring.

**Inputs:**
- `--iteration-state <path>` — JSON describing the iteration (track, files changed, axis scores, etc.)
- `--diff-path <path>` — `git diff` against HEAD
- `--rubric-path <path>` — `loop-a-rubric.md` OR `loop-b-rubric.md`
- `--doctrine-path <path>` — `research/doctrine.md`
- `--source-of-truth-path <path>` — `research/data-schema/source-of-truth-mapping.md` (Loop A only)
- For Loop B vision-diff: `--rendered-screenshot <path>`, `--comparable-screenshot <path>`, `--comparable-name`, `--signature-move-text <path>`

**Outputs (JSON):**
```json
{
  "verdict": "PASS" | "FAIL" | "NEEDS-WORK",
  "axis_scores": { "a1": 0-100, "a2": 0-100, ... },
  "weighted_overall": 0-100,
  "failure_modes": [{ "axis": "...", "what": "...", "evidence_excerpt": "..." }],
  "improvements": [{ "axis": "...", "suggestion": "...", "priority": "P0|P1|P2" }],
  "doctrine_violations": [{ "principle": "P1..P9", "what_breaks_it": "..." }],
  "would_you_ship_this": true | false,
  "one_line_justification": "..."
}
```

**Decision logic:**
- `PASS` → orchestrator commits + pushes + advances cursor.
- `NEEDS-WORK` → orchestrator commits but opens a follow-up task in `features.json` AND surfaces in /admin/review with 🎨 pre-marked.
- `FAIL` → orchestrator does NOT commit. Re-dispatches the iteration's builder with `failure_modes` as input. Counts toward anti-stall (3-consecutive-FAIL fires META).

The script uses the OpenAI API directly (gpt-5.5 model). API key from `OPENAI_API_KEY` env var. Output is parsed; non-parsing output = FAIL (assume worst case).

---

## §9 — Anti-shortcircuit rules (embedded in every subagent prompt)

These five rules from the THOTH skill MUST appear verbatim or paraphrased in every Researcher / Builder / Judge dispatch prompt. They DO NOT transit from orchestrator memory.

1. **Negative findings require positive proof.** If you declare any column / table / endpoint unavailable, you MUST cite a schema introspection query or live probe that proves it. Absence from `source-of-truth-mapping.md` or `bq-bnp-views.md` is NOT proof; those docs are starting context, not the final word. Run a new probe + commit the result.

2. **Skill names don't transit execution requirements.** When you're told to "use /audit" or "run /vision-diff" or "invoke /heimdall-data-science:investigate," naming the skill is necessary but never sufficient. The skill's multi-step flow MUST be executed in full. Step 1 (preparation / lookup) is the cheapest; steps 2–N are the actual work. You MUST execute all steps and document each step's output.

3. **No spend cap. No effort cap. Push through.** If a query times out, optimize and retry. If a table is wrong, find the right one. If a tool is missing, find an alternative. The user has explicitly authorized full effort up to `$5/iteration AND $50/day` per V7 charter §5; you are not the binding cost constraint, you are the work.

4. **Mid-stream verification gates.** Between data-gathering and synthesis stages, parse the upstream output. If you find "CANNOT DETERMINE," "TBD," "approximately," "would suggest," "appears to" WITHOUT accompanying numbers / queries, kick back to the upstream stage. DO NOT run synthesis on hollow data. The structural success signal (commit landed, file written) hides substantive failure.

5. **Orchestrator MUST spot-read load-bearing files.** Before declaring the iteration complete, the orchestrator reads the LOAD-BEARING file (e.g., `bq-bnp-schema-dump.md` after a probe, the rendered page screenshot after a Loop B ship). Volume + structural completion ≠ substantive completion. If the load-bearing file is hollow, the iteration is NOT complete.

---

## §10 — Iteration state schema

Every iteration writes `loop/v7/state/iteration-<N>.json`:

```json
{
  "iteration_id": "loop-a-0042" | "loop-b-0017",
  "loop": "A" | "B",
  "track": "BUILD-FAILING" | "CORRECTIVE" | "BACKFILL" | ...,
  "started_at": "2026-05-17T22:14:00Z",
  "finished_at": "2026-05-17T22:43:00Z",
  "files_changed": ["scripts/etl/lib/etl-helpers.mjs", "scripts/etl/lib/sync.mjs"],
  "commits": ["abc123", "def456"],
  "research_note_path": "research/iterations/loop-a-0042-research.md",
  "build_log_path": "loop/v7/state/iteration-0042.build.log",
  "axis_scores": { "a1": 95, "a2": 90, ... },
  "weighted_overall": 92,
  "cross_vendor_verdict": "PASS" | "FAIL" | "NEEDS-WORK",
  "cross_vendor_path": "loop/v7/state/iteration-0042.verify.json",
  "ceo_signal": "✓" | "✗" | "🎨" | null,
  "ceo_signal_received_at": "..." | null,
  "ceo_comment": "..." | null,
  "anti_stall_event": null | "..."
}
```

This is the orchestrator's persistent state. The orchestrator reads the last N iteration files before picking the next track (for anti-stall detection + transition triggers).

---

## §11 — Dispatch (where loops run)

**Loop A** runs on **kaaos-daemon VM** (autonomous, overnight-capable, BQ-and-Supabase access without exposing creds to local).

- Launch: `gcloud compute ssh kaaos-daemon ... --command="sudo -u r_dapperlabs_com /opt/pantheon/build-worker.sh loop-a /home/r_dapperlabs_com/topshot-builder/topshot-data-portal/loop/v7/prompts/loop-a.md /home/r_dapperlabs_com/topshot-builder/topshot-data-portal"`
- Monitor: `git fetch && git log origin/main --oneline | grep '\[loop-a\]'`
- STOP: `touch STOP` at repo root.

**Loop B** runs LOCALLY in Claude Code initially (taste-bound work needs the parent context per Roham's Phase 1=D). Once Roham promotes to Phase 3 or later, Loop B promotes to kaaos-daemon.

- Local: `claude --add-dir /Users/ro/dapper/topshot-data-portal --print < loop/v7/prompts/loop-b.md`

---

## §12 — Loop kickoff sequence

**Phase 0 — Prep (one-time, ~2 hours, BEFORE Loop A):**
1. Build `/admin/review` surface (page + migration + API). LOAD-BEARING.
2. Build cross-vendor review script `loop/v7/scripts/verify-via-openai.py`.
3. Commit `loop/v7/CHARTER.md` (this file).
4. Commit `research/quality-rubrics/{loop-a-rubric,loop-b-rubric}.md`.
5. Commit `research/data-schema/{bq-bnp-views,supabase-topshot,source-of-truth-mapping}.md`.
6. Commit `research/audits-baseline/2026-05-17-baseline.md`.
7. Roham authorizes loop kickoff.

**Phase 1 start — Loop A:**
1. Dispatch Loop A orchestrator prompt to daemon.
2. Loop A iteration 1: build `loop/v7/scripts/data-quality-audit.mjs` (committed version of the probe) + run baseline. Post first proposal to /admin/review.
3. Roham votes → loop continues.

**Phase 2 start — Loop B:**
1. When Loop A signals "complete enough" (handoff.json written): pause Loop A.
2. Dispatch Loop B orchestrator prompt locally.
3. Loop B Phase A: deepen /market-cap.
4. Roham votes → Phase B kicks off.

---

*This charter is the contract between the loops, the cross-vendor reviewer, and Roham. Edits require Roham approval + Opus review.*
