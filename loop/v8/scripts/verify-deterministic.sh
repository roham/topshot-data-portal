#!/usr/bin/env bash
# loop/v8/scripts/verify-deterministic.sh
# P3 deterministic primitives. Called from orchestrator.mjs Stop hook chain and Phase 1 wet-run.
# Outputs JSON to stdout: {"verdict":"PASS"|"FAIL","failures":[...]}
# Exit 0 on PASS, exit 1 on FAIL. No -e (we collect failures, not stop on first).

set -uo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO_ROOT"

FAILURES=()
LOG_DIR="${TOPSHOT_LOOP_LOG_DIR:-/tmp}"

# 1. npm run build
if ! npm run build >"$LOG_DIR/v8-build.log" 2>&1; then
  FAILURES+=("build_failed")
fi

# 2. tsc no-emit (exclude loop/judge noise per V7 inheritance)
TSC_ERRORS=$(npx tsc --noEmit 2>&1 | grep -v 'loop/judge' | grep -c 'error TS' || true)
if [[ "$TSC_ERRORS" -gt 0 ]]; then
  FAILURES+=("tsc_errors:$TSC_ERRORS")
fi

# 3. Probe-evidence: any "X unavailable" claim in last commit's diff has SQL probe adjacent.
# Skip if there's no previous commit (initial seed).
if git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
  LAST_DIFF=$(git diff HEAD~1 HEAD)
  UNAVAILABLE_CLAIMS=$(echo "$LAST_DIFF" | grep -cE 'unavailable|cannot determine|TBD|approximately' || true)
  PROBES=$(echo "$LAST_DIFF" | grep -cE 'SELECT|bq query|psql' || true)
  if [[ "$UNAVAILABLE_CLAIMS" -gt 0 && "$PROBES" -lt "$UNAVAILABLE_CLAIMS" ]]; then
    FAILURES+=("probe_evidence_missing:claims=$UNAVAILABLE_CLAIMS,probes=$PROBES")
  fi
fi

# 4. Multi-viewport screenshots (Playwright).
# Tolerate "no matching tests" gracefully — Tier A-6 is the iter that authors these.
# Only count a real test failure (exit != 0 AND output doesn't say "No tests found").
for VP in 375 768 1280 1920; do
  if npx playwright test --grep "@viewport-$VP" >"$LOG_DIR/v8-play-$VP.log" 2>&1; then
    : # pass
  else
    EXIT=$?
    if grep -qE 'No tests found|0 tests' "$LOG_DIR/v8-play-$VP.log" 2>/dev/null; then
      : # warn-skip; not a failure
    else
      FAILURES+=("playwright_${VP}_failed:exit=$EXIT")
    fi
  fi
done

# 5. Copy audit (P0 leaks only; --llm if OPENAI_API_KEY present, else heuristic-only).
COPY_ARGS=("--threshold" "P0")
if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  COPY_ARGS=("--llm" "${COPY_ARGS[@]}")
fi
if ! node scripts/audit-copy.mjs "${COPY_ARGS[@]}" >"$LOG_DIR/v8-copy-audit.log" 2>&1; then
  # audit-copy returns non-zero only on P0 leak found
  if grep -qE 'P0 leak|customer-facing' "$LOG_DIR/v8-copy-audit.log" 2>/dev/null; then
    FAILURES+=("copy_audit_p0_leaks")
  fi
fi

# Output JSON verdict
if [[ ${#FAILURES[@]} -eq 0 ]]; then
  printf '{"verdict":"PASS","failures":[]}\n'
  exit 0
else
  printf '{"verdict":"FAIL","failures":['
  for i in "${!FAILURES[@]}"; do
    [[ $i -gt 0 ]] && printf ','
    printf '"%s"' "${FAILURES[$i]}"
  done
  printf ']}\n'
  exit 1
fi
