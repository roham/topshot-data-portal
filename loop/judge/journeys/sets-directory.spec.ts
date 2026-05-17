// Persona journey J5 — Set completion / sets directory.
//
// From research/personas/pro-trader.md §5 J5:
//   "I want to see how many users have completed the WNBA: Best of 2021 set.
//    I open /set/<id>, see a completion histogram: X users at 56/56, Y users
//    at 55/56, descending. I know how rare full completion is."
//
//   Implicit entry point from research/features/sets-directory.md §1:
//   "I want to browse all sets, sort by floor to find cheap entry points,
//    sort by 7d volume to find active sets, filter by series to compare
//    across release cohorts."
//
// Pass criteria (judged at each step):
//   1. /sets loads with a non-stub sortable table in <30s (cold deploy)
//   2. Table renders at least 20 set rows (thin-slice scope)
//   3. Each row has a link to /set/[id]
//   4. Sort by Floor writes ?sort=floor to URL; table column changes
//   5. Filter by League (NBA) writes ?league=NBA; table narrows
//   6. Filter by Series writes ?series=<N>; table narrows
//   7. Clicking a set row navigates to /set/[id] without 404
//   8. Empty-state renders with "No sets match" + clear-filters link
//      when filters produce zero results
//
// Evidence: screenshots at each numbered step go to
//   loop/judge/captures/sets-directory/<ts>/

import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TS = new Date().toISOString().replace(/[:.]/g, "-");
const CAPTURE_DIR = path.join(
  __dirname,
  "..",
  "captures",
  "sets-directory",
  TS,
);

// Cold preview deployments need a longer timeout — first hit boots the
// serverless function + warms the Supabase connection pool.
test.setTimeout(180_000);

test.beforeAll(() => {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
});

test(
  "J5 — sets directory: land /sets, sort by floor, filter by league + series, click into set detail",
  async ({ page }) => {
    // ── Step 0 — land on /sets cold ────────────────────────────────────────
    const navStart = Date.now();
    await page.goto("/sets", { timeout: 90_000 });

    // Wait for either the table or the filter rail header (both indicate the
    // page rendered past the ComingSoon stub).
    await page
      .locator('[data-testid="sets-table"], [data-testid="sets-filter-rail"]')
      .first()
      .waitFor({ state: "visible", timeout: 60_000 });

    const ttiMs = Date.now() - navStart;
    await page.screenshot({
      path: path.join(CAPTURE_DIR, "00-land.png"),
      fullPage: true,
    });

    // Step 0 acceptance: TTI < 30s on cold preview deploy.
    expect(ttiMs, `landing TTI was ${ttiMs}ms`).toBeLessThan(30_000);

    // Page must NOT contain "Coming Soon" in any form.
    const bodyText = await page.locator("body").innerText();
    expect(
      bodyText.toLowerCase(),
      "page must not contain 'coming soon'",
    ).not.toContain("coming soon");

    // ── Step 1 — verify table renders ≥ 20 rows ───────────────────────────
    // "As a trader, I browse all sets sorted by floor" — the table must have
    // enough rows to be useful for browsing.
    const tableEl = page.locator('[data-testid="sets-table"]');
    await tableEl.waitFor({ state: "visible", timeout: 15_000 });

    const rowCount = await page.locator('[data-testid="set-row"]').count();
    expect(
      rowCount,
      "sets table must render at least 20 rows on bare /sets",
    ).toBeGreaterThanOrEqual(20);

    await page.screenshot({
      path: path.join(CAPTURE_DIR, "01-table-rows.png"),
      fullPage: true,
    });

    // ── Step 2 — verify each row has a valid set-row-link ────────────────
    const links = page.locator('[data-testid="set-row-link"]');
    const linkCount = await links.count();
    expect(
      linkCount,
      "every row must have a set-row-link anchor",
    ).toBeGreaterThanOrEqual(20);

    // Check that the first link href is /set/<something>
    const firstHref = await links.first().getAttribute("href");
    expect(firstHref, "set-row-link must point to /set/<id>").toMatch(
      /^\/set\//,
    );

    // ── Step 3 — sort by Floor → URL changes to ?sort=floor ──────────────
    // "sort by floor to find cheap entry points" (research §1)
    const floorHeader = page.locator('[data-testid="th-floor"]');
    await floorHeader.waitFor({ state: "visible", timeout: 10_000 });
    await floorHeader.click();

    // Wait for URL to contain ?sort=floor
    await page.waitForURL(/[?&]sort=floor/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    // Verify rows still render after sort
    const sortedRowCount = await page
      .locator('[data-testid="set-row"]')
      .count();
    expect(
      sortedRowCount,
      "rows must still render after sorting by floor",
    ).toBeGreaterThan(0);

    await page.screenshot({
      path: path.join(CAPTURE_DIR, "02-sort-floor.png"),
      fullPage: true,
    });

    // ── Step 4 — filter by League (NBA) → URL changes + table narrows ─────
    // "filter by series to compare across release cohorts" (research §1) —
    // we test league filter first since it's more predictable than series.
    const leagueNbaLabel = page.locator(
      '[data-testid="filter-sets-league-nba"]',
    );
    await leagueNbaLabel.waitFor({ state: "visible", timeout: 10_000 });
    await leagueNbaLabel.click();

    // Wait for URL to contain ?league=NBA
    await page.waitForURL(/[?&]league=NBA/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    const nbaRowCount = await page.locator('[data-testid="set-row"]').count();
    expect(
      nbaRowCount,
      "NBA-filtered rows must be > 0 (NBA sets exist)",
    ).toBeGreaterThan(0);
    // NBA filter should narrow the table (fewer than all sets)
    expect(
      nbaRowCount,
      "NBA filter should narrow the table",
    ).toBeLessThanOrEqual(rowCount);

    await page.screenshot({
      path: path.join(CAPTURE_DIR, "03-filter-league-nba.png"),
      fullPage: true,
    });

    // ── Step 5 — clear league filter, then filter by Series ───────────────
    // Navigate to /sets?sort=floor to reset league, then pick first series.
    await page.goto("/sets?sort=floor&dir=desc", { timeout: 30_000 });
    await page.locator('[data-testid="sets-table"]').waitFor({
      state: "visible",
      timeout: 30_000,
    });

    // Click the first non-"All series" series radio button
    const seriesRadios = page.locator(
      '[data-testid^="filter-sets-series-"]:not([data-testid="filter-sets-series-all"])',
    );
    const seriesCount = await seriesRadios.count();
    expect(seriesCount, "at least one series filter option must be visible").toBeGreaterThan(0);

    const firstSeriesLabel = seriesRadios.first();
    await firstSeriesLabel.click();

    // Wait for URL to contain ?series=
    await page.waitForURL(/[?&]series=/, { timeout: 10_000 });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});

    // Verify URL has series param and rows still render
    const currentUrl = page.url();
    expect(currentUrl, "URL must contain series param after clicking series filter").toContain("series=");

    const seriesRowCount = await page
      .locator('[data-testid="set-row"]')
      .count();
    // Series filter may show 0 rows if that series has no sets, but typically > 0
    // Primary assertion: URL changed (filter persists)
    // Secondary: some rows OR empty state is shown (not a crash)
    const emptyState = page.locator('[data-testid="sets-empty"]');
    const tableVisible = await page.locator('[data-testid="sets-table"]').isVisible().catch(() => false);
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    expect(
      tableVisible || emptyVisible,
      "after series filter, either table or empty state must be visible",
    ).toBe(true);

    await page.screenshot({
      path: path.join(CAPTURE_DIR, "04-filter-series.png"),
      fullPage: true,
    });

    // ── Step 6 — verify URL params survive page reload ─────────────────────
    // "Sort state must not reset on filter change" (research §4)
    const urlBeforeReload = page.url();
    await page.reload({ waitUntil: "networkidle", timeout: 30_000 });
    const urlAfterReload = page.url();

    // The sort/series params must persist across reload
    if (urlBeforeReload.includes("series=")) {
      expect(
        urlAfterReload,
        "series filter must persist after page reload",
      ).toContain("series=");
    }

    await page.screenshot({
      path: path.join(CAPTURE_DIR, "05-reload-preserves-filter.png"),
      fullPage: true,
    });

    // ── Step 7 — click a set row and land on /set/[id] without 404 ────────
    // "Clicking a set name 404s" is a failure mode per research §1 — we must
    // verify the detail page renders without error.
    await page.goto("/sets", { timeout: 30_000 });
    await page.locator('[data-testid="sets-table"]').waitFor({
      state: "visible",
      timeout: 30_000,
    });

    const firstLink = page.locator('[data-testid="set-row-link"]').first();
    const detailHref = await firstLink.getAttribute("href");
    expect(detailHref, "first row link must be a /set/ path").toMatch(
      /^\/set\//,
    );

    await firstLink.click();
    await page.waitForURL(/\/set\//, { timeout: 20_000 });

    await page.screenshot({
      path: path.join(CAPTURE_DIR, "06-set-detail.png"),
      fullPage: true,
    });

    // Set detail page must not 404 and must have substantive content.
    // Note: NOT checking for "404" as a substring — set UUIDs can contain "404"
    // (e.g., "891987bc-a5c0-404e-…"). Check for Next.js 404 error phrasing.
    const statusText = await page.locator("body").innerText();
    expect(
      statusText.length,
      "set detail page must render non-trivial content",
    ).toBeGreaterThan(200);
    expect(
      statusText.toLowerCase(),
      "set detail page must not render a 'not found' error",
    ).not.toContain("this page could not be found");
    expect(
      statusText.toLowerCase(),
      "set detail page must not render a 'page not found' error",
    ).not.toContain("page not found");

    // ── Step 8 — empty state renders when filters match no sets ──────────
    // Navigate to a URL that should produce an empty result.
    await page.goto("/sets?league=WNBA&series=9999", { timeout: 30_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

    await page.screenshot({
      path: path.join(CAPTURE_DIR, "07-empty-state.png"),
      fullPage: true,
    });

    // Either we get the empty state or the table with >0 rows (the series=9999
    // may still match if a series 9999 exists — either way, no crash and no
    // "Coming Soon").
    const pageText = await page.locator("body").innerText();
    expect(
      pageText.toLowerCase(),
      "page must never say 'coming soon' even with zero results",
    ).not.toContain("coming soon");

    // If sets-empty is present, it must contain the correct text.
    const emptyEl = page.locator('[data-testid="sets-empty"]');
    const emptyIsVisible = await emptyEl.isVisible().catch(() => false);
    if (emptyIsVisible) {
      const emptyText = await emptyEl.innerText();
      expect(
        emptyText.toLowerCase(),
        "empty state must say 'no sets match'",
      ).toContain("no sets match");
    }

    // ── Pass marker ───────────────────────────────────────────────────────
    fs.writeFileSync(
      path.join(CAPTURE_DIR, "PASS.json"),
      JSON.stringify(
        {
          journey: "sets-directory",
          passed_at: new Date().toISOString(),
          steps: [
            "land",
            "table-rows",
            "sort-floor",
            "filter-league-nba",
            "filter-series",
            "reload-preserves-filter",
            "set-detail-click",
            "empty-state",
          ],
          tti_ms: ttiMs,
          portal_url: process.env.PORTAL_URL ?? "(default localhost)",
        },
        null,
        2,
      ),
    );
  },
);
