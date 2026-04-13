import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import {
  notifyPartyConversationMessage,
  notifyPartyEscalationsRefresh,
} from "@/lib/partykit-notify";

const MESSAGE_FK_MAX_ATTEMPTS = 8;
const MESSAGE_FK_BASE_DELAY_MS = 40;

function isForeignKeyViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2003"
  );
}

/**
 * Persist a message with retries on P2003 (FK violation). Neon serverless + pooler
 * can briefly lag so the Conversation row isn't visible to the FK check right
 * after it was created — retries cover that window.
 */
export async function createMessageWithFkRetry(
  data: Prisma.MessageUncheckedCreateInput,
) {
  let last: unknown;
  for (let attempt = 0; attempt < MESSAGE_FK_MAX_ATTEMPTS; attempt++) {
    try {
      const row = await prisma.message.create({ data });
      if (row.audience === "CUSTOMER_VISIBLE") {
        notifyPartyConversationMessage(row.conversationId, {
          messageId: row.id,
        });
        notifyPartyEscalationsRefresh();
      }
      return row;
    } catch (e) {
      last = e;
      if (isForeignKeyViolation(e) && attempt < MESSAGE_FK_MAX_ATTEMPTS - 1) {
        await new Promise((r) =>
          setTimeout(r, MESSAGE_FK_BASE_DELAY_MS * (attempt + 1)),
        );
        continue;
      }
      throw e;
    }
  }
  throw last;
}

/** Wait until the conversation row is readable (mitigates replica / pooler lag). */
export async function waitForConversationVisible(
  conversationId: string,
): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    const row = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });
    if (row) return true;
    await new Promise((r) => setTimeout(r, 35 * (i + 1)));
  }
  return false;
}
