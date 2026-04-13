import { createMessageWithFkRetry } from "@/lib/message-persist";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const { content }: { content: string } = await req.json();

  await createMessageWithFkRetry({
    conversationId,
    role: "assistant",
    content,
    audience: "CUSTOMER_VISIBLE",
  });

  return Response.json({ ok: true });
}
