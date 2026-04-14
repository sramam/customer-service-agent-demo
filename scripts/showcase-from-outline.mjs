/**
 * One-shot: freeform outline (.md / .txt) → AI generates showcase YAML + voice narrations →
 * Playwright script replay → WebM → ElevenLabs → Remotion MP4 (default).
 *
 *   pnpm showcase:outline replay/showcase-outline.example.txt
 *       → remotion-out/f5-demo.mp4 and public/f5-demo.mp4 (after publish step)
 *
 *   pnpm showcase:outline replay/x.txt -- --no-render   # skip Remotion (faster iteration)
 *   pnpm showcase:outline replay/x.txt -- --studio     # open Remotion Studio instead of rendering
 *
 * Requires OPENAI_API_KEY (generation) and keys expected by showcase:script (ELEVENLABS for voice, etc.).
 */
import "dotenv/config";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const argv = process.argv.slice(2).filter((a) => a !== "--");
const outlineArg = argv.find((a) => !a.startsWith("-"));
if (!outlineArg) {
  console.error(
    "Usage: pnpm showcase:outline <outline.md|txt> [-- --no-render | --studio | --seed | --skip-record]",
  );
  process.exit(1);
}

const outlineAbs = resolve(root, outlineArg);
let forward = argv.filter((a) => a !== outlineArg && a !== "--no-render");

const noRender = argv.includes("--no-render");
const wantsStudio = forward.includes("--studio");

/** Default to a full MP4 unless the user opts out or opens Studio (same idea as pnpm showcase:full). */
if (!noRender && !wantsStudio && !forward.includes("--render")) {
  forward = [...forward, "--render"];
}

const gen = spawnSync(
  "pnpm",
  ["exec", "tsx", "scripts/generate-showcase-from-outline.ts", outlineAbs],
  { stdio: "inherit", cwd: root, env: process.env },
);
if (gen.status !== 0) {
  process.exit(gen.status ?? 1);
}

const generatedYaml = join(root, "replay/.generated/outline-showcase.yaml");
const narrationsJson = join(root, "replay/.generated/voice-narrations.json");

const run = spawnSync(
  "node",
  ["--import", "dotenv/config", "scripts/showcase-script.mjs", generatedYaml, ...forward],
  {
    stdio: "inherit",
    cwd: root,
    env: {
      ...process.env,
      SHOWCASE_VOICE_NARRATIONS_JSON: narrationsJson,
    },
  },
);

process.exit(run.status === null ? 1 : run.status);
