/**
 * Sets `F5_REPLAY_EXPORT` or `F5_REPLAY_SCRIPT` and runs the matching Playwright live-replay spec.
 * Loads `.env` from the repo root (same as `playwright.config.ts`) so OPENAI_API_KEY and
 * optional F5_REPLAY_* vars apply without exporting them in the shell.
 *
 * Usage:
 *   pnpm showcase:replay-live replay/david-replay1.json
 *   pnpm showcase:replay-live replay/showcase-example.yaml
 *   pnpm showcase:replay-live replay/notes.md   # Markdown with YAML front matter
 *   pnpm showcase:replay-live   # uses F5_REPLAY_EXPORT or F5_REPLAY_SCRIPT from .env
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const arg = process.argv[2];
const resolved = arg?.trim() ? resolve(process.cwd(), arg) : null;

if (!resolved && !process.env.F5_REPLAY_EXPORT?.trim() && !process.env.F5_REPLAY_SCRIPT?.trim()) {
  console.error("Usage: pnpm showcase:replay-live <replay.json|script.yaml|script.md>");
  console.error("   or: F5_REPLAY_EXPORT=./replay/foo.json pnpm showcase:replay-live");
  console.error("   or: F5_REPLAY_SCRIPT=./replay/bar.yaml pnpm showcase:replay-live");
  process.exit(1);
}

// Always start a dedicated dev server with claim bypass (see playwright.config webServer.env).
// Without this, Playwright reuses any process on :3000 and ignores E2E_BYPASS_DEMO_CLAIM → 409.
console.warn(
  "showcase:replay-live: starting a dedicated dev server (PLAYWRIGHT_NO_REUSE_SERVER). Stop any other `pnpm dev` on port 3000 first.",
);

const env = {
  ...process.env,
  PLAYWRIGHT_NO_REUSE_SERVER: "1",
  E2E_BYPASS_DEMO_CLAIM: process.env.E2E_BYPASS_DEMO_CLAIM ?? "1",
};

delete env.F5_REPLAY_SCRIPT;
delete env.F5_REPLAY_EXPORT;

let testSpec = "e2e/showcase-replay.spec.ts";

if (resolved) {
  if (/\.(ya?ml|md)$/i.test(resolved)) {
    env.F5_REPLAY_SCRIPT = resolved;
    testSpec = "e2e/showcase-replay-script.spec.ts";
  } else {
    env.F5_REPLAY_EXPORT = resolved;
  }
} else if (process.env.F5_REPLAY_SCRIPT?.trim()) {
  env.F5_REPLAY_SCRIPT = resolve(process.cwd(), process.env.F5_REPLAY_SCRIPT.trim());
  testSpec = "e2e/showcase-replay-script.spec.ts";
} else if (process.env.F5_REPLAY_EXPORT?.trim()) {
  env.F5_REPLAY_EXPORT = resolve(process.cwd(), process.env.F5_REPLAY_EXPORT.trim());
}

const result = spawnSync(
  "pnpm",
  ["exec", "playwright", "test", testSpec],
  {
    stdio: "inherit",
    env,
  },
);

process.exit(result.status === null ? 1 : result.status);
