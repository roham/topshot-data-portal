// Persona journey J3 — Market-cap leaderboard (the OTM Players view port).
//
// From research/personas/pro-trader.md §5 J3:
//   "I want to know who's the highest market-cap player right now. I open
//    /players, see a sorted leaderboard, scan the top 20, and click into a
//    player whose 24h delta is negative to see if there's distribution
//    happening."
//
// Pass criteria (per research/features/players-marketcap.md §4 acceptance):
//   1. /players renders a populated table (≥20 rows) without "Coming Soon"
//   2. Required columns present and correctly labeled:
//      # / Player / Team / # Editions / Total Minted / Circ % / Market Cap / 24h Δ%
//   3. Default sort is market cap DESC (first row cap ≥ second row cap)
//   4. Sort state survives page refresh via URL param (?sort + ?dir)
//   5. Clicking a column header updates the URL
//   6. Click-through to /player/[id] lands on non-stub content
//   7. TTI < 30s on cold deploy

import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TS = new Date().toISOString().replace(/[:.]/g, "-");
const CAPTURE_DIR = path.join(
  __dirname,
  "..",
  "captures",
  "players-marketcap",
  TS,
);

test.setTimeout(180_000);

test.beforeAll(() => {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
});

test("J3 — market-cap leaderboard: /players renders sorted table, sort survives refresh, click-through to player detail", async ({
  page,
}) => {
  // ── Step 0 — land on /players cold ───────────────────────────────────
  // "I want to know who's the highest market-cap player right now. I open
  //  /players, see a sorted leaderboard..."
  const navStart = Date.now();
  await page.goto("/players", { timeout: 90_000 });

  // Wait for either the table or the empty-state to appear (non-stub content).
  await page.waitForFunction(
    () => {
      return (
        document.querySelector('[data-testid="players-table"]') !== null ||
        document.querySelector('[data-testid="players-empty"]') !== null ||
        document.body.innerText.includes("No player market cap data")
      );
    },
    { timeout: 60_000 },
  );

  const ttiMs = Date.now() - navStart;
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "00-land.png"),
    fullPage: true,
  });

  // Step 0 acceptance: TTI < 30s (cold-deploy slack per moments-grid pattern)
  expect(ttiMs, `landing TTI was ${ttiMs}ms`).toBeLessThan(30_000);

  // ── Step 1 — assert ≥ 20 rows ─────────────────────────────────────────
  // "...scan the top 20..."
  const rowCount = await page.locator('[data-testid="player-row"]').count();
  expect(
    rowCount,
    `players table must render ≥ 20 rows; got ${rowCount}`,
  ).toBeGreaterThanOrEqual(20);

  await page.screenshot({
    path: path.join(CAPTURE_DIR, "01-rows-counted.png"),
    fullPage: true,
  });

  // ── Step 2 — assert required column headers ───────────────────────────
  // The acceptance text names exact column headers the judge locates.
  const requiredHeaders = [
    "#",
    "Player",
    "Team",
    "# Editions",
    "Total Minted",
    "Circ %",
    "Market Cap",
    "24h Δ%",
  ];
  for (const header of requiredHeaders) {
    // Look in the table header row — both static <th> text and <button> labels.
    const found = await page
      .locator('[data-testid="players-table"] thead')
      .getByText(header, { exact: true })
      .count();
    expect(
      found,
      `column header "${header}" must be present in the table thead`,
    ).toBeGreaterThan(0);
  }

  await page.screenshot({
    path: path.join(CAPTURE_DIR, "02-column-headers.png"),
    fullPage: true,
  });

  // ── Step 3 — assert default sort is market cap DESC ───────────────────
  // "I want to know who's the highest market-cap player right now."
  // Parse the Market Cap cell values for the first two rows and verify
  // row[0] cap ≥ row[1] cap.
  const capTexts = await page
    .locator('[data-testid="player-row"]')
    .evaluateAll((rows) =>
      rows.slice(0, 3).map((tr) => {
        // Market Cap is the 7th td (index 6, 0-based). Grab its text.
        const cells = tr.querySelectorAll("td");
        return cells[6]?.textContent?.trim() ?? "";
      }),
    );

  function parseCompact(s: string): number | null {
    if (!s || s === "—") return null;
    const m = s.match(/\$?([\d,.]+)\s*([KkMmBb]?)/);
    if (!m) return null;
    let n = Number(m[1].replace(/,/g, ""));
    const suffix = m[2]?.toUpperCase();
    if (suffix === "K") n *= 1_000;
    if (suffix === "M") n *= 1_000_000;
    if (suffix === "B") n *= 1_000_000_000;
    return n;
  }

  const caps = capTexts.map(parseCompact);
  if (caps[0] != null && caps[1] != null) {
    expect(
      caps[0],
      `row 1 market cap (${capTexts[0]}) should be ≥ row 2 market cap (${capTexts[1]}) for default DESC sort`,
    ).toBeGreaterThanOrEqual(caps[1]);
  }

  // ── Step 4 — click Market Cap header → URL updates ────────────────────
  // TradingView Screener signature: clicking the active column toggles dir.
  await page.locator('[data-testid="th-market-cap"]').click();
  // The sort direction flips: default was desc → now asc (or URL gains dir=asc)
  await page.waitForURL(/[?&]dir=asc/, { timeout: 10_000 });
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "03-sort-toggled.png"),
    fullPage: true,
  });

  // Step 4b — verify URL has sort params after click
  const urlAfterSort = page.url();
  expect(urlAfterSort, "URL must reflect sort state after header click").toMatch(
    /dir=asc/,
  );

  // ── Step 5 — click 24h Δ% header → URL updates ───────────────────────
  // "click into a player whose 24h delta is negative..."
  await page.locator('[data-testid="th-delta"]').click();
  await page.waitForURL(/sort=delta/, { timeout: 10_000 });
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "04-sort-delta.png"),
    fullPage: true,
  });

  const urlAfterDelta = page.url();
  expect(urlAfterDelta, "URL must contain sort=delta after Δ% header click").toMatch(
    /sort=delta/,
  );

  // ── Step 6 — sort state survives refresh ─────────────────────────────
  const currentUrl = page.url();
  await page.goto(currentUrl, { timeout: 30_000 });
  await page.locator('[data-testid="players-table"]').waitFor({
    state: "visible",
    timeout: 30_000,
  });
  expect(page.url(), "URL must remain unchanged after refresh").toContain(
    "sort=delta",
  );
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "05-sort-refresh.png"),
    fullPage: true,
  });

  // ── Step 7 — navigate to /players (reset) and click first player ──────
  // "...click into a player..."
  await page.goto("/players", { timeout: 30_000 });
  await page.locator('[data-testid="players-table"]').waitFor({
    state: "visible",
    timeout: 30_000,
  });

  const firstPlayerLink = page.locator('[data-testid="player-row-link"]').first();
  const playerHref = await firstPlayerLink.getAttribute("href");
  expect(playerHref, "player row must link to /player/[id]").toMatch(
    /^\/player\//,
  );

  await firstPlayerLink.click();
  await page.waitForURL(/\/player\//, { timeout: 15_000 });
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "06-player-detail.png"),
    fullPage: true,
  });

  // Step 7 acceptance: player detail renders non-stub content (not 404, not blank)
  const detailText = await page.locator("body").innerText();
  expect(
    detailText.length,
    "player detail page must render substantive content",
  ).toBeGreaterThan(200);

  // Player detail must not show "Coming Soon" or a stub
  expect(detailText, "player detail must not render ComingSoon stub").not.toContain(
    "coming soon",
  );

  await page.screenshot({
    path: path.join(CAPTURE_DIR, "07-done.png"),
    fullPage: true,
  });

  // Pass marker for the judge runner.
  fs.writeFileSync(
    path.join(CAPTURE_DIR, "PASS.json"),
    JSON.stringify(
      {
        journey: "players-marketcap",
        passed_at: new Date().toISOString(),
        steps: [
          "land",
          "row-count",
          "column-headers",
          "default-sort-desc",
          "sort-toggle-url",
          "sort-delta-url",
          "sort-refresh",
          "player-click-through",
        ],
        tti_ms: ttiMs,
        row_count: rowCount,
        portal_url: process.env.PORTAL_URL ?? "(default localhost)",
      },
      null,
      2,
    ),
  );
});
