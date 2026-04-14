import { prisma } from "@/lib/prisma";
import {
  buildCanonicalAgentExportFromDb,
  type CustomerConversationExportPayload,
  type CustomerConversationServerRow,
} from "@/lib/customer-conversation-export";
import { applyAiAssistantSpeakerResolution } from "@/lib/resolve-export-speakers-ai";

export const runtime = "nodejs";

/**
 * Canonical **agent-framed** conversation JSON for automation (Playwright, scripts, Remotion).
 *
 * - **GET** — DB source of truth (no client/UI id drift). Stable for `page.request.get()`.
 * - Query **`email`** — optional; when set, must match `conversation.customerEmail` (demo guard).
 * - Query **`resolveWithAi=true`** — optional LLM pass on **assistant** rows only (`transcript[].resolutionSource` = `ai`).
 *
 * @example
 * GET /api/conversations/{id}/agent-export?email=david@startuplab.dev
 * GET /api/conversations/{id}/agent-export?resolveWithAi=true
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;
  const url = new URL(req.url);
  const email = url.searchParams.get("email");
  const resolveWithAi =
    url.searchParams.get("resolveWithAi") === "1" ||
    url.searchParams.get("resolveWithAi") === "true";

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      id: true,
      status: true,
      customerEmail: true,
      escalationReason: true,
      messages: {
        where: { audience: "CUSTOMER_VISIBLE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conv) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (email && email !== conv.customerEmail) {
    return Response.json({ error: "email does not match conversation" }, { status: 403 });
  }

  const serverMessages: CustomerConversationServerRow[] = conv.messages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  let payload: CustomerConversationExportPayload = buildCanonicalAgentExportFromDb({
    conversationId: conv.id,
    customerEmail: conv.customerEmail,
    status: conv.status,
    escalationReason: conv.escalationReason,
    serverMessages,
  });

  if (resolveWithAi) {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      payload = {
        ...payload,
        aiSpeakerResolutionError:
          "resolveWithAi was requested but OPENAI_API_KEY is not set; transcript uses rules only.",
      };
    } else {
      try {
        const transcript = await applyAiAssistantSpeakerResolution(payload.transcript, {
          escalationReason: conv.escalationReason ?? "",
          customerEmail: conv.customerEmail,
          conversationStatus: conv.status,
        });
        payload = { ...payload, transcript };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        payload = {
          ...payload,
          aiSpeakerResolutionError: msg,
        };
      }
    }
  }

  return Response.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
