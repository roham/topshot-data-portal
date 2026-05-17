# 00 — START HERE

**You are the next session.** Welcome. Your sole job in this session is to set up an **autonomous, week-long build loop** on the `kaaos-daemon` VM that ships Top Shot Data Portal features to production while Roham sleeps — and then walk away. **You are not building features. You are not coding. You are the meta-orchestrator that puts the supervisor in place.**

---

## TL;DR

- Roham asked for an autonomous infinite loop that ships features overnight. The loop's machinery already exists on `main` of `roham/topshot-data-portal`. It works end-to-end (researcher → builder → judge), validated this session, with cross-vendor reviewer findings applied.
- **Your job:** install a supervisor on `kaaos-daemon` that respawns the loop continuously for at least one week, until Roham `touch STOP`s it.
- **Your job is NOT:** writing code, shipping features, modifying the loop's logic, reviewing PRs.
- **The pattern:** Daemon Dispatch (per `/thoth-prompter:agent`). You launch a self-supervising cron on the VM. The VM does the work. You verify and walk.

---

## Read these files in this order, then act

1. **`00-START-HERE.md`** — this file (mission + reading order)
2. **`02-STATE-OF-THE-WORLD.md`** — exact inventory of what exists right now (VM state, GSM secrets, branches, commits, what's live in production)
3. **`03-LOOP-ARCHITECTURE.md`** — how the Researcher → Builder → Judge pipeline works on the VM, what each role does, where prompts live, how state propagates
4. **`04-WEEK-LONG-SUPERVISOR.md`** — **THE LOAD-BEARING DOC.** The cron + watchdog pattern that keeps the loop alive for a week. Most of your concrete work happens from this doc.
5. **`05-OBSERVABILITY-AND-DEBUGGING.md`** — what "alive and shipping" looks like, where to read logs, common failure shapes from this session's learnings
6. **`06-FOLLOWUPS-AND-OPEN-RISKS.md`** — what's deferred (Anthropic budget cap, idempotency of judge runner, etc.) — surface to Roham, don't fix tonight
7. **`07-REFERENCE-PATHS.md`** — cheat sheet (paths, secret names, URLs, commands)
8. **`01-PROMPT-FOR-NEXT-SESSION.md`** — the prompt that produced YOU. Read this last as a self-check on what you were asked to do, and verify your output matches.

After reading: open a fresh todo list, execute `04-WEEK-LONG-SUPERVISOR.md` step by step, verify health per `05`, report to Roham, log off.

---

## Boot ritual (before any other action)

Per `~/agents/dexter/CLAUDE.md`. Run before reading anything else:

```bash
ls ~/agents/dexter/skills/                                  # surface available skills
env | grep -i "OPENAI\|ANTHROPIC" | sed 's/=.*$/=<set>/'    # verify cross-vendor tooling is in env
test -f ~/agents/dexter/skills/verify/scripts/verify-via-openai.py && echo "verify-via-openai: present"
cat ~/agents/dexter/voice-dna.md | tail -50                 # latest redlines
cat ~/agents/dexter/memory/shortterm.md                     # last session's scratch
```

**Then load these skills** (in this order, before doing any work):

1. `/kaaos:daemon-ops` — VM ops + file ownership + security model
2. `/thoth-prompter:agent` — orchestration patterns + anti-shortcircuit rules (5 of them, all load-bearing) + daemon dispatch sequence
3. `/plugin-dev:agent-development` — agent file format if you decide to formalize the supervisor as a skill (optional)

---

## What's already done (do NOT redo any of this)

- Orchestrator + prompts on main of `roham/topshot-data-portal`. HEAD: `3613f32` (or later — check `git log origin/main --oneline | head`).
- `kaaos-daemon` workspace at `/home/r_dapperlabs_com/topshot-builder/topshot-data-portal/` — git clone, npm install done, next build verified, claude+gh+vercel auth confirmed working
- GSM secrets provisioned + IAM granted to compute SA:
  - `topshot-builder-anthropic-api-key` in `dl-ai-pantheon`
  - `topshot-builder-github-pat` in `dl-kaaos`
  - `topshot-builder-vercel-auth-json` in `dl-kaaos`
  - `topshot-builder-env-local` in `dl-kaaos`
- Both Claude-Sonnet sub-agent + GPT-5 cross-vendor review run on the Builder brief. Five critical findings applied (commit `3613f32`):
  1. Orchestrator honors `done.json#judge_passed=true` and skips redundant judge dispatch
  2. Builder reads `judge.log` for failing assertion (not the narrative fail-report)
  3. Step 6 fail-fast on Vercel deploy timeout (no fallback to fixed alias)
  4. Retry loop NO-DELTA GUARD prevents empty-commit loops
  5. Step 8 `git pull --rebase --autostash` before committing canonical-state writes

---

## What's NOT done (your work this session)

1. **Install a supervisor cron on `kaaos-daemon`** that:
   - Checks every 5 min whether `tmux session topshot-loop` is alive
   - If not alive AND no `STOP` file present → relaunches with `--max-hours 8`
   - Logs each lifecycle event to a dedicated log file
   - Handles the `gcloud secrets versions access` for the Anthropic key inside the launcher so credentials never land on disk
2. **Verify the first iteration runs cleanly** end-to-end before walking away. Specifically: Researcher produces an artifact, Builder pushes a commit to main, Judge against production passes (or honest fail), features.json on main reflects the outcome.
3. **Write a single concise status note to Roham** with:
   - Where the supervisor cron lives
   - How to monitor progress (one-liner)
   - How to stop (`touch STOP`)
   - What's deferred per `06-FOLLOWUPS-AND-OPEN-RISKS.md`

That's it. ~30-45 minutes of concrete work if you stay disciplined.

---

## What you will be tempted to do but MUST NOT

- **Modify the loop's code or prompts.** They were cross-vendor reviewed and pushed. Touching them resets the review state and may introduce regressions you won't see until the loop runs.
- **Babysit the first 2-3 iterations.** Watch the first iteration end-to-end (success or honest fail). Then walk. Babysitting burns context and signals doubt in the loop you just verified.
- **Run features yourself.** You are not a builder. The loop is the builder. If you find yourself opening `app/moment/[flowId]/page.tsx` to edit it, STOP — that's the substrate-default failure mode this session corrected against.
- **Ask Roham confirming questions** for things already pre-approved here. Read the doc. Execute. Surface things only that are genuinely new decisions (e.g., the Anthropic budget cap is a real one-touch he has to do himself).
- **Skip the cross-vendor review** if you make any prompt change. The `verify-via-openai.py` script exists; use it. The retrospective from this session (`/Users/ro/dapper/topshot-data-portal/RETROSPECTIVE-2026-05-17-dexter-v5-orchestrator.md`) documents the cost of skipping it.

---

## Mission re-statement (so you don't forget mid-session)

By the time you log off, Roham has:
- A supervisor running on `kaaos-daemon` that will autonomously respawn the build loop continuously for one week, until he stops it.
- Visible production progress: features landing on `main` of `roham/topshot-data-portal`, `features.json#passes:true` flags incrementing, `progress.md` lines accreting, `https://topshot-data-portal.vercel.app` reflecting new features.
- One concise note explaining how to watch + halt.

Anything outside that is scope creep. Stay tight.

— Dexter (the previous session, signing off)
