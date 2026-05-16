import { defineConfig, devices } from "@playwright/test";

// Default baseURL points at `next start` on :3000. Override with
// PLAYWRIGHT_BASE_URL=https://your-vercel-preview.vercel.app for preview deploys.
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npx next start -p 3000",
        url: BASE,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
