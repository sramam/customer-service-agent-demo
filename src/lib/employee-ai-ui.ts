/**
 * Client-safe copy only — do not import @/lib/agents/employee from client components
 * (that module pulls server-only doc tooling).
 */
export const EMPLOYEE_AI_SUGGEST_DRAFT_PROMPT =
  "Reply with a **single JSON object** matching the employee response schema (internalNotes, draftCustomerResponse, sources). internalNotes: risks, fresh tool/doc findings, deltas (or \\\"No new internal findings this turn.\\\"). draftCustomerResponse: the **human agent's next message** to the customer when they need a reply — send-ready markdown. **Bias toward concise closure** when the customer just answered the last open question: short acknowledgment + real next step or \\\"Anything else?\\\" — avoid open-ended \\\"I'll proceed…\\\" filler unless blocked on something specific. **Upsell/cross-sell** only when grounded in tools/docs. The draft must **not** defer to \\\"sales will reach out\\\" or \\\"someone will contact you\\\" as the whole reply (the human is already here). Use getAccountInfo + searchPublicDocs for specifics (products, plan, named services/scoping). If the last thread message was generic customer-AI text, **replace** it with a better, concrete reply — do not paraphrase it. If the request is underspecified, ask named clarifiers from docs/account — do not assume completion.";

/** Shown in the Employee AI thread instead of the full kickoff prompt (server still gets the full string). */
export const EMPLOYEE_AI_KICKOFF_LABEL = "Internal notes + draft requested";

export function displayEmployeeAiUserText(raw: string): string {
  if (raw.trim() === EMPLOYEE_AI_SUGGEST_DRAFT_PROMPT.trim()) {
    return EMPLOYEE_AI_KICKOFF_LABEL;
  }
  return raw;
}

/**
 * Last assistant message with non-empty text (skips empty streaming placeholders at the tail).
 * Using `reverse().find(assistant)` alone can pick an empty draft message and hide ReviewControls.
 */
export function getLastNonEmptyAssistantText(
  messages: Array<{
    role: string;
    parts?: Array<{ type: string; text?: string }>;
  }>,
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;
    const t =
      m.parts
        ?.filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("") ?? "";
    if (t.trim().length > 0) return t;
  }
  return "";
}
