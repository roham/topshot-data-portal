#!/usr/bin/env bash
# loop/v8/scripts/cron-tick.sh
# Called by cron every 30 min on kaaos-daemon.
# Pre-flight checks, then invokes orchestrator.mjs with a 55-min hard timeout.

set -uo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO_ROOT"

TS() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { printf '[%s] %s\n' "$(TS)" "$*"; }

# Pre-flight 0: hydrate API keys from GSM (kaaos-daemon pattern, inherits from V7 supervisor).
# Skipped on dev Macs (gcloud not configured to the kaaos compute SA).
ANTHROPIC_SECRET_PROJECT="${ANTHROPIC_SECRET_PROJECT:-dl-ai-pantheon}"
ANTHROPIC_SECRET_NAME="${ANTHROPIC_SECRET_NAME:-topshot-builder-anthropic-api-key}"
OPENAI_SECRET_NAME="${OPENAI_SECRET_NAME:-topshot-loop-openai-api-key}"
COMPUTE_SA="${COMPUTE_SA:-941997949640-compute@developer.gserviceaccount.com}"

if [[ -z "${ANTHROPIC_API_KEY:-}" ]] && command -v gcloud >/dev/null 2>&1; then
  KEY=$(gcloud --account="$COMPUTE_SA" secrets versions access latest \
    --secret="$ANTHROPIC_SECRET_NAME" --project="$ANTHROPIC_SECRET_PROJECT" 2>/dev/null || true)
  if [[ -n "$KEY" ]]; then export ANTHROPIC_API_KEY="$KEY"; log "ANTHROPIC_API_KEY hydrated (${#KEY} bytes)"; fi
fi
if [[ -z "${OPENAI_API_KEY:-}" ]] && command -v gcloud >/dev/null 2>&1; then
  KEY=$(gcloud --account="$COMPUTE_SA" secrets versions access latest \
    --secret="$OPENAI_SECRET_NAME" --project="$ANTHROPIC_SECRET_PROJECT" 2>/dev/null || true)
  if [[ -n "$KEY" ]]; then export OPENAI_API_KEY="$KEY"; log "OPENAI_API_KEY hydrated (${#KEY} bytes)"; fi
fi

# Pre-flight 1: STOP file
if [[ -f "$REPO_ROOT/STOP" ]]; then
  log "STOP file present, halting"
  exit 0
fi

# Pre-flight 2: cost ledger daily caps
if ! node loop/v8/scripts/cost-gate.mjs --pre-flight; then
  log "daily cost cap hit, halting"
  exit 0
fi

# Pre-flight 3: phase status
PHASE=$(python3 -c 'import json;print(json.load(open("loop/v8/state/phase-status.json"))["current"])' 2>/dev/null || echo "1")

# Pre-flight 4: dry-run vs wet-run
WET=0
if [[ -f "loop/v8/state/wet-run-enabled" ]]; then
  WET=1
fi
if [[ "${DRY_RUN:-0}" == "1" ]]; then
  WET=0
fi
log "tick — phase=$PHASE wet=$WET"

# Pre-flight 5: single-tick lock (prevent overlapping cron invocations)
LOCK="/tmp/topshot-v8-cron-tick.lock"
(
  flock -n 9 || { log "previous tick still running, skipping"; exit 0; }
  TIMEOUT_BIN="$(command -v timeout || command -v gtimeout || true)"
  if [[ -n "$TIMEOUT_BIN" ]]; then
    "$TIMEOUT_BIN" 3300 node loop/v8/scripts/orchestrator.mjs \
      --phase "$PHASE" \
      --ledger loop/v8/state/task-ledger.json \
      --output loop/v8/state/ \
      --wet "$WET"
  else
    node loop/v8/scripts/orchestrator.mjs \
      --phase "$PHASE" \
      --ledger loop/v8/state/task-ledger.json \
      --output loop/v8/state/ \
      --wet "$WET"
  fi
) 9>"$LOCK"
