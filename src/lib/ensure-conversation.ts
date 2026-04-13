import { prisma } from "@/lib/prisma";

/**
 * If `conversationId` is missing or not in the DB (stale client id after reset),
 * create a new conversation. Otherwise return the existing id.
 *
 * Call **only** from customer-facing APIs (e.g. `POST /api/chat`). Agents must not
 * create conversations; they open existing threads for a customer.
 */
export async function ensureCustomerConversation(
  conversationId: string | undefined,
  customerEmail: string,
  create: { status: string; escalationReason?: string | null }
): Promise<string> {
  if (conversationId) {
    const row = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (row) return conversationId;
  }

  const conv = await prisma.conversation.create({
    data: {
      customerEmail,
      status: create.status,
      ...(create.escalationReason != null
        ? { escalationReason: create.escalationReason }
        : {}),
    },
  });
  return conv.id;
}
