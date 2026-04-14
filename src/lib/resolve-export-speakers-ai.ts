import { z } from "zod";
import { generateObjectPromptWithAnthropicFallback } from "@/lib/generate-object-anthropic-fallback";
import { zodToAiSchema } from "@/lib/zod-to-ai-json-schema";
import {
  AGENT_PERSPECTIVE_SPEAKER_LABELS,
  type AgentPerspectiveSpeaker,
  type CustomerConversationExportPayload,
  type CustomerConversationTranscriptLine,
} from "@/lib/customer-conversation-export";

const resolutionSchema = z.object({
  assistantLabels: z.array(
    z.object({
      messageId: z.string(),
      speaker: z.enum(["customer_ai", "human_agent"]),
    }),
  ),
});

const resolutionObjectSchema = zodToAiSchema(resolutionSchema);

/**
 * LLM pass: relabel **assistant** rows only. Use when rules are ambiguous (odd data, demos, or QA).
 * Requires `OPENAI_API_KEY` and a small model; failures should fall back to rules-only export.
 */
export async function applyAiAssistantSpeakerResolution(
  transcript: CustomerConversationTranscriptLine[],
  context: { escalationReason: string; customerEmail: string; conversationStatus: string },
): Promise<CustomerConversationTranscriptLine[]> {
  const assistants = transcript.filter((l) => l.role === "assistant");
  if (assistants.length === 0) return transcript;

  const modelId = process.env.EXPORT_RESOLVE_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const { object } = await generateObjectPromptWithAnthropicFallback({
    label: "export-resolve-speakers",
    openaiModelId: modelId,
    schema: resolutionObjectSchema,
    prompt: `You assign speaker labels for ASSISTANT messages in a logged support chat (F5 demo).

Hard rules (prefer these over guessing):
1. If a system message contains "Escalated to human agent", then chronologically AFTER that system message:
   - The FIRST assistant message is still the product automated assistant: speaker "customer_ai".
   - Every LATER assistant message is a human agent: speaker "human_agent".
2. Before that escalation system line (or if there is no such line), assistant messages are "customer_ai".
3. If rules conflict with tone, still follow rule 1–2; use judgment only to break ties when timestamps/order are unclear.

Conversation status: ${context.conversationStatus}
Escalation reason (may be empty): ${context.escalationReason || "(none)"}
Customer email: ${context.customerEmail}

Assistant messages in chronological order (label each by id):
${assistants
  .map(
    (a, i) =>
      `${i + 1}. id=${a.id}\n   text: ${a.text.slice(0, 2_000)}${a.text.length > 2_000 ? "…" : ""}`,
  )
  .join("\n\n")}

Return exactly one entry per assistant id listed above.`,
  });

  const byId = new Map(object.assistantLabels.map((x) => [x.messageId, x.speaker]));

  return transcript.map((line) => {
    if (line.role !== "assistant") return line;
    const ai = byId.get(line.id);
    if (!ai) return line;
    const speaker = ai as AgentPerspectiveSpeaker;
    return {
      ...line,
      speaker,
      speakerLabel: AGENT_PERSPECTIVE_SPEAKER_LABELS[speaker],
      resolutionSource: "ai" as const,
    };
  });
}

/**
 * Run the LLM speaker pass on a **full** downloaded export JSON (offline / CI).
 * Requires `OPENAI_API_KEY`. Does not call the Next.js app.
 */
export async function enrichCustomerExportPayloadWithAi(
  payload: CustomerConversationExportPayload,
): Promise<CustomerConversationExportPayload> {
  const transcript = await applyAiAssistantSpeakerResolution(payload.transcript, {
    escalationReason: payload.escalationReason,
    customerEmail: payload.customerEmail,
    conversationStatus: payload.escalated ? "ESCALATED" : "WITH_CUSTOMER_AI",
  });
  return {
    ...payload,
    transcript,
    aiSpeakerResolutionError: undefined,
  };
}
