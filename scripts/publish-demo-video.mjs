/**
 * Copies the rendered Remotion MP4 to `public/f5-demo.mp4` so the landing page (`/`) can serve it.
 * Run automatically at the end of `pnpm showcase:full` (after render), or manually: `pnpm demo:publish-video`
 */
import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "remotion-out", "f5-demo.mp4");
const dest = join(root, "public", "f5-demo.mp4");

async function main() {
  if (!existsSync(src)) {
    console.error(
      `publish-demo-video: missing ${src}\n  Run pnpm --dir remotion render or pnpm showcase:full first.`
    );
    process.exit(1);
  }
  await mkdir(join(root, "public"), { recursive: true });
  await copyFile(src, dest);
  console.log(`publish-demo-video: ${src} → ${dest} (embedded on /)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
