/**
 * One step: conversation export JSON → optional AI enrich → Remotion MP4.
 *
 * Usage (repo root):
 *   pnpm replay:video ./replay/david-replay1.json
 *   pnpm replay:video ./export.json --enrich
 *   pnpm replay:video ./export.json --enrich --save-enriched ./replay/out.enriched.json
 *   pnpm replay:video ./export.json --enrich --dwell 5 --out ./remotion-out/my.mp4
 *
 * Showcase one-liner (AI enrich + `*.enriched.json` beside input + MP4 in remotion-out/):
 *   pnpm showcase:replay replay/david-replay1.json
 *
 * Requires: `pnpm install` in `remotion/`. For `--enrich` / `--showcase`, set OPENAI_API_KEY.
 *
 * This path renders the **ConversationExportVideo** composition (transcript cards from JSON) —
 * it does **not** run Playwright or open the app. For a screen recording of the live UI, use
 * `pnpm showcase` / `pnpm showcase:full` / `pnpm demo:e2e`.
 */
import "dotenv/config";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CustomerConversationExportPayload } from "@/lib/customer-conversation-export";
import { enrichCustomerExportPayloadWithAi } from "@/lib/resolve-export-speakers-ai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function parseArgs(argv: string[]) {
  const out: {
    input?: string;
    showcase: boolean;
    enrich: boolean;
    dwell: number;
    outMp4?: string;
    saveEnriched?: string;
    verboseRemotion: boolean;
  } = { showcase: false, enrich: false, dwell: 4, verboseRemotion: false };
  const files: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--verbose-remotion" || a === "--remotion-verbose") {
      out.verboseRemotion = true;
      continue;
    }
    if (a === "--showcase") {
      out.showcase = true;
      continue;
    }
    if (a === "--enrich") {
      out.enrich = true;
      continue;
    }
    if (a === "--dwell" && argv[i + 1]) {
      out.dwell = Number(argv[i + 1]);
      i++;
      continue;
    }
    if (a === "--out" && argv[i + 1]) {
      out.outMp4 = argv[i + 1];
      i++;
      continue;
    }
    if (a === "--save-enriched" && argv[i + 1]) {
      out.saveEnriched = argv[i + 1];
      i++;
      continue;
    }
    if (!a.startsWith("-")) files.push(a);
  }
  out.input = files[0];
  return out;
}

function toRemotionProps(payload: CustomerConversationExportPayload) {
  const transcript = (payload.transcript ?? [])
    .filter((l) => l.text.trim().length > 0)
    .map((l) => ({
      id: l.id,
      speakerLabel: l.speakerLabel,
      text: l.text,
      offsetMsFromStart: l.offsetMsFromStart,
    }));
  return { transcript, dwellSeconds: 4 };
}

async function main() {
  let {
    input,
    showcase,
    enrich,
    dwell,
    outMp4,
    saveEnriched,
    verboseRemotion,
  } = parseArgs(process.argv.slice(2));
  if (!input) {
    console.error(
      "Usage: pnpm replay:video <export.json> [--enrich] [--save-enriched path.json] [--dwell 4] [--out path.mp4] [--verbose-remotion]",
    );
    console.error(
      "       pnpm showcase:replay <export.json>   # enrich + *.enriched.json + remotion-out/<stem>-replay.mp4",
    );
    process.exit(1);
  }

  const inPath = resolve(root, input);

  console.log(
    "Replay export → Remotion (transcript cards only; not a Playwright run).",
  );

  if (showcase) {
    enrich = true;
    const stem = basename(inPath, ".json");
    if (!saveEnriched) {
      saveEnriched = join(dirname(inPath), `${stem}.enriched.json`);
    }
    if (!outMp4) {
      outMp4 = join("remotion-out", `${stem}-replay.mp4`);
    }
  }

  let payload = JSON.parse(
    readFileSync(inPath, "utf-8"),
  ) as CustomerConversationExportPayload;

  if (enrich) {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      console.error("OPENAI_API_KEY is required for --enrich / showcase replay");
      process.exit(1);
    }
    console.log("Enriching with AI (assistant speakers)…");
    payload = await enrichCustomerExportPayloadWithAi(payload);
  }

  if (saveEnriched) {
    const p = resolve(root, saveEnriched);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(payload, null, 2), "utf-8");
    console.log("Saved enriched JSON:", p);
  }

  const props = toRemotionProps(payload);
  props.dwellSeconds = dwell;

  if (props.transcript.length === 0) {
    console.error("No transcript lines with text — nothing to render.");
    process.exit(1);
  }

  const propsPath = join(root, "replay", ".remotion-props.json");
  mkdirSync(dirname(propsPath), { recursive: true });
  writeFileSync(propsPath, JSON.stringify(props, null, 2), "utf-8");

  const outPath = resolve(root, outMp4 ?? join("remotion-out", "from-export.mp4"));
  mkdirSync(dirname(outPath), { recursive: true });

  const propsRelFromRemotion = join("..", "replay", ".remotion-props.json");

  const quietFlags = verboseRemotion ? "" : " --quiet --log=error";
  console.log(
    `Rendering ${props.transcript.length} transcript beats → ${outPath}${verboseRemotion ? " (verbose Remotion logs)" : ""}`,
  );

  execSync(
    `pnpm exec remotion render src/index.tsx ConversationExportVideo "${outPath}" --props="${propsRelFromRemotion}"${quietFlags}`,
    {
      cwd: join(root, "remotion"),
      stdio: "inherit",
      env: { ...process.env },
    },
  );

  console.log("Done:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
