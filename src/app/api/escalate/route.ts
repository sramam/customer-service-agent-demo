import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { conversationId, reason }: { conversationId: string; reason: string } =
    await req.json();

  const conversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: "ESCALATED", escalationReason: reason },
  });

  await prisma.message.create({
    data: {
      conversationId,
      role: "system",
      content:
        "Your request has been escalated to a support specialist. A human agent will follow up shortly.",
      audience: "CUSTOMER_VISIBLE",
    },
  });

  return Response.json({ ok: true, conversationId: conversation.id });
}
