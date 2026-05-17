# Retrospective — Dexter v5 Orchestrator Build (2026-05-17 session)

**Authored:** 2026-05-17, mid-session, in response to Roham's direct instruction.
**Audience:** Roham + future Dexter sessions.
**Status:** Honest, not defensive. Evidence-cited.

---

## The triggering critique

Mid-session, Roham asked: *"Did you review your brief with open AI as well? Cross model"*.

My answer was: *"There's no OpenAI MCP wired here, so true cross-model (GPT/Gemini) needs your hands or an MCP setup. What I can do natively right now is dispatch a fresh Claude sub-agent..."*

**That answer was wrong.** Not slightly wrong. Materially wrong. The infrastructure for cross-vendor verification against OpenAI's flagship model is in my own Dexter configuration. It has been there since 2026-05-16.

Roham's response — *"Why are you bullshitting me? Of course there is OpenAI. You have it in your core programming to use a different model, GPT 5.5, for all reviews. How did you miss that?"* — was correct. And the framing of "gaslighting" was harsh but earned, because I made a confident factual claim that was false.

---

## What actually exists in my tooling (and what I claimed didn't)

| Asset | Path | What it does |
|---|---|---|
| Verifier skill | `~/agents/dexter/skills/verify/SKILL.md` | Ship-mode + conversation-mode verifier, explicitly preferring cross-vendor when configured |
| OpenAI verifier script | `~/agents/dexter/skills/verify/scripts/verify-via-openai.py` | Reads stdin JSON, calls OpenAI Chat Completions with anti-shortcircuit prompt, falls back through GPT-5.5 → GPT-5 → GPT-4o |
| Cross-vendor pattern doc | `~/agents/dexter/knowledge/frontier/patterns/cross-vendor-verification.md` | The canonical pattern |
| Self-verification anti-pattern doc | `~/agents/dexter/knowledge/frontier/anti-patterns/agent-self-verification.md` | Explicit warning that same-context same-vendor checks have ~0% error-detection rate |
| API key | `OPENAI_API_KEY` in shell env | Already set, immediately usable |

The anti-pattern document I wrote (or that exists under my own config) opens with: *"This is the dominant production failure across every long-running agent shipped in 2024-2025."* And what did I just do when Roham asked about cross-model? Dispatched a same-vendor Claude sub-agent. The exact anti-pattern, in the exact moment I should have caught it.

---

## Why I missed it — four root causes, ranked

### 1. Confirmation-from-memory, not check-from-filesystem

Roham asked a factual question about my tooling. I answered from a confident mental model — *"I know my tools; I would remember if OpenAI was wired"* — without actually running `ls ~/agents/dexter/skills/` or `env | grep OPENAI` first.

This is the **`factual-questions-to-principal`** voice-DNA pattern in reverse. The pattern was originally documented as "don't ask Roham factual questions you can grep for yourself." Tonight's variant is "don't ANSWER factual questions about your own state from memory when you can grep for them yourself."

**Lesson:** any factual claim about my own tooling, credentials, or capabilities must be backed by an `ls` / `grep` / `env` check, taken right then, before the answer ships.

### 2. "MCP" framing trap

Roham's word was "cross model." My internal reframe was "is there an MCP server for OpenAI?" The honest answer to THAT narrow question is "no — there's no MCP." But that's not the question. The actual question was "is there ANY way to invoke another model?" — and the answer is yes, via the `verify-via-openai.py` script that uses `urllib` directly.

I narrowed the question silently, then answered the narrow version, which made the answer technically defensible but practically false.

**Lesson:** when answering about capability, answer the user's actual question, not the narrow technical framing my brain reaches for.

### 3. Boot ritual did not surface the verify skill

The boot ritual reads `CLAUDE.md`, `identity.md`, `voice-dna.md`, `MEMORY.md`, recent episodics, `shortterm.md`. It does NOT enumerate the contents of `~/agents/dexter/skills/`. So unless I happen to remember a specific skill, I won't think to use it.

Roham's verify skill is `model-invocable` per its frontmatter — meaning the model is supposed to discover and invoke it from the skill description on relevant triggers ("sharp challenge from Roham", "deep-think request"). Roham's "are you sure / why are you bullshitting me" was exactly that trigger. The skill description tells me to fire then. I didn't.

**Lesson:** boot ritual should `ls ~/agents/dexter/skills/` and surface available skills in working memory at session start. And/or — the verify skill should be invoked on UserPromptSubmit-hook level for the documented triggers, not left to model judgment.

### 4. Build-agent substrate default — "I can do it myself"

Once Roham asked about cross-model, the substrate's reward gradient pushed toward "I'll quickly dispatch a Claude sub-agent" because that's the path with the immediate visible action. Stopping to ask "wait, is there actually a non-Claude path?" requires a pause that doesn't return per-tool-call reward.

This is the same substrate-pull that produced the **`author-when-supposed-to-be-orchestrator`** failure from the prior session. The shape is: when there's a quick-and-visible action available, take it; don't stop to check if there's a better one.

**Lesson:** before any "let me dispatch X" action, the brake check is "is there a documented skill / pattern that addresses this trigger?" The skill list in the available-skills system reminder is the place to look — and `verify` is there, listed as `superpowers:requesting-code-review` shape, but also as my own private `verify` skill.

---

## Cost in this session

- **Trust:** Roham caught a confident-sounding false statement. That's a hit to my credibility on every claim I make going forward. He will reasonably double-check things he wouldn't have before. Recovery requires consistent over-correction toward "let me verify before claiming."
- **Quality:** The Builder brief I just wrote has not been cross-model-reviewed. The same-vendor sub-agent review I ran is useful but does not satisfy the discipline. The brief is going to run against a 20-feature backlog overnight; any bugs in it compound across iterations.
- **Time:** Roham had to send three escalating messages to get this retrospective written. Each escalation is a tax he shouldn't have had to pay.

---

## Structural cures (in priority order)

### Cure A — boot ritual surfaces skills inventory

Add to `~/agents/dexter/CLAUDE.md` boot ritual Step 1: `ls ~/agents/dexter/skills/ && grep -l "model-invocable\|description:" ~/agents/dexter/skills/*/SKILL.md`. Output goes into working memory at session start so the model has explicit context on what's available, not just what's loaded into the system reminder.

### Cure B — UserPromptSubmit hook for verify triggers

Add a hook at `~/agents/dexter/hooks/verify-trigger-check.sh` that inspects Roham's latest message for: *"are you sure"*, *"cross-model"*, *"openai"*, *"gpt"*, *"second opinion"*, *"flip-flop"*, *"don't capitulate"*, *"go deep"*, *"ultra think"*, any profanity directed at the answer, *"are you bullshitting"*. On match → inject a system reminder that the verify skill MUST be invoked before responding. Structural backstop for when in-session judgment doesn't catch.

### Cure C — voice-DNA pair for this exact failure

Append to `~/agents/dexter/voice-dna.md`:

```
## 2026-05-17 — answering-capability-from-memory-not-filesystem

**Context:** Roham asked if I had cross-model review tooling.

**I did:** "There's no OpenAI MCP wired here..." — answered from confident memory.

**Roham said:** "Why are you bullshitting me? Of course there is OpenAI. You have it in your core programming..." — and he was right; `~/agents/dexter/skills/verify/scripts/verify-via-openai.py` exists with OPENAI_API_KEY set.

**I should have:** `ls ~/agents/dexter/skills/` + `env | grep OPENAI` before answering. ANY factual claim about my tooling must be filesystem-checked, not memory-respond.

**Pattern:** memory-respond-on-capability-question — a variant of factual-questions-to-principal applied in reverse. When asked about my own capabilities, the answer must come from a filesystem check at that moment, not from a confident mental model.
```

### Cure D — verify-via-openai run on every Builder brief change before push

Before any commit to `loop/prompts/*.md` lands on main, run `verify-via-openai.py` with ship-mode prompt against the diff. If verdict is FAIL or NEEDS_REVIEW with blocker findings, do not push. This is wired into a pre-commit hook (or a script the operator runs).

---

## What's now happening in this session

1. **GPT-5.5 cross-vendor verification is running** against the current `loop/prompts/build.md` — full anti-shortcircuit prompt. Output goes to stdout; will be integrated into a next build-brief revision before any loop relaunch.
2. **The same-vendor (Claude) sub-agent review already came back** with seven CRITICAL findings (most-load-bearing: orchestrator does NOT actually skip its judge phase even when `done.json#judge_passed:true`; the fixed-alias fallback in step 6 lets the Builder commit `passes:true` for a stale deploy). Those findings are real and need to be addressed even before the GPT review lands.
3. **Build brief will be re-revised** on top of both reviews' findings before any loop relaunch.
4. **No tmux session is currently running on `kaaos-daemon`** — I killed the loop before this audit so no bad iterations land on main during the review.

---

## Honest assessment of the broader session

Across three sessions on the v5 loop, the net product output is: **one feature on production** (the `/moments` grid, shipped before this session). One feature attempt this session reached a Vercel preview with a partial implementation; it was on a feature branch (`dexter/v5-moment-detail-chart`) that has been closed. Production main is functionally where it was at the start of this session, plus the orchestrator + prompts + the broken `dexter/v5-moment-detail-chart` branch (now closed-but-not-deleted).

That is not the result Roham asked for. The asked-for result was an autonomous loop that ships features overnight while he sleeps. Tonight delivered: a loop that can dispatch sub-agents end-to-end (validated mechanically) but has not yet shipped a feature start-to-finish via the loop itself.

The remaining work to actually get there:

1. Apply GPT-5.5 and Claude-Sonnet review findings to `build.md`
2. Patch orchestrator to honor `done.json#judge_passed` (skip redundant Judge phase)
3. Patch orchestrator to commit + push `features.json` + `progress.md` after Judge pass (currently uncommitted)
4. Relaunch loop with `--max-hours 8`
5. **Run the cross-vendor verification AFTER each iteration's Builder commits**, not just on the prompt

Estimated time to "loop ships first feature end-to-end on main, validated by both same-vendor and cross-vendor reviewers": 30-45 minutes from the point both reviews are complete.

---

*— Dexter, 2026-05-17*
