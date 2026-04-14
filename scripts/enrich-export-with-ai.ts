/**
 * Offline AI pass on a downloaded F5 conversation export (JSON).
 *
 * Usage:
 *   pnpm export:enrich-ai ./f5-customer-conversation-xxx.json
 *   pnpm export:enrich-ai ./export.json --out ./export.enriched.json
 *
 * Requires OPENAI_API_KEY (and optional EXPORT_RESOLVE_MODEL / OPENAI_MODEL).
 * Does not start Next.js — calls the same LLM logic as GET .../agent-export?resolveWithAi=true.
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "fs";
import type { CustomerConversationExportPayload } from "@/lib/customer-conversation-export";
import { enrichCustomerExportPayloadWithAi } from "@/lib/resolve-export-speakers-ai";

function parseArgs() {
  const argv = process.argv.slice(2);
  let outPath: string | undefined;
  const files: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) {
      outPath = argv[i + 1];
      i++;
      continue;
    }
    if (!argv[i].startsWith("-")) files.push(argv[i]);
  }
  return { inPath: files[0], outPath };
}

async function main() {
  const { inPath, outPath } = parseArgs();
  if (!inPath) {
    console.error(
      "Usage: pnpm export:enrich-ai <export.json> [--out <path.enriched.json>]",
    );
    process.exit(1);
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("OPENAI_API_KEY is required.");
    process.exit(1);
  }

  const raw = readFileSync(inPath, "utf-8");
  const parsed = JSON.parse(raw) as CustomerConversationExportPayload;
  if (!parsed.transcript || !Array.isArray(parsed.transcript)) {
    console.error("Invalid export: missing transcript[]");
    process.exit(1);
  }

  const enriched = await enrichCustomerExportPayloadWithAi(parsed);
  const dest = outPath ?? inPath.replace(/\.json$/i, ".enriched.json");
  writeFileSync(dest, JSON.stringify(enriched, null, 2), "utf-8");
  console.log(`Wrote ${dest}`);
  const aiLines = enriched.transcript.filter((l) => l.resolutionSource === "ai");
  console.log(`Assistant lines relabeled with AI: ${aiLines.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
