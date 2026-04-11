/**
 * Generates per-beat MP3s under `remotion/public/voice/beat-01.mp3` … from `SHOWCASE_BEATS`
 * in `remotion/src/demo-timeline.ts` (synced with Playwright). Remotion places each clip on a
 * `Sequence` at `startSec` so narration aligns with the recording.
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SHOWCASE_BEATS } from "../remotion/src/demo-timeline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
config({ path: join(root, ".env") });

const VOICE_DIR = join(root, "remotion/public/voice");

async function ttsOne(
  apiKey: string,
  text: string,
  voiceId: string
): Promise<Buffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    const hint =
      res.status === 402
        ? " (Library/premium voices often require a paid ElevenLabs plan for API use; try a voice that works on your tier or upgrade.)"
        : "";
    throw new Error(`ElevenLabs HTTP ${res.status}: ${err}${hint}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId =
    process.env.ELEVENLABS_VOICE_ID ?? "3TStB8f3X3To0Uj5R7RK";
  if (!key) {
    console.error("Missing ELEVENLABS_API_KEY (set in .env or the environment).");
    process.exit(1);
  }

  mkdirSync(VOICE_DIR, { recursive: true });

  for (let i = 0; i < SHOWCASE_BEATS.length; i++) {
    const beat = SHOWCASE_BEATS[i];
    const n = String(i + 1).padStart(2, "0");
    const out = join(VOICE_DIR, `beat-${n}.mp3`);
    const buf = await ttsOne(key, beat.narration, voiceId);
    writeFileSync(out, buf);
    console.log(`Wrote ${out} (${buf.length} bytes) [${beat.phase}]`);
    if (i < SHOWCASE_BEATS.length - 1) {
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  console.log(`Done: ${SHOWCASE_BEATS.length} beats in ${VOICE_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
