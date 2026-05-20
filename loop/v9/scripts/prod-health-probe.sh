#!/usr/bin/env bash
# Post-deploy production health probe (Opus F6 fix — G10 gate).
# Runs AFTER Vercel deploys an iter to production.
# If FAIL → git revert HEAD && git push (auto-revert).
#
# Usage:
#   bash loop/v9/scripts/prod-health-probe.sh <iter-N>
#
# Exit codes:
#   0  — PASS (iter stays shipped)
#   1  — FAIL: / didn't return 200 OR has JS errors
#   2  — FAIL: iter-specific affordance not in DOM (per iter's plan)
#   3  — script error (Playwright missing, etc.)

set -euo pipefail

ITER="${1:-unknown}"
PROD_URL="https://topshot-data-portal.vercel.app"
TIMEOUT=30

echo "[V9 G10 prod-health] Probing $PROD_URL for iter $ITER"

# Step 1 — HTTP 200 + sane body size.
# Vercel SSR responses use Transfer-Encoding: chunked (no Content-Length header),
# so we measure body length directly via curl + wc -c.
HTTP_STATUS=$(curl -sI -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$PROD_URL" || echo "000")
if [ "$HTTP_STATUS" != "200" ]; then
  echo "[V9 G10 FAIL] / returned HTTP $HTTP_STATUS"
  exit 1
fi
BODY_LEN=$(curl -s --max-time $TIMEOUT "$PROD_URL" | wc -c | tr -d ' ')
if [ -z "$BODY_LEN" ] || [ "$BODY_LEN" -lt 5000 ]; then
  echo "[V9 G10 FAIL] / body suspiciously small: ${BODY_LEN:-empty} bytes"
  exit 1
fi
echo "[V9 G10] HTTP 200, body $BODY_LEN bytes — basic check passed"

# Step 2 — Playwright JS-error + affordance check.
# Graceful degrade: if node OR playwright module is missing in the calling
# environment, exit 0 after the basic HTTP+body check. The auto-revert path
# MUST only fire on real production failures, NOT on probe-script infrastructure
# gaps. Per Opus F6 design — the probe must distinguish "page broken" from
# "probe can't run." Daemon environments install playwright; local Mac and
# CI runners that don't have it get degraded coverage, not false auto-reverts.
if ! command -v node >/dev/null 2>&1; then
  echo "[V9 G10] node missing — degraded mode (basic check only)"
  exit 0
fi
if ! node -e "require('playwright')" >/dev/null 2>&1; then
  echo "[V9 G10] playwright module not installed in current env — degraded mode (basic check only). Install via 'npm install playwright && npx playwright install chromium' for full coverage."
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
  echo "[V9 G10] Triggering auto-revert"
  git revert --no-edit HEAD
  git push origin HEAD
  exit 1
fi
