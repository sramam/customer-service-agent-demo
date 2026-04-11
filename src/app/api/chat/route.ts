import { streamText, tool, stepCountIs, type UIMessage } from "ai";
import { AI_SDK_MAX_RETRIES } from "@/lib/ai-retry";
import { customerModel, CUSTOMER_SYSTEM } from "@/lib/agents/customer";
import { searchPublicDocs } from "@/lib/agents/tools/public-docs";
import { getAccountInfo, listInvoices } from "@/lib/agents/tools/account-read";
import { prisma } from "@/lib/prisma";
import {
  buildEscalationReason,
  requestEscalationInputSchema,
} from "@/lib/agents/tools/escalation-handoff";

export async function POST(req: Request) {
  const {
    messages,
    conversationId,
    customerEmail,
  }: {
    messages: UIMessage[];
    conversationId?: string;
    customerEmail: string;
  } = await req.json();

  let convId = conversationId;

  if (!convId) {
    const conv = await prisma.conversation.create({
      data: { customerEmail, status: "WITH_CUSTOMER_AI" },
    });
    convId = conv.id;
  }

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

  const finalConvId = convId;

  const requestEscalation = tool({
    description:
      "Escalate to a human agent after customer intent is clear: what they want to change and which products apply. Do not call until you have that clarity (ask questions first). For billing disputes, include invoice/context in contextForAgent.",
    inputSchema: requestEscalationInputSchema,
    execute: async (input) => {
      const reason = buildEscalationReason(input);
      await prisma.conversation.update({
        where: { id: finalConvId },
        data: { status: "ESCALATED", escalationReason: reason },
      });

      await prisma.message.create({
        data: {
          conversationId: finalConvId,
          role: "system",
          content: `Escalated to human agent: ${reason}`,
          audience: "CUSTOMER_VISIBLE",
        },
      });

      return { escalated: true, reason };
    },
  });

  const result = streamText({
    maxRetries: AI_SDK_MAX_RETRIES,
    model: customerModel,
    system: `${CUSTOMER_SYSTEM}\n\nCustomer email: ${customerEmail}\nConversation ID: ${finalConvId}`,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        m.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") ?? "",
    })),
    tools: {
      searchPublicDocs,
      getAccountInfo,
      listInvoices,
      requestEscalation,
    },
    stopWhen: stepCountIs(8),
    onFinish: async ({ text, steps }) => {
      const conv = await prisma.conversation.findUnique({
        where: { id: finalConvId },
      });
      if (conv && conv.status !== "ESCALATED") {
        outer: for (const step of steps ?? []) {
          for (const tr of step.toolResults ?? []) {
            if (tr.toolName !== "requestEscalation") continue;
            const out = tr.output as { escalated?: boolean; reason?: string };
            if (out?.escalated) {
              await prisma.conversation.update({
                where: { id: finalConvId },
                data: {
                  status: "ESCALATED",
                  escalationReason: out.reason ?? "Escalated",
                },
              });
              await prisma.message.create({
                data: {
                  conversationId: finalConvId,
                  role: "system",
                  content: `Escalated to human agent: ${out.reason ?? ""}`,
                  audience: "CUSTOMER_VISIBLE",
                },
              });
            }
            break outer;
          }
        }
      }

      if (text) {
        await prisma.message.create({
          data: {
            conversationId: finalConvId,
            role: "assistant",
            content: text,
            audience: "CUSTOMER_VISIBLE",
          },
        });
      }
    },
  });

  return result.toUIMessageStreamResponse({
    headers: {
      "X-Conversation-Id": finalConvId,
    },
  });
}
