import { prisma } from "@/lib/prisma";
import { DEMO_CLAIM_STALE_MS } from "@/lib/demo-customer-claim";

export const runtime = "nodejs";

/**
 * Playwright / showcase pipeline: skip DB-backed single-session locks so automated runs do not
 * depend on a clean claim row or lose races with `reuseExistingServer` + another tab.
 * Only when NODE_ENV=development and E2E_BYPASS_DEMO_CLAIM=1 (see playwright.config.ts).
 */
function e2eBypassDemoClaim(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.E2E_BYPASS_DEMO_CLAIM === "1"
  );
}

/** Fresh claims only (for picker UI). */
export async function GET() {
  if (e2eBypassDemoClaim()) {
    return Response.json({ claims: [] });
  }
  const staleBefore = new Date(Date.now() - DEMO_CLAIM_STALE_MS);
  const rows = await prisma.demoCustomerClaim.findMany({
    where: { updatedAt: { gte: staleBefore } },
    select: { customerEmail: true, sessionId: true, updatedAt: true },
  });
  return Response.json({ claims: rows });
}

/** Acquire or refresh a claim. Body: `{ customerEmail: string, sessionId: string }` */
export async function PUT(req: Request) {
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

  if (e2eBypassDemoClaim()) {
    return Response.json({ ok: true, bypass: true });
  }

  const staleBefore = new Date(Date.now() - DEMO_CLAIM_STALE_MS);

  const existing = await prisma.demoCustomerClaim.findUnique({
    where: { customerEmail: email },
  });

  if (!existing) {
    await prisma.demoCustomerClaim.create({
      data: { customerEmail: email, sessionId },
    });
    return Response.json({ ok: true });
  }

  if (existing.sessionId === sessionId) {
    await prisma.demoCustomerClaim.update({
      where: { customerEmail: email },
      data: { sessionId },
    });
    return Response.json({ ok: true });
  }

  if (existing.updatedAt < staleBefore) {
    await prisma.demoCustomerClaim.update({
      where: { customerEmail: email },
      data: { sessionId },
    });
    return Response.json({ ok: true, tookOverStale: true });
  }

  return Response.json(
    { error: "locked", message: "This demo profile is in use in another session." },
    { status: 409 },
  );
}
