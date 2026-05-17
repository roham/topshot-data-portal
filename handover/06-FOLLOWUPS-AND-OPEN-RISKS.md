# 06 — Follow-Ups and Open Risks

Things deferred this session that should land in the next 1-7 days. Each item has priority + action owner + concrete first step.

---

## P0 — Anthropic budget cap (highest priority)

**Risk:** the loop is currently burning Roham's local Anthropic API key with NO budget cap. Worst-case spend at ~$2-5 per iteration × 50 iterations = $100-250 for a week. Realistically lower (backlog drains in 1-2 days, then idle), but bursty/runaway behavior is unbounded.

**Action:** Roham creates a dedicated `topshot-builder` Anthropic key with a monthly budget cap and rotates the GSM secret.

**Concrete steps:**
1. https://console.anthropic.com → API Keys → Create Key. Name: `topshot-builder`. Workspace: same as personal default. Generate.
2. Set the budget cap in the Anthropic console (Anthropic admin API doesn't expose this yet) — recommend $50/month for v1, raise if usage warrants.
3. Rotate the GSM secret:
   ```bash
   gcloud secrets versions add topshot-builder-anthropic-api-key \
     --data-file=- --project=dl-ai-pantheon
   # paste new key, Ctrl-D
   ```
4. The loop picks up the new version on next supervisor relaunch (current orchestrator invocation continues using the old key until it exits — that's fine since Anthropic doesn't revoke until rotation in their UI).

**Verify** by side-effect — at next supervisor launch, the launcher log should show the same key-bytes count (108) and Researcher/Builder should continue spawning successfully. No need to display the key value.

**Owner:** Roham (only Roham has Anthropic console access).

---

## P1 — Formalize as a Pantheon agent

**Status:** today the loop runs as a cron+tmux supervisor on `kaaos-daemon`. Per the Pantheon canon (`/dapper-agi:agi-design` → `agi-scaffold` → `agi-credentials` → `agi-iam-grant` → `agi-containerize`), each long-running agent should have:
- Its own GCE VM (not piggybacking kaaos-daemon)
- A dedicated SA (`topshot-builder-agent@dl-kaaos.iam.gserviceaccount.com`) with minimal IAM
- Its own credential set in GSM (already done — under `topshot-builder-` prefix)
- A Docker container with canonical resource limits (memory 14g, cpus 2.0, etc.)
- A heartbeat + boot/talk/cron primitives matching the Magic/Sinbad shape

**Why deferred:** the cron+tmux pattern matches the V4 precedent and is reversible/cheap. Formalization is the right move once the loop has shipped 5+ features cleanly and the prompts have stabilized. Premature heavyweight setup risks repeating the V4 failure (over-architecting before the architecture was earned).

**Action when ready:** invoke `/dapper-agi:agi-design` with scope "≤8 words: ship Top Shot Data Portal features autonomously". Then `agi-scaffold topshot-builder`. Per Tier 1 pattern (see daemon-ops skill).

**Owner:** Roham + next-after-next Dexter session, when criteria met.

---

## P2 — Idempotent judge runner

**Risk:** if the orchestrator's post-Builder judge phase runs (i.e., Builder didn't write `judge_passed:true` for some reason), the judge runner re-flips `features.json#passes:true` (idempotent in value) but ALSO appends a SECOND line to `progress.md` and a SECOND entry to `judge_evidence[]`. Duplicate noise in canonical state.

**Action:** patch `loop/judge/run.mjs` so:
- `progress.md` append: check if the most recent "Completed" line already contains this feature_id today; skip if yes
- `judge_evidence[]`: dedup by (capture_dir, portal_url) before push

**Owner:** future Dexter session (10 min of careful editing).

---

## P3 — research/features/*.md commit policy

**Status:** the Builder brief mentions optionally committing the Researcher's note (`research/features/{FEATURE_ID}.md`) as "docs" but leaves it ambiguous. Current state: research notes likely don't end up on main (they're untracked until something explicitly `git add`s them).

**Question:** should research notes be canonical (committed for future Researchers to reference) or transient (overwritten each iteration)?

**Recommendation:** commit them. They're useful when a feature ships in attempt 2/3 and the next-Dexter wants to trace the loop's reasoning. Disk impact is negligible (~5KB per file × 20 features).

**Action:** patch Builder brief step 5 to include `research/features/{FEATURE_ID}.md` in the explicit `git add` list (uncomment the existing `# git add research/features/...` line).

**Owner:** future Dexter session.

---

## P4 — `npx playwright install chromium` runs every Builder iteration (~60s waste)

**Status:** the Builder brief tells the agent to install chromium before running the judge in step 11.5. On a warm VM, it's a no-op (Playwright detects the cache and skips). On a cold VM (first ever iteration), it's a ~90s download.

**Risk:** wastes ~10-15 seconds per iteration even on warm VMs (the check itself takes that long). Across 50 iterations: ~10 minutes total.

**Action:** hoist `npx playwright install chromium` to the supervisor's one-time setup pass (once per VM, not per iteration). Remove from Builder brief.

**Owner:** future Dexter session.

---

## P5 — Auto-retire features after N consecutive failures

**Risk:** if a feature is genuinely impossible to ship (e.g., requires schema changes the loop can't make, or a 3rd-party API the loop can't access), the orchestrator keeps re-attempting it every iteration. Wastes API spend + blocks lower-priority features.

**Action:** patch the orchestrator's feature-picker — count `features.json#<id>.fail_reasons[]` length; if >= 5, treat as blocked and skip.

**Owner:** future Dexter session.

---

## P6 — Snapshot-cron interaction

**Status:** the `roham/topshot-data-portal` repo has a snapshot cron pushing autosave commits to main every few minutes. The Builder brief has retry logic for non-fast-forward push collisions. So far this has been graceful.

**Risk:** during high-load multi-iteration runs, the rebase-retry-loop could hit edge cases (e.g., the snapshot cron renamed a file the Builder also renamed → real conflict).

**Action:** if Roham observes Builder failures with "merge conflict" stderr in `loop/runner/state/<id>.build.log`: temporarily pause the snapshot cron for the duration of the loop run. `crontab -l | grep -i snapshot` → comment out → run loop → uncomment after backlog drained.

**Owner:** Roham (case-by-case).

---

## P7 — Production deploys cause brief broken states on main

**Status:** in-iteration retry attempts each push a commit to main; production briefly serves the in-progress (possibly broken) state between attempts. Users hitting the site during this window see broken UI. Roham explicitly accepted this trade-off ("PUSH TO MAIN AND ITERATE IN PROD"), but worth surfacing.

**Action:** if Roham wants to mitigate later: add a `[WIP]` commit-message prefix on attempt commits + a Vercel project setting that skips deploys for `[WIP]` commits. Then only the final passing commit triggers a production rebuild.

**Owner:** Roham (if-and-when complaints surface).

---

## P8 — Anthropic key auto-rotation

**Status:** rotation cadence in agi-credentials canon is 90 days. Not on the calendar.

**Action:** add a calendar reminder for 2026-08-15 to rotate `topshot-builder-anthropic-api-key`.

**Owner:** Roham.

---

## Risks that are NOT followups (just live with them)

- **Roham's GitHub PAT scope.** Currently using a token sourced from his local `gh auth token`. Per agi-credentials canon, each agent should have its own fine-grained PAT scoped to specific repos. Acceptable trade-off for tonight.
- **Vercel CLI token shape.** OAuth refresh-token-based; Vercel handles its own rotation. Not on Dexter's rotation calendar.
- **Duplicate progress.md lines from the legacy path.** If a feature was passed in the prior session and the next iteration re-runs Judge on it, dup lines appear. Mitigated when P2 lands; not blocking otherwise.

---

## What is NOT a risk despite looking like one

- **Snapshot cron is benign.** It tags + commits but doesn't modify anything functional. Builder rebase handles all collisions.
- **Sinbad-agent default identity on VM.** Doesn't affect topshot-builder operations because every gcloud call explicitly uses `--account=941997949640-compute@developer.gserviceaccount.com`.
- **Other Pantheon tmux sessions running on the same VM.** Different repos, different identities, different file-ownership zones. They don't collide.
