import { classifyRoute } from "@/lib/agents/router";
import { prisma } from "@/lib/prisma";
import { requireOpenAiKeyResponse } from "@/lib/require-openai";
import type { UIMessage } from "ai";

export const runtime = "nodejs";

/**
 * Lightweight classification endpoint — determines whether a customer message
 * should be handled by the Customer AI or escalated to a human agent.
 *
 * For escalation it also creates/updates the conversation and persists the
 * relevant messages so the agent dashboard picks them up immediately.
 */
export async function POST(req: Request) {
  const missingKey = requireOpenAiKeyResponse();
  if (missingKey) return missingKey;

  const {
    messages,
    conversationId,
    customerEmail,
  }: {
    messages: UIMessage[];
    conversationId?: string;
    customerEmail: string;
  } = await req.json();

  const decision = await classifyRoute(messages);

  if (decision.route !== "escalate") {
    return Response.json({ route: "customer-ai" as const });
  }

  let convId = conversationId;
  if (convId) {
    const exists = await prisma.conversation.findUnique({
      where: { id: convId },
      select: { id: true },
    });
    if (!exists) convId = undefined;
  }

  if (!convId) {
    const conv = await prisma.conversation.create({
      data: {
        customerEmail,
        status: "ESCALATED",
        escalationReason: decision.reason,
      },
    });
    convId = conv.id;
  } else {
    await prisma.conversation.update({
      where: { id: convId },
      data: { status: "ESCALATED", escalationReason: decision.reason },
    });
  }

  const replacedStaleId = conversationId != null && convId !== conversationId;

  const lastUserMsg = messages.filter((m) => m.role === "user").at(-1);
  if (lastUserMsg) {
    const text =
      lastUserMsg.parts
        ?.filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("") ?? "";
    if (text) {
      await prisma.message.create({
        data: {
          conversationId: convId,
          role: "user",
          content: text,
          audience: "CUSTOMER_VISIBLE",
        },
      });
    }
  }

  const escalationMsg =
    "Your request has been escalated to a support specialist. A human agent will follow up shortly.";

  await prisma.message.create({
    data: {
      conversationId: convId,
      role: "assistant",
      content: escalationMsg,
      audience: "CUSTOMER_VISIBLE",
    },
  });

  // Persist earlier messages for a brand-new thread, or after a stale id was replaced with a new row
  if (!conversationId || replacedStaleId) {
    const earlier = messages.slice(0, -1);
    for (const msg of earlier) {
      const text =
        msg.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") ?? "";
      if (!text) continue;
      await prisma.message.create({
        data: {
          conversationId: convId,
          role: msg.role === "user" ? "user" : "assistant",
          content: text,
          audience: "CUSTOMER_VISIBLE",
        },
      });
    }
  }

  return Response.json({
    route: "escalate" as const,
    escalated: true,
    conversationId: convId,
    reason: decision.reason,
    message: escalationMsg,
  });
}
