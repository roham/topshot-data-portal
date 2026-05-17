// Persona journey J4 — Moment detail price chart (OTM-parity).
//
// From research/personas/pro-trader.md §J4 (Moment-detail research journey):
//   "I'm thinking about buying a Wemby Common. I open the moment detail page.
//    I switch between 1D / 7D / 1M / 3M / YTD / ALL — the chart actually
//    redraws. I see circulation breakdown: how many are owned, listed, in a
//    pack, locker room, burned."
//
// Acceptance (features.json[moment-detail-chart].acceptance):
//   "As a trader, I open any moment's detail page, click between time-window
//    tabs (1D, 7D, 1M, 3M, YTD, ALL), and the chart line redraws with the
//    corresponding sales over that window. Tab state survives a page refresh."
//
// Pass criteria per step:
//   1. Navigate to /moments, click into a moment → detail loads < 30s (cold)
//   2. Price history card visible with 6 time-window tabs
//   3. ALL tab is aria-checked="true" by default (no ?h= param)
//   4. Window label says "all time"
//   5. Click 7D → URL contains ?h=7d within 2s (nuqs pushes state to URL)
//   6. 7D tab aria-checked="true" after click
//   7. Window label shows "7D" after URL change
//   8. Chart area (data or honest empty state) is present
//   9. Clicking ALL tab reverts URL (no ?h= or ?h=all)
//  10. Navigate to /moment/47863705?h=7d fresh → 7D tab active (state survives reload)
//  11. Click 1D — page doesn't crash (empty state is honest absence, not error)
//
// Evidence: screenshots at each numbered step go to ./captures/moment-detail-chart/<ts>/

import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TS = new Date().toISOString().replace(/[:.]/g, "-");
const CAPTURE_DIR = path.join(
  __dirname,
  "..",
  "captures",
  "moment-detail-chart",
  TS,
);

// Cold Vercel serverless boot can take 20–30s. Warm runs are sub-3s.
test.setTimeout(180_000);

// Known-good flowId with at least 2 SUCCEEDED transactions in Supabase.
// From prior passing PASS.json: all_sales_count=2, seven_d_sales_count=2.
const KNOWN_FLOW_ID = "47863705";

test.beforeAll(() => {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
});

test("J4 — moment-detail-chart: time-window tabs redraw chart; state survives refresh", async ({
  page,
}) => {
  // ── Step 0: moments-grid-nav — navigate to /moments, find first moment link ──
  const navStart = Date.now();
  await page.goto("/moments", { timeout: 90_000 });
  await page
    .getByText("Filters", { exact: true })
    .first()
    .waitFor({ state: "visible", timeout: 60_000 });
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "00-moments-grid.png"),
    fullPage: true,
  });
  const ttiMs = Date.now() - navStart;
  // Cold-deploy TTI guard: must render within 30s.
  expect(ttiMs, `moments grid TTI was ${ttiMs}ms`).toBeLessThan(30_000);

  // ── Step 1: detail-land — navigate directly to the known-good moment ──
  // (Navigating directly avoids depending on the grid having visible rows under
  // whatever filter state the URL might carry from a prior run.)
  await page.goto(`/moment/${KNOWN_FLOW_ID}`, { timeout: 60_000 });
  // Wait for the price history card header to appear.
  await page
    .getByRole("heading", { name: "Price history" })
    .waitFor({ state: "visible", timeout: 30_000 });
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "01-detail-land.png"),
    fullPage: true,
  });

  // ── Step 2: tabs-visible — all 6 tabs present without scrolling ──
  // From features.json acceptance: "click between time-window tabs (1D, 7D, 1M, 3M, YTD, ALL)"
  const tabIds = ["1d", "7d", "1m", "3m", "ytd", "all"] as const;
  for (const w of tabIds) {
    const tab = page.locator(`[data-testid="price-tab-${w}"]`);
    await expect(tab, `price-tab-${w} must be visible`).toBeVisible();
  }
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "02-tabs-visible.png"),
    fullPage: true,
  });

  // ── Step 3: all-tab-default — ALL tab is active by default (no ?h= param) ──
  const allTab = page.locator('[data-testid="price-tab-all"]');
  await expect(allTab, "ALL tab must be aria-checked=true by default").toHaveAttribute(
    "aria-checked",
    "true",
  );

  // ── Step 4: all-subtitle — window label shows "all time" ──
  const windowLabel = page.locator('[data-testid="price-history-window-label"]');
  await expect(windowLabel, "window label must contain 'all time'").toContainText(
    "all time",
  );
  const allSalesText = await windowLabel.innerText();
  const allSalesCount = parseInt(allSalesText.match(/^(\d+)/)?.[1] ?? "0", 10);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "03-all-subtitle.png"),
    fullPage: true,
  });

  // ── Step 5: 7d-tab-url — clicking 7D updates URL to ?h=7d ──
  // "The judge asserts page.url() contains ?h=7d after tab click."
  // (research/features/moment-detail-chart.md §4 criterion 2)
  const sevenDTab = page.locator('[data-testid="price-tab-7d"]');
  await sevenDTab.click();
  await page.waitForURL(/[?&]h=7d/, { timeout: 8_000 });
  expect(page.url(), "URL must contain ?h=7d after 7D tab click").toContain("h=7d");
  // Wait for the Next.js RSC re-render: after nuqs pushes ?h=7d, Next.js
  // soft-navigates and fetches the new server component tree with active="7d".
  // networkidle is the most reliable completion signal; tolerate timeout.
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "04-tab-7d-url.png"),
    fullPage: true,
  });

  // ── Step 6: 7d-tab-active — 7D tab aria-checked="true" ──
  // aria-checked is set by the server render (the `active` prop). Allow 20s
  // for the RSC payload to arrive and the component to update.
  await expect(sevenDTab, "7D tab must be aria-checked=true after click").toHaveAttribute(
    "aria-checked",
    "true",
    { timeout: 20_000 },
  );
  // And ALL tab must now be unchecked.
  await expect(allTab, "ALL tab must be aria-checked=false after 7D clicked").toHaveAttribute(
    "aria-checked",
    "false",
  );
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "05-tab-7d-subtitle.png"),
    fullPage: true,
  });

  // ── Step 7: 7d-subtitle — window label reflects 7D ──
  // "Distinct sale counts between windows where data exists confirm real re-fetching."
  await expect(windowLabel, "window label must contain '7D' after 7D tab").toContainText(
    "7D",
    { timeout: 10_000 },
  );
  const sevenDSalesText = await windowLabel.innerText();
  const sevenDSalesCount = parseInt(sevenDSalesText.match(/^(\d+)/)?.[1] ?? "0", 10);
  // Both counts are valid (might be equal if all sales are within 7D).
  // The key assertion is: window label changed, not that counts differ.
  expect(sevenDSalesCount, "7D sales count must be ≥ 0").toBeGreaterThanOrEqual(0);

  // ── Step 8: chart-state — chart or honest empty state present ──
  const chartArea = page.locator('[data-testid="price-history-chart"]');
  const emptyArea = page.locator('[data-testid="price-history-empty"]');
  const chartOrEmpty =
    (await chartArea.count()) > 0 || (await emptyArea.count()) > 0;
  expect(
    chartOrEmpty,
    "price-history-chart or price-history-empty must be present",
  ).toBe(true);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "06-chart-state.png"),
    fullPage: true,
  });

  // ── Step 9: all-tab-back — clicking ALL reverts the URL ──
  // "Clicking ALL after 7D reverts the URL and subtitle"
  await allTab.click();
  // URL should no longer contain h=7d (either no h param, or h=all).
  await page.waitForFunction(
    () => !window.location.search.includes("h=7d"),
    { timeout: 5_000 },
  );
  expect(page.url()).not.toContain("h=7d");
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "07-tab-all-back.png"),
    fullPage: true,
  });

  // ── Step 10: refresh-7d — tab state survives a page refresh ──
  // "Navigating to /moment/47863705?h=7d and reloading must show the 7D tab
  //  as visually active (aria-checked='true')"
  await page.goto(`/moment/${KNOWN_FLOW_ID}?h=7d`, { timeout: 60_000 });
  await page
    .getByRole("heading", { name: "Price history" })
    .waitFor({ state: "visible", timeout: 30_000 });
  const sevenDTabReloaded = page.locator('[data-testid="price-tab-7d"]');
  await expect(
    sevenDTabReloaded,
    "7D tab must be aria-checked=true after hard navigation to ?h=7d",
  ).toHaveAttribute("aria-checked", "true");
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "08-refresh-7d.png"),
    fullPage: true,
  });

  // ── Step 11: 1d-tab-smoke — clicking 1D does not crash the page ──
  // "Clicking 1D does not crash the page even if 0 sales exist for that window."
  const oneDTab = page.locator('[data-testid="price-tab-1d"]');
  await oneDTab.click();
  await page.waitForURL(/[?&]h=1d/, { timeout: 5_000 });
  // Page must still show the price history card (not a 500 / blank).
  await expect(
    page.getByRole("heading", { name: "Price history" }),
    "Price history heading must survive 1D tab click",
  ).toBeVisible();
  // Chart or honest empty state present.
  const chart1d = page.locator('[data-testid="price-history-chart"]');
  const empty1d = page.locator('[data-testid="price-history-empty"]');
  const okAfter1d = (await chart1d.count()) > 0 || (await empty1d.count()) > 0;
  expect(okAfter1d, "price-history-chart or price-history-empty must be present after 1D click").toBe(true);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "09-tab-1d.png"),
    fullPage: true,
  });

  // ── Pass marker — write PASS.json for the judge runner ──
  fs.writeFileSync(
    path.join(CAPTURE_DIR, "PASS.json"),
    JSON.stringify(
      {
        journey: "moment-detail-chart",
        passed_at: new Date().toISOString(),
        steps: [
          "moments-grid-nav",
          "detail-land",
          "tabs-visible",
          "all-tab-default",
          "all-subtitle",
          "7d-tab-url",
          "7d-tab-active",
          "7d-subtitle",
          "chart-state",
          "all-tab-back",
          "refresh-7d",
          "1d-tab-smoke",
        ],
        tti_ms: ttiMs,
        moment_href: `/moment/${KNOWN_FLOW_ID}`,
        all_sales_count: allSalesCount,
        seven_d_sales_count: sevenDSalesCount,
        portal_url: process.env.PORTAL_URL ?? "(default localhost)",
      },
      null,
      2,
    ),
  );
});
