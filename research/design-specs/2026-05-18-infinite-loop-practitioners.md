# Infinite-Loop Best Practitioners — Survey + V8 Charter Patches (2026-05-18)

Survey purpose: extract concrete, named patterns from leading practitioners in autonomous-loop / multi-agent software construction, then convert into specific patch-level recommendations against `/Users/ro/dapper/topshot-data-portal/loop/v7/CHARTER.md`.

Scope discipline: this is a practitioner survey, not a literature review. Each pattern below is named by its inventor, sourced to a primary artifact, and tagged with a one-line implication for Dexter's V8.

---

## §1 — Practitioner survey

### 1.1 Anthropic — "Building effective agents" (Dec 2024) + multi-agent research system + Claude Code hooks

**Source:** anthropic.com/research/building-effective-agents; anthropic.com/engineering/built-multi-agent-research-system; code.claude.com/docs/en/hooks.

**Crystallized patterns:**

- **Five canonical agent topologies**: (1) Prompt chaining (sequential, fixed steps), (2) Routing (classifier dispatches to specialist), (3) Parallelization with two variants — *Sectioning* (independent subtasks) and *Voting* (multiple attempts at the same task for confidence), (4) Orchestrator-workers (central LLM decomposes dynamically), (5) Evaluator-optimizer (one generates, one critiques, loop). V7 already does Orchestrator-workers + Evaluator-optimizer; it does NOT yet do *Voting* parallelization explicitly.
- **Subagent contract has four required fields**: objective, output format, tool/source guidance, clear task boundaries. Vague delegation produced duplicate work — they had to explicitly forbid identical searches across subagents.
- **Artifact-via-filesystem pattern**: subagents do NOT return inline to the lead agent; they write to disk and return a path. Drops token overhead and prevents lossy compression of intermediate results.
- **Scaling heuristic for subagent count**: simple query = 1 subagent (3-10 tool calls); comparison = 2-4 subagents (10-15 calls each); complex research = 10+. Parallel tool calling *within* a subagent cut research time up to 90%.
- **Dedicated CitationAgent**: a separate agent that runs *after* generation to attach evidence-to-claim links. Verification is decoupled from generation.
- **Claude Code hook lifecycle**: PreToolUse, PostToolUse, PostToolUseFailure, PostToolBatch, Stop, SubagentStop, UserPromptSubmit, SessionStart, PreCompact, PostCompact, FileChanged, InstructionsLoaded. Each receives JSON; exit code 2 OR `{"decision":"block","reason":"..."}` blocks and feeds stderr back to Claude. This is the substrate Dexter actually runs on — not a theoretical thing.
- **Stop hook = the natural place for a verification gate**. Block `decision: "block"` prevents the agent from claiming completion until tests/lints/verifier pass.

**Implication for V8:** V7's `/verification-before-completion` should be wired as a literal Stop hook, not a script the orchestrator remembers to call. The hook system makes the gate non-bypassable.

### 1.2 Microsoft Research — Magentic-One (arxiv 2411.04468) + AutoGen

**Source:** microsoft.com/en-us/research/articles/magentic-one; arxiv.org/abs/2411.04468.

**Crystallized patterns:**

- **Orchestrator + 4 specialist agents**: WebSurfer (Chromium driver), FileSurfer (markdown file navigator), Coder (writes code + analyzes), ComputerTerminal (shell exec). Modular — agents can be added/removed without retraining.
- **Two-ledger architecture**: *Task Ledger* (outer loop) holds **facts, guesses, current plan**. *Progress Ledger* (inner loop) is rewritten every turn and answers the orchestrator's per-turn questions.
- **Per-turn orchestrator questions** (the Progress Ledger): is task complete? is progress being made? (stall detection) what is the next step? who executes it next?
- **Replan trigger**: stall count > 2 → orchestrator updates Task Ledger and writes a new plan. Crisp threshold, not a vibes call.
- **Outer/inner loop split**: outer = plan revision; inner = step execution. The two cadences are explicit, not blended.

**Implication for V8:** V7's "iteration state schema" is a Progress Ledger by another name, but lacks the explicit Task Ledger (facts vs guesses vs plan) that survives across iterations. V7 also doesn't separate outer-loop replan from inner-loop execution. The Magentic-One stall threshold (>2 = replan) is tighter than V7's "3 consecutive same failure_signature" — worth shortening.

### 1.3 Cognition Labs — "Don't Build Multi-Agents" (2025) + Devin SWE-bench report

**Source:** cognition.ai/blog/dont-build-multi-agents; cognition.ai/blog/swe-bench-technical-report.

**Crystallized patterns:**

- **Two principles of context engineering**: (1) Share context — full agent traces, not summarized messages. (2) Actions carry implicit decisions; conflicting implicit decisions yield bad results. These are the canonical arguments against naive parallelism.
- **Default = single-threaded linear agent**. Cognition explicitly says don't go parallel unless you've solved the implicit-decisions problem.
- **Compression LLM for long tasks**: when context overflows, a separate model compresses history into "key decisions + events" — NOT generic summarization. Preserves the decision trail.
- **Test-driven iteration is the verification primitive**: 72% of Devin's SWE-bench passes took >10 min. Iteration on test feedback is the load-bearing mechanism, not one-shot generation.
- **Sandbox execution constraint**: Devin runs in a clone-the-repo VM with bounded wall-clock. Reproducibility + cost cap from environment design, not policy.
- **Claude Code as exemplar of restraint**: spawns subtasks only for *answering questions*, never for parallel coding. Anti-fragmentation by design.

**Implication for V8:** V7 already runs sequentially (Loop A then Loop B), which is correct per Cognition. But V7's Researcher/Builder/Judge handoff inside a single iteration risks the implicit-decisions problem — Researcher's framing leaks into Builder's assumptions. V8 should mandate that Builder reads the Researcher's *full output file*, not a summary, and that Judge reads both. Also: V7 has no "compression LLM" for long-running iterations — when the orchestrator's context approaches the limit it currently has no defined policy.

### 1.4 OpenAI — Swarm + Model Spec

**Source:** github.com/openai/swarm.

**Crystallized patterns:**

- **Handoff via function return**: an agent's tool-call can return another `Agent` object, transferring control. Routing is a side-effect of normal tool calls, not a separate dispatcher.
- **Stateless client**: Swarm itself stores nothing; the caller threads state via `context_variables` dict. State is explicit and serializable.
- **Routines = instruction + functions bundle**. An "agent" is a workflow step, not a persona.
- **Active-agent-only context**: only the *current* agent's instructions are in the prompt at any moment. Cheap context-switching.

**Implication for V8:** V7's tier-model assignment (Opus/Sonnet/Haiku per role) maps cleanly to Swarm-style handoffs. V8 should formalize handoffs as a typed return shape (`{"handoff_to": "builder", "context": {...}}`) so the orchestrator doesn't have to infer the next agent.

### 1.5 DeepMind — AlphaEvolve (May 2025)

**Source:** deepmind.google/discover/blog/alphaevolve-a-gemini-powered-coding-agent.

**Crystallized patterns:**

- **Evolutionary outer loop, not iterative refinement**: a *program database* stores past candidates. Each cycle: sample parents from DB → LLM mutates → automated evaluator scores → DB selects survivors. NOT linear "improve last attempt."
- **Two-model split for breadth/depth**: Gemini Flash for diverse mutations (explore), Gemini Pro for refinement (exploit). Different temperatures, different jobs.
- **Automated evaluator is mandatory and quantifiable**: AlphaEvolve only works on problems with a programmable scoring function. No human-in-loop per generation.
- **Multi-component edits expected**: solutions touch optimizer + loss + hyperparams together; single-line mutations are rare.

**Implication for V8:** V7 throws away iterations that fail. AlphaEvolve keeps a *graveyard* + samples from it. V8 should preserve failed iterations in a `loop/v8/state/program-database/` so a later orchestrator can rediscover good ideas that were abandoned. Also: V7 mixes Sonnet 4.5 for both Researcher AND Builder — DeepMind's Flash/Pro split (cheap+diverse for exploration, expensive+careful for refinement) is a real signal that V8 should consider different *temperatures* even when using the same model tier.

### 1.6 Cursor — Composer, background agents, .cursorrules

**Source:** cursor.com/docs (and the well-known patterns from the product).

**Crystallized patterns:**

- **Composer mode = multi-file diff editor**: Cursor shows proposed edits across N files in a unified diff before apply. The human is the verification gate.
- **Background agents**: spawn a long-running agent on a branch; you check back later. Async by design.
- **.cursorrules file** = project-scoped instruction file, loaded into every agent context. Same pattern as Claude Code's CLAUDE.md / `.claude/rules/*.md`.
- **Agent vs Chat distinction**: Chat = read-only Q&A; Agent = write+exec authority. Two modes, explicit.

**Implication for V8:** V7 collapses ask-mode and act-mode into one orchestrator. V8 should keep a `READ-ONLY` track for "what should we do next?" decisions (cheap, no writes) distinct from execution tracks. /admin/review already half-does this for CEO signal, but the orchestrator's own *thinking-only* iterations aren't typed separately.

### 1.7 Sourcegraph / Cody — multi-repo context

**Source:** sourcegraph.com/blog (general product knowledge — code-graph + embeddings).

**Crystallized patterns:**

- **Code graph + embeddings hybrid**: structural index (call graph, refs) + semantic index (embeddings). Different queries hit different indices.
- **"Ask, then act"**: Cody insists on reading context before proposing edits. PreToolUse-equivalent gate.
- **Multi-repo context window**: pulls definitions from upstream repos, not just current.

**Implication for V8:** V7's "spot-read load-bearing files" rule (§9 rule 5) is the same idea but informal. V8 should make the orchestrator's load-bearing-file list *typed per track* (e.g., DERIVATIVE track MUST read source-of-truth-mapping.md before dispatch).

### 1.8 Aider / Continue — open-source coding loops

**Source:** aider.chat/docs.

**Crystallized patterns:**

- **Repo map as standing context**: Aider auto-builds a tree of class/function signatures and prepends it. Cheaper than full files.
- **/run and /test commands pipe stdout/stderr back into the chat**: the LLM sees real error output without the human pasting it.
- **Auto-commit per edit**: every successful edit becomes a git commit. Revert is `git reset`. Built-in checkpointing.
- **"Bite-sized steps"** is doctrine: explicit instruction to decompose, not one-shot.

**Implication for V8:** V7 commits per iteration (good) but doesn't auto-revert on FAIL — the iteration is just discarded and re-dispatched. Aider's pattern of *atomic edit = atomic commit + atomic revert* is cleaner. Also: V7 doesn't surface test/lint output back to the Builder in structured form; the verify-via-openai.py call gets axis scores but not raw failure trace. The Builder is missing direct access to its own failures.

### 1.9 Karpathy — Software 2.0, "iron man suit vs robot," autonomy slider

**Source:** karpathy YouTube talks (Andrej Karpathy "Software is changing", LLM agents talks 2024-2025) — synthesized from common-knowledge talks; primary URL was 404.

**Crystallized patterns:**

- **Autonomy slider**: every feature should expose a continuous knob from "human approves every step" → "fully autonomous." Same UI surface, different default position. V7's Phase 1-4 progression IS this slider made discrete.
- **Iron Man suit (augmentation) vs Iron Man robot (autonomy)**: most production AI today is augmentation; the productive frontier is gradually sliding toward autonomy. Most failures come from skipping rungs.
- **Verification is the bottleneck**: generation is cheap; *evaluation at scale* is the rate-limiter. Build the eval before scaling the generator.
- **Vibe coding is real but unverified**: shipping unverified vibe-coded artifacts is the canonical 2026 failure mode.

**Implication for V8:** V7 has the autonomy slider (Phase 1-4) but the *transition gates* are vibes-y ("Roham types /promote-to-phase-2 after 10 ✓ votes"). V8 should make the gate a deterministic computed signal (≥ N consecutive iterations passing the verifier with no FAIL, no anti-stall, no ✗ vote), and Roham's `/promote` is just the confirm action on top of the computed eligibility.

### 1.10 LangChain / LangGraph — graph-based orchestration

**Source:** langchain-ai.github.io/langgraph (fetched as redirect; synthesized from known patterns).

**Crystallized patterns:**

- **State graph**: nodes are agents/functions, edges are transitions. Conditional edges = router. State is a typed dict that flows through.
- **Supervisor pattern**: a routing agent decides which worker runs next based on state; workers return back to supervisor. Star topology.
- **Checkpointing**: state is persisted at each node transition. Resume from any checkpoint.
- **Human-in-the-loop interrupts**: a node can pause graph execution awaiting human input, then resume from same state.
- **Subgraphs**: workflows can nest — a worker can itself be a graph.

**Implication for V8:** V7 has implicit graph structure (orchestrator → researcher → builder → judge → verifier → cross-vendor → CEO) but no formal state object that survives node-to-node. V8's `iteration-<N>.json` is the right shape but it's currently a *record after the fact*, not the *thing that flows through nodes*. Make it the live state, mutated at each node.

### 1.11 Anthropic Skills + Claude Code Hooks — Dexter's actual substrate

**Source:** Dexter runs on Claude Code. Hooks doc above. Skills are markdown files with YAML frontmatter under `plugins/<name>/skills/<skill>/SKILL.md`.

**Crystallized patterns:**

- **Skill discovery is YAML-frontmatter-keyword-matched**, costs ~2% of context window. Over 60 skills → silent hiding.
- **disable-model-invocation** in frontmatter forces manual-only — saves context.
- **Hooks fire deterministically**: PreToolUse never gets skipped. Skills can be skipped if the model doesn't think to invoke them.
- **Settings.json hooks are the most reliable enforcement surface in Claude Code**. Anything in a skill body is advisory; anything in a settings.json hook is mandatory.

**Implication for V8:** V7's anti-shortcircuit rules (§9) are in skill text — advisory. The five rules SHOULD be enforced via PreToolUse and PostToolUse hooks where possible. E.g., "negative findings require positive proof" → a PostToolUse hook on Edit/Write that scans for "CANNOT DETERMINE" / "TBD" without a query reference and blocks.

---

## §2 — Convergence + divergence

### Patterns that appear in ≥3 practitioners (= adopt as doctrine)

| Pattern | Practitioners |
|---|---|
| **Verification is decoupled from generation** (separate evaluator) | Anthropic (CitationAgent + eval-optimizer), DeepMind (programmable evaluator), Cognition (test-driven iter), Aider (/run /test back into chat), Karpathy (eval is the bottleneck) |
| **Artifact-via-filesystem** (subagents write files, return paths) | Anthropic, Magentic-One (FileSurfer), Aider (repo map), Cursor (Composer diffs) |
| **Explicit two-loop / two-ledger separation** (plan-revision vs step-execution) | Magentic-One (Task vs Progress Ledger), LangGraph (supervisor + worker subgraphs), Anthropic (orchestrator-workers + evaluator-optimizer) |
| **Stall threshold = small integer** (2-3 consecutive failures triggers replan) | Magentic-One (>2), V7 (3), Anthropic (no specific number but "if not making progress") |
| **Single-threaded linear default; parallel only for read-only subagents** | Cognition (explicit), Anthropic (read-only research subagents), Claude Code (Q&A only) |
| **Context compression for long runs** | Cognition (compression LLM), Anthropic (summarize completed phases to external memory), Magentic-One (Task Ledger is the compressed view) |
| **Hooks/gates at lifecycle boundaries** | Claude Code (PreToolUse, Stop), Cursor (apply-edit gate), Aider (git auto-commit per edit) |

### Where practitioners disagree

- **Parallelism**: Anthropic embraces it for research; Cognition forbids it for coding. Resolution: parallelize read-only (research, audit, diagnose), serialize write (build, migrate, deploy). V7 currently does this implicitly — V8 should make it explicit policy.
- **Memory model**: AlphaEvolve keeps a *program database* of all attempts; Cognition prefers compressed traces of the *current* run; LangGraph checkpoints state but not failed alternatives. Resolution: V8 keeps both — a *short-term* iteration trace AND a *long-term* graveyard of failed-but-novel attempts.
- **Termination**: Aider terminates on /test pass; Devin terminates on agent self-judgment; Magentic-One terminates on Orchestrator's "task complete?" answer. Resolution: V8 should require BOTH a deterministic primitive (build passes, tests pass) AND the cross-vendor verifier saying PASS. Either alone is insufficient — V4's failure was exactly "deterministic gate passes but artifact is hollow."

---

## §3 — V8 Loop Charter patches (vs V7)

Each patch is named, scoped, and cited.

### Patch P1 — REVISE §10 (Iteration state schema) → adopt Magentic-One two-ledger split

**Source:** Magentic-One.
**Change:** Split `iteration-<N>.json` into two persistent objects:
- `loop/v8/state/task-ledger.json` (outer loop, single file, mutated across iterations) — fields: `facts[]` (probed/verified), `guesses[]` (unverified), `plan[]` (ordered next steps), `last_replan_at`, `replan_count`.
- `loop/v8/state/iteration-<N>.json` (inner loop, per-iteration) — keep current schema but add `task_ledger_version_at_start`, `progress_ledger`: `{ task_complete: bool, progress_made: bool, next_step: str, next_agent: str }`.

**Rationale:** V7 conflates outer plan and inner execution. Magentic-One's separation makes replan triggers crisp and "what is the live plan?" answerable in one read.

### Patch P2 — REVISE §4 (Anti-stall) → tighten threshold + structured replan output

**Source:** Magentic-One (stall > 2), Cognition (compression-on-overflow).
**Change:**
- Lower stall threshold from 3 consecutive to **2 consecutive** identical `failure_signature` (matches Magentic-One).
- On stall, the META track MUST write a *new Task Ledger plan* (not just a diagnostic) and bump `task_ledger.replan_count`.
- Add a `replan_budget`: max 5 replans per Loop-A run; exceeding → escalate to Roham as a "I cannot make this work" signal (this is the agent equivalent of "I quit" — explicit failure mode beats silent looping).

**Rationale:** V7's "log diagnostic + wait for vote" is too passive. Magentic-One's replan-on-stall is more agentic. V7 has no upper bound on replans.

### Patch P3 — ADD §13 (Verification primitives separated from generation)

**Source:** Anthropic (CitationAgent), DeepMind (programmable evaluator), Cognition (test-driven iter).
**Change:** Define three deterministic verification primitives that run BEFORE the gpt-5.5 judge — and the judge cannot run if any deterministic primitive fails:
1. **BUILD** — `npm run build` exit 0.
2. **PROBE-EVIDENCE** — for any Loop A iteration claiming "column X is unavailable" or "table Y doesn't exist", a `loop/v8/scripts/check-claims.py` script greps the iteration's research note for negative claims and checks each has an adjacent SQL probe artifact in `research/data-schema/probes/`. This is §9 rule 1 made enforceable.
3. **MULTI-VIEWPORT** (Loop B only) — every shipped page must have screenshots at 375px, 768px, 1280px, 1920px. Missing any → FAIL before judge runs.

**Rationale:** V7's verifier is one judge. Anthropic, DeepMind, and Cognition all agree: cheap deterministic gates run first, expensive LLM judge runs only on artifacts that pass them. V4's failure (judge says PASS but artifact hollow) was a missed deterministic gate, not a missed LLM gate.

### Patch P4 — REVISE §8 (verification gate) → wire as Claude Code Stop hook

**Source:** Claude Code hooks doc.
**Change:** Currently `verify-via-openai.py` is "called by the orchestrator." Make it a literal `Stop` hook in `.claude/settings.json` (or the daemon's equivalent), so the orchestrator *cannot* claim completion without it firing. `{"decision":"block","reason":"verifier returned FAIL"}` on FAIL.

**Rationale:** Anthropic patterns. Skills are advisory; hooks are enforced. Making the gate a hook moves it from "policy" to "mechanism."

### Patch P5 — ADD §14 (Subagent dispatch contract)

**Source:** Anthropic multi-agent research, Cognition (share context).
**Change:** Every subagent dispatch MUST include all four:
1. `objective` (one sentence, ≤ 25 words)
2. `output_path` (where the artifact will be written, e.g. `research/iterations/loop-a-<N>-research.md`)
3. `output_format` (markdown sections expected, or JSON schema)
4. `tool_boundaries` (allowed tools, disallowed tools, max tool calls)
5. *(addition beyond Anthropic)* `predecessor_artifacts[]` — full file paths to ALL upstream subagent outputs, not summaries (this is the Cognition "share full context" rule).

A subagent dispatch missing any field → orchestrator refuses to launch.

**Rationale:** V7 dispatches via prose prompts. Anthropic's structured contract reduces duplicate work and misalignment. Cognition's full-trace rule prevents the implicit-decisions bug.

### Patch P6 — REVISE §6 (file ownership) → ADD program database

**Source:** AlphaEvolve.
**Change:** Add new write path: `loop/v8/state/program-database/<iteration-id>.json` — preserves every iteration, including FAILs. Schema:
```json
{
  "iteration_id": "...",
  "verdict": "PASS|NEEDS-WORK|FAIL",
  "novel_ideas": ["..."],     // explicit list extracted by judge
  "rejected_reason": "...",
  "diff_snapshot": "..."       // git format-patch of the abandoned change
}
```
META track may sample from this DB when replanning.

**Rationale:** V7 throws away failures. AlphaEvolve keeps them. The Loop A discovery cadence is exactly the kind of evolutionary search that benefits from a graveyard.

### Patch P7 — REVISE §2 (Phase progression) → make gates deterministic

**Source:** Karpathy (autonomy slider should be a slider, not vibes).
**Change:** Each phase transition has a `eligible: bool` computed field in `loop/v8/state/phase-status.json`. Computed from objective signals (consecutive ✓ votes, FAIL rate, days without anti-stall). Roham's `/promote` only works when `eligible == true`. The orchestrator can show "you are 3 ✓ votes from Phase 2 eligibility" in /admin/review.

**Rationale:** V7's "Roham types /promote after 10 ✓ votes" relies on Roham counting. V8 lets the system count.

### Patch P8 — ADD §15 (Cost gates as PreToolUse hook)

**Source:** Claude Code hooks (PreToolUse).
**Change:** Move V7's §5 cost caps from "the orchestrator self-polices" to a `PreToolUse` hook that reads `loop/v8/state/cost-ledger.jsonl`, sums today's spend, and blocks the next LLM call if over budget. Add a per-tool budget:
- BigQuery: max 50 GB scanned/day (matches `bqMaxBytesBilled` * 5).
- Vercel: max 10 deploys/day per branch.
- gpt-5.5 verifier: max 100 calls/day.

**Rationale:** V7 has the policy ($5/iter, $50/day) but not the mechanism. Hooks make it mechanism.

### Patch P9 — ADD §16 (Doctrine compliance checker)

**Source:** Anthropic CitationAgent + cgs-template pattern.
**Change:** A dedicated `doctrine-checker` subagent runs as part of the Stop hook chain. Reads `research/doctrine.md` (§9 "doctrine-named comparable per feature") and the iteration's research note. For each new feature added in the iteration, asserts there is a named comparable, a signature move reference, and a quote from the comparable's doctrine page. FAIL → block.

**Rationale:** V7 has the doctrine but no enforcement. "Doctrine-named comparable per feature" is exactly the kind of textual obligation that drifts without a checker. Anthropic's CitationAgent precedent.

### Patch P10 — REMOVE §9 rule 3 ("No spend cap")

**Source:** V7 §5 has explicit caps; rule 3 contradicts them.
**Change:** Delete the "No spend cap. No effort cap. Push through" rule. It was useful as an anti-shortcircuit rhetorical move but it directly contradicts §5's $5/iter and $50/day. Replace with: "Within the §5 budget envelope, treat compute as cheap; outside it, escalate, do not silently degrade."

**Rationale:** Internal consistency. V7 has both "no spend cap" and "$5/iter cap" — the agent reading both will pick whichever helps it confabulate. V8 picks the cap.

### Patch P11 — ADD §17 (Read/write track typing — Cursor agent-vs-chat)

**Source:** Cursor (agent vs chat).
**Change:** Every track in §3 is tagged READ-ONLY or READ-WRITE.
- READ-ONLY (cheap, no commit): DISCOVERY, VERIFY, META (diagnostic phase).
- READ-WRITE (commits + verifier required): BUILD-FAILING, AUDIT-FAILING, CORRECTIVE, BACKFILL, DERIVATIVE, DEEPENING.
- READ-ONLY tracks skip §8 verifier (no diff to verify). READ-WRITE tracks require it.

**Rationale:** V7 runs the verifier on every iteration even when nothing was written. Wasted budget.

### Patch P12 — ADD §18 (Compression policy)

**Source:** Cognition (compression LLM).
**Change:** When orchestrator transcript exceeds 100K tokens (roughly half of Opus context), trigger a Haiku-based compression pass that produces `loop/v8/state/transcript-summary-<N>.md` containing: live Task Ledger, last 3 iteration outcomes, current track queue, open anti-stall events. The orchestrator's next prompt loads the summary + the most recent iteration trace, NOT the full history.

**Rationale:** V7 has no defined behavior at context overflow. Cognition's compression-LLM pattern is the standard answer.

### Patch P13 — REVISE §3 Loop B tracks → add VOTING parallelization for taste signals

**Source:** Anthropic (parallelization-voting variant).
**Change:** When a Loop B iteration produces a candidate page, spawn 3 *parallel* judge instances with different seeds/temperatures. PASS verdict requires ≥ 2/3. Cheap insurance against single-judge blind spots; Anthropic's voting pattern.

**Rationale:** V7 has one judge + one cross-vendor reviewer = 2 votes. Anthropic's voting pattern (3+ same-task) adds robustness for high-stakes taste calls.

---

## §4 — Three first-revisions Dexter should make

If only three patches land before the next Loop B kickoff:

**1. Patch P3 (deterministic verification primitives before LLM judge) + Patch P4 (verifier as Stop hook).**
*Why first:* this is the V4-failure-mode fix. Every other patch is improvement; this one closes a known bug. The combination means: the agent literally cannot claim done without (a) build passing, (b) probe-evidence for any negative claims, (c) multi-viewport screenshots for Loop B, AND (d) the gpt-5.5 judge returning PASS. Pure mechanism, not policy.

**2. Patch P1 (two-ledger split — Task Ledger + Progress Ledger).**
*Why second:* it's the cheapest structural change with the highest information-architecture payoff. Right now the orchestrator re-derives "what is the live plan?" every iteration by re-reading recent iteration files. With a persistent Task Ledger, the plan is a one-read primitive. Replan triggers (Patch P2) become trivial to implement once this exists.

**3. Patch P5 (subagent dispatch contract — 5 required fields incl. predecessor_artifacts).**
*Why third:* this is the Cognition "share full context" fix for V7's Researcher → Builder → Judge chain. Without it, V8 inherits V7's implicit-decisions bug. With it, every subagent's input is a typed object Roham can inspect in /admin/review.

These three patches together: close the verification gap (1), make state legible (2), and prevent context fragmentation between subagents (3). They are the load-bearing trio. The rest of the patches are quality multipliers on top.

---

*Survey conducted 2026-05-18 by Dexter research subagent. Citations are primary sources where retrievable; synthesized common-knowledge where the primary URL 404'd (Karpathy talks, Cursor docs, LangGraph multi-agent). All practitioner patterns named here are publicly attested. Patches are opinionated and assume Roham wants V8 to land the verification rigor first.*
