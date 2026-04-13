import type { MutableRefObject } from "react";
import type { UIMessage } from "ai";

function getTextFromUiMessage(m: UIMessage): string {
  return (
    m.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

function normalizeText(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function fingerprint(m: UIMessage): string {
  const role =
    m.role === "user"
      ? "user"
      : m.role === "system"
        ? "system"
        : "assistant";
  return `${role}:${normalizeText(getTextFromUiMessage(m))}`;
}

export type DbCustomerMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

/** Hydrate useChat from GET /api/conversations/[id]/customer-messages rows. */
export function dbCustomerMessagesToUiMessages(rows: DbCustomerMessage[]): UIMessage[] {
  return rows.map((row) => {
    const uiRole =
      row.role === "user"
        ? "user"
        : row.role === "system"
          ? "system"
          : "assistant";
    return {
      id: row.id,
      role: uiRole,
      parts: [{ type: "text", text: row.content }],
    };
  });
}

/**
 * Merge DB-backed customer-visible rows into useChat state without duplicating
 * stream/event-sourced lines (fingerprint by role + text).
 */
export function mergeDbRowsIntoCustomerChat(
  prev: UIMessage[],
  rows: DbCustomerMessage[],
  mergedDbIdsRef: MutableRefObject<Set<string>>,
): UIMessage[] {
  const existingFp = new Set(prev.map(fingerprint));
  const toAppend: UIMessage[] = [];

  for (const row of rows) {
    if (mergedDbIdsRef.current.has(row.id)) continue;

    const uiRole =
      row.role === "user"
        ? "user"
        : row.role === "system"
          ? "system"
          : "assistant";

    const fp = `${uiRole}:${normalizeText(row.content)}`;
    if (existingFp.has(fp)) {
      mergedDbIdsRef.current.add(row.id);
      continue;
    }

    mergedDbIdsRef.current.add(row.id);
    existingFp.add(fp);
    toAppend.push({
      id: row.id,
      role: uiRole,
      parts: [{ type: "text", text: row.content }],
    });
  }

  if (toAppend.length === 0) return prev;
  return [...prev, ...toAppend];
}
