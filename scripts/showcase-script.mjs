/**
 * Script-driven showcase pipeline: YAML/MD replay (Playwright) → WebM for Remotion → ElevenLabs
 * voiceover → optional Remotion MP4 (same beats as `pnpm showcase`, from `SHOWCASE_BEATS` in
 * `remotion/src/demo-timeline.ts`).
 *
 * Usage (repo root):
 *   pnpm showcase:script replay/showcase-example.yaml
 *   pnpm showcase:script replay/notes.md
 *   pnpm showcase:script -- --render              # + db:seed + remotion render + public/f5-demo.mp4
 *   pnpm showcase:script -- --seed                # seed DB before Playwright only
 *   pnpm showcase:script -- --studio              # after record + voiceover, open Remotion Studio
 *   pnpm showcase:script -- --skip-record --render
 *
 * Requires: OPENAI_API_KEY, optional ELEVENLABS_API_KEY for narration (see `.env.example`).
 * Voice-over runs whenever the key is set (unlike `pnpm showcase`, which generates audio only with `--render`).
 */

import { execSync, spawn } from "node:child_process";
import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function parseArgs(argv) {
  const args = argv.slice(2).filter((a) => a !== "--");
  return {
    render: args.includes("--render"),
    studio: args.includes("--studio"),
    skipRecord: args.includes("--skip-record"),
    seed: args.includes("--seed"),
    help: args.includes("--help") || args.includes("-h"),
    scriptPath: args.find((a) => !a.startsWith("-")),
  };
}

function printHelp() {
  console.log(`
showcase:script — Playwright script replay (YAML/MD) + Remotion assets + voiceover

  pnpm showcase:script replay/showcase-example.yaml
      db:seed (if --render or --seed) → e2e/showcase-replay-script.spec.ts → copy newest .webm
      → remotion/public/playwright-demo.webm → voiceover:generate (if ELEVENLABS_API_KEY)

  pnpm showcase:script replay/foo.yaml -- --render
      Same as above, then remotion render → remotion-out/… → public/f5-demo.mp4

  pnpm showcase:script -- --studio
      After record + voiceover, start Remotion Studio (tune demo-timeline / beats)

  pnpm showcase:script -- --skip-record --render
      Re-render MP4 from last recording + regenerate voice (if key)

Environment: F5_REPLAY_SCRIPT if no path arg; OPENAI_API_KEY; optional ELEVENLABS_API_KEY.
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

  const scriptPathRaw = opts.scriptPath?.trim() || process.env.F5_REPLAY_SCRIPT?.trim();
  if (!scriptPathRaw) {
    console.error(
      "showcase:script: pass a YAML or Markdown path, e.g. pnpm showcase:script replay/showcase-example.yaml",
    );
    console.error("   or set F5_REPLAY_SCRIPT in .env");
    process.exit(1);
  }

  const scriptAbs = resolve(root, scriptPathRaw);

  if (opts.seed || opts.render) {
    run("pnpm db:seed", root);
  }

  const env = {
    ...process.env,
    F5_REPLAY_SCRIPT: scriptAbs,
    PLAYWRIGHT_NO_REUSE_SERVER: "1",
    E2E_BYPASS_DEMO_CLAIM: process.env.E2E_BYPASS_DEMO_CLAIM ?? "1",
  };

  if (!opts.skipRecord) {
    execSync("pnpm exec playwright test e2e/showcase-replay-script.spec.ts", {
      stdio: "inherit",
      cwd: root,
      env,
    });
  }

  const src = await findNewestWebm(join(root, "test-results"));
  if (!src) {
    console.error(
      "showcase:script: no .webm under test-results/. Run without --skip-record after a successful replay.",
    );
    process.exit(1);
  }

  const dest = join(root, "remotion/public/playwright-demo.webm");
  await mkdir(join(root, "remotion/public"), { recursive: true });
  await copyFile(src, dest);
  console.log(`showcase:script: copied\n  ${src}\n  → ${dest}`);

  if (opts.studio) {
    if (process.env.ELEVENLABS_API_KEY) {
      run("pnpm voiceover:generate", root);
    } else {
      console.warn(
        "showcase:script: ELEVENLABS_API_KEY not set; skipping voiceover:generate.",
      );
    }
    const child = spawn("pnpm", ["--dir", "remotion", "dev"], {
      stdio: "inherit",
      cwd: root,
      env: process.env,
    });
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }

  if (process.env.ELEVENLABS_API_KEY) {
    run("pnpm voiceover:generate", root);
  } else {
    console.warn(
      "showcase:script: ELEVENLABS_API_KEY not set; skipping voiceover:generate. Add the key in .env for narration MP3s.",
    );
  }

  if (opts.render) {
    await mkdir(join(root, "remotion-out"), { recursive: true });
    run("pnpm --dir remotion render", root);
    try {
      run("node scripts/publish-demo-video.mjs", root);
    } catch {
      console.warn(
        "showcase:script: optional copy to public/f5-demo.mp4 failed; run `pnpm demo:publish-video` manually.",
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
