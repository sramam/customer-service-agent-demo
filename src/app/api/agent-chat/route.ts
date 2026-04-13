import { streamText, stepCountIs, type ModelMessage, type UIMessage } from "ai";
import {
  AI_AGENT_STREAM_MAX_RETRIES,
  CLIENT_STREAM_AUTO_RETRY_MAX,
} from "@/lib/ai-retry";
import {
  employeeModel,
  employeeTools,
  EMPLOYEE_SYSTEM,
} from "@/lib/agents/employee";
import { buildEmployeeModelMessages } from "@/lib/build-employee-model-messages";
import { createMessageWithFkRetry } from "@/lib/message-persist";
import { prisma } from "@/lib/prisma";
import { requireOpenAiKeyResponse } from "@/lib/require-openai";

export const runtime = "nodejs";

const LOG_PROMPT_MAX_CHARS = 12_000;

function truncateForLog(s: string): string {
  if (s.length <= LOG_PROMPT_MAX_CHARS) return s;
  return `${s.slice(0, LOG_PROMPT_MAX_CHARS)}… [truncated ${s.length - LOG_PROMPT_MAX_CHARS} chars]`;
}

/** Logs system + model messages when the client marks this POST as the last auto-retry (see useChatStreamAutoRetry). */
function logEmployeeAiModelInputIfFinalClientRetry(
  conversationId: string,
  streamRetryAttempt: number | undefined,
  streamRetryMax: number | undefined,
  system: string,
  messages: ModelMessage[],
) {
  if (streamRetryAttempt == null || streamRetryMax == null) return;
  if (streamRetryMax !== CLIENT_STREAM_AUTO_RETRY_MAX) return;
  if (streamRetryAttempt !== streamRetryMax) return;
  if (process.env.LOG_EMPLOYEE_AI_PROMPT === "false") return;

  console.warn("[agent-chat] model input (final client auto-retry)", {
    conversationId,
    streamRetryAttempt,
    streamRetryMax,
    systemLength: system.length,
    system: truncateForLog(system),
    messageCount: messages.length,
    messages: messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === "string"
          ? truncateForLog(m.content)
          : truncateForLog(JSON.stringify(m.content)),
    })),
  });
}

export async function POST(req: Request) {
  const missingKey = requireOpenAiKeyResponse();
  if (missingKey) return missingKey;

  const {
    messages,
    conversationId,
    streamRetryAttempt,
    streamRetryMax,
  }: {
    messages: UIMessage[];
    conversationId: string;
    streamRetryAttempt?: number;
    streamRetryMax?: number;
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
        await createMessageWithFkRetry({
          conversationId,
          role: "employee",
          content: lastEmployeeText,
          audience: "INTERNAL_ONLY",
        });
      }
    }
  }

  const conversationReloaded = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversationReloaded) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), {
      status: 404,
    });
  }

  const modelMessages = buildEmployeeModelMessages(conversationReloaded.messages);

  const systemPrompt = [
    EMPLOYEE_SYSTEM,
    "",
    customerContext,
    "",
    `Escalation reason: ${conversationReloaded.escalationReason ?? "N/A"}`,
    `Conversation ID: ${conversationId}`,
    "",
    "The messages array is the full thread (customer-visible and internal); respond to the latest turn.",
  ].join("\n");

  logEmployeeAiModelInputIfFinalClientRetry(
    conversationId,
    streamRetryAttempt,
    streamRetryMax,
    systemPrompt,
    modelMessages,
  );

  const result = streamText({
    maxRetries: AI_AGENT_STREAM_MAX_RETRIES,
    model: employeeModel,
    system: systemPrompt,
    messages: modelMessages,
    tools: employeeTools,
    stopWhen: stepCountIs(8),
    onFinish: async ({ text }) => {
      if (text) {
        await createMessageWithFkRetry({
          conversationId,
          role: "employee-ai",
          content: text,
          audience: "INTERNAL_ONLY",
        });
      }
    },
  });

  return result.toUIMessageStreamResponse();
}
