import { prisma } from "@/lib/prisma";

/**
 * Re-check before writes (tool / onFinish). On serverless SQLite each instance has its own /tmp DB;
 * a row created earlier may not exist here — recreate to avoid P2003 on Message.
 */
export async function getConversationIdOrRecreate(
  preferredId: string,
  customerEmail: string,
  create: { status: string; escalationReason?: string | null }
): Promise<string> {
  const row = await prisma.conversation.findUnique({
    where: { id: preferredId },
    select: { id: true },
  });
  if (row) return preferredId;
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

/**
 * If `conversationId` is missing or not in the DB (stale client id after deploy / DB reset),
 * create a new conversation. Otherwise return the existing id.
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
