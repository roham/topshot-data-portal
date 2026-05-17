# 02 — State of the World (2026-05-17 ~07:00Z handoff)

Exact inventory of what exists, where, in what state. No editorializing — facts only.

---

## A. Production

- **Live URL:** https://topshot-data-portal.vercel.app
- **Vercel project:** `topshot-data-portal`, org `ros-projects-9a9bb0c9`, account label `r-8089`
- **Vercel auto-deploys main on every push.** This is the load-bearing fact the loop depends on.
- **Currently live features:** `moments-grid` (the `/moments` filterable table — OTM-parity centerpiece, shipped 2026-05-16T22:28). Renders real data from Supabase.

---

## B. Repository

- **GitHub:** `roham/topshot-data-portal`
- **Branch state:** `main` is canonical; `dexter/v5-orchestrator` and `dexter/v5-moment-detail-chart` are legacy branches (both closed as PRs, not deleted — forensic).
- **HEAD on main:** `3613f32` (or later if snapshot cron has pushed; verify with `git log origin/main --oneline | head`). Carries:
  - `loop/runner/orchestrator.mjs` — the loop's brain
  - `loop/prompts/{research,build}.md` — sub-agent briefs
  - `loop/runner/README.md` — operator runbook
  - `loop/judge/run.mjs` + `playwright.config.ts` + `journeys/moments-grid.spec.ts` — judge runner + the one shipped journey
  - `features.json` — 20-feature backlog (1 passing, 1 blocked, 18 unblocked-unpassed)
  - `LOOP-CHARTER.md` — role contracts
  - `progress.md` — session log + "Completed" / "Failed" markers
  - `research/personas/pro-trader.md`, `research/comp-diff-otm.md`, `research/00-foundation-v2.md`, `research/wiki/gotchas/*` — research foundation
  - `.gitignore` — excludes `loop/runner/state/` (the orchestrator's transient state dir)
  - `RETROSPECTIVE-2026-05-17-dexter-v5-orchestrator.md` — root-cause analysis of session failure modes
  - This `handover/` directory

- **Snapshot cron** pushes autosave commits to `main` every few minutes (`[snapshot] <tag> <ts>`). The loop's Builder brief has a `git pull --rebase --autostash` retry loop that handles these collisions.

---

## C. The VM — `kaaos-daemon`

- **Project:** `dl-kaaos`
- **Zone:** `us-central1-a`
- **Machine type:** ~62 GB RAM, 96 GB disk, plenty of headroom (NOT the e2-medium mentioned in older docs)
- **SSH:**
  ```bash
  gcloud compute ssh --tunnel-through-iap kaaos-daemon \
    --project dl-kaaos --zone us-central1-a
  ```
- **Unix user on VM:** `r_dapperlabs_com`
- **Active gcloud identity on VM (default):** `sinbad-agent@dl-kaaos.iam.gserviceaccount.com`. Do NOT change this — it's Sinbad's identity for the Pantheon agent that runs on this VM. **For topshot-builder operations, override per-call with `--account=941997949640-compute@developer.gserviceaccount.com`** (the compute SA, which is the metadata-server SA and which has been granted secretAccessor on every `topshot-builder-*` secret).
- **Concurrent tmux sessions present** (none of which belong to topshot-builder right now): `dapper-agi-eng-ownership-build`, `dapper-agi-research-compilation-build`, `dapper-agi-v07-overhaul-build`, `guardrails-architecture-dossier-build`, `overnight-build-build`. They're unrelated workloads; leave them alone.
- **Resources used on VM by the topshot loop:** one tmux session (`topshot-loop`), one `node` process (the orchestrator), one `claude --print --bare` subprocess at a time (per role spawn), peaks of `next build` spawning 4-5 worker procs for ~30s during Builder phase.

### C.1 Toolchain on the VM

| Tool | Version | Path | Auth state |
|---|---|---|---|
| `claude` (Claude Code CLI) | 2.1.114 | `/usr/bin/claude` | OAuth login NOT set; uses `ANTHROPIC_API_KEY` env via `--bare` flag |
| `node` | v22.22.1 | `/usr/bin/node` | n/a |
| `gh` (GitHub CLI) | 2.45.0 | `/usr/bin/gh` | logged in as `roham` (token in keyring after `gh auth login --with-token`) |
| `vercel` (Vercel CLI) | 51.4.0 | `/usr/bin/vercel` | logged in as `r-8089` via `~/.local/share/com.vercel.cli/auth.json` |
| `git` | 2.43.0 | `/usr/bin/git` | global config: `Dexter <dexter@dapperlabs.com>` |
| `jq` | 1.7 | `/usr/bin/jq` | n/a |
| `playwright` chromium | downloaded to `~/.cache/ms-playwright/` | (via `@playwright/test` 1.60) | n/a |

### C.2 Workspace on the VM

- **Repo clone:** `/home/r_dapperlabs_com/topshot-builder/topshot-data-portal/`
- **Current branch:** `main` (last set after the killed iteration earlier; verify with `cd <workspace> && git branch --show-current`)
- **`.env.local` present** at the workspace root (`chmod 600`), contains: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **`node_modules/` installed.** Don't re-install unless `package.json` changed.
- **Setup script left on the VM:** `~/topshot-builder-setup.sh` — idempotent re-runner. Useful if the VM ever loses state.

### C.3 Loose ends on the VM (clean state when you arrive)

- **No `topshot-loop` tmux session** is running. I killed it before handing off.
- **No leftover `claude --print` subprocesses.** Verified.
- **No `STOP` file** at `<workspace>/STOP`.
- **`loop/runner/state/` is empty** on the VM workspace. The prior iteration's artifacts (from the killed run) were wiped.

---

## D. Secrets (GSM)

Per the agi-credentials discipline: tokens entered via `--data-file=-` stdin pipe, never argv, never echoed.

| Secret | Project | Scope | Notes |
|---|---|---|---|
| `topshot-builder-anthropic-api-key` | `dl-ai-pantheon` | compute-SA accessor granted | **Currently holds Roham's local key — NO BUDGET CAP.** Rotate to a dedicated topshot-builder-only key with monthly cap before relying on >24h runs. See `06-FOLLOWUPS-AND-OPEN-RISKS.md`. |
| `topshot-builder-github-pat` | `dl-kaaos` | compute-SA accessor granted | Sourced from local Mac `gh auth token`; used by `gh auth login --with-token` on VM. |
| `topshot-builder-vercel-auth-json` | `dl-kaaos` | compute-SA accessor granted | The full content of `~/Library/Application Support/com.vercel.cli/auth.json` from Mac; written to `~/.local/share/com.vercel.cli/auth.json` on VM. Contains `token`, `userId`, `expiresAt`, `refreshToken`. |
| `topshot-builder-env-local` | `dl-kaaos` | compute-SA accessor granted | Full `.env.local` content; written to `<workspace>/.env.local` on VM. |

Fetch pattern (use `--account=` to force the compute SA since the VM's default account is sinbad-agent):
```bash
gcloud --account=941997949640-compute@developer.gserviceaccount.com \
  secrets versions access latest \
  --secret=topshot-builder-anthropic-api-key --project=dl-ai-pantheon
```

---

## E. The backlog — `features.json` summary

20 features total. Filterable:

- **Passing (don't pick):** 1 — `moments-grid`
- **Blocked (skip; needs auth wiring before loop can ship):** 1 — `watchlist`
- **Unblocked & not passing (loop targets):** 18, in priority order:
  - `moment-detail-chart` (priority 2) ← prior iteration's incomplete attempt left a fail report at `loop/judge/reports/moment-detail-chart-2026-05-17T03-13-02-493Z.md` documenting the tab-state-survives-refresh assertion failure. Next Researcher should read this. This is the loop's first target.
  - `moment-detail-circulation` (3), `players-marketcap` (4), `moments-csv-export` (5), `collector-bag` (6), `set-completion-histogram` (7), `moment-detail-histogram` (8), `moment-detail-serial-overlay` (9), `players-directory` (10), `sets-directory` (11), `packs-tracker` (12), `player-detail` (13), `sniper-alerts` (14), `real-time-feed` (16), `on-this-day` (17), `anomaly-detection` (18), `ipfs-provenance` (19), `cross-collector-compare` (20)

Per-feature schema (in `features.json`):
- `id`, `title`, `routes[]`, `priority`, `otm_parity` (bool), `passes` (bool), `passes_at` (timestamp), `blocked` (bool), `fail_reasons[]`, `acceptance` (string — the trader's verbatim journey), `data_source`, `implementation_hint`, `judge_journey` (path)

The loop reads `features.json` each iteration. Roham can edit it mid-run to retarget priorities, add features, mark items blocked. Changes pick up next iteration.

---

## F. Closed PRs (forensic only — do not reopen)

- **PR #3** [v5 loop] orchestrator + Researcher/Builder prompts — closed; content was direct-pushed to main per "iterate-in-prod" directive.
- **PR #4** [v5 loop] moment-detail-chart — closed-draft; was the prior iteration's incomplete attempt with the refresh-state bug. Feature branch `dexter/v5-moment-detail-chart` still exists on origin as a forensic record.

---

## G. Known live state on `progress.md` (main)

The "Completed" section has the moments-grid entry. The "Failed" section (if it exists) is empty as of the handoff. Future loop iterations append to both sections.

---

## H. Other Pantheon agents on this VM you should NOT touch

Per `/kaaos:daemon-ops` rule #0 (file ownership): each Pantheon identity owns its own state files. The kaaos-daemon writes `INBOX.md`, `.kaaos/state/*`, `.kaaos/proactive/*` in the `kaaos-knowledge` repo. Sinbad and others run their own tmux sessions. **Topshot-builder operates on a completely separate repo (`topshot-data-portal`) and its own tmux session (`topshot-loop`)**, so file-ownership collisions are not possible. Just don't kill someone else's tmux session by accident — list sessions before killing.
