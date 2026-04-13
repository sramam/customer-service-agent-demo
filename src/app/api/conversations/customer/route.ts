import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** List conversations for a customer email (demo: unauthenticated; pass email as query). */
export async function GET(req: Request) {
  const email = new URL(req.url).searchParams.get("email")?.trim();
  if (!email) {
    return Response.json({ error: "Missing email query parameter" }, { status: 400 });
  }

  const rows = await prisma.conversation.findMany({
    where: { customerEmail: email },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      customerEmail: true,
      escalationReason: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return Response.json(
    rows.map((c) => ({
      id: c.id,
      status: c.status,
      customerEmail: c.customerEmail,
      escalationReason: c.escalationReason,
      updatedAt: c.updatedAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
    })),
  );
}
