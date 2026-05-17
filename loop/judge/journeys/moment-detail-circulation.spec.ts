// Persona journey J4b — Moment detail circulation breakdown (OTM-parity).
//
// From research/personas/pro-trader.md §J4 (Moment-detail research journey):
//   "I'm thinking about buying a Wemby Common. I open the moment detail page.
//    I switch between 1D / 7D / 1M / 3M / YTD / ALL — the chart actually
//    redraws. I see circulation breakdown: how many are owned, listed, in a
//    pack, locker room, burned."
//
// Acceptance (features.json[moment-detail-circulation].acceptance):
//   "As a trader, I see for this edition: absolute count + % of total for
//    each of Owned, Listings, Owned-locked, In a Pack, Locker Room, Burned.
//    Numbers sum to total circulation."
//
// Pass criteria per step (research/features/moment-detail-circulation.md §4):
//   1. Navigate to /moment/<known-flowId> — page renders < 30s (cold)
//   2. Circulation card (data-testid="circ-card") is visible
//   3. All six bucket cells present: circ-owned, circ-listings,
//      circ-owned-locked, circ-in-pack, circ-locker-room, circ-burned
//   4. Each bucket shows a non-blank percentage (e.g. "70.1%")
//   5. Each bucket shows a non-blank absolute count in parens (e.g. "(5,761)")
//   6. Listings bucket (circ-listings) has a count > 0 (edition has live listings)
//   7. Donut chart (data-testid="circ-donut") renders
//   8. Subtitle contains the DB total or edition reconciliation text
//
// Evidence: screenshots at each numbered step go to
//   loop/judge/captures/moment-detail-circulation/<ts>/

import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TS = new Date().toISOString().replace(/[:.]/g, "-");
const CAPTURE_DIR = path.join(
  __dirname,
  "..",
  "captures",
  "moment-detail-circulation",
  TS,
);

// Cold Vercel serverless boot can take 20–30s. Warm runs are sub-3s.
test.setTimeout(180_000);

// Known-good flowId with listings (appears in the moments grid default view).
// Same flowId used by the moment-detail-chart journey (PASS confirmed).
const KNOWN_FLOW_ID = "47863705";

test.beforeAll(() => {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
});

test("J4b — moment-detail-circulation: six circulation buckets with counts+pcts; listings > 0; donut chart present", async ({
  page,
}) => {
  // ── Step 0: cold-land — navigate to the known-good moment detail page ──
  // "I open the moment detail page." — pro-trader.md J4
  const navStart = Date.now();
  await page.goto(`/moment/${KNOWN_FLOW_ID}`, { timeout: 90_000 });
  // Wait for the "Price history" heading — confirms the page rendered (not 404,
  // not blank). Circulation card loads in the same server render pass.
  await page
    .getByRole("heading", { name: "Price history" })
    .waitFor({ state: "visible", timeout: 30_000 });
  const ttiMs = Date.now() - navStart;
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "00-detail-land.png"),
    fullPage: true,
  });
  // Cold-deploy TTI guard: must render within 30s.
  expect(ttiMs, `detail page TTI was ${ttiMs}ms`).toBeLessThan(30_000);

  // ── Step 1: circ-card-visible — Circulation card appears ──
  // The card is rendered server-side; no interaction needed.
  const circCard = page.locator('[data-testid="circ-card"]');
  await circCard.waitFor({ state: "visible", timeout: 15_000 });
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "01-circ-card.png"),
    fullPage: true,
  });

  // ── Step 2: six-buckets — all six OTM-named buckets present ──
  // "I see circulation breakdown: how many are owned, listed, in a pack,
  //  locker room, burned." — pro-trader.md J4
  const BUCKET_SLUGS = [
    "owned",
    "listings",
    "owned-locked",
    "in-pack",
    "locker-room",
    "burned",
  ] as const;

  for (const slug of BUCKET_SLUGS) {
    const cell = page.locator(`[data-testid="circ-${slug}"]`);
    await expect(cell, `circ-${slug} bucket must be visible`).toBeVisible();
  }
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "02-six-buckets.png"),
    fullPage: true,
  });

  // ── Step 3: pct-non-blank — each bucket shows a percentage ──
  // "absolute count + % of total for each bucket" — features.json acceptance
  for (const slug of BUCKET_SLUGS) {
    const cell = page.locator(`[data-testid="circ-${slug}"]`);
    const text = await cell.innerText();
    // Percentage pattern: one or more digits, decimal point, one digit, percent sign
    expect(
      text,
      `circ-${slug} must contain a percentage like "70.1%" — got: ${JSON.stringify(text)}`,
    ).toMatch(/\d+\.\d%/);
  }

  // ── Step 4: count-non-blank — each bucket shows an absolute count in parens ──
  for (const slug of BUCKET_SLUGS) {
    const cell = page.locator(`[data-testid="circ-${slug}"]`);
    const text = await cell.innerText();
    // Count-in-parens pattern: "(N)" where N may have commas
    expect(
      text,
      `circ-${slug} must contain a count in parens like "(5,761)" — got: ${JSON.stringify(text)}`,
    ).toMatch(/\(\d[\d,]*\)/);
  }

  // ── Step 5: listings-nonzero — Listings bucket has count > 0 ──
  // "The judge will navigate to an edition known to have listings and assert
  //  data-testid='circ-listings' shows a value > 0." — moment-detail-circulation.md §4
  const listingsCell = page.locator('[data-testid="circ-listings"]');
  const listingsText = await listingsCell.innerText();
  // Extract the count from "(N)" pattern
  const countMatch = listingsText.match(/\((\d[\d,]*)\)/);
  expect(
    countMatch,
    `circ-listings must contain count in parens — got: ${JSON.stringify(listingsText)}`,
  ).not.toBeNull();
  const listingsCount = parseInt((countMatch?.[1] ?? "0").replace(/,/g, ""), 10);
  expect(
    listingsCount,
    `Listings count must be > 0 for an edition with live listings (got ${listingsCount})`,
  ).toBeGreaterThan(0);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "03-listings-nonzero.png"),
    fullPage: true,
  });

  // ── Step 6: donut-chart — donut/pie chart renders within the card ──
  // "A donut or stacked-bar chart renders within the same card, color-coding
  //  the six buckets. An absent chart (text-only block) fails Pillar 1."
  //   — moment-detail-circulation.md §4 criterion 5
  const donut = page.locator('[data-testid="circ-donut"]');
  await expect(donut, "circ-donut must be visible").toBeVisible();
  // The donut contains SVG rendered by Recharts.
  const svgCount = await donut.locator("svg").count();
  expect(svgCount, "circ-donut must contain at least one SVG element").toBeGreaterThan(0);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "04-donut-chart.png"),
    fullPage: true,
  });

  // ── Step 7: subtitle-present — card subtitle shows total or reconciliation ──
  // "DB total: N · edition declared: M" or "N moments · edition [id[:8]]"
  //   — moment-detail-circulation.md §2b (confidence layer)
  // The subtitle is the first .font-mono element inside circ-card.
  const subtitleEl = circCard.locator(".font-mono").first();
  const subtitleText = await subtitleEl.innerText();
  // Must contain either "moments · edition" (matching case) or "DB total:"
  const hasSubtitle =
    subtitleText.includes("moments · edition") ||
    subtitleText.includes("DB total:");
  expect(
    hasSubtitle,
    `Circulation card subtitle must contain 'moments · edition' or 'DB total:' — got: ${JSON.stringify(subtitleText)}`,
  ).toBe(true);
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "05-subtitle.png"),
    fullPage: true,
  });

  // ── Step 8: scroll-capture — full page screenshot showing circulation in context ──
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: path.join(CAPTURE_DIR, "06-full-page.png"),
    fullPage: true,
  });

  // ── Pass marker — write PASS.json for the judge runner ──
  fs.writeFileSync(
    path.join(CAPTURE_DIR, "PASS.json"),
    JSON.stringify(
      {
        journey: "moment-detail-circulation",
        passed_at: new Date().toISOString(),
        steps: [
          "cold-land",
          "circ-card-visible",
          "six-buckets",
          "pct-non-blank",
          "count-non-blank",
          "listings-nonzero",
          "donut-chart",
          "subtitle-present",
        ],
        tti_ms: ttiMs,
        moment_href: `/moment/${KNOWN_FLOW_ID}`,
        listings_count: listingsCount,
        portal_url: process.env.PORTAL_URL ?? "(default localhost)",
      },
      null,
      2,
    ),
  );
});
