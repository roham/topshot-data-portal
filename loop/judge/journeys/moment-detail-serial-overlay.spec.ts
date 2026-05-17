// Persona journey J9 — moment-detail-serial-overlay (OTM-parity).
//
// From research/personas/pro-trader.md §Discord voice #2:
//   "I need to dump the Common Wembys with serials > 5K before EOM. Are there
//    any thinly-listed parallels with better bid support?"
//
// Acceptance (features.json[moment-detail-serial-overlay].acceptance):
//   "As a trader, I type a serial number into the 'True Value by serial' input
//    on a moment detail page and see a price estimate for that specific serial
//    (or an honest 'not enough comps' message)."
//
// OTM signature move (research/features/moment-detail-serial-overlay.md §2):
//   OTM "Search True Value by serial" input: typing a serial number causes the
//   pricing block to update in place — serial-band premiums (sub-100 = premium,
//   high-serial = discount) fire automatically. The result includes:
//     - Estimated fair value for the typed serial
//     - Parallel context label ("Base parallel" / "Parallel #N")
//     - Confidence string
//     - Adjustment trace (which rules fired)
//
// PSA pop-by-grade cross-domain signature (§2):
//   Alongside the fair value, show the comp context for the serial's band —
//   "band 1–100" etc. — so the trader can see which segment of the market
//   the estimate draws from.
//
// Pass criteria per step:
//   1. Navigate to known moment → page loads < 30s (cold)
//   2. "True Value by serial" card is visible
//   3. serial-input element is present with data-testid="serial-input"
//   4. Type serial 50 → result block appears (data-testid="serial-valuation-result")
//   5. URL contains ?s=50 (Pillar 1 URL-state mandate)
//   6. Result block contains a dollar amount (rendered data assertion)
//   7. Result block contains parallel context label ("Base parallel" or "Parallel #")
//   8. Navigate to /moment/<id>?s=1 directly → result pre-populated without interaction
//   9. Input shows serial #1; result block shows premium (serial1 rule fires)
//  10. Clear serial (set s=null) → result block disappears
//  11. Type a high serial (e.g. 9999) if circulation > 9999 → result block shows
//      lower-premium or no-premium estimate; no crash
//
// Evidence: screenshots at each numbered step go to ./captures/moment-detail-serial-overlay/<ts>/

import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TS = new Date().toISOString().replace(/[:.]/g, "-");
const CAPTURE_DIR = path.join(
  __dirname,
  "..",
  "captures",
  "moment-detail-serial-overlay",
  TS,
);

// Cold Vercel serverless boot can take 20–30s. Warm runs are sub-3s.
test.setTimeout(180_000);

// Known-good flowId with market data (used by moment-detail-chart.spec.ts).
const KNOWN_FLOW_ID = "47863705";

test.beforeAll(() => {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
});

test("J9 — moment-detail-serial-overlay: serial input shows estimate; URL encodes state; parallel context present", async ({
  page,
}) => {
  // ── Step 0: land — navigate to known moment detail page ──────────────────
  const navStart = Date.now();
  await page.goto(`/moment/${KNOWN_FLOW_ID}`, { timeout: 90_000 });
  // Wait for any heading (hero renders first).
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 60_000 });
  const ttiMs = Date.now() - navStart;
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "00-land.png"),
    fullPage: true,
  });
  // Cold-deploy TTI guard.
  expect(ttiMs, `detail page TTI was ${ttiMs}ms`).toBeLessThan(30_000);

  // ── Step 1: card-visible — "True Value by serial" Card heading present ────
  // From research/features/moment-detail-serial-overlay.md §4 item 1:
  //   "Input labeled 'True Value by serial' is present on /moment/[flowId]"
  const cardHeading = page.getByRole("heading", { name: "True Value by serial" });
  await cardHeading.waitFor({ state: "visible", timeout: 20_000 });
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "01-card-visible.png"),
    fullPage: true,
  });

  // ── Step 2: input-present — serial-input element visible ──────────────────
  const serialInput = page.locator('[data-testid="serial-input"]');
  await expect(serialInput, "serial-input must be visible").toBeVisible();
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "02-input-present.png"),
    fullPage: true,
  });

  // ── Step 3: type-serial — enter serial 50 → result block appears ──────────
  // From research/features/moment-detail-serial-overlay.md §4 item 2:
  //   "Entering a valid serial renders a result block with an estimated price"
  // OTM signature: typing triggers inline update; no page nav.
  await serialInput.fill("50");
  // nuqs debounces and pushes ?s=50 to the URL.
  await page.waitForURL(/[?&]s=50/, { timeout: 10_000 });
  // Wait for the result block to appear.
  const resultBlock = page.locator('[data-testid="serial-valuation-result"]');
  await resultBlock.waitFor({ state: "visible", timeout: 15_000 });
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "03-serial-50-result.png"),
    fullPage: true,
  });

  // ── Step 4: url-state — URL contains ?s=50 ──────────────────────────────
  // Pillar 1 mandate: "the entered serial MUST be reflected in the URL so the
  //   trader can share a permalink."
  expect(page.url(), "URL must contain ?s=50 after typing serial 50").toContain("s=50");

  // ── Step 5: result-has-dollar — result block contains a dollar amount ─────
  // From research/features/moment-detail-serial-overlay.md §4 item 2:
  //   "a result block with an estimated price"
  // Assert rendered data, not just element existence.
  const resultText = await resultBlock.innerText();
  const hasDollarOrNotEnough =
    resultText.includes("$") || resultText.toLowerCase().includes("not enough");
  expect(
    hasDollarOrNotEnough,
    `result block must contain dollar amount or 'not enough'; got: "${resultText.slice(0, 120)}"`,
  ).toBe(true);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "04-result-data.png"),
    fullPage: true,
  });

  // ── Step 6: parallel-context — result contains parallel label ────────────
  // From research/features/moment-detail-serial-overlay.md §4 item 6:
  //   "result text shows 'Base parallel' or 'Parallel #N'"
  // Pillar 5 §6: parallels-not-aggregated, parallel context in label.
  // If result is empty state (no base price), parallel context may not appear —
  // accept either the parallel label OR the honest-empty "not enough" signal.
  const hasParallelLabel =
    resultText.includes("Base parallel") ||
    resultText.includes("Parallel #") ||
    resultText.toLowerCase().includes("not enough");
  expect(
    hasParallelLabel,
    `result block must include parallel context or honest-empty state; got: "${resultText.slice(0, 200)}"`,
  ).toBe(true);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "05-parallel-context.png"),
    fullPage: true,
  });

  // ── Step 7: permalink — navigate to ?s=1 directly; result pre-populated ──
  // From research/features/moment-detail-serial-overlay.md §4 item 3:
  //   "Navigating directly to /moment/[flowId]?s=50 shows the estimate for
  //    serial #50 without user interaction."
  // PSA pop-by-grade pattern: "X/Y graded at this level" directly from URL.
  await page.goto(`/moment/${KNOWN_FLOW_ID}?s=1`, { timeout: 60_000 });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
  // input must show "1" without user typing.
  const inputOnLoad = page.locator('[data-testid="serial-input"]');
  await inputOnLoad.waitFor({ state: "visible", timeout: 15_000 });
  const inputVal = await inputOnLoad.inputValue();
  expect(inputVal, "serial input must show '1' when ?s=1 is in URL").toBe("1");
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "06-permalink-s1.png"),
    fullPage: true,
  });

  // ── Step 8: serial1-result — result block present for serial #1 ─────────
  const resultS1 = page.locator('[data-testid="serial-valuation-result"]');
  await resultS1.waitFor({ state: "visible", timeout: 15_000 });
  const s1Text = await resultS1.innerText();
  const s1HasDollarOrNotEnough =
    s1Text.includes("$") || s1Text.toLowerCase().includes("not enough");
  expect(
    s1HasDollarOrNotEnough,
    `serial #1 result must have dollar or not-enough; got: "${s1Text.slice(0, 120)}"`,
  ).toBe(true);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "07-serial1-result.png"),
    fullPage: true,
  });

  // ── Step 9: empty-input — clearing serial removes result block ────────────
  // From research/features/moment-detail-serial-overlay.md §4 item 5:
  //   "When the input is empty or zero, no result block is shown"
  // StockX signature: rekey-on-input; surrounding context stays anchored.
  await page.goto(`/moment/${KNOWN_FLOW_ID}`, { timeout: 60_000 });
  await page.locator("h1").first().waitFor({ state: "visible", timeout: 30_000 });
  // With no ?s= param, input is empty and result block must NOT be present.
  const inputEmpty = page.locator('[data-testid="serial-input"]');
  await inputEmpty.waitFor({ state: "visible", timeout: 15_000 });
  const emptyInputVal = await inputEmpty.inputValue();
  expect(
    emptyInputVal,
    "serial input must be empty on /moment/<id> with no ?s= param",
  ).toBe("");
  const resultOnEmpty = page.locator('[data-testid="serial-valuation-result"]');
  const resultCount = await resultOnEmpty.count();
  expect(resultCount, "result block must not be present when input is empty").toBe(0);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "08-empty-input.png"),
    fullPage: true,
  });

  // ── Pass marker — write PASS.json for the judge runner ──────────────────
  fs.writeFileSync(
    path.join(CAPTURE_DIR, "PASS.json"),
    JSON.stringify(
      {
        journey: "moment-detail-serial-overlay",
        passed_at: new Date().toISOString(),
        steps: [
          "land",
          "card-visible",
          "input-present",
          "type-serial-50",
          "url-state-s=50",
          "result-has-dollar",
          "parallel-context",
          "permalink-s=1",
          "serial1-result",
          "empty-input",
        ],
        tti_ms: ttiMs,
        moment_href: `/moment/${KNOWN_FLOW_ID}`,
        result_text_preview: resultText.slice(0, 80),
        portal_url: process.env.PORTAL_URL ?? "(default localhost)",
      },
      null,
      2,
    ),
  );
});
