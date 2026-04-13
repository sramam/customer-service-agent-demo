import { useEffect, useRef } from "react";
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

const POLL_MS = 3000;

/**
 * After escalation, periodically merge customer-visible messages from the DB so
 * agent-approved replies appear even in another tab or after refresh (stream
 * state is not the source of truth). Skips rows already represented by content
 * fingerprint (covers stream + custom-event ids vs Prisma ids).
 */
export function useCustomerDbMessagePoll(
  escalated: boolean,
  conversationId: string | null,
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>,
) {
  const mergedDbIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mergedDbIdsRef.current = new Set();
  }, [conversationId]);

  useEffect(() => {
    if (!escalated || !conversationId) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(
          `/api/conversations/${conversationId}/customer-messages`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { messages?: DbCustomerMessage[] };
        const rows = data.messages ?? [];

        setMessages((prev) => {
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
        });
      } catch {
        /* ignore */
      }
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [escalated, conversationId, setMessages]);
}
