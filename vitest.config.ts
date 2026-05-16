import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Vitest runs unit + integration tests in-process. Playwright e2e specs
    // live under e2e/ and must be excluded — they import @playwright/test
    // which can't run inside the vitest runner.
    exclude: ["node_modules/**", "e2e/**", ".next/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
