import { prisma } from "@/lib/prisma";

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    where: { status: { in: ["ESCALATED", "RESOLVED"] } },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const customerEmails = [...new Set(conversations.map((c) => c.customerEmail))];
  const accounts = await prisma.customerAccount.findMany({
    where: { email: { in: customerEmails } },
    include: { invoices: { orderBy: { issuedAt: "desc" } } },
  });
  const accountMap = new Map(accounts.map((a) => [a.email, a]));

  const enriched = conversations.map((conv) => {
    const account = accountMap.get(conv.customerEmail);
    return {
      ...conv,
      customer: account
        ? {
            name: account.name,
            company: account.company,
            email: account.email,
            products: account.products,
            status: account.status,
            planTier: account.planTier,
            supportTier: account.supportTier,
            createdAt: account.createdAt.toISOString(),
            invoiceCount: account.invoices.length,
            latestInvoice: account.invoices[0]
              ? {
                  invoiceNumber: account.invoices[0].invoiceNumber,
                  amount: `$${(account.invoices[0].amountCents / 100).toFixed(2)}`,
                  period: `${account.invoices[0].periodStart.toISOString().slice(0, 10)} to ${account.invoices[0].periodEnd.toISOString().slice(0, 10)}`,
                }
              : null,
          }
        : null,
    };
  });

  return Response.json(enriched);
}
