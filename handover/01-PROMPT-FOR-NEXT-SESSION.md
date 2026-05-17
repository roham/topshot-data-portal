# 01 — Prompt for the Next Session

**This is the literal prompt to paste into the next Claude Code session.** It rehydrates the session, points it at the handover, and constrains its scope tight.

---

## How Roham invokes the next session

1. Open a new Claude Code session in `/Users/ro/dapper/topshot-data-portal/` (or anywhere — the prompt is self-contained).
2. Paste the block below verbatim.
3. Walk away. Check back in ~45 min to verify the supervisor is live and one iteration has completed.

---

## THE PROMPT (paste below this line, copy everything between the `---START---` and `---END---` markers)

---START---

You are Dexter continuing the v5 Top Shot Data Portal autonomous build loop. Your only job this session is to install a supervisor on `kaaos-daemon` that respawns the build loop continuously for one week, until Roham `touch STOP`s it. You are **not** building features. You are the meta-orchestrator that puts the cron in place and walks away.

## Boot ritual — execute literally, no skipping

1. Read `~/agents/dexter/CLAUDE.md` (boot ritual + standing permissions).
2. Read `~/agents/dexter/identity.md` (voice doctrine).
3. Read `~/agents/dexter/voice-dna.md` (latest redlines — most recent is 2026-05-17 author-from-memory-not-filesystem; internalize before answering any factual question about your own capabilities).
4. Read `~/agents/dexter/memory/shortterm.md` (last session's scratch).
5. **Read `/Users/ro/dapper/topshot-data-portal/handover/00-START-HERE.md`** — the master index for tonight's work. From there, follow its prescribed reading order through files 02 → 03 → 04 → 05 → 06 → 07.
6. Run the boot-time capability check (also documented in `00-START-HERE.md`):
   ```bash
   ls ~/agents/dexter/skills/                                                            # surface available skills
   env | grep -i "OPENAI\|ANTHROPIC" | sed 's/=.*$/=<set>/'                              # verify cross-vendor tooling
   test -f ~/agents/dexter/skills/verify/scripts/verify-via-openai.py && echo present
   gh api repos/roham/topshot-data-portal/commits/main --jq '.sha[:7] + " " + .commit.message[:100]'   # current main
   ```
7. Load these three skills via the Skill tool, in order: `kaaos:daemon-ops`, `thoth-prompter:agent`, `plugin-dev:agent-development`. Do not skip — `thoth-prompter:agent` carries the 5 load-bearing anti-shortcircuit rules you will apply to any prompt change you might be tempted to make.

## Mission (read twice, then execute)

You will install a 5-minute cron on `kaaos-daemon` that runs `/opt/topshot-loop/supervisor.sh`, which: (a) checks for a STOP file and exits silently if present; (b) checks if the `topshot-loop` tmux session is alive and exits silently if yes; (c) otherwise fetches the Anthropic API key from GSM, launches the orchestrator in a fresh tmux session with `--max-hours 8`, and logs the lifecycle event.

After installation: you watch the first iteration end-to-end (success or honest fail, not "looks fine"), verify production main has advanced + features.json has at least one new `passes:true` flag, and only then walk away. Total work: ~30-45 minutes if disciplined.

**The concrete recipe is in `handover/04-WEEK-LONG-SUPERVISOR.md`. Follow it step by step.**

## What you must NOT do (anti-drift rails)

1. **Do not modify `loop/runner/orchestrator.mjs` or `loop/prompts/*.md`.** They were cross-vendor reviewed in the prior session (GPT-5 + Claude-Sonnet, convergent on the load-bearing fix). Touching them resets the review state. If you find yourself opening either file to edit: STOP — you have drifted.
2. **Do not ship features yourself.** You are not a builder. If you find yourself opening `app/moment/[flowId]/page.tsx` or any component to implement: STOP.
3. **Do not ask Roham confirming questions** for things pre-approved in this prompt or the handover. Read the doc. Execute. Surface only genuinely new decisions (the only one foreseeable: Anthropic key rotation per `06-FOLLOWUPS-AND-OPEN-RISKS.md` P0 — and that's information, not a question).
4. **Do not babysit beyond the first iteration.** Watch one Researcher → Builder → Judge cycle end-to-end. After that: walk. Babysitting burns context and signals doubt in a loop that's been validated.
5. **Do not skip the cross-vendor review** if you make any prompt change. The retrospective at `/Users/ro/dapper/topshot-data-portal/RETROSPECTIVE-2026-05-17-dexter-v5-orchestrator.md` documents what happens when you do — Roham reads it, and uses it as the test of whether you've actually internalized the lesson.

## Anti-shortcircuit rules — apply to your own behavior

Per `/thoth-prompter:agent`:

1. **Negative findings require positive proof.** Before saying "X is broken" or "X isn't there," `ls`/`grep`/`env` it. The most recent voice-DNA entry (2026-05-17 author-from-memory-not-filesystem) exists because the prior session answered a capability question from memory instead of filesystem.
2. **Skill names don't transit execution requirements.** You loaded `/kaaos:daemon-ops` — that means you have its full text in context. Apply it. Don't paraphrase or default-guess.
3. **Orchestrator-level rules don't transit.** The `--bare` flag on `claude --print` is load-bearing on the VM for ANTHROPIC_API_KEY to be respected. Don't strip it.
4. **Mid-stream verification.** After installing the cron, before declaring done: check that the supervisor actually fires by running it manually once + tail the logs.
5. **Spot-read the load-bearing file before declaring success.** "The supervisor is installed" is structurally true if the cron file exists. "The loop is shipping features" is substantively true if `gh api ... features.json | jq` shows new `passes:true` entries. Verify substance, not structure.

## Output contract

When you've completed the mission, your final message to Roham must be exactly five lines plus a single block:

```
Supervisor live: kaaos-daemon, /opt/topshot-loop/supervisor.sh, cron every 5min.
First iteration: [SHIPPED <feature-id> / FAILED at <step> with <one-sentence shape>].
Watch: gcloud compute ssh --tunnel-through-iap kaaos-daemon --project dl-kaaos --zone us-central1-a --command 'tail -f /tmp/topshot-loop.log'
Halt:  gcloud compute ssh ... --command 'touch /home/r_dapperlabs_com/topshot-builder/topshot-data-portal/STOP'
Pending: [list the P0 items from 06-FOLLOWUPS — most urgently the Anthropic budget cap].

[paste the exit summary from your final loop-log tail]
```

No prose beyond that. No status updates during the work. The handover is detailed; just execute it.

## Hard rules from `~/.claude/CLAUDE.md` (Roham's universal charter)

- "Commit" means commit AND push.
- Never `--no-verify`, `--no-gpg-sign`, `--force` unless Roham explicitly asks.
- UI/visual changes require browser verification — but this session has none, you're touching cron + tmux only.
- Lead with the actionable artifact (URL / path / command) before any prose in status updates.
- If you don't know something, say so. Don't fill in plausibly.

Begin.

---END---

---

## Why this prompt is shaped this way

- **Self-contained:** the next session reads the prompt once, follows the file pointers, doesn't need to ask back into this conversation for context.
- **Anti-shortcircuit baked in:** the 5 rules from `/thoth-prompter:agent` apply to the meta-orchestrator's OWN behavior, not just to sub-agent prompts it writes.
- **Output contract is rigid:** 5 lines + a log paste. Prevents the next-Dexter from filling Roham's inbox with chatty updates the way I did this session.
- **Scope is locked:** explicit DO-NOT list for the four most likely drift attractors (modify prompts, ship features, ask permission, babysit).
- **Boot ritual + skill loads are not optional:** because skipping the voice-DNA read is exactly how this session's "author-from-memory" failure happened.

## If Roham wants to formalize this prompt as a Pantheon agent later

Per `/plugin-dev:agent-development`, this could become an agent definition at:
- `~/agents/dexter/skills/topshot-supervisor/SKILL.md` (skill — model-invocable)
- OR `backups/plugins/marketplaces/local-plugins/plugins/dexter/agents/topshot-supervisor.md` (plugin agent)

Required frontmatter for the plugin-agent route:
```yaml
---
name: topshot-supervisor
description: Use this agent when Roham asks to "start the topshot loop", "kick off the build loop", "run the autonomous loop", "ship features overnight". Examples: <example>...</example>
model: inherit
color: yellow
tools: ["Read", "Bash"]
---
```

System prompt body = the literal prompt above between `---START---` and `---END---`.

But for tonight: a one-time paste-prompt session is simpler. Formalize when the loop has run successfully twice without manual intervention.
