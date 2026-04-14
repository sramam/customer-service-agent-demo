/**
 * Parses customer-visible system lines from `createCustomerRequestEscalationTool`:
 * `Escalated to human agent:\n` + `buildEscalationReason` (summary, Products:, Context:).
 */

export type ParsedEscalationHandoff =
  | { ok: true; summary: string; products: string[]; context: string | null }
  | { ok: false; raw: string };

const ESCALATION_PREFIX = /^Escalated to human agent:\s*\n?/i;

export function parseEscalationHandoffMessage(content: string): ParsedEscalationHandoff {
  const trimmed = content.trim();
  if (!ESCALATION_PREFIX.test(trimmed)) {
    return { ok: false, raw: content };
  }

  const body = trimmed.replace(ESCALATION_PREFIX, "").trim();
  if (!body) {
    return { ok: true, summary: "", products: [], context: null };
  }

  const lines = body.split("\n");

  let productsIdx = -1;
  let contextIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^Products:\s*/i.test(lines[i])) productsIdx = i;
    if (/^Context:\s*/i.test(lines[i])) contextIdx = i;
  }

  const specials = [productsIdx, contextIdx].filter((i) => i >= 0).sort((a, b) => a - b);
  const firstSpecial = specials[0] ?? -1;

  if (firstSpecial === -1) {
    return { ok: true, summary: body, products: [], context: null };
  }

  const summary = lines.slice(0, firstSpecial).join("\n").trim();

  let products: string[] = [];
  if (productsIdx >= 0) {
    const pl = lines[productsIdx].replace(/^Products:\s*/i, "").trim();
    products = pl.split(",").map((p) => p.trim()).filter(Boolean);
  }

  let context: string | null = null;
  if (contextIdx >= 0) {
    const firstCtx = lines[contextIdx].replace(/^Context:\s*/i, "").trim();
    const rest = lines.slice(contextIdx + 1);
    context = [firstCtx, ...rest].join("\n").trim() || null;
  }

  return { ok: true, summary, products, context };
}
