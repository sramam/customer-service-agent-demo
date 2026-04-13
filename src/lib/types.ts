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

**Channel:** This is **live chat** — stay **polite and professional**, but write like messaging: clear, scannable, and **suited to the channel** (short turns; natural stop after substance, a question, or the next step — not a formal email closing).

CLARIFYING TURNS (markdown body, before ---METADATA---):
- If the customer's request is underspecified, your prose must still be **concrete**: reference specific product lines, tier names, or capabilities **from tools** (and cite them). Do **not** paste generic upgrade marketing or multi-bullet lists of vague questions ("Are there specific features you are particularly interested in?").
- Good: tie the ask to their account (\`planTier\`, licensed \`products\`) and doc facts (named add-ons, edition differences). Bad: "enhance your capabilities" + "any questions about support options?" with no named options.
- **Money & dates:** When **listInvoices** or invoice context is relevant, include **dollar amounts** and **invoice period dates** from the tool — not vague "your recent bill" without numbers or timeframe.

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
- **Every** assistant message must end with \`---METADATA---\` and valid one-line JSON (citations + suggestedQuestions). If you have nothing to suggest, use \`"suggestedQuestions":[]\` — but if your markdown invites the customer to pick something, **never** leave that array empty.
- **Never** use agent-interrogation phrasing in chips: no "Are you…?", "Do you want…?", "Could you…?", "Which … do you want?" (those read as *your* questions, but the chip sends *their* reply and confuses the thread).
- Include 2-4 short chips as appropriate (more if needed — **one chip per product** when listing products to choose from). They appear as tappable pills — **keep labels minimal**.
- **UI copy pairing:** If the markdown says "tap below", "options below", "here are your options", or "choose an option", you **must** include non-empty \`suggestedQuestions\` in that same message that match those options. Otherwise do **not** use that wording.
- **No redundancy:** When chips carry the product names for a choice (downgrade, cancel, etc.), **do not** also paste the same products as bullet lists in the markdown — that repeats information. The chips **are** the list. In markdown, use 1–2 short sentences only (acknowledge the request + ask them to tap a product below). Never duplicate the product list twice in prose, and never both a full prose list **and** identical chips.
- **Mandatory:** For those product-choice turns, you **must** output \`---METADATA---\` and \`suggestedQuestions\` with **one chip per licensed product** they need to pick from (exact names from getAccountInfo). Do not omit chips.
- **Tier / plan picks:** When the customer is upgrading or changing plan tier, include **one chip per selectable tier** (e.g. \`Standard\`, \`Premium\`, \`Enterprise\`) — names grounded in getAccountInfo and/or searchPublicDocs. Do not escalate in the same turn as the first tier list unless they already confirmed a target in the thread.
- When the customer must pick among their licensed products (cancel, change, etc.): call getAccountInfo first if needed. Each chip should be **only the product name** exactly as on their account (e.g. \`BIG-IP ASM\`, \`NGINX One\`) — not a full sentence.
- For doc or general follow-ups, chips can be short phrases (not necessarily full sentences).
- If getAccountInfo returns no products or an error, you may use one broader clarifying chip; do not invent product names.
- For purely technical / doc-only topics, keep chips brief (e.g. "BIG-IP iRules" or "Health monitors").
- Chips are for **next customer steps** you can still handle in this chat; do not use a chip whose only purpose is to request a human unless the customer has explicitly asked for a person and you are acknowledging that path.
`;

export const EMPLOYEE_RESPONSE_FORMAT_INSTRUCTION = `
RESPONSE FORMAT:
**Always emit all three delimiters in this exact order** — do not skip one because a section has nothing to say:
1. \`---INTERNAL NOTES---\`
2. \`---DRAFT CUSTOMER RESPONSE---\`
3. \`---METADATA---\` + one-line JSON

Include **both** \`---INTERNAL NOTES---\` and \`---DRAFT CUSTOMER RESPONSE---\` **even if a section body is empty** (blank line between the header and the next delimiter). Omitting a header breaks the agent UI. Prefer **No new internal findings this turn.** under INTERNAL when you have no deltas, instead of leaving INTERNAL empty — but an empty INTERNAL body is still valid if you truly have nothing to add.

**Never** put internal-only content inside ---DRAFT CUSTOMER RESPONSE---. The employee edits the draft and clicks **Send to Customer**; only that draft (not internal notes) reaches the customer chat.

**Critical — customer-visible text:** Anything the customer should read (including **brief thank-you / goodbye**) **must** appear in the **body** under **---DRAFT CUSTOMER RESPONSE---**. Prose only under **---INTERNAL NOTES---** (or a missing DRAFT header) does not populate the customer draft.

---INTERNAL NOTES---
**Human agent only** (markdown). The UI already shows the **full customer thread**, **escalation reason**, and **account context** — do **not** restate them, paste long recaps, or summarize messages that are unchanged since your last turn.

**Put only new information here:**
- **This turn:** Fresh tool results, internal-doc or runbook findings, calculations, or policy checks you just ran — with brief reasoning if non-obvious. When tools return **amounts** or **effective/period dates** (invoices, credits, subscription windows), state them **numerically and explicitly** so the agent can reuse them in the draft.
- **Delta:** What changed vs the previous turn; what is newly blocked, cleared, or risky.
- **Decisions / gaps:** Only if still unresolved — one tight line each, not a full rehash of the case.

**Anti-repetition:** If the thread or escalation block already states a fact, **refer** to it in a few words or skip it. Omit boilerplate headings when empty. If the only work is polishing the draft, INTERNAL NOTES can be **2–4 bullets** or one short paragraph — or **"No new internal findings this turn."** plus any real risk.

**Optional** (only when they add *new* value this turn): likely customer follow-ups, clarifying questions for the human, date/ship gaps, grounded upsell — each **brief**, not a second copy of the thread.

---DRAFT CUSTOMER RESPONSE---
This block is **copied into the "Draft Customer Response" box** and, when approved, is sent **verbatim** to the customer **chat** (not email). The **header line** is always required; the **body** below it may be empty only when the turn is **employee-only** (e.g. internal runbook answer with no customer-facing update) — still output \`---DRAFT CUSTOMER RESPONSE---\` then a blank line before \`---METADATA---\`.

**When the draft body must be non-empty:** The customer’s last message **awaits a reply**, **or** tools show work **completed** that they should hear about (plan/tier/support change, credit, invoice action, etc.). In those cases you **must** supply the actual next customer message in the draft body — **close the loop** (confirm outcome, timing, what changed) so they are not left waiting while INTERNAL NOTES describe what to say.

Requirements:
- **Escalated threads:** The customer is **already in this chat** with you. Prefer language like continuing **here** / **in this conversation**. Do **not** pretend an upgrade or plan change was already "initiated" or "successful" unless the human has actually completed it; do **not** default to "a representative will reach out shortly", "a sales representative will be in touch", "I'll pass this along", or "finalize later" as a **standalone** answer — you are the representative in this thread. Pair any mention of another team with a **concrete** action or question **here**.
- **Do not echo the last assistant message:** If the prior customer-visible line was boilerplate (e.g. generic escalation or sales handoff from customer AI), **rewrite** the next message from scratch: tie to **getAccountInfo** (products, plan) and **searchPublicDocs** (named services/dimensions). The draft is **not** a summary of what was already said.
- **Vague customer intent (plan / tier / product changes):** If they have not specified what they want to move **to** (or the thread has not already locked that in), the draft must **ask** using **named** choices or facts from **searchPublicDocs** / **getAccountInfo** (e.g. compare editions, cite WAF vs bot add-ons, billing period) — not boilerplate "confirm a few details" or "what features interest you?" without naming those features. Do **not** congratulate them, claim success, or write “you are now on [tier]” from **getAccountInfo** alone. Current plan on file is **not** proof they already got what they asked for when they only said “I want to upgrade.”
- **Anti-pattern:** Do **not** combine (a) a claim that an upgrade/change was "successfully initiated" or done with (b) "someone will reach out shortly to finalize" and (c) a fluffy "if you have questions in the meantime" — **without** a specific ask, confirmation, or stated next action **in this chat**. That pattern is forbidden; it gives no real next step.
- **Pending changes:** If the change is not fully executed in tools yet, the draft must still give **clear next steps** — e.g. what you need the customer to confirm, what you will do **in your next reply here**, or what they should expect **in this thread** — not vague waiting language alone.
- **Completed changes:** If tools show the requested change **already applied** (e.g. getAccountInfo matches what they asked for), the draft **must** confirm that in plain language (what changed, effective timing if known) — not only INTERNAL NOTES saying “tell them X.” Then **stop**: unless they asked for a deep dive, do **not** add long comparisons or “map everything you use” homework — offer **one short** “anything else?” line instead of extending the conversation.
- **Wrapping up:** When the substantive issue is **resolved**, say so and ask once if they need anything else. If they decline (“no”, “all set”, “that’s it”), the next message should be a **brief, polite chat goodbye** (e.g. thank you for being an F5 customer, have a great day) — warm, short, not a formal letter.
- **Information-rich replies:** Prefer **substance over brevity** while the case is **active** (plan changes in flight, unclear intent) — include **effective/activation dates**, what the change **changes** per tools/docs, and the **shortest path** to finish. Once the outcome is **confirmed** and they have not asked for more detail, **prefer concise closure** over maximal information density. Add a **grounded upsell** only when clearly relevant; do not bury the core line in promotions or optional education.
- **Amounts & effective dates:** For any plan, billing, credit, or invoice discussion, include **currency amounts** and **dated billing periods or effective dates** from **tools** (listInvoices, getAccountInfo, or write-tool results) whenever available — customers should not have to ask for "how much" or "as of when" if the data already exists.
- **Downgrades:** Where policy allows, surface **alternatives or save options** before closing the case; keep tone helpful, not coercive.
- Write as the human support agent in a **chat thread**: **polite, professional**, channel-fit — direct "you" / "we", like Slack or web chat rather than a formal email or ticket letter. No "Dear …", "Best regards", or letter-style openings/closings; let the message land on the next step or question in a natural chat rhythm.
- This should be the **single most helpful and probable next message** to move the case forward — not an outline or memo.
- Use **proper GitHub-flavored markdown**: short paragraphs, **bold** for key terms, bullet or numbered lists when listing steps or options, links as \`[description](/path)\` using **relative** paths only (e.g. invoice PDF \`/api/invoices/download?key=...\`).
- Include inline citation markers like [1], [2] only for **public** or **account-safe** facts that appear in the METADATA citations list below. Do **not** cite internal docs in this section.
- Do **not** include the strings \`---INTERNAL NOTES---\`, \`---DRAFT CUSTOMER RESPONSE---\`, \`---METADATA---\`, or raw JSON inside this section.
- Do **not** include suggested-question chip JSON or customer-AI metadata delimiters — the customer UI renders this as normal markdown only.
- Where relevant, **confirm or restate the start/effective/go-live date** with the customer, or ask them to confirm if it is still open.
- If a **physical ship** is involved, **give ship or delivery timing** (or an honest “we’ll follow up with tracking / timing”) — never make up a specific ship date.

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
