// Capture a screenshot inventory of the live deployment.
// Usage: node scripts/screenshots.mjs [outDir]
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const BASE = process.env.PORTAL_URL ?? "http://localhost:3000";
const OUT = resolve(process.argv[2] ?? "./qa-screenshots");

const PAGES = [
  { name: "01-home-mobile", path: "/", viewport: { width: 375, height: 1200 } },
  { name: "02-home-desktop", path: "/", viewport: { width: 1440, height: 1100 } },
  { name: "03-rules-desktop", path: "/rules", viewport: { width: 1440, height: 1300 } },
  { name: "04-u-bostonbased-desktop", path: "/u/BostonBased", viewport: { width: 1440, height: 1500 } },
  { name: "05-u-bigdaddabear-mobile", path: "/u/BigDaddaBear", viewport: { width: 375, height: 2200 } },
  { name: "06-player-lebron-desktop", path: "/player/2544", viewport: { width: 1440, height: 1200 } },
  { name: "07-collectors-desktop", path: "/collectors", viewport: { width: 1440, height: 900 } },
  { name: "08-methodology-desktop", path: "/methodology", viewport: { width: 1440, height: 1400 } },
  { name: "09-sets-desktop", path: "/sets", viewport: { width: 1440, height: 1200 } },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ colorScheme: "dark" });
  for (const p of PAGES) {
    await ctx.setViewportSize?.(p.viewport).catch(() => {});
    const page = await ctx.newPage();
    await page.setViewportSize(p.viewport);
    const url = BASE + p.path;
    console.log(`→ ${url} (${p.viewport.width}×${p.viewport.height})`);
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    } catch (e) {
      console.warn("  goto timeout, proceeding to screenshot:", e?.message ?? e);
    }
    await page.waitForTimeout(800);
    const file = `${OUT}/${p.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log("  saved", file);
    await page.close();
  }
  // also pick a moment from home → screenshot moment page
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1440, height: 1500 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 30_000 }).catch(() => {});
  const momentHref = await page.locator("a[href^='/moment/']").first().getAttribute("href").catch(() => null);
  if (momentHref) {
    console.log(`→ ${BASE}${momentHref} (moment)`);
    await page.goto(BASE + momentHref, { waitUntil: "networkidle", timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/10-moment-detail-desktop.png`, fullPage: true });
    console.log("  saved", `${OUT}/10-moment-detail-desktop.png`);
  }
  await page.close();
  await browser.close();
  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
