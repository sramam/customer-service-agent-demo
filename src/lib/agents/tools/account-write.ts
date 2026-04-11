import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const updateAccount = tool({
  description:
    "Update a customer account's plan tier or status. Employee-only — requires human approval.",
  inputSchema: z.object({
    email: z.string().email().describe("Customer email address"),
    planTier: z
      .string()
      .optional()
      .describe("New plan tier (e.g. standard, enterprise)"),
    status: z
      .string()
      .optional()
      .describe("New account status (e.g. active, suspended)"),
  }),
  execute: async ({ email, planTier, status }) => {
    const data: Record<string, string> = {};
    if (planTier) data.planTier = planTier;
    if (status) data.status = status;
    if (Object.keys(data).length === 0)
      return { error: "No fields to update" };

    const account = await prisma.customerAccount.update({
      where: { email },
      data,
    });
    return {
      updated: true,
      email: account.email,
      planTier: account.planTier,
      status: account.status,
    };
  },
});

export const createCreditMemo = tool({
  description:
    "Issue a credit memo against an invoice. Employee-only — requires human approval.",
  inputSchema: z.object({
    invoiceId: z.string().describe("The invoice ID to credit"),
    amountCents: z.number().int().positive().describe("Credit amount in cents"),
    reason: z.string().describe("Reason for the credit"),
  }),
  execute: async ({ invoiceId, amountCents, reason }) => {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });
    if (!invoice) return { error: `Invoice ${invoiceId} not found` };
    return {
      creditApplied: true,
      invoiceNumber: invoice.invoiceNumber,
      creditAmount: `$${(amountCents / 100).toFixed(2)}`,
      reason,
      note: "Credit memo recorded (mock).",
    };
  },
});
