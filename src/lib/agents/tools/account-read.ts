import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const getAccountInfo = tool({
  description:
    "Look up a customer account by email. Returns name, company, licensed products, status, plan tier, and support tier.",
  inputSchema: z.object({
    email: z.string().email().describe("Customer email address"),
  }),
  execute: async ({ email }) => {
    const account = await prisma.customerAccount.findUnique({
      where: { email },
    });
    if (!account) return { error: `No account found for ${email}` };
    return {
      name: account.name,
      company: account.company,
      email: account.email,
      products: account.products,
      status: account.status,
      planTier: account.planTier,
      supportTier: account.supportTier,
      createdAt: account.createdAt.toISOString(),
    };
  },
});

export const listInvoices = tool({
  description:
    "List invoices for a customer by email. Returns invoice numbers, amounts, periods, and download keys.",
  inputSchema: z.object({
    email: z.string().email().describe("Customer email address"),
  }),
  execute: async ({ email }) => {
    const account = await prisma.customerAccount.findUnique({
      where: { email },
      include: { invoices: { orderBy: { issuedAt: "desc" } } },
    });
    if (!account) return { error: `No account found for ${email}` };
    return account.invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      amount: `$${(inv.amountCents / 100).toFixed(2)} ${inv.currency}`,
      period: `${inv.periodStart.toISOString().slice(0, 10)} to ${inv.periodEnd.toISOString().slice(0, 10)}`,
      issuedAt: inv.issuedAt.toISOString().slice(0, 10),
      pdfKey: inv.pdfKey,
      downloadUrl: `/api/invoices/download?key=${encodeURIComponent(inv.pdfKey)}`,
    }));
  },
});
