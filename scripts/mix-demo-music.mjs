/**
 * Mixes a low-volume background MP3 into the Remotion-rendered demo MP4 (voiceover stays primary).
 * Requires `ffmpeg` on PATH.
 *
 * Usage (repo root):
 *   ./mix-demo-music
 *   pnpm mix-demo-music
 *   pnpm demo:mix-music
 *   node scripts/mix-demo-music.mjs -- --video remotion-out/f5-demo.mp4
 *   MUSIC_VOLUME=0.06 ./mix-demo-music
 *
 * Defaults:
 *   Video in:  remotion-out/f5-demo.mp4
 *   Music in:  bensound-creativeminds.mp3 (repo root)
 *   Video out: remotion-out/f5-demo-with-music.mp4
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function parseArgs(argv) {
  const out = {
    video: join(root, "remotion-out", "f5-demo.mp4"),
    music: join(root, "bensound-creativeminds.mp3"),
    output: join(root, "remotion-out", "f5-demo-with-music.mp4"),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--video" && argv[i + 1]) out.video = argv[++i];
    if (argv[i] === "--music" && argv[i + 1]) out.music = argv[++i];
    if (argv[i] === "--out" && argv[i + 1]) out.output = argv[++i];
  }
  return out;
}

const paths = parseArgs(process.argv.slice(2));
const musicVolume = process.env.MUSIC_VOLUME ?? "0.07";

function main() {
  try {
    execSync("ffmpeg -version", { stdio: "pipe" });
  } catch {
    console.error("mix-demo-music: ffmpeg not found. Install ffmpeg and ensure it is on PATH.");
    process.exit(1);
  }

  if (!existsSync(paths.video)) {
    console.error(`mix-demo-music: missing video: ${paths.video}\n  Run pnpm demo:render or pnpm showcase:full first.`);
    process.exit(1);
  }
  if (!existsSync(paths.music)) {
    console.error(`mix-demo-music: missing music: ${paths.music}\n  Place the Bensound MP3 at the repo root (see README).`);
    process.exit(1);
  }

  const filter = `[1:a]volume=${musicVolume}[m];[0:a][m]amix=inputs=2:duration=first:normalize=0[aout]`;

  const args = [
    "-y",
    "-i",
    paths.video,
    "-stream_loop",
    "-1",
    "-i",
    paths.music,
    "-filter_complex",
    filter,
    "-map",
    "0:v",
    "-map",
    "[aout]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    paths.output,
  ];

  console.log("mix-demo-music: ffmpeg", ["ffmpeg", ...args].join(" "));
  execFileSync("ffmpeg", args, { stdio: "inherit", cwd: root });
  console.log(`mix-demo-music: wrote ${paths.output}`);
}

main();
