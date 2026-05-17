# 04 — Week-Long Supervisor (your concrete work)

This is the load-bearing doc. Everything below either: (a) gets installed on `kaaos-daemon`, (b) gets verified end-to-end, or (c) gets reported to Roham.

---

## The pattern

A 5-minute cron on `kaaos-daemon` calls a wrapper script. The wrapper:
1. Checks for `STOP` file → exits silently if present
2. Checks if `tmux session topshot-loop` is alive → exits silently if alive
3. If not alive AND no STOP: fetches the Anthropic key from GSM, exports it, launches the loop in a new tmux session with `--max-hours 8`, and logs the lifecycle event

This pattern matches the existing `/opt/pantheon/topshot-supervisor/hourly.sh` from V4 (the predecessor loop), which was killed via the V4 STOP procedure. **Reuse the directory shape but with a different filename so we don't reactivate the V4 commented-out crons** (Roham explicitly disabled them).

---

## Step-by-step recipe

### Step 1 — SSH to the VM and confirm clean state

```bash
gcloud compute ssh --tunnel-through-iap kaaos-daemon --project dl-kaaos --zone us-central1-a
```

Inside the SSH session:
```bash
# No topshot-loop session should be running
tmux list-sessions | grep topshot && echo "WARN: existing topshot-* session" || echo "OK: no topshot session"

# No STOP file should be present
WORKDIR=/home/r_dapperlabs_com/topshot-builder/topshot-data-portal
test -f "$WORKDIR/STOP" && echo "WARN: STOP file present" || echo "OK: no STOP file"

# Workspace is on main, up to date
cd "$WORKDIR"
git fetch origin --quiet
git checkout main 2>&1 | tail -2
git reset --hard origin/main 2>&1 | tail -2
echo "HEAD: $(git log --oneline -1)"

# Verify the orchestrator parses (don't run)
node --check loop/runner/orchestrator.mjs && echo "OK: orchestrator parses"
```

If any WARN: investigate before proceeding. Don't install the supervisor on top of unknown state.

### Step 2 — Install the supervisor wrapper script

On the VM, create `/opt/topshot-loop/supervisor.sh`. Ownership: `r_dapperlabs_com:r_dapperlabs_com`, mode `0755`.

```bash
sudo mkdir -p /opt/topshot-loop
sudo chown r_dapperlabs_com:r_dapperlabs_com /opt/topshot-loop

cat > /opt/topshot-loop/supervisor.sh <<'BASH'
#!/usr/bin/env bash
# topshot-loop supervisor — keeps the v5 build loop alive for a week-long run.
#
# Invoked by cron every 5 minutes. If a STOP file exists, exits silently.
# If the topshot-loop tmux session is already running, exits silently.
# Otherwise: fetches the Anthropic key from GSM, launches the orchestrator
# in a new tmux session with --max-hours 8.
#
# Lifecycle events log to /tmp/topshot-supervisor.log (append).
# Loop output logs to /tmp/topshot-loop.log (overwrite per launch).

set -euo pipefail

WORKDIR=/home/r_dapperlabs_com/topshot-builder/topshot-data-portal
SESSION=topshot-loop
LOG=/tmp/topshot-supervisor.log
LOOP_LOG=/tmp/topshot-loop.log
PROJECT=dl-kaaos
ANTHROPIC_SECRET_PROJECT=dl-ai-pantheon
ANTHROPIC_SECRET_NAME=topshot-builder-anthropic-api-key
COMPUTE_SA=941997949640-compute@developer.gserviceaccount.com

ts() { date -u +%FT%TZ; }
log() { echo "[$(ts)] $*" >> "$LOG"; }

# 1. STOP check
if [ -f "$WORKDIR/STOP" ]; then
  # Don't spam the log — only note the first time after a successful launch
  # by checking if our last log line says we launched
  last=$(tail -1 "$LOG" 2>/dev/null || echo "")
  if [[ "$last" != *"STOP file present, halting"* ]]; then
    log "STOP file present, halting (will not relaunch until STOP removed)"
  fi
  exit 0
fi

# 2. Already running check
if tmux has-session -t "$SESSION" 2>/dev/null; then
  exit 0  # silent — alive is the happy path
fi

# 3. Need to launch. Verify workspace state first.
if [ ! -d "$WORKDIR" ]; then
  log "ERROR: workspace missing at $WORKDIR"
  exit 1
fi

# Fetch the Anthropic key. Done inside the tmux launcher (not here) so the
# key only lives in the launched process's environment, never in this
# supervisor shell's env, never persisted to disk.

# 4. Launch the loop. Note: we pull latest main inside the launcher so the
# loop always runs with the freshest orchestrator + prompts.
log "launching $SESSION (max-hours=8)"

tmux new -d -s "$SESSION" "
  cd '$WORKDIR' || { echo '[launcher] workdir missing' | tee -a '$LOOP_LOG'; exit 1; }

  # Always pull latest main so loop runs with current code
  git fetch origin --quiet
  git checkout main 2>&1 | tail -1 | tee -a '$LOOP_LOG'
  git reset --hard origin/main 2>&1 | tail -1 | tee -a '$LOOP_LOG'
  echo '[launcher] HEAD: '\$(git log --oneline -1) | tee -a '$LOOP_LOG'

  # Fetch Anthropic key (compute SA, dl-ai-pantheon)
  ANTHROPIC_API_KEY=\$(gcloud --account='$COMPUTE_SA' secrets versions access latest \
    --secret='$ANTHROPIC_SECRET_NAME' --project='$ANTHROPIC_SECRET_PROJECT' 2>/dev/null)
  if [ -z \"\$ANTHROPIC_API_KEY\" ]; then
    echo '[launcher] ERROR: anthropic key fetch returned empty' | tee -a '$LOOP_LOG'
    exit 1
  fi
  echo '[launcher] anthropic key bytes: '\$(echo -n \"\$ANTHROPIC_API_KEY\" | wc -c) | tee -a '$LOOP_LOG'
  export ANTHROPIC_API_KEY

  # CLOUDSDK_CORE_ACCOUNT lets the Builder and judge runner reach the same
  # compute-SA identity for any secret reads they do mid-iteration.
  export CLOUDSDK_CORE_ACCOUNT='$COMPUTE_SA'

  # Run the orchestrator. Continuous mode, no --feature filter, 8h budget.
  node loop/runner/orchestrator.mjs --max-hours 8 2>&1 | tee -a '$LOOP_LOG'

  # Orchestrator exited cleanly. Log the exit and let the tmux session die so
  # the supervisor relaunches next tick.
  echo '[launcher] orchestrator exited at '\$(date -u +%FT%TZ) | tee -a '$LOOP_LOG'
"

log "launch dispatched"
exit 0
BASH

chmod 0755 /opt/topshot-loop/supervisor.sh
ls -la /opt/topshot-loop/supervisor.sh
```

### Step 3 — Smoke-test the wrapper manually (BEFORE installing the cron)

Run it once by hand and verify the loop comes up:

```bash
# Should launch the loop
/opt/topshot-loop/supervisor.sh

# Within 5 seconds, verify
tmux list-sessions | grep topshot-loop && echo "OK: session alive"
sleep 6
head -10 /tmp/topshot-supervisor.log
head -10 /tmp/topshot-loop.log

# Verify processes
ps -ef | grep "[o]rchestrator.mjs" | head -1
ps -ef | grep "[c]laude --print" | head -1
```

**Expected:** supervisor log shows a "launching topshot-loop" line. Loop log shows the anthropic-key-bytes line + an `[orchestrator] start max-hours=8` line + `iter run=...` + `researcher dispatch`. A `node loop/runner/orchestrator.mjs --max-hours 8` process is running. A `claude --print --bare` subprocess is running.

If something's wrong: read `/tmp/topshot-loop.log` for the failure shape. Common shapes are documented in `05-OBSERVABILITY-AND-DEBUGGING.md`.

### Step 4 — Watch the first iteration to completion (research → build → judge → next)

This is your verification gate before walking away. **Do not skip.**

```bash
# Watch the loop log live
tail -f /tmp/topshot-loop.log
```

Expected timeline (~25-30 min):
- `0:00` start log line
- `0:00-0:01` researcher dispatch
- `~5:00-7:00` `researcher done: research/features/<feature-id>.md`
- `~5:01` builder dispatch
- `~10:00-15:00` first push to main (visible via `git log origin/main --oneline | head` from your laptop)
- `~15:00-20:00` vercel deploy + judge running (visible via `vercel ls topshot-data-portal | head -3`)
- `~20:00-25:00` builder done marker + iteration outcome logged

**If iteration succeeds:** you should see `features.json` on main updated for the picked feature (`passes:true` flag flipped), a new `progress.md` line under "Completed (chronological, judge-verified only)", and the loop starts the next iteration.

**If iteration fails:** the orchestrator logs the failure shape + continues to next iteration. The same feature gets re-picked next iteration (since `passes` is still false) with the fail report now in the file system as Researcher input.

After ONE successful (or honest-failed) iteration: walk. Don't watch more. The supervisor handles the rest.

### Step 5 — Install the cron

Once Step 4 confirms the supervisor works, add the cron:

```bash
# Edit crontab — adds the supervisor to fire every 5 min
( crontab -l 2>/dev/null; echo '*/5 * * * * /opt/topshot-loop/supervisor.sh >> /tmp/topshot-supervisor.cron.log 2>&1' ) | sort -u | crontab -

# Verify it's installed
crontab -l | grep topshot-loop
```

The `>> /tmp/topshot-supervisor.cron.log 2>&1` redirects cron's own stderr (separate from the supervisor's `/tmp/topshot-supervisor.log`) so any cron-level problems (path issues, permission issues) are captured.

### Step 6 — Write the status note for Roham

In this conversation thread, give Roham a tight (5-line) status:

- The supervisor cron is installed on kaaos-daemon
- First iteration ran [end-to-end / failed at X]
- How to monitor: `gcloud compute ssh ... --command 'tail -f /tmp/topshot-loop.log'`
- How to stop: `gcloud compute ssh ... --command 'touch /home/r_dapperlabs_com/topshot-builder/topshot-data-portal/STOP'`
- Pending follow-ups per `06-FOLLOWUPS-AND-OPEN-RISKS.md` (most urgent: Anthropic budget cap)

Then exit.

---

## Stop conditions

The supervisor halts cleanly when ANY of these are true:

1. **`STOP` file exists** at `<workspace>/STOP`. Touch it: `gcloud compute ssh ... --command 'touch <workspace>/STOP'`. The supervisor logs "STOP file present, halting" once and then exits silently every tick after.
2. **Backlog drained.** When `features.json` has no unblocked-unpassed features, the orchestrator exits with "no eligible features — backlog drained." The tmux session dies; the supervisor sees no STOP and tries to relaunch; the orchestrator immediately exits again with backlog drained; supervisor logs and the cycle repeats every 5 min until Roham adds features. This is fine — wasted cycles are cheap.
3. **Cron removed.** `crontab -r` or surgical edit to remove the supervisor line.

To resume after a `STOP`: `gcloud compute ssh ... --command 'rm <workspace>/STOP'`. Next cron tick relaunches.

---

## Resource budgets

- Anthropic API: currently uncapped (uses Roham's local key). **Highest-priority follow-up — see `06`.** Worst-case spend at ~$2-5/iteration × 50 iterations = $100-250 for the week. Real-case is lower; backlog drains in 1-2 days.
- VM CPU/RAM: ~1% utilization most of the time, peaks during `next build`. Plenty of headroom.
- Vercel: bandwidth/build minutes. Production deploys are short (<60s). No expected limits hit.
- GitHub API: gh CLI for `gh pr` (used only on the prior preview-based pattern; current flow doesn't open PRs). git push hits standard repo bandwidth. No expected limits.
- Disk: `loop/runner/state/*` accumulates per feature. Tiny (<1KB per file). `loop/judge/captures/*` accumulates screenshots — could grow to ~100MB across 20 features × 3 captures × 5 screenshots @ 2MB each. Acceptable on a 96GB disk.

---

## Why not the dapper-agi:agi-scaffold formal Pantheon agent pattern?

For "this week" the cron-supervisor matches the existing daemon-ops pattern and is the simplest reversible setup. For long-term, formalize via `/dapper-agi:agi-scaffold` + `agi-credentials` + `agi-iam-grant` + `agi-containerize`. That's a follow-up after the loop has shipped 5+ features cleanly and the prompts have stabilized — at that point the per-agent VM/container becomes worth the lift.

Per the handover ladder: **today = cron-supervisor on kaaos-daemon. After 5+ clean ships = formalize as Pantheon agent.**
