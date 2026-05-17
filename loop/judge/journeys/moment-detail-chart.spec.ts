// Persona journey J4 — Moment detail price chart (OTM-parity).
//
// From research/personas/pro-trader.md §J4 (Moment-detail research journey):
//   "I'm thinking about buying a Wemby Common. I open the moment detail page.
//    I switch between 1D / 7D / 1M / 3M / YTD / ALL — the chart actually
//    redraws. I see circulation breakdown: how many are owned, listed, in a
//    pack, locker room, burned."
//
// Acceptance (features.json[moment-detail-chart].acceptance):
//   "As a trader, I open a moment detail page for a flowId WITH AT LEAST 5
//    RECORDED SALES, click between time-window tabs (1D, 7D, 1M, 3M, YTD,
//    ALL), and the chart line actually redraws with sale dots. Tab state
//    survives a page refresh. The default time window on landing is 30D."
//
// Pass criteria per step:
//   0.  /moments loads < 30s (cold deploy TTI)
//   1.  Navigate to /moment/KNOWN_FLOW_ID — detail loads, "Price history" visible
//   2.  All 6 time-window tabs present without scrolling
//   3.  1M tab is aria-checked="true" by default (no ?h= param) — 30D default fix
//   4.  Window label shows "1M" (not "all time")
//   4b. price-history-chart is VISIBLE with SVG path/circle > 0 in 1M window
//       FAILS on honest empty — data-bearing entity required (Pattern C)
//   5.  Click 7D → URL contains ?h=7d within 2s
//   6.  7D tab aria-checked="true" after click
//   7.  Window label shows "7D" after URL change
//   8.  Chart or honest empty present after 7D click (weaker: 7D may be sparse)
//   9.  Clicking ALL reverts URL (h=7d removed)
//  10.  Navigate to ?h=7d fresh → 7D tab active (state survives reload)
//  11.  Click 1D → page doesn't crash; chart or honest empty present
//
// Evidence: screenshots at each numbered step → ./captures/moment-detail-chart/<ts>/
//
// IMPORTANT — prior failure (re-opened 2026-05-17 14:51Z by Roham):
//   Hard-coded KNOWN_FLOW_ID="47863705" had 0 SUCCEEDED transactions in
//   topshot.transactions. getMomentHistory returned [], chart showed
//   price-history-empty, and the old step 8 accepted that as PASS. This
//   spec replaces the hardcoded flowId with a runtime Pattern-C lookup
//   and adds a strong SVG assertion in step 4b.

import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
// Use project-standard admin client — bypasses RLS, schema="topshot" applied
// via createClient<AdminDatabase,"topshot"> generics (matching admin.ts pattern).
// The prior raw createClient() + @ts-expect-error caused schema to be
// silently ignored in some SDK versions → queries hit public.transactions
// (doesn't exist) → txErr thrown → beforeAll threw → empty captures.
// Relative import avoids @/ alias resolution uncertainty in Playwright esbuild.
import { supabaseAdmin } from "../../../lib/supabase/admin";

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

// Resolved dynamically in beforeAll via Pattern C (client-side aggregate over
// topshot.transactions). Never hard-coded — the prior hard-coded flowId
// "47863705" had 0 SUCCEEDED transactions, causing chart to show honest-empty
// and the judge to accept that as PASS (Roham review 2026-05-17 14:40Z).
let KNOWN_FLOW_ID = "";

test.beforeAll(async () => {
  fs.mkdirSync(CAPTURE_DIR, { recursive: true });

  // ── Env-var guard: load .env.local if vars aren't in the process env ─────
  // Fresh orchestrator spawns (or `node loop/judge/run.mjs` invoked directly)
  // may not have NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY exported in the
  // shell. Reading .env.local here covers that gap without requiring dotenv.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    const envLocalPath = path.resolve(__dirname, "../../../.env.local");
    if (fs.existsSync(envLocalPath)) {
      const raw = fs.readFileSync(envLocalPath, "utf-8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (key && !(key in process.env)) process.env[key] = val;
      }
      console.log("[judge] moment-detail-chart: loaded env vars from .env.local");
    }
  }

  // ── Pattern C — use project-standard supabaseAdmin() ─────────────────────
  // supabaseAdmin() from lib/supabase/admin.ts uses createClient<AdminDatabase,"topshot">
  // with proper TypeScript generics, which guarantees db.schema="topshot" is
  // applied at construction time. The prior approach (raw createClient + @ts-expect-error)
  // may have silently fallen back to public schema in some @supabase/supabase-js versions,
  // causing .from("transactions") to hit public.transactions (non-existent),
  // returning txErr → beforeAll throw → empty captures directory.
  //
  // Find a moment_id with ≥5 SUCCEEDED transactions in the last 30 days,
  // then resolve its moment_flow_id for the URL (/moment/[flowId]).
  const sb = supabaseAdmin();

  // Pull up to 5 000 SUCCEEDED transactions from the last 30 days,
  // group by moment_id client-side, pick the most-traded one.
  const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: txData, error: txErr } = await sb
    .from("transactions")
    .select("moment_id")
    .eq("transaction_state_id", "SUCCEEDED")
    .not("gross_amount_usd", "is", null)
    .gte("source_updated_at", since30d)
    .limit(5000);

  if (txErr) {
    throw new Error(
      `[judge] moment-detail-chart: transactions query failed: ${JSON.stringify(txErr)}`,
    );
  }

  const counts = new Map<string, number>();
  for (const t of (txData ?? []) as Array<{ moment_id: string }>) {
    if (t.moment_id)
      counts.set(t.moment_id, (counts.get(t.moment_id) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .filter(([, c]) => c >= 5)
    .sort(([, a], [, b]) => b - a);

  if (!sorted.length) {
    throw new Error(
      "[judge] moment-detail-chart: No moment_id with ≥5 SUCCEEDED " +
        "transactions in the last 30 days. Check topshot.transactions ETL.",
    );
  }

  const topMomentId = sorted[0][0];

  // Resolve moment_flow_id from moment_id.
  // (moment_flow_id is the URL parameter in /moment/[flowId])
  const { data: momentRow, error: momentErr } = await sb
    .from("moments")
    .select("moment_flow_id")
    .eq("moment_id", topMomentId)
    .maybeSingle();

  if (momentErr || !momentRow) {
    throw new Error(
      `[judge] moment-detail-chart: Could not resolve moment_flow_id ` +
        `for moment_id=${topMomentId}: ${JSON.stringify(momentErr)}`,
    );
  }

  KNOWN_FLOW_ID = (momentRow as { moment_flow_id: string }).moment_flow_id;
  if (!KNOWN_FLOW_ID) {
    throw new Error(
      `[judge] moment-detail-chart: moment_flow_id is null/empty ` +
        `for moment_id=${topMomentId}`,
    );
  }

  console.log(
    `[judge] moment-detail-chart: resolved KNOWN_FLOW_ID=${KNOWN_FLOW_ID} ` +
      `(moment_id=${topMomentId}, tx_count_30d=${sorted[0][1]})`,
  );
});

test(
  "J4 — moment-detail-chart: 1M default; tabs redraw chart; state survives refresh",
  async ({ page }) => {
    // ── Step 0: cold TTI guard — navigate to /moments ─────────────────────────
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
    expect(ttiMs, `moments grid TTI was ${ttiMs}ms`).toBeLessThan(30_000);

    // ── Step 1: detail-land — navigate directly to data-bearing moment ────────
    // Navigating directly avoids depending on grid row state from prior runs.
    await page.goto(`/moment/${KNOWN_FLOW_ID}`, { timeout: 60_000 });
    await page
      .getByRole("heading", { name: "Price history" })
      .waitFor({ state: "visible", timeout: 30_000 });
    await page.screenshot({
      path: path.join(CAPTURE_DIR, "01-detail-land.png"),
      fullPage: true,
    });

    // ── Step 2: tabs-visible — all 6 tabs present without scrolling ───────────
    // From acceptance: "click between time-window tabs (1D, 7D, 1M, 3M, YTD, ALL)"
    const tabIds = ["1d", "7d", "1m", "3m", "ytd", "all"] as const;
    for (const w of tabIds) {
      const tab = page.locator(`[data-testid="price-tab-${w}"]`);
      await expect(tab, `price-tab-${w} must be visible`).toBeVisible();
    }
    await page.screenshot({
      path: path.join(CAPTURE_DIR, "02-tabs-visible.png"),
      fullPage: true,
    });

    // ── Step 3: 1m-tab-default — 1M tab is active by default (no ?h= param) ──
    // "The default time window on landing is 30D (not 24H)" — research note §4.
    // Fix: parseHistoryWindow() now returns "1m" instead of "all" as fallback.
    //      MomentPriceHistory.tsx nuqs withDefault now "1m" instead of "all".
    const oneMTab = page.locator('[data-testid="price-tab-1m"]');
    await expect(
      oneMTab,
      "1M tab must be aria-checked=true by default (30D default fix per research note §4)",
    ).toHaveAttribute("aria-checked", "true");
    const allTab = page.locator('[data-testid="price-tab-all"]');
    await expect(
      allTab,
      "ALL tab must be aria-checked=false on fresh landing (1m is the default)",
    ).toHaveAttribute("aria-checked", "false");

    // ── Step 4: 1m-subtitle — window label shows "1M" ────────────────────────
    const windowLabel = page.locator(
      '[data-testid="price-history-window-label"]',
    );
    await expect(
      windowLabel,
      "window label must contain '1M' for the default 30D window",
    ).toContainText("1M");
    const oneMSalesText = await windowLabel.innerText();
    const oneMSalesCount = parseInt(
      oneMSalesText.match(/^(\d+)/)?.[1] ?? "0",
      10,
    );
    await page.screenshot({
      path: path.join(CAPTURE_DIR, "03-1m-tab-default.png"),
      fullPage: true,
    });

    // ── Step 4b: chart-svg — ACTUAL SVG data elements in 1M window ───────────
    // "The judge MUST NOT accept price-history-empty as a PASS on a data-bearing
    //  entity." (research/wiki/gotchas/judge-journeys-must-assert-data-rendered.md)
    // KNOWN_FLOW_ID was dynamically resolved to have ≥5 SUCCEEDED transactions
    // in the last 30 days. The 1M window MUST render the chart, not empty state.
    await expect(
      page.locator('[data-testid="price-history-chart"]'),
      "price-history-chart must be VISIBLE (not empty state) for data-bearing flowId in 1M window",
    ).toBeVisible({ timeout: 20_000 });
    const svgElements = page.locator(
      '[data-testid="price-history-chart"] svg path, ' +
        '[data-testid="price-history-chart"] svg circle',
    );
    expect(
      await svgElements.count(),
      "SVG must have path or circle elements (actual sale dots rendered) — " +
        "honest empty state is NOT acceptable for a data-bearing entity",
    ).toBeGreaterThan(0);
    await page.screenshot({
      path: path.join(CAPTURE_DIR, "04-chart-svg-1m.png"),
      fullPage: true,
    });

    // ── Step 5: 7d-tab-url — clicking 7D updates URL to ?h=7d ─────────────────
    // "Each tab click triggers a real server re-fetch with a new WHERE clause,
    //  not a client-side filter of a cached full history." — research note §2
    const sevenDTab = page.locator('[data-testid="price-tab-7d"]');
    await sevenDTab.click();
    await page.waitForURL(/[?&]h=7d/, { timeout: 8_000 });
    expect(page.url(), "URL must contain ?h=7d after 7D tab click").toContain(
      "h=7d",
    );
    await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    await page.screenshot({
      path: path.join(CAPTURE_DIR, "05-tab-7d-url.png"),
      fullPage: true,
    });

    // ── Step 6: 7d-tab-active — 7D tab aria-checked="true" ───────────────────
    await expect(
      sevenDTab,
      "7D tab must be aria-checked=true after click",
    ).toHaveAttribute("aria-checked", "true", { timeout: 20_000 });
    await expect(
      oneMTab,
      "1M tab must be aria-checked=false after 7D clicked",
    ).toHaveAttribute("aria-checked", "false");
    await page.screenshot({
      path: path.join(CAPTURE_DIR, "06-tab-7d-active.png"),
      fullPage: true,
    });

    // ── Step 7: 7d-subtitle — window label reflects 7D ───────────────────────
    await expect(
      windowLabel,
      "window label must contain '7D' after 7D tab",
    ).toContainText("7D", { timeout: 10_000 });
    const sevenDSalesText = await windowLabel.innerText();
    const sevenDSalesCount = parseInt(
      sevenDSalesText.match(/^(\d+)/)?.[1] ?? "0",
      10,
    );
    expect(
      sevenDSalesCount,
      "7D sales count must be ≥ 0",
    ).toBeGreaterThanOrEqual(0);

    // ── Step 8: chart-state-7d — chart or honest empty state after 7D ─────────
    // Weaker assertion: 7D window may be sparse for this moment.
    // The strong SVG assertion was performed in step 4b for the 1M window.
    const chartArea = page.locator('[data-testid="price-history-chart"]');
    const emptyArea = page.locator('[data-testid="price-history-empty"]');
    const chartOrEmpty =
      (await chartArea.count()) > 0 || (await emptyArea.count()) > 0;
    expect(
      chartOrEmpty,
      "price-history-chart or price-history-empty must be present after 7D click",
    ).toBe(true);
    await page.screenshot({
      path: path.join(CAPTURE_DIR, "07-chart-state-7d.png"),
      fullPage: true,
    });

    // ── Step 9: all-tab-back — clicking ALL reverts the URL ───────────────────
    // "Clicking ALL after 7D reverts the URL" — original acceptance criterion.
    await allTab.click();
    await page.waitForFunction(
      () => !window.location.search.includes("h=7d"),
      { timeout: 5_000 },
    );
    expect(page.url()).not.toContain("h=7d");
    await page.screenshot({
      path: path.join(CAPTURE_DIR, "08-tab-all-back.png"),
      fullPage: true,
    });

    // ── Step 10: refresh-7d — tab state survives a page refresh ──────────────
    // "Navigating to ?h=7d and reloading must show the 7D tab as active"
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
      path: path.join(CAPTURE_DIR, "09-refresh-7d.png"),
      fullPage: true,
    });

    // ── Step 11: 1d-tab-smoke — clicking 1D does not crash ───────────────────
    // "Clicking 1D does not crash the page even if 0 sales exist for that window."
    const oneDTab = page.locator('[data-testid="price-tab-1d"]');
    await oneDTab.click();
    await page.waitForURL(/[?&]h=1d/, { timeout: 5_000 });
    await expect(
      page.getByRole("heading", { name: "Price history" }),
      "Price history heading must survive 1D tab click",
    ).toBeVisible();
    const chart1d = page.locator('[data-testid="price-history-chart"]');
    const empty1d = page.locator('[data-testid="price-history-empty"]');
    const okAfter1d =
      (await chart1d.count()) > 0 || (await empty1d.count()) > 0;
    expect(
      okAfter1d,
      "price-history-chart or price-history-empty must be present after 1D click",
    ).toBe(true);
    await page.screenshot({
      path: path.join(CAPTURE_DIR, "10-tab-1d.png"),
      fullPage: true,
    });

    // ── Pass marker — write PASS.json for the judge runner ───────────────────
    fs.writeFileSync(
      path.join(CAPTURE_DIR, "PASS.json"),
      JSON.stringify(
        {
          journey: "moment-detail-chart",
          passed_at: new Date().toISOString(),
          steps: [
            "cold-tti",
            "detail-land",
            "tabs-visible",
            "1m-tab-default",
            "1m-subtitle",
            "chart-svg-1m",
            "7d-tab-url",
            "7d-tab-active",
            "7d-subtitle",
            "chart-state-7d",
            "all-tab-back",
            "refresh-7d",
            "1d-tab-smoke",
          ],
          tti_ms: ttiMs,
          known_flow_id: KNOWN_FLOW_ID,
          one_m_sales_count: oneMSalesCount,
          seven_d_sales_count: sevenDSalesCount,
          portal_url: process.env.PORTAL_URL ?? "(default localhost)",
        },
        null,
        2,
      ),
    );
  },
);
