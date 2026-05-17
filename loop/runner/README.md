# v5 Top Shot Data Portal — orchestrator runbook

This is the operator's view of the v5 autonomous build loop. The orchestrator picks the highest-priority unblocked feature from `features.json`, dispatches the Researcher → Builder → Judge sequence one at a time, records outcomes on disk, and loops. The judge is the only role allowed to flip `features.json` `passes`. The orchestrator never writes to `features.json`.

## Usage

Smoke-test one specific feature, no spawning:

    node loop/runner/orchestrator.mjs --feature moment-detail-chart --once --dry-run

Continuous loop with a wall-clock budget:

    node loop/runner/orchestrator.mjs --max-hours 8

Single iteration against the highest-priority unblocked feature (real spawns):

    node loop/runner/orchestrator.mjs --once

`--help` prints the full CLI usage.

## How to stop a running loop

- Clean stop next tick: `touch STOP` at the repo root. The orchestrator detects it before picking a feature and exits 0.
- Hard stop: `ctrl-c` in the orchestrator's terminal. In-flight sub-agents may be left running until their own timeouts; check `ps aux | grep claude` if you need certainty.

## How to redirect priority

Edit `features.json` directly. The orchestrator re-reads it at the top of every iteration, so priority changes land within ~5 seconds. To force a specific feature next, either reorder priorities or run the next loop tick with `--feature <id>`.

## Where state lives

All transient per-iteration state is in `loop/runner/state/` (gitignored). Filenames are namespaced by feature id:

- `<id>.iteration.json` — current phase (`researching` | `building` | `judging` | `done` | `failed`), run id, attempt counter, timestamps. On orchestrator restart with phase != `done`, the same feature is re-attempted next tick.
- `<id>.research.log` — merged stdout/stderr from the Researcher sub-agent.
- `<id>.build.log` — merged stdout/stderr from the Builder sub-agent.
- `<id>.judge.log` — merged stdout/stderr from the judge runner (`loop/judge/run.mjs`).
- `<id>.done.json` — Builder's success marker (`commit_sha`, `branch_name`, `deploy_url`, `smoke_passed`, `pr_url`). Required input for the judge phase.
- `<id>.failed.md` — written when any phase fails; carries the failure shape for the next research turn to read.
- `<id>.crash.log` — defensive; only appears if an iteration throws an uncaught exception in the orchestrator itself.

## Where to read what happened

- `progress.md` — the judge appends to "Completed (chronological, judge-verified only)" on each pass. The orchestrator does NOT append here; duplication is forbidden.
- `loop/judge/reports/` — judge fail reports per failed journey run. Gitignored. Read the most recent one for a given feature before re-attempting.
- `loop/judge/captures/<feature-id>/<ts>/` — per-step screenshots from the judge's Playwright journey. Gitignored.
- `loop/runner/state/*.log` — the orchestrator + sub-agent logs (above).
- `research/features/<feature-id>.md` — the Researcher's per-feature note. Committed; the next research turn reads its own prior note.

## What you do NOT do

- DO NOT edit `features.json` to flip `passes`. The judge is the sole writer. If a flag is wrong, write `passes: revoked` per LOOP-CHARTER §9.
- DO NOT modify `loop/judge/run.mjs`, `loop/judge/playwright.config.ts`, or any existing journey spec. Builders ADD new journey files; they do not edit existing ones.
- DO NOT modify `loop/runner/orchestrator.mjs` or `loop/prompts/*.md` from inside a Builder session.
- DO NOT attach to a running sub-agent's `claude` session. The sub-agent is autonomous; reading its log is the supported observation channel.
- DO NOT push to `main` from any role. Builders push to `dexter/v5-<feature-id>` and open a PR.
- DO NOT pass `--no-verify`, `--no-gpg-sign`, or `--force` to git from any role.

## See also

- `LOOP-CHARTER.md` — the operating contract (roles, exit conditions, anti-FINAL guard).
- `HANDOVER-NEXT-SESSION.md` — what to read first when picking up a cold session.
