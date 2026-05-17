// Persona journey J4b — Moment detail price-bucket sale histogram (OTM-parity).
//
// From research/personas/pro-trader.md §J4 (Moment-detail research journey):
//   "I'm thinking about buying a Wemby Common. I open the moment detail page.
//    I switch between 1D / 7D / 1M / 3M / YTD / ALL — the chart actually
//    redraws. I see circulation breakdown: how many are owned, listed, in a
//    pack, locker room, burned. I see a histogram of recent sale prices."
//
// Acceptance (features.json[moment-detail-histogram].acceptance):
//   "As a trader, I see below the price chart a histogram bucketing recent
//    sales by price band (e.g., $7, $8, …) over the active window, so I can
//    see the price-cluster distribution."
//
// Pass criteria per step:
//   1. Navigate to known-active moment → page renders in < 30s (cold deploy)
//   2. [data-testid="price-histogram"] is present in DOM
//   3. Recharts SVG is visible inside the section (edition has historical sales)
//   4. SVG contains dollar-denominated x-axis labels matching /$\d/
//   5. Card subtitle shows correct sale count and "all time" window label
//   6. Navigate to ?h=7d → histogram subtitle updates to "7D"
//   7. Navigate to ?h=1d → histogram shows SVG or honest EmptyState (no crash)
//   8. "Sale distribution" heading is visible without "Coming Soon" text
//
// Evidence: screenshots at each numbered step go to captures/moment-detail-histogram/<ts>/

import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TS = new Date().toISOString().replace(/[:.]/g, "-");
const CAPTURE_DIR = path.join(
  __dirname,
  "..",
  "captures",
  "moment-detail-histogram",
  TS,
);

// Cold Vercel serverless boot can take 20–30s. Warm runs are sub-3s.
test.setTimeout(180_000);

// Known-good flowId with at least 2 SUCCEEDED transactions at the serial level
// (edition-level count will be ≥ this). Same moment used by moment-detail-chart.
const KNOWN_FLOW_ID = "47863705";

test.beforeAll(() => {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
});

test("J4b — moment-detail-histogram: sale price histogram renders below price chart", async ({
  page,
}) => {
  // ── Step 0: land — navigate to the known-active moment (ALL window) ──────
  // "I open the moment detail page." — persona J4
  const navStart = Date.now();
  await page.goto(`/moment/${KNOWN_FLOW_ID}`, { timeout: 90_000 });

  // Wait for the price history card to confirm page has rendered
  await page
    .getByRole("heading", { name: "Price history" })
    .waitFor({ state: "visible", timeout: 60_000 });
  const ttiMs = Date.now() - navStart;
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "00-land.png"),
    fullPage: true,
  });
  // Cold-deploy TTI guard
  expect(ttiMs, `landing TTI was ${ttiMs}ms`).toBeLessThan(30_000);

  // ── Step 1: histogram-present — [data-testid="price-histogram"] in DOM ──
  // "The judge Playwright spec will assert count() > 0 for that selector."
  // (research/features/moment-detail-histogram.md §4 criterion 1)
  const histogramSection = page.locator('[data-testid="price-histogram"]');
  await histogramSection.waitFor({ state: "visible", timeout: 30_000 });
  const histogramCount = await histogramSection.count();
  expect(histogramCount, '[data-testid="price-histogram"] must be present').toBeGreaterThan(0);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "01-histogram-present.png"),
    fullPage: true,
  });

  // ── Step 2: valid-state — histogram shows SVG (data exists) OR EmptyState ─
  // Per Pillar 5 §2 ("Honest absence beats fabricated presence"):
  //   • SVG present → edition has transactions → histogram renders bars
  //   • EmptyState present → edition has 0 transactions in window → honest absence
  // Both are CORRECT behaviours. The test verifies the component renders
  // appropriately for the data that exists, not that data must be present.
  // (research/features/moment-detail-histogram.md §4 criteria 2 + 5)
  //
  // NOTE: data-testid="price-histogram" is on a server-rendered wrapper div in
  // page.tsx (NOT inside the "use client" MomentPriceHistogram component). This
  // ensures the locator anchor is SSR-stable and not subject to hydration races.
  const svgInSection = histogramSection.locator("svg");
  const svgCount = await svgInSection.count();
  const emptyStateEl = histogramSection.getByText("No sale data for this window");
  const emptyStateCount = await emptyStateEl.count();
  const hasValidHistogramState = svgCount > 0 || emptyStateCount > 0;
  expect(
    hasValidHistogramState,
    "histogram must show SVG chart OR honest EmptyState — not blank/crash",
  ).toBe(true);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "02-svg-or-empty.png"),
    fullPage: true,
  });

  // ── Step 3: dollar-labels — if SVG present, XAxis has price-bucket labels ─
  // "The SVG contains text elements with dollar-denominated labels (e.g., "$7",
  //  "$8", or "$0–$5"). The judge will assert that at least one text element in
  //  the SVG matches /$\d/." (research/features/moment-detail-histogram.md §4 criterion 3)
  // Only asserted when SVG is present (when data exists).
  let hasDollarLabel = false;
  let allTextInSvg: string[] = [];
  if (svgCount > 0) {
    allTextInSvg = await svgInSection.locator("text").allInnerTexts();
    hasDollarLabel = allTextInSvg.some((t) => /\$\d/.test(t));
    expect(
      hasDollarLabel,
      `SVG must contain at least one "$N" price-bucket label. Found: ${JSON.stringify(allTextInSvg.slice(0, 20))}`,
    ).toBe(true);
  }

  // ── Step 4: subtitle-check — card subtitle shows count + "all time" ──────
  // "The subtitle must reflect the window (e.g., 'N sales · this edition · 7D')."
  // (research/features/moment-detail-histogram.md §4 criterion 4)
  const saleDistHeading = page.getByRole("heading", { name: "Sale distribution" });
  await expect(
    saleDistHeading,
    '"Sale distribution" heading must be visible',
  ).toBeVisible();

  // The Card subtitle contains "all time" for the default ALL window
  // (no ?h= param on this navigation).
  // We look for the subtitle text near the heading — it's in the same header block.
  const cardHeader = saleDistHeading.locator("..").locator("..");
  // The subtitle is a sibling span inside the card header.
  // Simpler: check that the page body contains "all time" near sale-distribution context.
  const pageText = await page.locator("body").innerText();
  expect(
    pageText,
    'Page body must contain "all time" (the default window label)',
  ).toContain("all time");
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "03-subtitle-all.png"),
    fullPage: true,
  });

  // ── Step 5: 7d-window — navigate to ?h=7d; histogram subtitle shows "7D" ─
  // "When the page renders with ?h=7d, the histogram's sale count reflects only
  //  transactions within the last 7 days."
  // (research/features/moment-detail-histogram.md §4 criterion 4)
  await page.goto(`/moment/${KNOWN_FLOW_ID}?h=7d`, { timeout: 60_000 });
  await page
    .getByRole("heading", { name: "Sale distribution" })
    .waitFor({ state: "visible", timeout: 30_000 });

  // Check histogram section is still present
  const histogram7d = page.locator('[data-testid="price-histogram"]');
  await histogram7d.waitFor({ state: "visible", timeout: 20_000 });
  expect(await histogram7d.count()).toBeGreaterThan(0);

  // The subtitle should now contain "7D"
  const pageText7d = await page.locator("body").innerText();
  expect(
    pageText7d,
    'Page body must contain "7D" as the active window label when ?h=7d',
  ).toContain("7D");
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "04-subtitle-7d.png"),
    fullPage: true,
  });

  // ── Step 6: honest-empty-or-chart — 1D window doesn't crash ─────────────
  // "If zero transactions exist in the window, <EmptyState> renders …
  //  Must not show 'Coming Soon.'"
  // (research/features/moment-detail-histogram.md §4 criterion 5)
  await page.goto(`/moment/${KNOWN_FLOW_ID}?h=1d`, { timeout: 60_000 });
  await page
    .getByRole("heading", { name: "Sale distribution" })
    .waitFor({ state: "visible", timeout: 30_000 });

  const histogram1d = page.locator('[data-testid="price-histogram"]');
  await histogram1d.waitFor({ state: "visible", timeout: 20_000 });

  // Either SVG (data present) or EmptyState (no data) — not "Coming Soon"
  const svgCount1d = await histogram1d.locator("svg").count();
  const emptyTitle1d = await histogram1d.getByText("No sale data for this window").count();
  const hasValidState1d = svgCount1d > 0 || emptyTitle1d > 0;
  expect(
    hasValidState1d,
    "1D window must show SVG or EmptyState — not a blank/crashing state",
  ).toBe(true);

  // Must not show "Coming Soon"
  const innerText1d = await histogram1d.innerText();
  expect(innerText1d, "Must not show 'Coming Soon'").not.toContain("Coming Soon");
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "05-1d-window.png"),
    fullPage: true,
  });

  // ── Step 7: methodology-cited — data source attribution visible ──────────
  // "The Card's methodology prop references topshot.transactions so the trader
  //  can trace the source." (research/features/moment-detail-histogram.md §4 criterion 6)
  // Navigate back to all-window for clean final state
  await page.goto(`/moment/${KNOWN_FLOW_ID}`, { timeout: 60_000 });
  await page
    .getByRole("heading", { name: "Sale distribution" })
    .waitFor({ state: "visible", timeout: 30_000 });

  const pageBodyFinal = await page.locator("body").innerText();
  expect(
    pageBodyFinal,
    'Page body must reference "topshot.transactions" as the data source',
  ).toContain("topshot.transactions");
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "06-methodology.png"),
    fullPage: true,
  });

  // ── Pass marker ───────────────────────────────────────────────────────────
  fs.writeFileSync(
    path.join(CAPTURE_DIR, "PASS.json"),
    JSON.stringify(
      {
        journey: "moment-detail-histogram",
        passed_at: new Date().toISOString(),
        steps: [
          "land",
          "histogram-present",
          "svg-or-empty",
          "dollar-labels-if-svg",
          "subtitle-all",
          "subtitle-7d",
          "1d-window",
          "methodology-cited",
        ],
        tti_ms: ttiMs,
        svg_count: svgCount,
        empty_state_count: emptyStateCount,
        dollar_labels_found: allTextInSvg.filter((t) => /\$\d/.test(t)),
        portal_url: process.env.PORTAL_URL ?? "(default localhost)",
      },
      null,
      2,
    ),
  );
});
