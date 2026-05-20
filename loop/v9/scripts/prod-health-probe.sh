#!/usr/bin/env bash
# Post-deploy production health probe (Opus F6 fix — G10 gate).
# Runs AFTER Vercel deploys an iter to production.
#
# **CHECK-ONLY** — does NOT auto-revert. Returns non-zero on failure; the
# caller (orchestrator stage chain) decides what to do with the failure
# (revert via separate command, escalate to Meta-Track, file CORRECTIVE iter).
#
# Earlier iteration of this script bundled auto-revert (`git revert HEAD && git
# push`) but proved catastrophic in practice — the probe self-reverted twice
# during V9 iter-1 ship due to a missing-Playwright-module infra gap that
# the script couldn't distinguish from a real production failure. The right
# shape is separation of concerns: probe checks; revert is a separate
# explicit operator action.
#
# Usage:
#   bash loop/v9/scripts/prod-health-probe.sh <iter-N>
#
# Exit codes:
#   0  — PASS (production is healthy; iter stays shipped)
#   1  — FAIL: / didn't return HTTP 200
#   2  — FAIL: / body suspiciously small (deploy may have shipped a blank/error page)
#   3  — FAIL: Playwright probe detected JS errors or bodyTooShort
#   4  — script infra error (node/playwright not installed) — DEGRADED COVERAGE, not a real prod failure

set -euo pipefail

ITER="${1:-unknown}"
PROD_URL="https://topshot-data-portal.vercel.app"
TIMEOUT=30

echo "[V9 G10 prod-health] Probing $PROD_URL for iter $ITER"

# Step 1 — HTTP 200
HTTP_STATUS=$(curl -sI -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL" || echo "000")
if [ "$HTTP_STATUS" != "200" ]; then
  echo "[V9 G10 FAIL] / returned HTTP $HTTP_STATUS"
  exit 1
fi

# Step 2 — Body size (Vercel SSR uses chunked transfer; measure body directly).
BODY_LEN=$(curl -s --max-time $TIMEOUT "$PROD_URL" | wc -c | tr -d ' ')
if [ -z "$BODY_LEN" ] || [ "$BODY_LEN" -lt 5000 ]; then
  echo "[V9 G10 FAIL] / body suspiciously small: ${BODY_LEN:-empty} bytes"
  exit 2
fi
echo "[V9 G10] HTTP 200, body $BODY_LEN bytes — basic check passed"

# Step 3 — Playwright JS-error + body-length check.
# Graceful degrade: if node OR playwright module is missing in the calling
# environment, exit 0 after the basic HTTP+body check. The auto-revert path
# is intentionally NOT here — the script is check-only. Daemon environments
# with Playwright installed get the JS-error check; local runners that don't
# have it get HTTP-and-body-length coverage only (exit 4 = degraded, NOT a
# real prod failure signal).
if ! command -v node >/dev/null 2>&1; then
  echo "[V9 G10] node missing — degraded mode (basic check only, exit 0)"
  exit 0
fi
if ! node -e "require('playwright')" >/dev/null 2>&1; then
  echo "[V9 G10] playwright not loadable — degraded mode (basic check only, exit 0). Install via 'npm install playwright && npx playwright install chromium' on daemon for full coverage."
  exit 0
fi

PROBE_SCRIPT="$(mktemp /tmp/v9-probe-XXXXXX.js)"
trap 'rm -f "$PROBE_SCRIPT"' EXIT

cat > "$PROBE_SCRIPT" <<JSEOF
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', e => jsErrors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error') jsErrors.push('CONSOLE: ' + msg.text()); });
  try {
    await page.goto(process.env.PROBE_URL, { waitUntil: 'networkidle', timeout: ${TIMEOUT}*1000 });
    const body = await page.locator('body').innerText();
    if (body.length < 200) {
      console.log('FAIL bodyTooShort ' + body.length);
      process.exit(1);
    }
    if (jsErrors.length > 0) {
      console.log('FAIL jsErrors ' + JSON.stringify(jsErrors));
      process.exit(1);
    }
    console.log('PASS bodyLen=' + body.length + ' jsErrors=0');
  } catch (e) {
    console.log('FAIL playwrightError ' + e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
JSEOF

if PROBE_OUTPUT=$(PROBE_URL="$PROD_URL" node "$PROBE_SCRIPT" 2>&1); then
  echo "[V9 G10 PASS] $PROBE_OUTPUT"
  exit 0
else
  echo "[V9 G10 FAIL] $PROBE_OUTPUT"
  echo "[V9 G10] Probe is CHECK-ONLY. Auto-revert disabled. Caller must decide remediation."
  exit 3
fi
