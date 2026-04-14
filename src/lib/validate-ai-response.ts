import { z } from "zod";
import {
  CustomerAgentResponseSchema,
  EmployeeAgentResponseSchema,
  type CustomerAgentResponse,
  type EmployeeAgentResponse,
} from "./types";
import {
  normalizeCustomerPayload,
  normalizeEmployeePayload,
  tryParseCustomerAgentEnvelopeOnly,
  tryParseEmployeeAgentEnvelopeOnly,
  tryParseJson,
} from "./parse-response";

function zodIssuesToStrings(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);
}

/**
 * Validates the final assistant text (last model step) for the customer AI.
 * Accepts a single JSON object, or prose immediately followed by the JSON object.
 */
export function validateCustomerAssistantText(
  raw: string,
):
  | { ok: true; data: CustomerAgentResponse }
  | { ok: false; errors: string[] } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, errors: ["Assistant reply was empty."] };
  }

  const envelope = tryParseCustomerAgentEnvelopeOnly(trimmed);
  if (envelope) return { ok: true, data: envelope };

  const parsed = tryParseJson(trimmed);
  if (!parsed || typeof parsed !== "object") {
    return {
      ok: false,
      errors: [
        "Expected a single JSON object matching CustomerAgentResponseSchema (fields text, sources, suggestedQuestions), optionally after a short prose line.",
      ],
    };
  }

  const data = normalizeCustomerPayload(parsed as Record<string, unknown>);
  const result = CustomerAgentResponseSchema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };

  if (typeof (parsed as Record<string, unknown>).text === "string") {
    return { ok: false, errors: zodIssuesToStrings(result.error) };
  }

  return {
    ok: false,
    errors: [
      "Expected a single JSON object matching CustomerAgentResponseSchema (fields text, sources, suggestedQuestions), optionally after a short prose line.",
    ],
  };
}

/**
 * Validates the final assistant text for the employee AI.
 * Accepts a single JSON object, or prose immediately followed by the JSON object.
 */
export function validateEmployeeAssistantText(
  raw: string,
):
  | { ok: true; data: EmployeeAgentResponse }
  | { ok: false; errors: string[] } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, errors: ["Assistant reply was empty."] };
  }

  const envelope = tryParseEmployeeAgentEnvelopeOnly(trimmed);
  if (envelope) return { ok: true, data: envelope };

  const parsed = tryParseJson(trimmed);
  if (!parsed || typeof parsed !== "object") {
    return {
      ok: false,
      errors: [
        "Expected a single JSON object matching EmployeeAgentResponseSchema (internalNotes, draftCustomerResponse, sources), optionally after a short prose line.",
      ],
    };
  }

  const data = normalizeEmployeePayload(parsed as Record<string, unknown>);
  const result = EmployeeAgentResponseSchema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };

  const o = parsed as Record<string, unknown>;
  if (
    typeof o.internalNotes === "string" &&
    typeof o.draftCustomerResponse === "string"
  ) {
    return { ok: false, errors: zodIssuesToStrings(result.error) };
  }

  return {
    ok: false,
    errors: [
      "Expected a single JSON object matching EmployeeAgentResponseSchema (internalNotes, draftCustomerResponse, sources), optionally after a short prose line.",
    ],
  };
}

export function formatCustomerSchemaRetryUserMessage(errors: string[]): string {
  return [
    "Your previous assistant reply failed server-side validation against the customer response contract (Zod / UI).",
    "Output a corrected reply as a single JSON object only (no prose before or after the JSON), matching the JSON Schema in the system prompt.",
    "",
    "Issues:",
    ...errors.map((e) => `- ${e}`),
  ].join("\n");
}

export function formatEmployeeSchemaRetryUserMessage(errors: string[]): string {
  return [
    "Your previous assistant reply failed server-side validation against the employee response contract (Zod / UI).",
    "Output a corrected reply as a single JSON object only (no prose before or after the JSON), matching the JSON Schema in the system prompt.",
    "",
    "Issues:",
    ...errors.map((e) => `- ${e}`),
  ].join("\n");
}
