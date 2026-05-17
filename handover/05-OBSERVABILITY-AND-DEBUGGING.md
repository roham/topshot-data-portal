# 05 — Observability and Debugging

How to know it's working. Where to look when it's not. Failure shapes documented from this session.

---

## "Is it working?" — the 30-second health check

From your laptop:

```bash
# 1. Has production main moved since handoff?
gh api repos/roham/topshot-data-portal/commits/main --jq '.commit.committer.date + " | " + .commit.message[:80]'

# 2. Are features being flipped?
gh api repos/roham/topshot-data-portal/contents/features.json --jq '.content' \
  | base64 -d | jq -r '.features[] | select(.passes==true) | .id'

# 3. Is the loop alive on the VM?
gcloud compute ssh --tunnel-through-iap kaaos-daemon --project dl-kaaos --zone us-central1-a \
  --command 'tmux list-sessions | grep topshot-loop || echo "NOT RUNNING"; ps -ef | grep "[c]laude --print" | head -1'

# 4. Is the supervisor cron firing?
gcloud compute ssh ... --command 'tail -5 /tmp/topshot-supervisor.log'

# 5. What's the loop doing right now?
gcloud compute ssh ... --command 'tail -20 /tmp/topshot-loop.log'
```

Healthy state:
- (1) main HEAD ts within last ~30 min if loop is in mid-iteration; longer if backlog drained
- (2) at least `moments-grid` always; new ids appearing through the week
- (3) `topshot-loop` session exists with one `claude --print` subprocess
- (4) supervisor log lines roughly every 5 min — most say nothing (alive) but you'll see "launching topshot-loop (max-hours=8)" entries every ~8h
- (5) recent `[orchestrator]` lines showing iteration progress

---

## Logs — where everything lives

| Log | What | When to read |
|---|---|---|
| `/tmp/topshot-supervisor.log` (VM) | Supervisor lifecycle events (launched, halted by STOP, errors) | Backlog drained? Loop won't relaunch? |
| `/tmp/topshot-supervisor.cron.log` (VM) | Cron stderr only (paths, permissions) | Cron-level issues |
| `/tmp/topshot-loop.log` (VM) | Live orchestrator output | Iteration mid-flight; failure shape on iter exit |
| `loop/runner/state/<id>.iteration.json` (VM, repo) | Per-feature iteration phase + attempt counter | Forensic — what was the loop doing for this feature |
| `loop/runner/state/<id>.research.log` (VM, repo) | Researcher claude --print stdout dump | Researcher exited but artifact missing — what did it say? |
| `loop/runner/state/<id>.build.log` (VM, repo) | Builder claude --print stdout dump | Builder claimed done but commit didn't land |
| `loop/runner/state/<id>.judge.log` (VM, repo) | Judge runner stdout/stderr (Playwright output) | Judge failed — find the exact failing assertion HERE (NOT in fail-report) |
| `loop/runner/state/<id>.done.json` (VM, repo) | Builder's success marker | Verify smoke_passed/judge_passed fields |
| `loop/runner/state/<id>.failed.md` (VM, repo) | Builder/researcher catastrophic failure shape | Iteration didn't even reach judge |
| `loop/judge/reports/<id>-<ts>.md` (repo, ON MAIN) | Judge's narrative fail report | Forensic context (NOT the assertion text) |
| `loop/judge/captures/<id>/<ts>/*.png` (VM, repo) | Per-step Playwright screenshots | Visual debugging of what the persona saw |
| `progress.md` (repo, ON MAIN) | Human-readable per-feature shipped/failed log | High-level summary of week's work |

`loop/runner/state/` is **gitignored**; lives on VM only. The rest is on main (judge reports/captures are committed by the snapshot cron periodically + by the Builder when it commits the canonical-state writes).

---

## Common failure shapes (from this session's learnings)

### F1. "Loop not running" but supervisor cron is installed

**Symptom:** `tmux list-sessions | grep topshot-loop` → nothing. `tail /tmp/topshot-supervisor.log` shows "STOP file present, halting" or nothing recent.

**Causes:**
- STOP file was created and forgotten: `ls -la <workspace>/STOP` → if present, `rm` it
- Cron disabled: `crontab -l | grep topshot-loop` → if absent, reinstall per `04-WEEK-LONG-SUPERVISOR.md` Step 5
- Cron daemon not running: `sudo systemctl status cron` (rare)
- Backlog drained: `cat <workspace>/features.json | jq '[.features[] | select(.passes==false and .blocked==false)] | length'` → if 0, that's "loop sleeping until features added" (success, not failure)

### F2. "Researcher exits but no artifact written"

**Symptom:** orchestrator log shows `researcher dispatch` then `researcher failed: ... no artifact at research/features/<id>.md`.

**Cause:** Researcher claude subprocess thought it was done but didn't actually `Write` the file. Read `<id>.research.log` — the claude stdout dump will show what it was thinking.

**Common shape this session:** Researcher tries to use `Edit` instead of `Write` on a new file (Edit requires the file to exist first). The brief tells it to Write — but claude's tooling preference can override.

**Repair:** the orchestrator's idempotent retry handles this — next iteration re-runs Researcher fresh.

### F3. "Builder hangs at git checkout / git push"

**Symptom:** Builder spawned, no progress in build log for >5 min, no process activity.

**Cause this session:** the Mac auto-classifier blocked git mutations when running locally. On the VM with `--bare --dangerously-skip-permissions`, this doesn't happen — but if you're testing the orchestrator on a Mac, expect this.

**Repair on VM:** none needed; works by default.

### F4. "Builder pushes but Vercel never reaches Ready for the SHA"

**Symptom:** build log shows `git push origin main` succeeded but the Vercel deploy poll loop in step 6 times out after 6 minutes. Failed.md written.

**Causes:**
- Vercel webhook backlog (rare, transient)
- Build broken on a TypeScript error the Builder's local `npm run build` didn't catch (rare — local + prod use same Next config)
- Vercel project misconfiguration (auto-deploy disabled, branch protection)

**Diagnose:** `vercel inspect <prod-url>` for the latest production deploy state. `vercel ls topshot-data-portal | head -5` shows recent deploys with their state.

**Repair:** the orchestrator's idempotent retry handles transient cases. For persistent: Roham investigates Vercel project config.

### F5. "Judge passes locally but orchestrator's redundant judge fails"

**Symptom:** Builder writes done.json with `judge_passed:true` but orchestrator's post-Builder judge phase fails.

**Status:** this should be impossible after commit `3613f32` because the orchestrator now SKIPS its judge phase when done.json says judge_passed:true. If it happens, something is regressed.

**Diagnose:** read the orchestrator log for which judge invocation fired. If only the Builder-side judge fired and Builder reported judge_passed:true → working as designed. If orchestrator's also fired despite the flag → regression in `runIteration` logic.

### F6. "features.json modified but never committed"

**Symptom:** Roham's `cat features.json | jq ...` on main shows passes:false for what looks like a shipped feature. The judge clearly passed (per `loop/judge/reports/` having a positive entry).

**Cause:** Builder ran the judge (which writes features.json locally), but Builder failed/exited before reaching step 8 (commit canonical-state writes). The flip is stranded on the VM's working tree.

**Repair:** next iteration re-picks the feature (since `passes:false` on main), Researcher reads the fail report, Builder re-implements + re-judges + commits canonically. Or: on the VM, `cd <workspace> && git diff features.json` shows the local flip → manually `git add features.json progress.md && git commit -m '[v5 loop] <id>: canonical-state catch-up' && git push origin main`.

### F7. "git push rejected, non-fast-forward, infinite retry loop"

**Symptom:** Builder's push retry loop hits the 6-attempt cap because the snapshot cron pushes faster than Builder can rebase + retry.

**Status:** mitigated in the current brief (rebase + autostash + sleep on each retry). If still hitting it: Roham can manually pause the snapshot cron for the duration of the loop's run.

**Identify the snapshot cron:** `crontab -l | grep -i snapshot` — if found, comment temporarily.

### F8. "Anthropic key rejected / 401 in claude --bare"

**Symptom:** every Researcher/Builder exits ~5s with "Not logged in" or "Invalid API key."

**Causes:**
- The `topshot-builder-anthropic-api-key` secret was rotated externally; the GSM value is stale
- The compute SA's IAM binding got revoked
- The launcher's `gcloud secrets versions access` returned empty (silent failure)

**Diagnose on VM:**
```bash
KEY=$(gcloud --account=941997949640-compute@developer.gserviceaccount.com secrets versions access latest --secret=topshot-builder-anthropic-api-key --project=dl-ai-pantheon)
echo "key bytes: $(echo -n "$KEY" | wc -c)"

# Test directly against Anthropic
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $KEY" -H "anthropic-version: 2023-06-01" -H "Content-Type: application/json" https://api.anthropic.com/v1/messages -d '{"model":"claude-haiku-4-5","max_tokens":5,"messages":[{"role":"user","content":"hi"}]}')
echo "HTTP=$HTTP"
```

**Repair:** if HTTP != 200, Roham rotates the key via console.anthropic.com → updates GSM via `gcloud secrets versions add topshot-builder-anthropic-api-key --data-file=- --project=dl-ai-pantheon`.

---

## When to escalate to Roham

Surface to Roham as an interrupt (not a routine check-in) when:

1. **Anthropic key rejected** (F8) — Roham must rotate
2. **Vercel project misconfigured persistently** (F4 sticky) — Roham investigates project settings
3. **Same feature fails 5+ iterations in a row** — the loop is stuck, manual unblock needed
4. **Disk filling on VM** (>85%) — caches need pruning
5. **Anthropic budget approaching cap** — Roham sets new cap or pauses

Don't escalate for:
- Single iteration failure (loop auto-retries)
- Snapshot-cron push collisions (mitigated by retry loop)
- One feature taking 3 attempts (in spec — that's the budget)

---

## Halting cleanly (Roham's controls)

Read-only mode — pause the loop without losing state:

```bash
gcloud compute ssh --tunnel-through-iap kaaos-daemon --project dl-kaaos --zone us-central1-a \
  --command 'touch /home/r_dapperlabs_com/topshot-builder/topshot-data-portal/STOP'
```

Resume:

```bash
gcloud compute ssh ... --command 'rm /home/r_dapperlabs_com/topshot-builder/topshot-data-portal/STOP'
```

Permanent stop — remove the cron:

```bash
gcloud compute ssh ... --command 'crontab -l | grep -v topshot-loop | crontab -'
```

Full cleanup — also remove supervisor script + tmux session:

```bash
gcloud compute ssh ... --command '
  tmux kill-session -t topshot-loop 2>/dev/null
  crontab -l | grep -v topshot-loop | crontab -
  sudo rm -rf /opt/topshot-loop/
  echo "topshot-loop fully removed"
'
```

(Workspace at `/home/r_dapperlabs_com/topshot-builder/topshot-data-portal/` is left in place as forensic record. To also remove: `rm -rf ~/topshot-builder/`.)
