import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { showcaseReplayGuidanceSchema } from "@/lib/showcase-replay-guidance";

/**
 * Declarative showcase replay (YAML or Markdown with YAML front matter).
 * Run via `pnpm showcase:replay-live replay/my-showcase.yaml`.
 */
export const showcaseReplayScriptSchema = z
  .object({
    version: z.literal(1),
    customerEmail: z.string().email(),
    expectEscalation: z.boolean().default(true),
    /** Shown to the vision model as ground truth for escalation intent. */
    escalationReason: z.string().default(""),
    /** Same shape as AI-derived guidance from JSON exports. */
    guidance: showcaseReplayGuidanceSchema,
    /** Overrides `guidance.employeeAiGuidance` when set. */
    employeeAiPrompt: z.string().optional(),
    preEscalation: z.discriminatedUnion("mode", [
      z.object({
        mode: z.literal("scripted"),
        messages: z.array(z.string()).min(1),
      }),
      z.object({
        mode: z.literal("vision"),
      }),
      /**
       * Like export replay with `F5_REPLAY_USE_VISION=0`: optional `guidance.fallbackFirstCustomerMessage`
       * then product chip + generic escalate line (when `expectEscalation`).
       */
      z.object({
        mode: z.literal("fallback_heuristic"),
      }),
    ]),
    postAgent: z
      .discriminatedUnion("mode", [
        z.object({ mode: z.literal("none") }),
        z.object({
          mode: z.literal("scripted"),
          /** Lines are merged into one customer message so the thread alternates customer ↔ agent. */
          messages: z.array(z.string()),
        }),
        z.object({
          mode: z.literal("vision"),
        }),
      ])
      .default({ mode: "none" }),
  })
  .superRefine((data, ctx) => {
    const emp =
      data.employeeAiPrompt?.trim() || data.guidance.employeeAiGuidance.trim();
    if (data.expectEscalation && !emp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "When expectEscalation is true, set guidance.employeeAiGuidance or employeeAiPrompt.",
        path: ["guidance", "employeeAiGuidance"],
      });
    }
  });

export type ShowcaseReplayScript = z.infer<typeof showcaseReplayScriptSchema>;

export function loadShowcaseReplayScriptFile(absPath: string): ShowcaseReplayScript {
  const raw = readFileSync(absPath, "utf-8");
  let yamlText = raw;
  const lower = absPath.toLowerCase();
  if (lower.endsWith(".md")) {
    const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\s*([\s\S]*)$/);
    if (!m) {
      throw new Error(
        "Showcase script (.md): file must begin with YAML front matter between --- lines.",
      );
    }
    yamlText = m[1]!;
  }
  const data = parseYaml(yamlText) as unknown;
  return showcaseReplayScriptSchema.parse(data);
}
