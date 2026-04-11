import { z } from "zod";

// ---------------------------------------------------------------------------
// Citation — used by both customer and employee agents
// ---------------------------------------------------------------------------

export const CitationSchema = z.object({
  label: z.string().describe("Short label shown inline, e.g. [1]"),
  source: z
    .enum(["public-doc", "internal-doc", "account-data", "invoice"])
    .describe("Category of the source"),
  title: z.string().describe("Human-readable source title"),
  excerpt: z.string().describe("Relevant excerpt or summary from the source"),
  url: z
    .string()
    .optional()
    .describe("Download or reference URL, if applicable"),
  docFile: z
    .string()
    .optional()
    .describe(
      "Filename of the source document (e.g. 'big-ip-overview.md'). Required for public-doc and internal-doc citations."
    ),
});

export type Citation = z.infer<typeof CitationSchema>;

// ---------------------------------------------------------------------------
// Customer Agent response
// ---------------------------------------------------------------------------

export const CustomerAgentResponseSchema = z.object({
  text: z
    .string()
    .describe(
      "The response text with inline citation markers like [1], [2] etc."
    ),
  citations: z
    .array(CitationSchema)
    .describe("Ordered list of citations referenced in the text"),
  suggestedQuestions: z
    .array(z.string())
    .max(3)
    .describe(
      "2-3 follow-up questions the customer is most likely to ask next, based on the current conversation context. Short, natural phrasing."
    ),
});

export type CustomerAgentResponse = z.infer<typeof CustomerAgentResponseSchema>;

// ---------------------------------------------------------------------------
// Employee Agent response
// ---------------------------------------------------------------------------

export const EmployeeAgentResponseSchema = z.object({
  internalNotes: z
    .string()
    .describe(
      "Supporting information for the human agent: doc excerpts, account data, reasoning. NEVER shown to the customer."
    ),
  draftCustomerResponse: z
    .string()
    .describe(
      "Customer-safe message the human can review, edit, and send. Must not contain internal system names, ticket IDs, or raw internal doc text."
    ),
  citations: z
    .array(CitationSchema)
    .describe(
      "Ordered list of citations. Citations from internal docs are for the agent only."
    ),
});

export type EmployeeAgentResponse = z.infer<typeof EmployeeAgentResponseSchema>;

// ---------------------------------------------------------------------------
// API request / response shapes
// ---------------------------------------------------------------------------

export const ChatRequestSchema = z.object({
  conversationId: z.string().optional(),
  customerEmail: z.string().email(),
});

export const EscalationResponseSchema = z.object({
  escalated: z.literal(true),
  conversationId: z.string(),
  reason: z.string(),
  message: z.string(),
});

export type EscalationResponse = z.infer<typeof EscalationResponseSchema>;

export const ApproveRequestSchema = z.object({
  content: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Stored message shape (from DB, used in employee dashboard)
// ---------------------------------------------------------------------------

export const StoredMessageSchema = z.object({
  id: z.string(),
  role: z.string(),
  content: z.string(),
  audience: z.enum(["CUSTOMER_VISIBLE", "INTERNAL_ONLY"]),
  createdAt: z.string(),
});

export type StoredMessage = z.infer<typeof StoredMessageSchema>;

export const CustomerInfoSchema = z.object({
  name: z.string(),
  company: z.string(),
  email: z.string(),
  products: z.string(),
  status: z.string(),
  planTier: z.string(),
  supportTier: z.string(),
  createdAt: z.string(),
  invoiceCount: z.number(),
  latestInvoice: z
    .object({
      invoiceNumber: z.string(),
      amount: z.string(),
      period: z.string(),
    })
    .nullable(),
});

export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

export const ConversationSummarySchema = z.object({
  id: z.string(),
  customerEmail: z.string(),
  status: z.string(),
  escalationReason: z.string().nullable(),
  updatedAt: z.string(),
  messages: z.array(StoredMessageSchema),
  customer: CustomerInfoSchema.nullable().optional(),
});

export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

// ---------------------------------------------------------------------------
// Helpers for response format instructions (embedded in system prompts)
// ---------------------------------------------------------------------------

export const CUSTOMER_RESPONSE_FORMAT_INSTRUCTION = `
RESPONSE FORMAT:
Your response has TWO parts separated by a ---METADATA--- delimiter:

1. FIRST: Write your response as plain markdown. Use inline citation markers like [1], [2] where appropriate. Do NOT wrap it in JSON or code fences.

2. THEN: Write the delimiter on its own line:
---METADATA---

3. AFTER the delimiter: Write a single-line JSON object with citations and suggested next **customer** lines:
{"citations":[{"label":"[1]","source":"public-doc","title":"...","excerpt":"...","docFile":"big-ip-overview.md"}],"suggestedQuestions":["line 1","line 2"]}

**Critical — \`suggestedQuestions\` are sent as the customer's message when tapped.** Each string must read as something **the customer** would type (first person, a short intent label, or a product name) — **never** as a question **you the agent** would ask them. Wrong: "Are you looking to upgrade?", "Do you want to downgrade?", "Which product do you want to change?" Right: "Upgrade", "Downgrade", "BIG-IP LTM", "I want to cancel NGINX One", "Tell me about iRules".

EXAMPLE:
BIG-IP LTM provides load balancing and traffic steering for applications [1].

---METADATA---
{"citations":[{"label":"[1]","source":"public-doc","title":"BIG-IP Overview","excerpt":"LTM handles load balancing and traffic steering","docFile":"big-ip-overview.md"}],"suggestedQuestions":["What are iRules?","How does health monitoring work?"]}

CITATION RULES:
- Every factual claim must have a citation marker in the text.
- Use [1], [2], etc. as inline markers.
- Do NOT create multiple citations for the same source document. Reuse the same label.
- For public-doc citations, the "docFile" field MUST be the exact filename returned by the search tool (e.g. "big-ip-overview.md"). NEVER invent or guess filenames.
- For invoices, include the download URL as "/api/invoices/download?key=<pdfKey>".
- Only cite sources you actually looked up via tools. NEVER fabricate citations.
- If no citations are needed (e.g. a greeting), use an empty citations array.

SUGGESTED QUESTIONS RULES (customer voice — see critical note above):
- **Never** use agent-interrogation phrasing in chips: no "Are you…?", "Do you want…?", "Could you…?", "Which … do you want?" (those read as *your* questions, but the chip sends *their* reply and confuses the thread).
- Include 2-4 short chips as appropriate (more if needed — **one chip per product** when listing products to choose from). They appear as tappable pills — **keep labels minimal**.
- **No redundancy:** When chips carry the product names for a choice (downgrade, cancel, etc.), **do not** also paste the same products as bullet lists in the markdown — that repeats information. The chips **are** the list. In markdown, use 1–2 short sentences only (acknowledge the request + ask them to tap a product below). Never duplicate the product list twice in prose, and never both a full prose list **and** identical chips.
- **Mandatory:** For those product-choice turns, you **must** output \`---METADATA---\` and \`suggestedQuestions\` with **one chip per licensed product** they need to pick from (exact names from getAccountInfo). Do not omit chips.
- When the customer must pick among their licensed products (cancel, change, etc.): call getAccountInfo first if needed. Each chip should be **only the product name** exactly as on their account (e.g. \`BIG-IP ASM\`, \`NGINX One\`) — not a full sentence.
- For doc or general follow-ups, chips can be short phrases (not necessarily full sentences).
- If getAccountInfo returns no products or an error, you may use one broader clarifying chip; do not invent product names.
- For purely technical / doc-only topics, keep chips brief (e.g. "BIG-IP iRules" or "Health monitors").
- Do not suggest chips that would require escalation unless there's nothing else relevant.
`;

export const EMPLOYEE_RESPONSE_FORMAT_INSTRUCTION = `
RESPONSE FORMAT:
Use the three sections below whenever you produce structured output. **Never** put internal-only content inside ---DRAFT CUSTOMER RESPONSE---. The employee edits the draft and clicks **Send to Customer**; only that draft (not internal notes) reaches the customer chat.

---INTERNAL NOTES---
Dense context for the **human agent only** (markdown). Use headings; be thorough — they may only read this before replying. Internal search results, runbook excerpts, and reasoning belong **here only**.

### Escalation & handoff
Summarize \`Escalation reason\` and what is still unknown. Quote key phrases if helpful.

### Thread snapshot
Brief chronology: what the customer said, what was already answered, open loops.

### Customer intent & products
Goals, affected products/SKUs, urgency, emotional tone if relevant.

### Facts (tools)
Concrete data you pulled: account fields, invoice lines, doc findings — with reasoning.

### Gaps / risks / compliance
What is ambiguous, what could go wrong, policy sensitivities.

### Probable next customer moves
1–3 likely replies or questions they may send next (helps the human mentally rehearse).

### Clarifying questions (if needed)
2–5 bullets the human could ask the customer, or "None — intent is sufficient".

### Upsell / cross-sell
Brief, factual; "None identified." if none. Never invent pricing.

### Suggested agent stance
One short paragraph: recommended tone and priority action.

---DRAFT CUSTOMER RESPONSE---
This block is **copied into the "Draft Customer Response" box** and, when approved, is sent **verbatim** to the customer chat. It must be **complete, polished, and send-ready**. If this turn is only answering the employee’s question with **no** new message for the customer, **omit this entire section** (do not paste internal analysis here).

Requirements:
- Write as the human support agent speaking **to the customer** (first person plural or direct "you"). This should be the **single most helpful and probable next message** to move the case forward — not an outline.
- Use **proper GitHub-flavored markdown**: short paragraphs, **bold** for key terms, bullet or numbered lists when listing steps or options, links as \`[description](/path)\` using **relative** paths only (e.g. invoice PDF \`/api/invoices/download?key=...\`).
- Include inline citation markers like [1], [2] only for **public** or **account-safe** facts that appear in the METADATA citations list below. Do **not** cite internal docs in this section.
- Do **not** include the strings \`---INTERNAL NOTES---\`, \`---DRAFT CUSTOMER RESPONSE---\`, \`---METADATA---\`, or raw JSON inside this section.
- Do **not** include suggested-question chip JSON or customer-AI metadata delimiters — the customer UI renders this as normal markdown only.

---METADATA---
{"citations":[{"label":"[1]","source":"public-doc","title":"...","excerpt":"...","docFile":"big-ip-overview.md"}]}

CITATION RULES:
- Every factual claim in INTERNAL NOTES and DRAFT that uses a citation marker must have a matching entry in the JSON.
- Do NOT create multiple citations for the same source document. Reuse the same label.
- For public-doc citations, the "docFile" field MUST be the exact filename returned by the search tool. NEVER invent or guess filenames.
- **internal-doc** citations: only for material cited in INTERNAL NOTES; never cite internal docs in the DRAFT. METADATA may list **both** internal-doc rows (for INTERNAL NOTES footnotes) and public-doc / account-data / invoice rows (for the DRAFT). The DRAFT body must only use citation markers that point to customer-safe sources.
- NEVER fabricate citations for documents you did not search for and find.
- For invoices in DRAFT, use citation markers and include "/api/invoices/download?key=<pdfKey>" in the citation url field where applicable.
- The DRAFT may reference public-doc and account-data citations only.
`;
