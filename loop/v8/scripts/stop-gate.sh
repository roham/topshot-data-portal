#!/usr/bin/env bash
# loop/v8/scripts/stop-gate.sh
# Claude Code Stop hook. Reads stdin event JSON; emits decision JSON to stdout.
# Engages only when an active iter lock is present (interactive Phase 1 wet-run); otherwise approves.

set -uo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO_ROOT"

# Drain stdin (the Stop event JSON); we don't currently inspect it.
cat >/dev/null

# Only gate when an orchestrator-driven iter is active.
if [[ ! -f "loop/v8/state/active-iter.lock" ]]; then
  printf '{"decision":"approve"}\n'
  exit 0
fi

VERIFY=$(loop/v8/scripts/verify-deterministic.sh 2>/dev/null || true)
VERDICT=$(printf '%s' "$VERIFY" | python3 -c 'import sys,json;d=json.loads(sys.stdin.read() or "{}");print(d.get("verdict","UNKNOWN"))' 2>/dev/null || echo "UNKNOWN")

if [[ "$VERDICT" != "PASS" ]]; then
  REASONS=$(printf '%s' "$VERIFY" | python3 -c 'import sys,json;d=json.loads(sys.stdin.read() or "{}");print(json.dumps(d.get("failures",[])))' 2>/dev/null || echo '[]')
  printf '{"decision":"block","reason":"P3 verifier FAIL: %s"}\n' "$REASONS"
  exit 0
fi

printf '{"decision":"approve"}\n'
exit 0
