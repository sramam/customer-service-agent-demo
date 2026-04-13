import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Customer-visible thread for polling — same rows the agent approves into. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: {
      status: true,
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

  return Response.json({
    status: conv.status,
    escalationReason: conv.escalationReason,
    messages: conv.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
