import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  type UIMessage,
} from "ai";
import {
  AI_RESPONSE_SCHEMA_MAX_ATTEMPTS,
  AI_SDK_MAX_RETRIES,
} from "@/lib/ai-retry";
import { customerModel, CUSTOMER_SYSTEM } from "@/lib/agents/customer";
import { createCustomerRequestEscalationTool } from "@/lib/agents/tools/customer-request-escalation";
import {
  listPublicProductDocs,
  searchPublicDocs,
} from "@/lib/agents/tools/public-docs";
import { getAccountInfo, listInvoices } from "@/lib/agents/tools/account-read";
import { ensureCustomerConversation } from "@/lib/ensure-conversation";
import {
  createMessageWithFkRetry,
  waitForConversationVisible,
} from "@/lib/message-persist";
import { prisma } from "@/lib/prisma";
import { requireOpenAiKeyResponse } from "@/lib/require-openai";
import {
  validateCustomerAssistantText,
  formatCustomerSchemaRetryUserMessage,
} from "@/lib/validate-ai-response";
import { createSyntheticAssistantTextStream } from "@/lib/synthetic-assistant-ui-stream";
import { CUSTOMER_SCHEMA_FALLBACK_ASSISTANT_TEXT } from "@/lib/schema-fallback-messages";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const missingKey = requireOpenAiKeyResponse();
  if (missingKey) return missingKey;

  let body: {
    messages: UIMessage[];
    conversationId?: string;
    customerEmail: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { messages, conversationId, customerEmail } = body;

  try {
    const activeConversationId = await ensureCustomerConversation(
      conversationId,
      customerEmail,
      { status: "WITH_CUSTOMER_AI" }
    );

    const lastUserMsg = messages.filter((m) => m.role === "user").at(-1);
    if (lastUserMsg) {
      const text =
        lastUserMsg.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") ?? "";
      if (text) {
        await createMessageWithFkRetry({
          conversationId: activeConversationId,
          role: "user",
          content: text,
          audience: "CUSTOMER_VISIBLE",
        });
      }
    }

    const convAfterUser = await prisma.conversation.findUnique({
      where: { id: activeConversationId },
      select: { status: true },
    });
    /** Human-handled thread: persist user message only; do not run customer AI. */
    if (convAfterUser?.status === "ESCALATED") {
      const stream = createUIMessageStream({
        execute({ writer }) {
          writer.write({ type: "finish", finishReason: "stop" });
        },
      });
      return createUIMessageStreamResponse({
        stream,
        headers: { "X-Conversation-Id": activeConversationId },
      });
    }

    const baseModelMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        m.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") ?? "",
    }));

    const schemaFailures: { text: string; errors: string[] }[] = [];
    let validated = false;
    let finalText = "";

    for (let attempt = 1; attempt <= AI_RESPONSE_SCHEMA_MAX_ATTEMPTS; attempt++) {
      const extra: Array<{ role: "user" | "assistant"; content: string }> = [];
      for (const f of schemaFailures) {
        extra.push({ role: "assistant", content: f.text });
        extra.push({
          role: "user",
          content: formatCustomerSchemaRetryUserMessage(f.errors),
        });
      }

      const result = streamText({
        maxRetries: AI_SDK_MAX_RETRIES,
        model: customerModel,
        system: `${CUSTOMER_SYSTEM}\n\nCustomer email: ${customerEmail}\nConversation ID: ${activeConversationId}`,
        messages: [...baseModelMessages, ...extra],
        tools: {
          listPublicProductDocs,
          searchPublicDocs,
          getAccountInfo,
          listInvoices,
          requestEscalation: createCustomerRequestEscalationTool(
            activeConversationId,
          ),
        },
        stopWhen: stepCountIs(8),
      });

      const text = await result.text;

      const v = validateCustomerAssistantText(text);
      if (v.ok) {
        validated = true;
        finalText = JSON.stringify(v.data);
        break;
      }
      schemaFailures.push({ text, errors: v.errors });
    }

    if (!validated) {
      finalText = CUSTOMER_SCHEMA_FALLBACK_ASSISTANT_TEXT;
    }

    await waitForConversationVisible(activeConversationId);
    await createMessageWithFkRetry({
      conversationId: activeConversationId,
      role: "assistant",
      content: finalText,
      audience: "CUSTOMER_VISIBLE",
    });

    const outStream = createSyntheticAssistantTextStream(finalText, messages);

    return createUIMessageStreamResponse({
      stream: outStream,
      headers: {
        "X-Conversation-Id": activeConversationId,
      },
    });
  } catch (e) {
    console.error("[api/chat]", e);
    const msg = e instanceof Error ? e.message : "Internal server error";
    return Response.json(
      {
        error: msg,
        hint:
          process.env.VERCEL === "1"
            ? "Check DATABASE_URL (Neon) and that prisma migrate deploy ran on deploy."
            : undefined,
      },
      { status: 500 }
    );
  }
}
