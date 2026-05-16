// Persona-judge Playwright config (separate from /e2e suite).
//
// The judge points at the deployed URL (preview or production) and walks
// persona journeys defined in loop/judge/journeys/. Each journey captures
// step-by-step screenshots into loop/judge/captures/<journey>/<timestamp>/
// and emits a pass/fail verdict.

import { defineConfig, devices } from "@playwright/test";

const BASE = process.env.PORTAL_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./journeys",
  fullyParallel: false, // serialize so captures land in order
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["line"], ["json", { outputFile: "reports/last-run.json" }]],
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    screenshot: "on", // always capture; we want the judge's evidence record
    video: "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium-pro-trader",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  // The judge does NOT spin up a server — it always grades a deployed URL.
  // Set PORTAL_URL=https://... to the preview / production target.
  webServer: undefined,
});
