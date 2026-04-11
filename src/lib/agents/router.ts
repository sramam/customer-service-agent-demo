import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { UIMessage } from "ai";
import { AI_OUTER_ATTEMPTS, withAiAttempts } from "@/lib/ai-retry";

export type RouteDecision =
  | { route: "customer-ai" }
  | { route: "escalate"; reason: string };

const SYSTEM = `You are a routing classifier for F5 Networks customer support.

Your ONLY job is to read the customer's latest message (in context of the conversation) and output a JSON routing decision. Do NOT generate any customer-facing text.

Rules:
- If the question is about product features, documentation, how-tos, account status, or invoice downloads → route to customer-ai.
- If the question involves account modifications (plan changes, cancellations, credits), billing disputes, or anything the self-service agent cannot answer → route to escalate, with a reason.
- When in doubt, route to customer-ai first — it can escalate later.

Respond ONLY with valid JSON in one of these forms:
  {"route":"customer-ai"}
  {"route":"escalate","reason":"<brief reason>"}`;

export async function classifyRoute(
  messages: UIMessage[]
): Promise<RouteDecision> {
  return withAiAttempts(async () => {
    const { text } = await generateText({
      // Outer `withAiAttempts` handles repetition; keep inner calls single-shot
      maxRetries: 0,
      model: openai("gpt-4o-mini"),
      system: SYSTEM,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content:
          m.parts
            ?.filter((p) => p.type === "text")
            .map((p) => p.text)
            .join("") ?? "",
      })),
    });

    try {
      const parsed = JSON.parse(text.trim());
      if (parsed.route === "escalate" && typeof parsed.reason === "string") {
        return { route: "escalate", reason: parsed.reason };
      }
      return { route: "customer-ai" };
    } catch {
      return { route: "customer-ai" };
    }
  }, AI_OUTER_ATTEMPTS);
}
