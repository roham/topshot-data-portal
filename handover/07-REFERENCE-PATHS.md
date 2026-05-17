# 07 — Reference Paths (cheat sheet)

Everything you might need to look up, in one place. No prose.

---

## URLs

| Purpose | URL |
|---|---|
| Production portal | https://topshot-data-portal.vercel.app |
| GitHub repo | https://github.com/roham/topshot-data-portal |
| Anthropic console | https://console.anthropic.com |
| Vercel project | https://vercel.com/ros-projects-9a9bb0c9/topshot-data-portal |
| GCP secrets (dl-ai-pantheon) | https://console.cloud.google.com/security/secret-manager?project=dl-ai-pantheon |
| GCP secrets (dl-kaaos) | https://console.cloud.google.com/security/secret-manager?project=dl-kaaos |

---

## VM

| What | Where |
|---|---|
| VM name | `kaaos-daemon` |
| GCP project | `dl-kaaos` |
| Zone | `us-central1-a` |
| Unix user | `r_dapperlabs_com` |
| Compute SA (use this for all topshot-builder gcloud calls) | `941997949640-compute@developer.gserviceaccount.com` |
| Default gcloud identity on VM (do NOT change) | `sinbad-agent@dl-kaaos.iam.gserviceaccount.com` |

**SSH:**
```bash
gcloud compute ssh --tunnel-through-iap kaaos-daemon \
  --project dl-kaaos --zone us-central1-a
```

**Run command remotely:**
```bash
gcloud compute ssh --tunnel-through-iap kaaos-daemon \
  --project dl-kaaos --zone us-central1-a \
  --command '<command>'
```

---

## Filesystem (on VM)

| Path | What |
|---|---|
| `/home/r_dapperlabs_com/topshot-builder/topshot-data-portal/` | Loop workspace (the cloned repo) |
| `/home/r_dapperlabs_com/topshot-builder/topshot-data-portal/STOP` | Touch this to halt cleanly |
| `/opt/topshot-loop/supervisor.sh` | The supervisor wrapper script |
| `/home/r_dapperlabs_com/topshot-builder-setup.sh` | Idempotent setup script (re-bootstraps VM workspace if needed) |
| `/tmp/topshot-supervisor.log` | Supervisor lifecycle events |
| `/tmp/topshot-supervisor.cron.log` | Cron stderr (path/perm issues) |
| `/tmp/topshot-loop.log` | Live orchestrator output |
| `/home/r_dapperlabs_com/.local/share/com.vercel.cli/auth.json` | Vercel CLI token |
| `/home/r_dapperlabs_com/.config/gh/hosts.yml` | GitHub CLI auth state |

---

## Filesystem (in repo on main)

| Path | What |
|---|---|
| `loop/runner/orchestrator.mjs` | The loop's brain (Node 22 ESM) |
| `loop/runner/state/*` | Per-iteration transient state (GITIGNORED — lives on VM only) |
| `loop/runner/README.md` | Operator runbook |
| `loop/prompts/research.md` | Researcher brief template (`{FEATURE_ID}` substituted at render) |
| `loop/prompts/build.md` | Builder brief template |
| `loop/judge/run.mjs` | Judge runner (Playwright + features.json flip + progress.md append) |
| `loop/judge/playwright.config.ts` | Playwright config (reads PORTAL_URL) |
| `loop/judge/journeys/*.spec.ts` | Per-feature judge journeys (Builder writes these) |
| `loop/judge/captures/<id>/<ts>/*.png` | Judge screenshots per iteration |
| `loop/judge/reports/<id>-<ts>.md` | Judge fail-reports (narrative only — assertion text is in judge.log) |
| `features.json` | The backlog (20 features) |
| `progress.md` | Human-readable shipped/failed log |
| `LOOP-CHARTER.md` | Role contracts |
| `research/personas/pro-trader.md` | Persona doc |
| `research/comp-diff-otm.md` | Per-feature OTM gap enumeration |
| `research/00-foundation-v2.md` | Foundation doc (10 public-API ceilings) |
| `research/wiki/gotchas/*.md` | Load-bearing operational constraints |
| `research/features/<id>.md` | Researcher's note per feature (may or may not be committed) |
| `research/otm-screenshots/*.png` | OTM reference captures |
| `RETROSPECTIVE-2026-05-17-dexter-v5-orchestrator.md` | This session's failure-mode analysis |
| `handover/*` | This handover directory |

---

## Filesystem (on the Mac, for next-Dexter to re-orient)

| Path | What |
|---|---|
| `/Users/ro/dapper/topshot-data-portal/` | The Mac clone (may be stale; pull before reading) |
| `~/agents/dexter/CLAUDE.md` | Boot ritual |
| `~/agents/dexter/identity.md` | Voice doctrine |
| `~/agents/dexter/voice-dna.md` | Redline pairs (most recent: 2026-05-17 author-from-memory-not-filesystem) |
| `~/agents/dexter/memory/MEMORY.md` | Memory index |
| `~/agents/dexter/memory/SESSION.md` | Working memory |
| `~/agents/dexter/memory/shortterm.md` | Last session's scratch |
| `~/agents/dexter/skills/verify/SKILL.md` | Verifier skill |
| `~/agents/dexter/skills/verify/scripts/verify-via-openai.py` | Cross-vendor verification |
| `~/agents/dexter/knowledge/frontier/patterns/cross-vendor-verification.md` | Pattern |
| `~/agents/dexter/knowledge/frontier/anti-patterns/agent-self-verification.md` | Anti-pattern |
| `~/agents/cgs-template-rg/THE-WAY.md` | Doctrine (consult on difficulty) |
| `~/agents/cgs-template-rg/THE-LEARNINGS.md` | Cross-Pantheon learnings corpus |

---

## GSM secrets

| Secret name | Project | Used by |
|---|---|---|
| `topshot-builder-anthropic-api-key` | `dl-ai-pantheon` | Supervisor + Builder subprocess (env var) |
| `topshot-builder-github-pat` | `dl-kaaos` | One-time `gh auth login --with-token` on VM |
| `topshot-builder-vercel-auth-json` | `dl-kaaos` | One-time write to `~/.local/share/com.vercel.cli/auth.json` on VM |
| `topshot-builder-env-local` | `dl-kaaos` | One-time write to `<workspace>/.env.local` on VM |

**Fetch (compute SA, never display value):**
```bash
gcloud --account=941997949640-compute@developer.gserviceaccount.com \
  secrets versions access latest \
  --secret=<secret-name> --project=<project>
```

**Rotate (paste new value via stdin):**
```bash
gcloud secrets versions add <secret-name> --data-file=- --project=<project>
# paste, Ctrl-D
```

---

## Common commands

### Watch the loop live (from laptop)
```bash
gcloud compute ssh --tunnel-through-iap kaaos-daemon \
  --project dl-kaaos --zone us-central1-a \
  --command 'tail -f /tmp/topshot-loop.log'
```

### Halt cleanly
```bash
gcloud compute ssh --tunnel-through-iap kaaos-daemon \
  --project dl-kaaos --zone us-central1-a \
  --command 'touch /home/r_dapperlabs_com/topshot-builder/topshot-data-portal/STOP'
```

### Resume
```bash
gcloud compute ssh ... --command 'rm /home/r_dapperlabs_com/topshot-builder/topshot-data-portal/STOP'
```

### Force-launch loop now (skip cron wait)
```bash
gcloud compute ssh ... --command '/opt/topshot-loop/supervisor.sh'
```

### What's shipping on main right now
```bash
gh api repos/roham/topshot-data-portal/commits/main --jq '.commit.committer.date + " | " + .commit.message[:120]'
```

### Which features have passed
```bash
gh api repos/roham/topshot-data-portal/contents/features.json --jq '.content' \
  | base64 -d | jq -r '.features[] | select(.passes==true) | .id + " (passed at " + .passes_at + ")"'
```

### Verify VM toolchain (one-shot health check)
```bash
gcloud compute ssh ... --command '
  echo "claude: $(claude --version 2>&1 | head -1)"
  echo "node: $(node --version)"
  echo "gh: $(gh auth status 2>&1 | grep "Logged in" || echo "NOT AUTHED")"
  echo "vercel: $(vercel whoami 2>&1 | head -1)"
  echo "loop session: $(tmux list-sessions 2>/dev/null | grep topshot-loop || echo "not running")"
  echo "STOP file: $(test -f /home/r_dapperlabs_com/topshot-builder/topshot-data-portal/STOP && echo "PRESENT" || echo "absent")"
  echo "cron: $(crontab -l | grep topshot-loop || echo "not installed")"
'
```

### Test Anthropic key validity
```bash
gcloud compute ssh ... --command '
  KEY=$(gcloud --account=941997949640-compute@developer.gserviceaccount.com secrets versions access latest --secret=topshot-builder-anthropic-api-key --project=dl-ai-pantheon)
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "x-api-key: $KEY" -H "anthropic-version: 2023-06-01" -H "Content-Type: application/json" https://api.anthropic.com/v1/messages -d "{\"model\":\"claude-haiku-4-5\",\"max_tokens\":5,\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}]}")
  echo "HTTP=$HTTP (expect 200; 401 means key invalid; non-200 means key issue)"
'
```

### Find the latest judge fail report for a feature
```bash
gh api repos/roham/topshot-data-portal/contents/loop/judge/reports --jq '.[] | select(.name | startswith("<feature-id>-")) | .name' | sort | tail -1
```

---

## Skills to load (in this order) when starting next session

```
/kaaos:daemon-ops              — VM ops, file ownership, security
/thoth-prompter:agent          — orchestration patterns, anti-shortcircuit rules, daemon dispatch
/plugin-dev:agent-development  — agent file format (only if formalizing supervisor as skill)
```

**Also relevant:**
- `verify` skill at `~/agents/dexter/skills/verify/SKILL.md` — for cross-vendor review of any prompt change
- `superpowers:dispatching-parallel-agents` — if next-Dexter needs to fan out research
- `superpowers:verification-before-completion` — the discipline this session learned the hard way

---

## Commit refs to anchor on

| Ref | What |
|---|---|
| `3613f32` (or later) | HEAD of main after this session's cross-vendor-review fixes |
| `4f39dce` | The merged PR #1 — `/moments` grid shipped to production (prior session) |
| `9959936` | The local foundation commit (pre-merge) — superseded |

Verify the current HEAD with: `gh api repos/roham/topshot-data-portal/commits/main --jq '.sha[:7] + " | " + .commit.message'`
