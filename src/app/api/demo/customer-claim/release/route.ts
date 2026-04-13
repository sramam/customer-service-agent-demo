import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** Release a claim. Body: `{ customerEmail: string, sessionId: string }` (supports sendBeacon POST). */
export async function POST(req: Request) {
  let body: { customerEmail?: string; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = body.customerEmail?.trim().toLowerCase();
  const sessionId = body.sessionId?.trim();
  if (!email || !sessionId) {
    return Response.json(
      { error: "customerEmail and sessionId required" },
      { status: 400 },
    );
  }

  const row = await prisma.demoCustomerClaim.findUnique({
    where: { customerEmail: email },
  });
  if (row?.sessionId === sessionId) {
    await prisma.demoCustomerClaim.delete({ where: { customerEmail: email } });
  }
  return Response.json({ ok: true });
}
