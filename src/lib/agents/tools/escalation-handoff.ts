import { z } from "zod";

/** Input schema for `requestEscalation` on `POST /api/chat`. */
export const requestEscalationInputSchema = z.object({
  changeSummary: z
    .string()
    .describe(
      "What the customer wants to accomplish (e.g. upgrade tier, cancel, add seats, dispute a charge)"
    ),
  productsInvolved: z
    .array(z.string())
    .min(1)
    .describe(
      "F5 products or services this applies to (from conversation; align with getAccountInfo when possible). Use a single entry like \"Unclear — customer unsure\" only when truly unknown."
    ),
  contextForAgent: z
    .string()
    .optional()
    .describe(
      "Invoice refs, urgency, billing period, gaps, or anything else useful for the human agent"
    ),
});

export type RequestEscalationInput = z.infer<typeof requestEscalationInputSchema>;

export function buildEscalationReason(input: RequestEscalationInput): string {
  const lines = [
    input.changeSummary.trim(),
    `Products: ${input.productsInvolved.join(", ")}`,
  ];
  if (input.contextForAgent?.trim()) {
    lines.push(`Context: ${input.contextForAgent.trim()}`);
  }
  return lines.join("\n");
}
