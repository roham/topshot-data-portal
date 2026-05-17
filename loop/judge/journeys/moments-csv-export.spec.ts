// Persona journey J5 — CSV Export (the LiveToken anti-lock-in feature).
//
// From research/features/moments-csv-export.md §1, quoting pro-trader persona:
//   "No CSV export. They want to model elsewhere too. Lock-in is hostile."
//   "livetoken.co … 'full portfolio with CSV export' — the export is explicitly
//    listed as a distinguishing feature."
//
// LiveToken signature move: a prominent EXPORT button that fires a direct
// <a href="/api/..."> anchor — no modal confirmation, just a server-rendered
// text/csv response with Content-Disposition: attachment. The export reflects
// the *current filter state* — not the entire universe.
//
// Pass criteria (judged at each step):
//   1. /moments?player=Wembanyama&tiers=Common loads with EXPORT link visible
//   2. EXPORT href carries /api/moments/export + filter params from URL
//   3. GET on export URL → HTTP 200, Content-Type: text/csv, Content-Disposition: attachment
//   4. Header row includes required columns (moment_flow_id, player_name, play_name,
//      set_name, series_name, edition_name, tier_name, serial_number, listing_price_usd)
//   5. At least 1 data row exists
//   6. Every data row has tier_name="Common" (filter respected — no Rare/Legendary bleed)
//   7. RFC 4180 quoting: each row parses to exactly headerCols.length columns
//      (proves that comma-containing fields are double-quote-wrapped)
//
// Evidence: screenshots at each numbered step go to ./captures/moments-csv-export/<ts>/

import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const TS = new Date().toISOString().replace(/[:.]/g, "-");
const CAPTURE_DIR = path.join(__dirname, "..", "captures", "moments-csv-export", TS);

// Cold preview deployments need a longer test timeout.
test.setTimeout(180_000);

test.beforeAll(() => {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });
});

// RFC 4180-compliant CSV row parser. Handles:
//   - Quoted fields (wrapped in "")
//   - Escaped quotes inside quoted fields ("" → ")
//   - Commas inside quoted fields (treated as data, not separator)
function parseCsvRow(line: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuote = true;
      } else if (ch === ',') {
        cols.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  cols.push(cur);
  return cols;
}

test("J5 — csv-export: filtered /moments EXPORT link downloads valid CSV respecting filters", async ({ page }) => {
  // ── Step 0 — land on /moments with Wembanyama+Common filter ─────────────
  // "I open /moments, filter by Player='Victor Wembanyama' + Tier='Common'"
  // Using the research note's canonical test URL (§8 spec step 1).
  const navStart = Date.now();
  await page.goto("/moments?player=Wembanyama&tiers=Common", { timeout: 90_000 });
  // Wait for the filter rail to be visible — same pattern as moments-grid.spec.ts
  await page.getByText("Filters", { exact: true }).first().waitFor({ state: "visible", timeout: 60_000 });
  const ttiMs = Date.now() - navStart;
  await page.screenshot({ path: path.join(CAPTURE_DIR, "00-land.png"), fullPage: true });
  // TTI < 30s on cold deploy (production is expected sub-3s; 30s is cold-preview slack)
  expect(ttiMs, `landing TTI was ${ttiMs}ms`).toBeLessThan(30_000);

  // ── Step 1 — assert EXPORT link is visible without scrolling ────────────
  // "Lock-in is hostile" — the EXPORT button must be visible at page load.
  // The data-testid is "moments-export-csv" (the value set in app/moments/page.tsx).
  const exportLink = page.locator('[data-testid="moments-export-csv"]');
  await exportLink.waitFor({ state: "visible", timeout: 15_000 });
  await page.screenshot({ path: path.join(CAPTURE_DIR, "01-export-visible.png"), fullPage: true });

  // ── Step 2 — verify href carries filter state ────────────────────────────
  // TradingView cross-domain reference: "export the currently visible time window
  // as CSV — not all historical data, just the filtered slice the user is looking at."
  // Same discipline: export URL must mirror the current page's filter params.
  const href = await exportLink.getAttribute("href");
  expect(href, "EXPORT link must have an href").toBeTruthy();
  expect(href, "href must point to the export API route").toContain("/api/moments/export");
  expect(href, "href must carry the player filter param").toContain("player=Wembanyama");
  expect(href, "href must carry the tiers filter param").toContain("tiers=Common");
  await page.screenshot({ path: path.join(CAPTURE_DIR, "02-href-verified.png"), fullPage: true });

  // ── Step 3 — fetch the export URL (no browser download dialog) ──────────
  // "LiveToken's signature move: fires a direct <a href='/api/...'> anchor —
  // no Promise-based download API, no modal confirmation"
  // Use page.request.get() to fetch the CSV directly (relative URL resolves
  // against the page's origin automatically in Playwright).
  const response = await page.request.get(href!, { timeout: 60_000 });

  expect(response.status(), "export must return HTTP 200").toBe(200);

  const contentType = response.headers()["content-type"] ?? "";
  expect(contentType, "content-type must contain text/csv").toContain("text/csv");

  const contentDisposition = response.headers()["content-disposition"] ?? "";
  expect(contentDisposition, "content-disposition must be attachment (triggers browser save)").toContain("attachment");
  // Filename discipline from TradingView cross-domain: auto-generated with date stamp
  expect(contentDisposition, "filename must include 'topshot-moments'").toContain("topshot-moments");
  await page.screenshot({ path: path.join(CAPTURE_DIR, "03-http-200-csv.png"), fullPage: true });

  // ── Step 4 — parse CSV body: header row ──────────────────────────────────
  // IBKR cross-domain reference: "every row names the asset class, security
  // identifier, transaction type … all the dimensions the trader needs to model
  // without having to cross-reference."
  const csvText = await response.text();
  const lines = csvText.split("\n").filter((l) => l.trim().length > 0);
  expect(lines.length, "CSV must have at least a header row + 1 data row").toBeGreaterThanOrEqual(2);

  const headerLine = lines[0];
  const headerCols = headerLine.split(",");

  const requiredCols = [
    "moment_flow_id",
    "player_name",
    "play_name",
    "set_name",
    "series_name",
    "edition_name",
    "tier_name",
    "serial_number",
    "listing_price_usd",
  ];
  for (const col of requiredCols) {
    expect(headerLine, `CSV header must include column "${col}"`).toContain(col);
  }

  // ── Step 5 — at least 1 data row ────────────────────────────────────────
  const dataRows = lines.slice(1);
  expect(dataRows.length, "CSV must have at least 1 data row for Wembanyama Common listed moments").toBeGreaterThan(0);

  // ── Step 6 — filter respected: every row must have tier_name="Common" ───
  // "When exporting with tiers=Common, all data rows have Common in the
  //  tier_name column; no Rare or Legendary rows appear."
  const tierIdx = headerCols.indexOf("tier_name");
  expect(tierIdx, "tier_name column must be present in header").toBeGreaterThanOrEqual(0);

  for (const row of dataRows) {
    if (!row.trim()) continue;
    const cells = parseCsvRow(row);
    const tierVal = cells[tierIdx] ?? "";
    expect(
      tierVal,
      `All data rows must have tier_name="Common" (filter respected). Got "${tierVal}" in row: ${row.slice(0, 80)}`,
    ).toBe("Common");
  }

  // ── Step 7 — RFC 4180 quoting: column count must match header ───────────
  // "Any field value that contains a comma … is wrapped in double-quotes;
  //  double-quotes within a value are escaped as '""'"
  // Structural proof: if quoting is correct, our RFC 4180 parser produces
  // exactly headerCols.length columns per row. A missing quote on a field
  // that contains a comma would give more columns; that's the failure mode.
  for (const row of dataRows) {
    if (!row.trim()) continue;
    const cells = parseCsvRow(row);
    expect(
      cells.length,
      `RFC 4180 quoting error: row has ${cells.length} cols, expected ${headerCols.length}. Row: ${row.slice(0, 120)}`,
    ).toBe(headerCols.length);
  }

  await page.screenshot({ path: path.join(CAPTURE_DIR, "04-data-verified.png"), fullPage: true });

  // Pass marker for the judge runner.
  fs.writeFileSync(
    path.join(CAPTURE_DIR, "PASS.json"),
    JSON.stringify(
      {
        journey: "moments-csv-export",
        passed_at: new Date().toISOString(),
        steps: [
          "land",
          "export-visible",
          "href-carries-filter-state",
          "http-200-text-csv-attachment",
          "header-row-cols",
          "tier-filter-respected",
          "rfc4180-quoting",
        ],
        tti_ms: ttiMs,
        data_rows: dataRows.length,
        header_cols: headerCols.length,
        portal_url: process.env.PORTAL_URL ?? "(default localhost)",
      },
      null,
      2,
    ),
  );
});
