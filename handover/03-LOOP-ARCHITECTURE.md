# 03 — Loop Architecture

How the autonomous build loop actually works. Read this so you understand what the supervisor is keeping alive — but you do NOT need to modify any of the code below.

---

## The one-paragraph version

A Node script on `kaaos-daemon` (`loop/runner/orchestrator.mjs`) runs in a tmux session. Each iteration: it picks the highest-priority unblocked-unpassed feature from `features.json`, spawns a Researcher (`claude --print --bare`) that writes a research note, spawns a Builder (`claude --print --bare`) that implements + tests + commits + pushes to `main` + waits for the production Vercel deploy + runs the Judge against the live URL + commits the canonical pass state + writes a done marker. The orchestrator reads the marker, skips its own redundant Judge phase if `judge_passed:true`, and starts the next iteration. Wall-clock killer at 8 hours. STOP file halts cleanly between iterations.

---

## The three roles

### Researcher
- **Spawn:** `claude --print --bare --dangerously-skip-permissions --add-dir <repo-root>`
- **Brief (stdin):** `loop/prompts/research.md` with `{FEATURE_ID}` substituted in
- **Reads:** features.json (the feature), `research/personas/pro-trader.md`, `research/comp-diff-otm.md`, `research/00-foundation-v2.md`, `research/wiki/gotchas/*`, OTM screenshot references, the latest judge fail-report for this feature (if exists)
- **Writes:** `research/features/{FEATURE_ID}.md` — an 8-section note (Trader's verbatim ask, OTM comparable, Public-API ceiling, Thin-slice scope, Data source, Reuse-first inventory, Known gotchas, Prior failure to address). If a fail report exists, MUST include the "Prior failure to address" section with a concrete proposed fix.
- **Done signal:** the artifact at `research/features/{FEATURE_ID}.md` exists. Orchestrator checks via `existsSync`.
- **Timeout:** 15 min, SIGTERM → SIGKILL after 30s grace.
- **Typical wall-clock:** 4-7 min.

### Builder
- **Spawn:** same flags as Researcher, different prompt on stdin
- **Brief:** `loop/prompts/build.md` with `{FEATURE_ID}` substituted in
- **Reads:** the Researcher's note, features.json, LOOP-CHARTER.md, the moments-grid.spec.ts template, supabase queries, primitive components, every wiki gotcha
- **Does:** 9 steps total —
  1. `git checkout main && git reset --hard origin/main` (clean tree)
  2. Implement the feature (real code changes)
  3. Write `loop/judge/journeys/{FEATURE_ID}.spec.ts` mirroring moments-grid template
  4. `npm run build` (must exit 0)
  5. Commit + push **directly to main** (with retry loop for snapshot-cron collisions)
  6. Wait for Vercel production deploy of the new SHA (24× 15s polls, fail-fast if timeout)
  7. Run judge locally against production URL — up to 3 attempts with in-iteration fix retries, NO-DELTA GUARD prevents empty-commit infinite loops
  8. After judge pass: commit features.json + progress.md flips (pre-rebase against origin first), push to main
  9. Write `loop/runner/state/{FEATURE_ID}.done.json` with `judge_passed: true`
- **Done signal:** `loop/runner/state/{FEATURE_ID}.done.json` exists with `smoke_passed: true`. Orchestrator parses it.
- **Timeout:** 35 min, SIGTERM → SIGKILL after 30s grace.
- **Typical wall-clock:** 15-25 min.

### Judge (two invocations possible per iteration)
- **Invocation #1 (Builder-side, step 7 of Builder brief):** `PORTAL_URL=<prod> node loop/judge/run.mjs --feature {FEATURE_ID}`. The Builder runs this itself, in its own subprocess. Pass → Builder continues to step 8. Fail → Builder retries (up to 3 attempts total).
- **Invocation #2 (orchestrator-side, post-Builder):** if `done.json#judge_passed !== true`, orchestrator spawns the judge runner again as a belt-and-suspenders verification. **In the happy path this is SKIPPED** per the convergent GPT-5/Claude review fix.
- **Exit codes (run.mjs):** 0 = pass (flips `features.json#passes:true` in working tree + appends `progress.md`), 1 = fail (writes `loop/judge/reports/<id>-<ts>.md` + adds to `fail_reasons[]`), 2 = runner error (no spec, IO error)
- **Implementation:** Playwright headless chromium, the journey spec the Builder wrote, screenshots at every step into `loop/judge/captures/<id>/<ts>/`
- **Timeout:** 10 min orchestrator-side; ~3-5 min typical real-time

---

## The orchestrator (`loop/runner/orchestrator.mjs`)

A Node 22 single-file script. ESM. No external deps (Node stdlib only).

### Per-iteration state machine

```
1. STOP-file check (./STOP at repo root) → exit 0 if present
2. Wall-clock check (default 8h budget) → exit 0 if exceeded
3. Read features.json + pick highest-priority unblocked-unpassed
   (or specific feature if --feature flag set)
4. Write iteration state to loop/runner/state/<id>.iteration.json
5. Spawn Researcher → wait → check artifact → fail-iter if missing
6. Spawn Builder → wait → parse done.json → fail-iter if missing or smoke_passed=false
7. If done.json#judge_passed === true → SKIP orchestrator-side judge
   Else → spawn judge runner → parse exit code
8. Record outcome to state file; log line to /tmp/topshot-loop.log
9. If --once → exit. Else sleep 5s → loop to step 1.
```

### CLI flags

```
--max-hours N        wall-clock budget (default 8); SIGTERM/exit fires regardless
--feature ID         pin to one feature (default: auto-pick highest-priority)
--once               single iteration then exit (default: continuous loop)
--portal-url URL     target deploy URL for orchestrator's judge phase
                     (default: $PORTAL_URL or https://topshot-data-portal.vercel.app)
--dry-run            log what would happen; don't spawn sub-agents
--help               usage
```

### Crash safety

- Each iteration wrapped in `try/catch`. Uncaught error writes `loop/runner/state/<id>.crash.log` and continues to next iteration. NEVER kills the outer loop.
- Per-role SIGTERM timeouts (15/35/10 min) ensure a wedged sub-agent can't block the loop.
- Idempotent re-attempt: if a feature fails, next iteration re-picks it (since `passes` is still false), now with the fail report as Researcher input.
- Prompts loaded into memory ONCE at startup so mid-iteration branch switches can't strand the running process.

### What the orchestrator does NOT do (load-bearing constraints)

- Does NOT flip `features.json#passes`. Only the judge runner does that.
- Does NOT append to `progress.md`. Only the judge runner does that.
- Does NOT commit anything itself. The Builder commits feature code + canonical-state writes.
- Does NOT touch the production URL or Vercel API. Only the Builder does that.

---

## The supervisor (your job to install)

Read `04-WEEK-LONG-SUPERVISOR.md` for the concrete recipe. The shape:

- A 1-2 line cron entry on `kaaos-daemon` that runs every 5 minutes
- Cron calls a wrapper script (`/opt/topshot-loop/supervisor.sh`) that:
  1. Checks for STOP file → exits if present
  2. Checks `tmux has-session -t topshot-loop` → exits if alive
  3. If not alive and no STOP: relaunches with `--max-hours 8`
- Wrapper fetches the Anthropic key from GSM at launch (never persisted to disk in plaintext outside the running process's env)
- Wrapper logs every lifecycle event to `/tmp/topshot-supervisor.log`

That's the entire pattern. Every 5 minutes, if the loop isn't running and Roham hasn't said STOP, relaunch.

---

## Wall-clock math for a week

- Each iteration: ~25-30 min wall-clock (Researcher 5m + Builder 18m including waits + ~1m bookkeeping)
- Loop's `--max-hours 8` budget means one orchestrator invocation handles ~16 iterations before exiting cleanly
- Supervisor relaunches every 5 min if not alive → max 5 min of dead time between invocations
- Week = 168h. ~21 orchestrator invocations needed to cover.
- Backlog has 18 unblocked-unpassed features. Each ships in 1-3 iterations (sometimes one if the feature is simple; sometimes 3 if the Builder needs to iterate). So **expected total iterations to drain backlog: 18-54**.
- Once backlog drained, orchestrator exits with "no eligible features — backlog drained" and exits clean. Supervisor re-checks every 5 min and finds backlog still drained → no relaunch. Loop sleeps until Roham adds features OR a passing-but-buggy feature gets manually `passes:false`'d to retrigger work.

In the happy path: backlog drains in 1-2 days of real wall-clock. The remaining week is supervisor-idle.

---

## Anti-shortcircuit rules baked into the prompts

Per `/thoth-prompter:agent`, every sub-agent prompt embeds:

1. **Negative findings require positive proof** — Builder must read judge.log for the actual failing assertion, not declare "couldn't find it"
2. **Skill names don't transit execution requirements** — Builder brief explicitly enumerates all 9 steps; the brief is the spec, not a reference to one
3. **Orchestrator-level rules don't transit** — Builder brief restates no-spend-cap / push-through / explicit-3-attempt-budget
4. **Mid-stream verification gates** — judge runner IS the gate between Builder and "feature shipped"; canonical-state commit only fires post-pass
5. **Spot-read load-bearing files** — orchestrator's runIteration reads `done.json` and validates required fields before declaring Builder ok

If you find yourself modifying the prompts: re-run `verify-via-openai.py` and a fresh Claude sub-agent review BEFORE committing. The retrospective documents the cost of skipping this.
