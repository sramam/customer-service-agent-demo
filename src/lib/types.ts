import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ---------------------------------------------------------------------------
// Source — doc / invoice / account entry listed in the `sources` array (both agents)
// ---------------------------------------------------------------------------

export const SourceSchema = z.object({
  label: z
    .string()
    .describe(
      "Optional legacy id (often empty). Do not use for inline markers — references appear in order below the message, not as [n] in the markdown body."
    ),
  source: z
    .enum(["public-doc", "internal-doc", "account-data", "invoice"])
    .describe("Category of the source"),
  title: z.string().describe("Human-readable source title; plain text (not markdown)"),
  excerpt: z.string().describe("Relevant excerpt or summary; plain text (not markdown)"),
  url: z
    .string()
    .optional()
    .describe("Download or reference URL string, if applicable (plain text, not markdown)"),
  docFile: z
    .string()
    .optional()
    .describe(
      "Plain-text filename of the source document (e.g. 'big-ip-overview.md'); not markdown. Required for public-doc and internal-doc source rows."
    ),
});

export type Source = z.infer<typeof SourceSchema>;

// ---------------------------------------------------------------------------
// Customer Agent response
// ---------------------------------------------------------------------------

export const CustomerAgentResponseSchema = z.object({
  text: z
    .string()
    .describe(
      "GitHub-flavored markdown (GFM) for the customer-visible reply. Do **not** put [1], [2], or other numeric bracket markers in the body — prose stands alone. For multi-row structured tool data (e.g. invoices, comparisons), prefer bullet lists or GFM tables over long prose paragraphs."
    ),
  sources: z
    .array(SourceSchema)
    .describe(
      "Ordered docs, invoices, and account links for further reading; listed below the message in UI, not tied to inline markers in `text`."
    ),
  suggestedQuestions: z
    .array(
      z
        .string()
        .describe(
          "Plain text only (not markdown): short chip label as the customer's next message when tapped"
        ),
    )
    .max(3)
    .describe(
      "Up to 3 plain-text follow-up lines the customer may send next; not markdown. If you have nothing to suggest, use an empty array."
    ),
});

export type CustomerAgentResponse = z.infer<typeof CustomerAgentResponseSchema>;

/** Agent dashboard thread: human-approved reply to the customer (stored markdown). */
export const HumanAgentThreadBodySchema = z.object({
  bodyMarkdown: z
    .string()
    .describe(
      "GitHub-flavored markdown (GFM) body shown in the agent thread and sent to the customer when approved"
    ),
});

export type HumanAgentThreadBody = z.infer<typeof HumanAgentThreadBodySchema>;

// ---------------------------------------------------------------------------
// Employee Agent response
// ---------------------------------------------------------------------------

export const EmployeeAgentResponseSchema = z.object({
  internalNotes: z
    .string()
    .describe(
      "GitHub-flavored markdown (GFM) for the human agent only: doc excerpts, account data, reasoning. Prefer ### headings and nested bullet lists over dense paragraphs. NEVER shown to the customer."
    ),
  draftCustomerResponse: z
    .string()
    .describe(
      "GitHub-flavored markdown (GFM) for the customer-safe message the human can review, edit, and send. For invoices, credits, or multi-row tool facts, prefer bullet lists or GFM tables over dense paragraphs. Must not contain internal system names, ticket IDs, or raw internal doc text; do not embed JSON or delimiter lines."
    ),
  sources: z
    .array(SourceSchema)
    .describe(
      "Ordered sources for internalNotes and draftCustomerResponse (docs consulted or linked material). Do not use inline [n] markers in markdown — list entries here only. internal-doc rows are for the agent only."
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
  content: z
    .string()
    .min(1)
    .describe(
      "GitHub-flavored markdown (GFM) for the human-approved message posted to the customer thread"
    ),
});

// ---------------------------------------------------------------------------
// Stored message shape (from DB, used in employee dashboard)
// ---------------------------------------------------------------------------

export const StoredMessageSchema = z.object({
  id: z.string(),
  role: z.string(),
  content: z
    .string()
    .describe(
      "Stored message body; customer-visible assistant/human replies are typically GitHub-flavored markdown (GFM), employee/internal lines are often plain text"
    ),
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

const CUSTOMER_AGENT_JSON_SCHEMA_FOR_PROMPT = JSON.stringify(
  zodToJsonSchema(CustomerAgentResponseSchema, { target: "jsonSchema7", $refStrategy: "none" }),
  null,
  2,
);

const EMPLOYEE_AGENT_JSON_SCHEMA_FOR_PROMPT = JSON.stringify(
  zodToJsonSchema(EmployeeAgentResponseSchema, { target: "jsonSchema7", $refStrategy: "none" }),
  null,
  2,
);

export const CUSTOMER_RESPONSE_FORMAT_INSTRUCTION = `
RESPONSE FORMAT (required — machine contract):
- Output **only** a single JSON object (no prose before or after it). Do **not** use line-based section markers or \`---\` delimiters.
- The JSON must **match** this JSON Schema (types + shapes the UI validates with Zod):
${CUSTOMER_AGENT_JSON_SCHEMA_FOR_PROMPT}
- **Field \`text\`:** GitHub-flavored markdown for the customer. Do **not** use inline numeric markers like [1], [2] in the body — put supporting material only in \`sources\` (listed below the bubble). Do **not** paste raw JSON or delimiter lines inside \`text\`. For invoices and similar tool output, prefer **tables or bullets** (see **Structured data** below).
- You may minify JSON or pretty-print; optional \`\`\`json code fences are allowed only if the payload is valid JSON inside them.

**Channel:** This is **live chat** — stay **polite and professional**, but write like messaging: clear, scannable, and **suited to the channel** (short turns; natural stop after substance, a question, or the next step — not a formal email closing).

**Structured data in \`text\` (invoices, lists, comparisons):**
- Prefer **scannable layout** over dense paragraphs: use **GFM markdown tables** when several rows share the same columns. For invoices, typical columns are **Amount | Billing period | Issued | PDF** (and only add an invoice **number** column if it helps the customer — avoid leading with long IDs when period + amount already distinguish rows).
- **Human-readable dates in tables:** Use short month forms in cells, e.g. **Mar 1–31, 2026** or **March 2026** for the billing window, and **Apr 1, 2026** for issued date — **not** raw ISO strings like \`2026-03-01 to 2026-03-31\` unless the customer asked for machine-readable dates.
- Use **bullet lists** when each item has short sub-lines (one bullet per invoice; amount, human-readable dates, \`[Download PDF](...)\` from tools).
- Avoid repeating the same facts in prose, then again in a table, then again under **Sources** — **one** compact presentation only.
- Optional one-line intro, then the table or list. Add \`sources\` rows for **public docs** (and similar) when relevant; for pure invoice lists, see **SOURCE RULES** — **no** [n] markers in the markdown.

CLARIFYING TURNS (inside \`text\`):
- If the customer's request is underspecified, your prose must still be **concrete**: reference specific product lines, tier names, or capabilities **from tools** (and add matching \`sources\` rows for docs consulted). Do **not** paste generic upgrade marketing or multi-bullet lists of vague questions ("Are there specific features you are particularly interested in?").
- **Batch missing facts:** If you need **two or more** specific details (e.g. licensing basis + count + environment + billing cadence), ask for **all** of them in **this single assistant message** using a **numbered list** (or short labeled lines), and tell the customer they may reply **once** with every answer. Do **not** ask question A alone, wait for a reply, then ask B in the next turn — unless B genuinely depends on information you cannot know yet.
- Good: tie the ask to their account (\`planTier\`, licensed \`products\`) and doc facts (named add-ons, edition differences); add matching \`sources\` rows for docs consulted. Bad: "enhance your capabilities" + "any questions about support options?" with no named options.
- **Money & dates:** When **listInvoices** or invoice context is relevant, include **dollar amounts** and **invoice period dates** from the tool — not vague "your recent bill" without numbers or timeframe. Present multiple invoices as a **markdown table or bullet list** (see **Structured data** above), not a single dense paragraph.

**Critical — \`suggestedQuestions\` are sent as the customer's message when tapped.** Each string must read as something **the customer** would type (first person, a short intent label, or a product name) — **never** as a question **you the agent** would ask them. Wrong: "Are you looking to upgrade?", "Do you want to downgrade?", "Which product do you want to change?" Right: "Upgrade", "Downgrade", "BIG-IP LTM", "I want to cancel NGINX One", "Tell me about iRules".

EXAMPLE (one JSON object):
{"text":"BIG-IP LTM provides load balancing and traffic steering for applications.","sources":[{"label":"","source":"public-doc","title":"BIG-IP Overview","excerpt":"LTM handles load balancing and traffic steering","docFile":"big-ip-overview.md"}],"suggestedQuestions":["What are iRules?","How does health monitoring work?"]}

SOURCE RULES (for further reading — **not** inline markers):
- Ground factual claims in tools. List **public-doc** or **account-data** rows in \`sources\` when the customer may want to open them **in addition** to the body. Do **not** put [1], [2], etc. in \`text\`.
- **Invoices — no duplication:** If \`text\` already has a **markdown table or bullet list** with a \`[Download PDF](...)\` (or bare \`/api/invoices/download?key=...\`) for each invoice, set \`sources\` to \`[]\`. Do **not** repeat every invoice again in \`sources\` — the table/list is enough.
- Do NOT create multiple rows for the same source document — one row per distinct source.
- For public-doc rows, the "docFile" field MUST be the exact filename returned by the search tool (e.g. "big-ip-overview.md"). NEVER invent or guess filenames.
- If you **do** include an **invoice** row in \`sources\` (rare — e.g. single PDF mention without a table), include the download URL as "/api/invoices/download?key=<pdfKey>". Prefer putting PDF links in \`text\` instead.
- Only list sources you actually looked up via tools. NEVER fabricate entries.
- If no sources add value (e.g. a greeting, or invoices fully covered in \`text\`), use an empty \`sources\` array.

SUGGESTED QUESTIONS RULES (customer voice — see critical note above):
- **Every** assistant message must be valid JSON with \`sources\` and \`suggestedQuestions\`. If you have nothing to suggest, use \`"suggestedQuestions":[]\` — but if your markdown invites the customer to pick something, **never** leave that array empty.
- **Invoice / statement lists:** For turns that **only** show invoices or charges in a table or list, use \`"suggestedQuestions":[]\` (or at most **one** short follow-up such as "Payment options" / "Question about a charge"). Do **not** emit **one chip per invoice number** — that duplicates the table.
- **Never** use agent-interrogation phrasing in chips: no "Are you…?", "Do you want…?", "Could you…?", "Which … do you want?" (those read as *your* questions, but the chip sends *their* reply and confuses the thread).
- Include 2-4 short chips as appropriate (more if needed — **one chip per product** when listing products to choose from). They appear as tappable pills — **keep labels minimal**.
- **UI copy pairing:** If the markdown says "tap below", "options below", "here are your options", or "choose an option", you **must** include non-empty \`suggestedQuestions\` in that same message that match those options. Otherwise do **not** use that wording.
- **No redundancy:** When chips carry the product names for a choice (downgrade, cancel, etc.), **do not** also paste the same products as bullet lists in the markdown — that repeats information. The chips **are** the list. In markdown, use 1–2 short sentences only (acknowledge the request + ask them to tap a product below). Never duplicate the product list twice in prose, and never both a full prose list **and** identical chips.
- **Mandatory:** For those product-choice turns, you **must** include \`suggestedQuestions\` with **one chip per licensed product** they need to pick from (exact names from getAccountInfo). Do not omit chips.
- **Tier / plan picks:** When the customer is upgrading or changing plan tier, include **one chip per selectable tier** (e.g. \`Standard\`, \`Premium\`, \`Enterprise\`) — names grounded in getAccountInfo and/or searchPublicDocs. Do not escalate in the same turn as the first tier list unless they already confirmed a target in the thread.
- When the customer must pick among their licensed products (cancel, change, etc.): call getAccountInfo first if needed. Each chip should be **only the product name** exactly as on their account (e.g. \`BIG-IP ASM\`, \`NGINX One\`) — not a full sentence.
- For doc or general follow-ups, chips can be short phrases (not necessarily full sentences).
- If getAccountInfo returns no products or an error, you may use one broader clarifying chip; do not invent product names.
- For purely technical / doc-only topics, keep chips brief (e.g. "BIG-IP iRules" or "Health monitors").
- Chips are for **next customer steps** you can still handle in this chat; do not use a chip whose only purpose is to request a human unless the customer has explicitly asked for a person and you are acknowledging that path.
`;

export const EMPLOYEE_RESPONSE_FORMAT_INSTRUCTION = `
RESPONSE FORMAT (required — machine contract):
- Output **only** a single JSON object (no prose before or after it). Do **not** use line-based section markers or \`---\` delimiters.
- The JSON must **match** this JSON Schema (types + shapes the UI validates with Zod):
${EMPLOYEE_AGENT_JSON_SCHEMA_FOR_PROMPT}
- **Field \`internalNotes\`:** Human-agent-only markdown (never sent to the customer). Prefer **No new internal findings this turn.** when you have no deltas; use \`""\` only if truly empty is intended.
- **Field \`draftCustomerResponse\`:** Customer-safe markdown copied into the draft box; may be \`""\` only for employee-only turns.
- **Field \`sources\`:** Ordered list of docs, invoices, and account links; shown in the UI — **no** inline [n] markers in \`internalNotes\` or \`draftCustomerResponse\`.
- You may minify JSON or pretty-print; optional \`\`\`json code fences are allowed only if the payload is valid JSON inside them.

**Never** put internal-only content in \`draftCustomerResponse\`. The employee edits the draft and clicks **Send to Customer**; only that field (not internal notes) reaches the customer chat.

**Critical — customer-visible text:** Anything the customer should read (including **brief thank-you / goodbye**) **must** appear in \`draftCustomerResponse\`. Prose only in \`internalNotes\` does not populate the customer draft.

**internalNotes** — human agent only (markdown). The UI already shows the **full customer thread**, **escalation handoff** (structured summary / products / context), and **account context** — do **not** restate them, paste long recaps, or summarize messages that are unchanged since your last turn.

**Scannable structure:** Use \`###\` headings (e.g. \`### New facts\`, \`### Risks\`, \`### Next steps\`) and **nested bullet lists** for tool results, amounts, dates, and runbook steps. Avoid long undifferentiated paragraphs — the human agent should grasp deltas in seconds.

**Put only new information in internalNotes:**
- **This turn:** Fresh tool results, internal-doc or runbook findings, calculations, or policy checks you just ran — with brief reasoning if non-obvious. When tools return **amounts** or **effective/period dates** (invoices, credits, subscription windows), state them **numerically and explicitly** so the agent can reuse them in the draft.
- **Delta:** What changed vs the previous turn; what is newly blocked, cleared, or risky.
- **Decisions / gaps:** Only if still unresolved — one tight line each, not a full rehash of the case.

**Anti-repetition:** If the thread or escalation block already states a fact, **refer** to it in a few words or skip it. Omit boilerplate headings when empty. If the only work is polishing the draft, internalNotes can be **2–4 bullets** or one short paragraph — or **"No new internal findings this turn."** plus any real risk.

**Optional** (only when they add *new* value this turn): likely customer follow-ups, clarifying questions for the human, date/ship gaps, grounded upsell — each **brief**, not a second copy of the thread.

**draftCustomerResponse** is **copied into the "Draft Customer Response" box** and, when approved, is sent **verbatim** to the customer **chat** (not email). The string may be empty only when the turn is **employee-only** (e.g. internal runbook answer with no customer-facing update).

**Structured data in \`draftCustomerResponse\` (invoices, lists, comparisons):** Same guidance as customer AI — prefer **GFM tables** or **bullet lists** with **human-readable** billing periods and issued dates; avoid long repetitive prose and **do not** repeat the same invoice PDFs again in \`sources\` when the draft already includes each \`/api/invoices/download?key=...\` link. Use \`[label](/api/...)\` links for PDFs.

**When the draft must be non-empty:** The customer’s last message **awaits a reply**, **or** tools show work **completed** that they should hear about (plan/tier/support change, credit, invoice action, etc.). In those cases you **must** supply the actual next customer message — **close the loop** (confirm outcome, timing, what changed) so they are not left waiting while internal notes describe what to say.

Requirements (for \`draftCustomerResponse\` when non-empty):
- **Escalated threads:** The customer is **already in this chat** with you. Prefer language like continuing **here** / **in this conversation**. Do **not** pretend an upgrade or plan change was already "initiated" or "successful" unless the human has actually completed it; do **not** default to "a representative will reach out shortly", "a sales representative will be in touch", "I'll pass this along", or "finalize later" as a **standalone** answer — you are the representative in this thread. Pair any mention of another team with a **concrete** action or question **here**.
- **Do not echo the last assistant message:** If the prior customer-visible line was boilerplate (e.g. generic escalation or sales handoff from customer AI), **rewrite** the next message from scratch: tie to **getAccountInfo** (products, plan) and **searchPublicDocs** (named services/dimensions). The draft is **not** a summary of what was already said.
- **Ask once, collect many answers:** When scoping (quotes, licensing metrics, counts, environments, billing cadence, effective dates, etc.) requires **multiple** inputs, list **every** still-missing item in **one** draft — numbered or labeled lines — and invite a **single** customer reply covering all of them. Do **not** sequence one question per message unless a later question truly depends on unknown prior information.
- **Vague customer intent (plan / tier / product changes):** If they have not specified what they want to move **to** (or the thread has not already locked that in), the draft must **ask** using **named** choices or facts from **searchPublicDocs** / **getAccountInfo** (e.g. compare editions, cite WAF vs bot add-ons, billing period) — not boilerplate "confirm a few details" or "what features interest you?" without naming those features. Do **not** congratulate them, claim success, or write “you are now on [tier]” from **getAccountInfo** alone. Current plan on file is **not** proof they already got what they asked for when they only said “I want to upgrade.”
- **Anti-pattern:** Do **not** combine (a) a claim that an upgrade/change was "successfully initiated" or done with (b) "someone will reach out shortly to finalize" and (c) a fluffy "if you have questions in the meantime" — **without** a specific ask, confirmation, or stated next action **in this chat**. That pattern is forbidden; it gives no real next step.
- **Pending changes:** If the change is not fully executed in tools yet, the draft must still give **clear next steps** — e.g. what you need the customer to confirm, what you will do **in your next reply here**, or what they should expect **in this thread** — not vague waiting language alone.
- **Completed changes:** If tools show the requested change **already applied** (e.g. getAccountInfo matches what they asked for), the draft **must** confirm that in plain language (what changed, effective timing if known) — not only internalNotes saying “tell them X.” Then **stop**: unless they asked for a deep dive, do **not** add long comparisons or “map everything you use” homework — offer **one short** “anything else?” line instead of extending the conversation.
- **Wrapping up:** When the substantive issue is **resolved**, say so and ask once if they need anything else. If they decline (“no”, “all set”, “that’s it”), the next message should be a **brief, polite chat goodbye** (e.g. thank you for being an F5 customer, have a great day) — warm, short, not a formal letter.
- **Prefer closure over open loops:** When the customer **just answered** the last open question (timing, product, yes/no), avoid **filler** that sounds busy but adds nothing (“I’ll proceed with…”, “if anything else comes up…”) **unless** you still need **one** specific thing from them or tools. Acknowledge briefly, state the **real** next move (or that you’re applying the change **here** when tools allow), then **one** “Anything else?” line — **not** a second paragraph of process theater.
- **Upsell / cross-sell exception:** Optional **one** short upsell or cross-sell line **only** when docs/account facts support it; if not, **end** with closure + “anything else?” instead of stretching the conversation.
- **Information-rich replies:** Prefer **substance over brevity** while the case is **active** (plan changes in flight, unclear intent) — include **effective/activation dates**, what the change **changes** per tools/docs, and the **shortest path** to finish. Once the outcome is **confirmed** and they have not asked for more detail, **prefer concise closure** over maximal information density. Add a **grounded upsell** only when clearly relevant; do not bury the core line in promotions or optional education.
- **Amounts & effective dates:** For any plan, billing, credit, or invoice discussion, include **currency amounts** and **dated billing periods or effective dates** from **tools** (listInvoices, getAccountInfo, or write-tool results) whenever available — customers should not have to ask for "how much" or "as of when" if the data already exists.
- **Downgrades:** Where policy allows, surface **alternatives or save options** before closing the case; keep tone helpful, not coercive.
- Write as the human support agent in a **chat thread**: **polite, professional**, channel-fit — direct "you" / "we", like Slack or web chat rather than a formal email or ticket letter. No "Dear …", "Best regards", or letter-style openings/closings; let the message land on the next step or question in a natural chat rhythm.
- This should be the **single most helpful and probable next message** to move the case forward — not an outline or memo.
- Use **proper GitHub-flavored markdown**: short paragraphs, **bold** for key terms, bullet or numbered lists when listing steps or options, links as \`[description](/path)\` using **relative** paths only (e.g. invoice PDF \`/api/invoices/download?key=...\`).
- Do **not** use inline [n] markers in the draft — list public or account-safe rows in \`sources\` only. Do **not** include internal-doc entries in this field.
- Do **not** embed JSON or delimiter lines inside \`draftCustomerResponse\` — the customer UI renders it as normal markdown only.
- Where relevant, **confirm or restate the start/effective/go-live date** with the customer, or ask them to confirm if it is still open.
- If a **physical ship** is involved, **give ship or delivery timing** (or an honest “we’ll follow up with tracking / timing”) — never make up a specific ship date.

EXAMPLE (one JSON object):
{"internalNotes":"No new internal findings this turn.","draftCustomerResponse":"Thanks for your patience — here is the next step.","sources":[{"label":"","source":"public-doc","title":"BIG-IP Overview","excerpt":"LTM handles load balancing","docFile":"big-ip-overview.md"}]}

SOURCE RULES (**not** inline markers):
- List sources you used in \`sources\`; do **not** put [1], [2], etc. in \`internalNotes\` or \`draftCustomerResponse\`.
- Do NOT create multiple rows for the same source document.
- For public-doc rows, the "docFile" field MUST be the exact filename returned by the search tool. NEVER invent or guess filenames.
- **internal-doc** rows: only for material covered in internalNotes; never put internal-only material in the draft. \`sources\` may list **both** internal-doc and public-doc / account-data / invoice rows. The draft must only point to customer-safe material in prose; internal-doc entries are for the agent panel only.
- NEVER fabricate sources for documents you did not search for and find.
- For invoices in the draft, include "/api/invoices/download?key=<pdfKey>" in the source \`url\` field where applicable.
- The draft may reference public-doc and account-data sources only (via \`sources\`, not inline markers).
`;
