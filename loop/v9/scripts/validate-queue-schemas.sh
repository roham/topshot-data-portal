#!/usr/bin/env bash
# Validates V9 queue files against schemas/queue.schema.json.
# Run as pre-commit hook or CI step.
set -euo pipefail

cd "$(dirname "$0")/../../.."

SCHEMA="loop/v9/schemas/queue.schema.json"
QUEUES=(
  "loop/v9/queues/discoverability.json"
  "loop/v9/queues/polish.json"
  "loop/v9/queues/visual.json"
)

if ! command -v ajv >/dev/null 2>&1; then
  echo "WARN: ajv-cli not installed; falling back to jq syntax check only."
  echo "  Install: npm install -g ajv-cli ajv-formats"
  for q in "${QUEUES[@]}"; do
    if [ ! -f "$q" ]; then
      echo "MISSING: $q"
      exit 1
    fi
    if ! jq empty "$q" 2>/dev/null; then
      echo "INVALID JSON: $q"
      exit 1
    fi
    echo "JSON-OK: $q"
  done
  exit 0
fi

EXIT=0
for q in "${QUEUES[@]}"; do
  if [ ! -f "$q" ]; then
    echo "MISSING: $q"
    EXIT=1
    continue
  fi
  if ajv validate -s "$SCHEMA" -d "$q" --strict=false 2>&1; then
    echo "SCHEMA-OK: $q"
  else
    echo "SCHEMA-FAIL: $q"
    EXIT=1
  fi
done
exit $EXIT
