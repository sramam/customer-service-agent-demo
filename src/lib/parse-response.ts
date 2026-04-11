import type { Citation, CustomerAgentResponse, EmployeeAgentResponse } from "./types";

const METADATA_DELIM = "---METADATA---";
const INTERNAL_DELIM = "---INTERNAL NOTES---";
const DRAFT_DELIM = "---DRAFT CUSTOMER RESPONSE---";

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
 * Delimiter format (preferred):
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

    return {
      internalNotes: internalMatch?.[1]?.trim() ?? "",
      draftCustomerResponse: draftMatch?.[1]?.trim() ?? "",
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

/** Markdown-safe body for Employee AI chat bubbles (strips delimiter metadata). */
export function displayTextForEmployeeAiMarkdown(raw: string): string {
  const p = parseEmployeeResponse(raw);
  const a = p.internalNotes?.trim() ?? "";
  const b = p.draftCustomerResponse?.trim() ?? "";
  if (!a && !b) return raw;
  if (a && b) return `${a}\n\n---\n\n${b}`;
  return a || b;
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
