import type { Citation, CustomerAgentResponse, EmployeeAgentResponse } from "./types";

const METADATA_DELIM = "---METADATA---";
const INTERNAL_DELIM = "---INTERNAL NOTES---";
const DRAFT_DELIM = "---DRAFT CUSTOMER RESPONSE---";

/** Heuristic: block promoting obvious internal/runbook/tool dumps into the customer draft. */
function isLikelyInternalOnlyAgentContent(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.includes("---")) return true;
  if (
    /\b(runbook|triage code|ServiceNow|Zuora|INTERNAL ONLY|INTERNAL AGENT|per runbook|createCreditMemo|updateAccount|severity\s*[Pp][1-4])\b/i.test(
      t,
    )
  ) {
    return true;
  }
  if (/\[INTERNAL/i.test(t)) return true;
  if (t.length > 2000) return true;
  const nonEmptyLines = t.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (nonEmptyLines.length > 30) return true;
  // Multiple markdown bullets usually mean internal deltas, not a lone customer reply.
  const bulletLines = nonEmptyLines.filter((l) =>
    /^\s*([-*]|\d+\.)\s/.test(l),
  );
  if (bulletLines.length >= 3) return true;
  return false;
}

/**
 * Models sometimes put send-ready customer text under ---INTERNAL NOTES--- only (no DRAFT block).
 * If it does not look like internal guidance, treat it as the draft so the UI can send it.
 */
function promoteMisplacedCustomerDraft(
  internalText: string,
): { internalNotes: string; draftCustomerResponse: string } | null {
  const trimmed = internalText.trim();
  if (!trimmed) return null;
  if (isLikelyInternalOnlyAgentContent(trimmed)) return null;
  return {
    internalNotes: "No new internal findings this turn.",
    draftCustomerResponse: trimmed,
  };
}

function tryParseJson(str: string): Record<string, unknown> | null {
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

function extractCitations(obj: Record<string, unknown>): Citation[] {
  return Array.isArray(obj.citations) ? obj.citations : [];
}

/**
 * Parse a customer agent response.
 *
 * Delimiter format (preferred — streams naturally):
 *   <markdown text>
 *   ---METADATA---
 *   {"citations":[...],"suggestedQuestions":[...]}
 *
 * During streaming, everything before ---METADATA--- renders as markdown.
 * Citations appear once the metadata JSON is complete.
 * Falls back to legacy JSON format for backward compatibility.
 */
export function parseCustomerResponse(raw: string): CustomerAgentResponse {
  const metaIdx = raw.indexOf(METADATA_DELIM);

  if (metaIdx !== -1) {
    const text = raw.slice(0, metaIdx).trim();
    const metaStr = raw.slice(metaIdx + METADATA_DELIM.length).trim();
    const meta = tryParseJson(metaStr);
    if (meta) {
      return {
        text,
        citations: extractCitations(meta),
        suggestedQuestions: Array.isArray(meta.suggestedQuestions)
          ? (meta.suggestedQuestions as string[])
          : [],
      };
    }
    return { text, citations: [], suggestedQuestions: [] };
  }

  // Legacy: full JSON blob
  const parsed = tryParseJson(raw);
  if (parsed && typeof parsed.text === "string") {
    return {
      text: parsed.text as string,
      citations: extractCitations(parsed),
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
        ? (parsed.suggestedQuestions as string[])
        : [],
    };
  }

  // Streaming / plain text fallback
  return { text: raw, citations: [], suggestedQuestions: [] };
}

/**
 * Parse an employee agent response.
 *
 * Delimiter format (preferred): both section headers should appear every turn; a section
 * body may be empty (blank) before the next delimiter.
 *   ---INTERNAL NOTES---
 *   <internal markdown>
 *   ---DRAFT CUSTOMER RESPONSE---
 *   <draft markdown>
 *   ---METADATA---
 *   {"citations":[...]}
 *
 * Falls back to legacy JSON format.
 */
export function parseEmployeeResponse(raw: string): EmployeeAgentResponse {
  const hasInternal = raw.includes(INTERNAL_DELIM);
  const hasDraft = raw.includes(DRAFT_DELIM);

  if (hasInternal || hasDraft) {
    const metaIdx = raw.indexOf(METADATA_DELIM);
    const bodyStr = metaIdx !== -1 ? raw.slice(0, metaIdx) : raw;

    const internalMatch = bodyStr.match(
      /---INTERNAL NOTES---\s*([\s\S]*?)(?=---DRAFT CUSTOMER RESPONSE---|$)/
    );
    const draftMatch = bodyStr.match(
      /---DRAFT CUSTOMER RESPONSE---\s*([\s\S]*?)(?=---METADATA---|$)/
    );

    let citations: Citation[] = [];
    if (metaIdx !== -1) {
      const metaStr = raw.slice(metaIdx + METADATA_DELIM.length).trim();
      const meta = tryParseJson(metaStr);
      if (meta) citations = extractCitations(meta);
    }

    let internalNotes = internalMatch?.[1]?.trim() ?? "";
    let draftCustomerResponse = draftMatch?.[1]?.trim() ?? "";

    if (
      hasInternal &&
      !hasDraft &&
      internalNotes &&
      draftCustomerResponse === ""
    ) {
      const promoted = promoteMisplacedCustomerDraft(internalNotes);
      if (promoted) {
        internalNotes = promoted.internalNotes;
        draftCustomerResponse = promoted.draftCustomerResponse;
      }
    }

    return {
      internalNotes,
      draftCustomerResponse,
      citations,
    };
  }

  // Legacy: full JSON blob
  const parsed = tryParseJson(raw);
  if (
    parsed &&
    typeof parsed.internalNotes === "string" &&
    typeof parsed.draftCustomerResponse === "string"
  ) {
    return {
      internalNotes: parsed.internalNotes as string,
      draftCustomerResponse: parsed.draftCustomerResponse as string,
      citations: extractCitations(parsed),
    };
  }

  // Unstructured reply (e.g. conversational answer to the employee only) — never
  // treat the full body as a customer draft; that would leak internal guidance.
  const trimmed = raw.trim();
  return {
    internalNotes: trimmed,
    draftCustomerResponse: "",
    citations: [],
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
  const a = p.internalNotes?.trim() ?? "";
  const b = p.draftCustomerResponse?.trim() ?? "";
  if (!a && !b) return raw;
  if (a && b) {
    return `${a}\n\n---\n\n*Customer-facing draft: edit and send from the draft panel below (not repeated here).*`;
  }
  if (a) return a;
  // Draft-only structured reply (no internal section): still surface text in-thread;
  // ReviewControls will mirror it — rare; avoids an empty bubble.
  return b;
}

/**
 * Render text with inline citation markers as React-friendly segments.
 * Returns an array of { type: 'text', value } | { type: 'citation', label, citation }.
 */
export type TextSegment =
  | { type: "text"; value: string }
  | { type: "citation"; label: string; citation: Citation | undefined };

export function segmentText(
  text: string,
  citations: Citation[]
): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\[(\d+)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    const label = `[${match[1]}]`;
    const citation = citations.find((c) => c.label === label);
    segments.push({ type: "citation", label, citation });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments;
}
