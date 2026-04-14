import {
  CustomerAgentResponseSchema,
  EmployeeAgentResponseSchema,
  type CustomerAgentResponse,
  type EmployeeAgentResponse,
  HumanAgentThreadBodySchema,
  type Source,
} from "./types";

/** Legacy model output used inline [1], [2] markers; strip so body text matches source-list-only UI. */
export function stripLegacyInlineCitationMarkers(text: string): string {
  return text.replace(/\[\d+\]/g, "");
}

export function tryParseJson(str: string): Record<string, unknown> | null {
  try {
    const trimmed = str.trim();
    const clean = trimmed.startsWith("```")
      ? trimmed.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
      : trimmed;
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

/** Extract a balanced `{ ... }` slice starting at `start` (string-aware, JSON-safe). */
function extractBalancedJsonSlice(s: string, start: number): string | null {
  if (s[start] !== "{") return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === "\\") {
        esc = true;
        continue;
      }
      if (c === "\"") inStr = false;
      continue;
    }
    if (c === "\"") {
      inStr = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * When the model prepends prose to the JSON envelope (e.g. `Sure.{"text":"..."}`),
 * find and parse the object, merge leading prose into `text`.
 */
function parseCustomerAgentJsonFromMixed(raw: string): CustomerAgentResponse | null {
  const trimmed = raw.trim();
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] !== "{") continue;
    const slice = extractBalancedJsonSlice(trimmed, i);
    if (!slice) continue;
    const parsed = tryParseJson(slice);
    if (!parsed || typeof parsed !== "object") continue;
    const data = normalizeCustomerPayload(parsed as Record<string, unknown>);
    const r = CustomerAgentResponseSchema.safeParse(data);
    if (!r.success) continue;
    const leading = trimmed.slice(0, i).trim();
    if (leading) {
      return { ...r.data, text: `${leading}\n\n${r.data.text}` };
    }
    return r.data;
  }
  return null;
}

/** Same idea as {@link parseCustomerAgentJsonFromMixed} for employee JSON; prose → internalNotes. */
function parseEmployeeAgentJsonFromMixed(raw: string): EmployeeAgentResponse | null {
  const trimmed = raw.trim();
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] !== "{") continue;
    const slice = extractBalancedJsonSlice(trimmed, i);
    if (!slice) continue;
    const parsed = tryParseJson(slice);
    if (!parsed || typeof parsed !== "object") continue;
    const merged = normalizeEmployeePayload(parsed as Record<string, unknown>);
    const r = EmployeeAgentResponseSchema.safeParse(merged);
    if (!r.success) continue;
    const leading = trimmed.slice(0, i).trim();
    if (leading) {
      return {
        ...r.data,
        internalNotes: `${leading}\n\n${r.data.internalNotes}`,
      };
    }
    return r.data;
  }
  return null;
}

/** Preferred key `sources`; legacy persisted JSON may use `citations`. */
export function extractSources(obj: Record<string, unknown>): unknown[] {
  if (Array.isArray(obj.sources)) return obj.sources;
  if (Array.isArray(obj.citations)) return obj.citations;
  return [];
}

export function normalizeCustomerPayload(obj: Record<string, unknown>): {
  text: string;
  sources: Source[];
  suggestedQuestions: string[];
} {
  return {
    text: typeof obj.text === "string" ? obj.text : "",
    sources: extractSources(obj).map(normalizeSourceForThread),
    suggestedQuestions: Array.isArray(obj.suggestedQuestions)
      ? obj.suggestedQuestions.map(String).slice(0, 3)
      : [],
  };
}

function tryStrictCustomerEnvelope(raw: string): CustomerAgentResponse | null {
  const parsed = tryParseJson(raw.trim());
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const data = normalizeCustomerPayload(o);
  const r = CustomerAgentResponseSchema.safeParse(data);
  return r.success ? r.data : null;
}

/** Whole-string JSON or leading prose + JSON; `null` if no valid envelope. */
export function tryParseCustomerAgentEnvelopeOnly(raw: string): CustomerAgentResponse | null {
  const strict = tryStrictCustomerEnvelope(raw);
  if (strict) return strict;
  return parseCustomerAgentJsonFromMixed(raw);
}

/**
 * Parse a customer agent response.
 *
 * Expects a single JSON object matching {@link CustomerAgentResponseSchema} (`text` is GFM markdown),
 * or loose JSON with at least `text`. Non-JSON strings are treated as raw `text` with empty arrays.
 */
export function parseCustomerResponse(raw: string): CustomerAgentResponse {
  const strict = tryStrictCustomerEnvelope(raw);
  if (strict) return strict;

  const mixed = parseCustomerAgentJsonFromMixed(raw);
  if (mixed) return mixed;

  const parsed = tryParseJson(raw);
  if (parsed && typeof parsed.text === "string") {
    const data = normalizeCustomerPayload(parsed as Record<string, unknown>);
    const r = CustomerAgentResponseSchema.safeParse(data);
    if (r.success) return r.data;
    return {
      text: parsed.text as string,
      sources: extractSources(parsed as Record<string, unknown>).map(
        normalizeSourceForThread,
      ),
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
        ? (parsed.suggestedQuestions as string[])
        : [],
    };
  }

  return { text: raw, sources: [], suggestedQuestions: [] };
}

/** Coerce a loose source row (e.g. from JSON) into a shape valid for {@link CustomerAgentResponseSchema}. */
export function normalizeSourceForThread(input: unknown): Source {
  const o = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const s = o.source;
  const source =
    s === "public-doc" || s === "internal-doc" || s === "account-data" || s === "invoice"
      ? s
      : "public-doc";
  const base: Source = {
    label: String(o.label ?? "").trim(),
    source,
    title: String(o.title ?? ""),
    excerpt: String(o.excerpt ?? ""),
  };
  if (typeof o.url === "string" && o.url.length > 0) base.url = o.url;
  if (typeof o.docFile === "string" && o.docFile.length > 0) base.docFile = o.docFile;
  return base;
}

/** @deprecated Use {@link normalizeSourceForThread} */
export const normalizeCitationForThread = normalizeSourceForThread;

/**
 * Parse raw persisted customer-AI content and validate as {@link CustomerAgentResponseSchema}
 * (all fields present; arrays may be empty).
 */
export function toCustomerAgentResponse(raw: string): CustomerAgentResponse {
  const loose = parseCustomerResponse(raw);
  const sources = (loose.sources ?? []).map((c) => normalizeSourceForThread(c));
  const parsed = CustomerAgentResponseSchema.safeParse({
    text: loose.text ?? "",
    sources,
    suggestedQuestions: (loose.suggestedQuestions ?? []).slice(0, 3),
  });
  if (parsed.success) return parsed.data;
  return {
    text: loose.text ?? "",
    sources: [],
    suggestedQuestions: [],
  };
}

export function toHumanAgentThreadBody(content: string): string {
  return HumanAgentThreadBodySchema.parse({ bodyMarkdown: content ?? "" }).bodyMarkdown;
}

export function normalizeEmployeePayload(obj: Record<string, unknown>): {
  internalNotes: string;
  draftCustomerResponse: string;
  sources: Source[];
} {
  return {
    internalNotes: typeof obj.internalNotes === "string" ? obj.internalNotes : "",
    draftCustomerResponse:
      typeof obj.draftCustomerResponse === "string" ? obj.draftCustomerResponse : "",
    sources: extractSources(obj).map(normalizeSourceForThread),
  };
}

function tryStrictEmployeeEnvelope(raw: string): EmployeeAgentResponse | null {
  const parsed = tryParseJson(raw.trim());
  if (!parsed || typeof parsed !== "object") return null;
  const data = normalizeEmployeePayload(parsed as Record<string, unknown>);
  const r = EmployeeAgentResponseSchema.safeParse(data);
  return r.success ? r.data : null;
}

/** Whole-string JSON or leading prose + JSON; `null` if no valid envelope. */
export function tryParseEmployeeAgentEnvelopeOnly(raw: string): EmployeeAgentResponse | null {
  const strict = tryStrictEmployeeEnvelope(raw);
  if (strict) return strict;
  return parseEmployeeAgentJsonFromMixed(raw);
}

/**
 * Parse an employee agent response.
 *
 * Expects a single JSON object matching {@link EmployeeAgentResponseSchema}. Loose JSON with
 * `internalNotes` and `draftCustomerResponse` is coerced. Non-JSON text becomes internal-only notes.
 */
export function parseEmployeeResponse(raw: string): EmployeeAgentResponse {
  const strict = tryStrictEmployeeEnvelope(raw);
  if (strict) return strict;

  const mixed = parseEmployeeAgentJsonFromMixed(raw);
  if (mixed) return mixed;

  const parsed = tryParseJson(raw);
  if (
    parsed &&
    typeof parsed.internalNotes === "string" &&
    typeof parsed.draftCustomerResponse === "string"
  ) {
    const merged = normalizeEmployeePayload(parsed as Record<string, unknown>);
    const r = EmployeeAgentResponseSchema.safeParse(merged);
    if (r.success) return r.data;
    return {
      internalNotes: parsed.internalNotes as string,
      draftCustomerResponse: parsed.draftCustomerResponse as string,
      sources: extractSources(parsed as Record<string, unknown>).map(
        normalizeSourceForThread,
      ),
    };
  }

  // Unstructured reply (e.g. conversational answer to the employee only) — never
  // treat the full body as a customer draft; that would leak internal guidance.
  const trimmed = raw.trim();
  return {
    internalNotes: trimmed,
    draftCustomerResponse: "",
    sources: [],
  };
}

/**
 * Markdown-safe body for Employee AI **chat bubbles** only.
 * The editable **Draft Customer Response** lives in ReviewControls — when the model
 * returns both internal notes and a draft, show internal notes here and point to the
 * panel so we do not duplicate the same draft pre- and post-parse.
 */
export function displayTextForEmployeeAiMarkdown(raw: string): string {
  const p = parseEmployeeResponse(raw);
  const a = stripLegacyInlineCitationMarkers(p.internalNotes?.trim() ?? "");
  const b = stripLegacyInlineCitationMarkers(p.draftCustomerResponse?.trim() ?? "");
  if (!a && !b) return raw;
  if (a && b) {
    return `${a}\n\n---\n\n*Customer-facing draft: edit and send from the draft panel below (not repeated here).*`;
  }
  if (a) return a;
  // Draft-only structured reply (no internal section): still surface text in-thread;
  // ReviewControls will mirror it — rare; avoids an empty bubble.
  return b;
}
