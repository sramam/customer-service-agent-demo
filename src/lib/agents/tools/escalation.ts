import { tool } from "ai";
import { z } from "zod";

export const requestEscalation = tool({
  description:
    "Escalate the conversation to a human agent. Use when the customer needs account changes, disputes a charge, or asks something you cannot answer from public docs.",
  inputSchema: z.object({
    reason: z
      .string()
      .describe(
        "Clear explanation of why this conversation needs human attention"
      ),
  }),
  execute: async ({ reason }) => {
    return { escalated: true, reason };
  },
});
