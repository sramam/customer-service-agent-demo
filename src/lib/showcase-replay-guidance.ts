import { z } from "zod";
import { generateObjectPromptWithAnthropicFallback } from "@/lib/generate-object-anthropic-fallback";
import { zodToAiSchema } from "@/lib/zod-to-ai-json-schema";
import type { CustomerConversationExportPayload } from "@/lib/customer-conversation-export";

/**
 * Export JSON → **guidance** for AI-driven replay (not a verbatim script). Playwright + vision
 * use this + `.env` keys to steer the live app toward the desired outcome.
 */
export const showcaseReplayGuidanceSchema = z.object({
  /** What “success” means for this replay end-to-end (1–3 sentences). */
  successSummary: z.string(),
  /**
   * Narrative for the **public chat** phase: what the customer is trying to accomplish (docs,
   * account data they can only read, then subscription/billing change requiring a human). Do **not** list messages to type.
   */
  preEscalationGuidance: z.string(),
  /** Short bullets the driver can lean on (products, plan names, constraints). */
  keyFacts: z.array(z.string()),
  /**
   * When `escalated`: what Employee AI should achieve (internal notes + draft). Empty when not escalated.
   */
  employeeAiGuidance: z.string(),
  /**
   * After the human/agent reply is visible: what tone/content the customer should reach (thanks,
   * confirmation). Empty if nothing further. Not an ordered script.
   */
  postAgentCustomerGuidance: z.string(),
  /**
   * If Playwright cannot use vision (`F5_REPLAY_USE_VISION=0`): one reasonable **first** customer
   * line to open the thread toward the goal.
   */
  fallbackFirstCustomerMessage: z.string(),
  /**
   * If vision is off after the agent sends: one optional closing customer line; use "" if none.
   */
  fallbackPostCustomerMessage: z.string(),
});

export type ShowcaseReplayGuidance = z.infer<typeof showcaseReplayGuidanceSchema>;

const showcaseReplayGuidanceObjectSchema = zodToAiSchema(showcaseReplayGuidanceSchema);

function compactTranscriptForPrompt(payload: CustomerConversationExportPayload): string {
  const lines = payload.transcript ?? [];
  const maxLines = 64;
  const slice = lines.length > maxLines ? lines.slice(-maxLines) : lines;
  return slice
    .map((l, i) => {
      const t = l.text.replace(/\s+/g, " ").trim();
      const short = t.length > 900 ? `${t.slice(0, 900)}…` : t;
      return `${i + 1}. ${l.speaker}: ${short}`;
    })
    .join("\n");
}

/**
 * Build **guidance** from a downloaded export. Requires `OPENAI_API_KEY`.
 * Optional `SHOWCASE_REPLAY_MODEL` (default `gpt-4o-mini`).
 */
export async function buildShowcaseReplayGuidanceFromExport(
  payload: CustomerConversationExportPayload,
): Promise<ShowcaseReplayGuidance> {
  const modelId = process.env.SHOWCASE_REPLAY_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const escalated = payload.escalated === true;
  const summary = compactTranscriptForPrompt(payload);

  const { object } = await generateObjectPromptWithAnthropicFallback({
    label: "showcase-replay-guidance",
    openaiModelId: modelId,
    schema: showcaseReplayGuidanceObjectSchema,
    prompt: `You summarize an exported F5 support chat into **guidance** for an automated replay.

The automation will use **screenshot + vision** (and API keys from .env) to drive the real /customer UI — it does **not** follow a fixed list of customer messages. Your job is to describe **intent and outcomes**, not a script.

Export metadata:
- customerEmail: ${payload.customerEmail}
- escalated: ${escalated}
- escalationReason: ${(payload.escalationReason || "").slice(0, 2000)}

Transcript (assistant bodies may be JSON — infer intent only):
${summary}

Fill fields:
1. **successSummary**: What a successful replay demonstrates (customer self-serve → escalation → agent workspace → optional wrap-up).
2. **preEscalationGuidance**: What the customer is exploring and what business outcome leads to **human escalation** (subscription/plan/billing). No dialogue lines — narrative only.
3. **keyFacts**: 3–8 short bullets (products, current plan, target plan, company name, etc.).
4. **employeeAiGuidance**: ${escalated ? "Non-empty. What Employee AI should produce: internal notes referencing runbooks + a draft customer reply aligned with escalation reason. Not a copy-paste of internal secrets." : "Empty string \"\"."}
5. **postAgentCustomerGuidance**: ${escalated ? "What the customer should naturally do after the agent’s reply (e.g. confirm, thank). Empty string if the export ends at agent send." : "Empty string \"\"."}
6. **fallbackFirstCustomerMessage**: One plausible **opening** customer line if vision is disabled — moves toward keyFacts and preEscalationGuidance (short).
7. **fallbackPostCustomerMessage**: ${escalated ? "One short closing customer line if vision is disabled after agent reply; \"\" if postAgentCustomerGuidance is empty." : "\"\""}`,
  });

  if (escalated && !object.employeeAiGuidance.trim()) {
    throw new Error(
      "showcase replay: export is escalated but employeeAiGuidance was empty",
    );
  }

  if (!escalated) {
    return {
      successSummary: object.successSummary,
      preEscalationGuidance: object.preEscalationGuidance,
      keyFacts: object.keyFacts,
      employeeAiGuidance: "",
      postAgentCustomerGuidance: "",
      fallbackFirstCustomerMessage: object.fallbackFirstCustomerMessage.trim(),
      fallbackPostCustomerMessage: "",
    };
  }

  return {
    successSummary: object.successSummary,
    preEscalationGuidance: object.preEscalationGuidance,
    keyFacts: object.keyFacts,
    employeeAiGuidance: object.employeeAiGuidance.trim(),
    postAgentCustomerGuidance: object.postAgentCustomerGuidance.trim(),
    fallbackFirstCustomerMessage: object.fallbackFirstCustomerMessage.trim(),
    fallbackPostCustomerMessage: object.fallbackPostCustomerMessage.trim(),
  };
}
