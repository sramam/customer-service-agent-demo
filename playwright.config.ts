import "dotenv/config";
import { defineConfig } from "@playwright/test";

/** Default ~full HD so split customer/agent UI is not clipped in WebM; override via env. */
function demoRecordingViewport(): { width: number; height: number } {
  const w = Number(process.env.PLAYWRIGHT_VIEWPORT_WIDTH ?? "1920");
  const h = Number(process.env.PLAYWRIGHT_VIEWPORT_HEIGHT ?? "1080");
  if (!Number.isFinite(w) || w < 960) {
    return { width: 1920, height: 1080 };
  }
  if (!Number.isFinite(h) || h < 540) {
    return { width: 1920, height: 1080 };
  }
  return { width: Math.round(w), height: Math.round(h) };
}

const vp = demoRecordingViewport();

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
    screenshot: "only-on-failure",
    video: {
      mode: "on",
      size: { width: vp.width, height: vp.height },
    },
    viewport: { width: vp.width, height: vp.height },
  },
  projects: [{ name: "chromium", use: { channel: "chromium" } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "pnpm dev",
        url: "http://127.0.0.1:3000",
        // `showcase:replay-live` sets PLAYWRIGHT_NO_REUSE_SERVER=1 so we always start `pnpm dev`
        // with E2E_BYPASS below — reusing a manually started dev server would skip that env.
        reuseExistingServer:
          !process.env.CI && !process.env.PLAYWRIGHT_NO_REUSE_SERVER,
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
