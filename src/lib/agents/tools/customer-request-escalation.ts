import { tool } from "ai";
import { createMessageWithFkRetry } from "@/lib/message-persist";
import { prisma } from "@/lib/prisma";
import {
  buildEscalationReason,
  requestEscalationInputSchema,
} from "./escalation-handoff";

/**
 * Customer `/api/chat` only — persists escalation + system line when the model
 * invokes the tool.
 */
export function createCustomerRequestEscalationTool(conversationId: string) {
  return tool({
    description:
      "Escalate to a human agent. Use when the customer needs account changes you cannot perform (plan up/down, credits, cancellations), billing disputes, contract-sensitive work, an explicit human, or when intent is clear and only a human can execute. Prefer getAccountInfo + clarifying questions when the message is vague; call this once intent and products are clear.",
    inputSchema: requestEscalationInputSchema,
    execute: async (input) => {
      const reason = buildEscalationReason(input);
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { status: true },
      });
      if (!conv) {
        return { ok: false as const, error: "Conversation not found" };
      }
      if (conv.status === "ESCALATED") {
        return { ok: true as const, alreadyEscalated: true as const, reason };
      }
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { status: "ESCALATED", escalationReason: reason },
      });
      await createMessageWithFkRetry({
        conversationId,
        role: "system",
        content: `Escalated to human agent:\n${reason}`,
        audience: "CUSTOMER_VISIBLE",
      });
      return { ok: true as const, reason };
    },
  });
}
