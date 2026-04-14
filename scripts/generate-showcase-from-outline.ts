/**
 * Reads a freeform outline (.md / .txt), uses OpenAI to produce:
 * - `replay/.generated/outline-showcase.yaml` — valid ShowcaseReplayScript
 * - `replay/.generated/voice-narrations.json` — per-phase narration for ElevenLabs (same 9 beats as demo-timeline)
 *
 * Uses a **flat** Zod schema (no discriminated unions / oneOf), **`zod-to-json-schema`** with
 * `target: "openAi"` via `zodToAiSchema`, then maps to `ShowcaseReplayScript` and validates with Zod.
 *
 *   pnpm exec tsx scripts/generate-showcase-from-outline.ts ./replay/my-outline.md
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { z } from "zod";
import {
  DEMO_TIMELINE_PHASES,
  PHASE_PLAYWRIGHT_HINT,
  type DemoTimelinePhaseId,
} from "../remotion/src/demo-timeline";
import { generateObjectPromptWithAnthropicFallback } from "../src/lib/generate-object-anthropic-fallback";
import {
  showcaseReplayScriptSchema,
  type ShowcaseReplayScript,
} from "../src/lib/showcase-replay-script";
import { zodToAiSchema } from "../src/lib/zod-to-ai-json-schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const OUT_DIR = join(root, "replay/.generated");

/** Drop lines that are only comments (leading whitespace + \`#\`), e.g. preamble in outline .txt files. */
function stripHashCommentLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n")
    .trim();
}

/** LLMs often emit `null` for omitted JSON fields; Zod `.optional()` only allows `undefined`. */
function nullToUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === null ? undefined : v), schema);
}

/** Flat shape — no oneOf / email() — for provider JSON-schema constraints. */
const outlineShowcaseLlmSchema = z.object({
  version: z.literal(1),
  /** Include @ — validated later with full ShowcaseReplayScript schema. */
  customerEmail: z.string(),
  expectEscalation: z.boolean(),
  escalationReason: z.string(),
  guidance: z.object({
    successSummary: z.string(),
    preEscalationGuidance: z.string(),
    keyFacts: z.array(z.string()),
    employeeAiGuidance: z.string(),
    postAgentCustomerGuidance: z.string(),
    fallbackFirstCustomerMessage: z.string(),
    fallbackPostCustomerMessage: z.string(),
  }),
  employeeAiPrompt: nullToUndefined(z.string().optional()),
  preEscalationMode: z.enum(["scripted", "vision", "fallback_heuristic"]),
  /** Set when preEscalationMode is scripted (at least one line). */
  preEscalationMessages: nullToUndefined(z.array(z.string()).optional()),
  postAgentMode: z.enum(["none", "scripted", "vision"]),
  postAgentMessages: nullToUndefined(z.array(z.string()).optional()),
});

const narrationsSchema = z.object(
  Object.fromEntries(
    DEMO_TIMELINE_PHASES.map((phase) => [
      phase,
      z
        .string()
        .min(1)
        .describe(`Spoken narration for beat "${phase}". Plain sentences for TTS.`),
    ]),
  ) as Record<DemoTimelinePhaseId, z.ZodString>,
);

const outlineGenerationSchema = z.object({
  showcase: outlineShowcaseLlmSchema,
  narrations: narrationsSchema,
});

const outlineGenerationObjectSchema = zodToAiSchema(outlineGenerationSchema);

function flatShowcaseToScript(
  flat: z.infer<typeof outlineShowcaseLlmSchema>,
): ShowcaseReplayScript {
  let preEscalation: ShowcaseReplayScript["preEscalation"];
  if (flat.preEscalationMode === "scripted") {
    const messages =
      flat.preEscalationMessages && flat.preEscalationMessages.length > 0
        ? flat.preEscalationMessages
        : [
            "I have a question about NGINX One capabilities.",
            "Can you show my recent invoices?",
            "I need to change my plan—please connect me with billing.",
          ];
    preEscalation = { mode: "scripted", messages };
  } else if (flat.preEscalationMode === "vision") {
    preEscalation = { mode: "vision" };
  } else {
    preEscalation = { mode: "fallback_heuristic" };
  }

  let postAgent: ShowcaseReplayScript["postAgent"];
  if (flat.postAgentMode === "none") {
    postAgent = { mode: "none" };
  } else if (flat.postAgentMode === "scripted") {
    postAgent = {
      mode: "scripted",
      messages: flat.postAgentMessages ?? [],
    };
  } else {
    postAgent = { mode: "vision" };
  }

  return showcaseReplayScriptSchema.parse({
    version: 1,
    customerEmail: flat.customerEmail.trim(),
    expectEscalation: flat.expectEscalation,
    escalationReason: flat.escalationReason,
    guidance: flat.guidance,
    employeeAiPrompt: flat.employeeAiPrompt,
    preEscalation,
    postAgent,
  });
}

async function main() {
  const outlinePath = process.argv[2];
  if (!outlinePath?.trim()) {
    console.error(
      "Usage: pnpm exec tsx scripts/generate-showcase-from-outline.ts <outline.md|txt>",
    );
    process.exit(1);
  }

  const abs = resolve(root, outlinePath);
  const outlineText = stripHashCommentLines(readFileSync(abs, "utf-8"));
  if (!outlineText.trim()) {
    console.error("Outline file is empty.");
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("OPENAI_API_KEY is required to generate a showcase from an outline.");
    process.exit(1);
  }

  const modelId =
    process.env.SHOWCASE_OUTLINE_MODEL ??
    process.env.OPENAI_MODEL ??
    "gpt-4o-mini";

  const phaseHints = DEMO_TIMELINE_PHASES.map(
    (p) => `- **${p}**: ${PHASE_PLAYWRIGHT_HINT[p]}`,
  ).join("\n");

  const { object } = await generateObjectPromptWithAnthropicFallback({
    label: "showcase-from-outline",
    openaiModelId: modelId,
    schema: outlineGenerationObjectSchema,
    prompt: `You are preparing an automated marketing demo for an F5-style customer support product.

The user wrote a **freeform outline** (bullets, optional \`[voice-over]\` labels, customer name like "david"). Convert it into structured data.

**Director notes** (e.g. \`[voice-over + agent UI scroll]\`, nested bullets about split UI or scrolling) are **human guidance** for the Playwright recording and for tuning \`videoAnchorSec\` in \`remotion/src/demo-timeline.ts\`. They do not control the browser from this JSON. Fold their substance into **narrations** (spoken copy per phase) and **guidance** / scripted messages as appropriate.

## Outline to implement
"""
${outlineText.slice(0, 24_000)}
"""

## Customer identity
- If the outline names **david** (or "David") as the demo customer, use email **david@startuplab.dev** (seed data).
- Otherwise infer a plausible customer email consistent with the outline.

## Part 1 — showcase (Playwright)
Fill **showcase** using the flat fields below (no nested oneOf — follow exactly):
- **guidance**: All string fields. Reflect public docs + account data customers can only read, invoices, upgrade → escalation, agent workspace, wrap-up.
- **preEscalationMode**: Prefer \`scripted\` with **preEscalationMessages**: concrete customer lines (two technical questions, invoices, upgrade path to escalation).
- **postAgentMode** / **postAgentMessages**: After the **human agent’s reply**, the customer speaks **once** in the scripted path: put **2–4 short sentences** in **one** postAgentMessages entry (or join into one string), as separate YAML strings are merged into a **single** customer message so the thread **alternates** customer ↔ agent (no consecutive customer bubbles).
- **expectEscalation**: true unless the outline clearly avoids escalation.
- **escalationReason**: Short internal-style reason for human handoff.
- **employeeAiPrompt**: Optional override for Employee AI; otherwise rely on guidance.employeeAiGuidance.

## Part 2 — narrations (exactly 9 strings)
Map **[voice-over]** ideas onto these **fixed video beats**:

${phaseHints}

- Cover every phase; split voice-over bullets across beats logically.
- **closingCta**: Thank the viewer and invite them to try the demo below.
- Keep each narration suitable for ~8–20 seconds of speech.`,
  });

  mkdirSync(OUT_DIR, { recursive: true });

  const yamlPath = join(OUT_DIR, "outline-showcase.yaml");
  const jsonPath = join(OUT_DIR, "voice-narrations.json");

  const showcase = flatShowcaseToScript(object.showcase);

  writeFileSync(yamlPath, stringify(showcase, { lineWidth: 100 }));
  writeFileSync(jsonPath, `${JSON.stringify(object.narrations, null, 2)}\n`);

  console.log(`Wrote ${yamlPath}`);
  console.log(`Wrote ${jsonPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
