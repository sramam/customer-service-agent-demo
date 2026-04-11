import { streamText, stepCountIs, type UIMessage } from "ai";
import { AI_AGENT_STREAM_MAX_RETRIES } from "@/lib/ai-retry";
import {
  employeeModel,
  employeeTools,
  EMPLOYEE_SYSTEM,
} from "@/lib/agents/employee";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const {
    messages,
    conversationId,
  }: {
    messages: UIMessage[];
    conversationId: string;
  } = await req.json();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), {
      status: 404,
    });
  }

  const account = await prisma.customerAccount.findUnique({
    where: { email: conversation.customerEmail },
    include: { invoices: { orderBy: { issuedAt: "desc" } } },
  });

  const customerContext = account
    ? [
        `CUSTOMER PROFILE:`,
        `  Name: ${account.name}`,
        `  Company: ${account.company}`,
        `  Email: ${account.email}`,
        `  Account status: ${account.status}`,
        `  Plan: ${account.planTier} | Support: ${account.supportTier}`,
        `  Licensed products: ${account.products}`,
        `  Total invoices: ${account.invoices.length}`,
        account.invoices[0]
          ? `  Latest invoice: ${account.invoices[0].invoiceNumber} — $${(account.invoices[0].amountCents / 100).toFixed(2)} (${account.invoices[0].periodStart.toISOString().slice(0, 10)} to ${account.invoices[0].periodEnd.toISOString().slice(0, 10)})`
          : "",
        `  Account since: ${account.createdAt.toISOString().slice(0, 10)}`,
      ]
        .filter(Boolean)
        .join("\n")
    : `CUSTOMER PROFILE:\n  Email: ${conversation.customerEmail}\n  (No account record found)`;

  const priorMessages = conversation.messages
    .filter((m) => m.audience === "CUSTOMER_VISIBLE")
    .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
    .join("\n");

  const conversationContext = priorMessages
    ? `\nCONVERSATION HISTORY (customer-visible messages before escalation):\n${priorMessages}`
    : "";

  const lastEmployeeMsg = messages.filter((m) => m.role === "user").at(-1);
  let lastEmployeeText = "";
  if (lastEmployeeMsg) {
    lastEmployeeText =
      lastEmployeeMsg.parts
        ?.filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("") ?? "";
    if (lastEmployeeText) {
      const duplicate = await prisma.message.findFirst({
        where: {
          conversationId,
          role: "employee",
          audience: "INTERNAL_ONLY",
          content: lastEmployeeText,
        },
      });
      if (!duplicate) {
        await prisma.message.create({
          data: {
            conversationId,
            role: "employee",
            content: lastEmployeeText,
            audience: "INTERNAL_ONLY",
          },
        });
      }
    }
  }

  const systemPrompt = [
    EMPLOYEE_SYSTEM,
    "",
    customerContext,
    "",
    `Escalation reason: ${conversation.escalationReason ?? "N/A"}`,
    `Conversation ID: ${conversationId}`,
    conversationContext,
  ].join("\n");

  const result = streamText({
    maxRetries: AI_AGENT_STREAM_MAX_RETRIES,
    model: employeeModel,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        m.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") ?? "",
    })),
    tools: employeeTools,
    stopWhen: stepCountIs(8),
    onFinish: async ({ text }) => {
      if (text) {
        await prisma.message.create({
          data: {
            conversationId,
            role: "employee-ai",
            content: text,
            audience: "INTERNAL_ONLY",
          },
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
