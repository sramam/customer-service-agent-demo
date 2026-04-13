import "dotenv/config";
import { defineConfig } from "@playwright/test";

/**
 * Demo / marketing capture — `e2e/demo-flow.spec.ts` visits `/customer` and records WebM for Remotion.
 * Requires: `pnpm dev` (or webServer), seeded DB, `OPENAI_API_KEY` in env.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 600_000,
  expect: { timeout: 120_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "on-first-retry",
    video: {
      mode: "on",
      size: { width: 1280, height: 720 },
    },
    viewport: { width: 1280, height: 720 },
  },
  projects: [{ name: "chromium", use: { channel: "chromium" } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          // Lets /api/demo/customer-claim succeed without DB contention (see route.ts).
          E2E_BYPASS_DEMO_CLAIM: "1",
        },
      },
});
