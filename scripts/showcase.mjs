/**
 * Showcase pipeline: record demo (Playwright) → copy WebM for Remotion → optional studio / render.
 *
 * Usage (repo root):
 *   pnpm showcase              # record + copy WebM (no DB seed, no MP4)
 *   pnpm showcase:full         # db:seed → Playwright (/customer) → WebM → voiceover → MP4 → public/f5-demo.mp4 for /
 *   pnpm showcase:fresh        # alias of showcase:full
 *   pnpm showcase -- --render | --studio | --seed | --skip-record
 *
 * Requires: pnpm install, OPENAI_API_KEY (see .env).
 * Voice-over: set ELEVENLABS_API_KEY (optional ELEVENLABS_VOICE_ID); `--render` runs voiceover:generate when the key is set.
 */

import { execSync, spawn } from "node:child_process";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function parseArgs(argv) {
  const args = argv.slice(2);
  return {
    render: args.includes("--render"),
    studio: args.includes("--studio"),
    skipRecord: args.includes("--skip-record"),
    seed: args.includes("--seed"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

function printHelp() {
  console.log(`
showcase — Playwright demo capture + Remotion asset copy (+ optional render)

  pnpm showcase
      Run e2e demo-flow, copy newest test-results/**/*.webm → remotion/public/playwright-demo.webm

  pnpm showcase:full
      db:seed → Playwright on /customer → WebM → voiceover (if key) → remotion-out/f5-demo.mp4 → public/f5-demo.mp4

  pnpm showcase:fresh
      Same as showcase:full

  pnpm showcase -- --render
      Same pipeline as showcase:full (includes db:seed)

  pnpm showcase -- --seed
      Run db:seed before Playwright only (useful without --render)

  pnpm showcase -- --studio
      Same as first step, then start Remotion Studio (tune remotion/src/demo-timeline.ts / Root.tsx)

  pnpm showcase -- --skip-record
      Skip Playwright; copy the newest existing .webm from test-results/

  pnpm showcase -- --skip-record --render
      Re-render MP4 from last recording without re-recording

Environment: OPENAI_API_KEY, optional PLAYWRIGHT_SKIP_WEBSERVER if dev server already running (when set, run dev with E2E_BYPASS_DEMO_CLAIM=1 so /api/demo/customer-claim matches Playwright; spawned webServer sets this automatically).
`);
}

async function findNewestWebm(dir) {
  const files = [];

  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith(".webm")) files.push(p);
    }
  }

  await walk(dir);
  if (files.length === 0) return null;

  let best = files[0];
  let bestMs = 0;
  for (const p of files) {
    const s = await stat(p);
    if (s.mtimeMs > bestMs) {
      bestMs = s.mtimeMs;
      best = p;
    }
  }
  return best;
}

function run(cmd, cwd = root) {
  execSync(cmd, { stdio: "inherit", cwd, env: process.env });
}

async function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.seed || opts.render) {
    run("pnpm db:seed", root);
  }

  if (!opts.skipRecord) {
    run("pnpm exec playwright test e2e/demo-flow.spec.ts", root);
  }

  const src = await findNewestWebm(join(root, "test-results"));
  if (!src) {
    console.error(
      "showcase: no .webm under test-results/. Run without --skip-record after a successful demo:e2e."
    );
    process.exit(1);
  }

  const dest = join(root, "remotion/public/playwright-demo.webm");
  await mkdir(join(root, "remotion/public"), { recursive: true });
  await copyFile(src, dest);
  console.log(`showcase: copied\n  ${src}\n  → ${dest}`);

  if (opts.studio) {
    const child = spawn("pnpm", ["--dir", "remotion", "dev"], {
      stdio: "inherit",
      cwd: root,
      env: process.env,
    });
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }

  if (opts.render) {
    await mkdir(join(root, "remotion-out"), { recursive: true });
    if (process.env.ELEVENLABS_API_KEY) {
      run("pnpm voiceover:generate", root);
    } else {
      console.warn(
        "showcase: ELEVENLABS_API_KEY not set; skipping voiceover:generate. Run `pnpm voiceover:generate` after adding the key, or ensure remotion/public/voice/beat-01.mp3 … exist."
      );
    }
    run("pnpm --dir remotion render", root);
    try {
      run("node scripts/publish-demo-video.mjs", root);
    } catch {
      console.warn(
        "showcase: optional copy to public/f5-demo.mp4 failed; run `pnpm demo:publish-video` manually."
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
