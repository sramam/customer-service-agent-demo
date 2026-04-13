"use client";

import { useEffect, useRef } from "react";

/**
 * Keeps the "Escalated" UI in sync with the database. Do not infer escalation from
 * assistant prose ("human agent", "escalate") — that false-positives while the
 * thread is still WITH_CUSTOMER_AI and /api/chat keeps running the customer model.
 *
 * When the DB shows ESCALATED, `onEscalation` forwards the conversation to the split-view agent panel.
 */
export function useCustomerEscalationSyncFromDb(
  conversationId: string | null,
  chatStatus: string,
  /** Bump when the thread changes so we re-check after each completed turn. */
  messagesVersion: number,
  setEscalated: (value: boolean) => void,
  setEscalationReason: (value: string) => void,
  onEscalation?: (conversationId: string) => void,
) {
  /** One forward per conversation id per mount (split demo: open agent when escalated). */
  const forwardedRef = useRef<string | null>(null);

  useEffect(() => {
    forwardedRef.current = null;
  }, [conversationId]);

  useEffect(() => {
    if (
      !conversationId ||
      chatStatus === "streaming" ||
      chatStatus === "submitted"
    ) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(
          `/api/conversations/${encodeURIComponent(conversationId)}/customer-messages`,
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          status?: string;
          escalationReason?: string | null;
        };
        if (cancelled) return;
        if (data.status === "ESCALATED") {
          setEscalated(true);
          if (data.escalationReason) {
            setEscalationReason(data.escalationReason);
          }
          if (
            onEscalation &&
            forwardedRef.current !== conversationId
          ) {
            forwardedRef.current = conversationId;
            onEscalation(conversationId);
          }
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    conversationId,
    chatStatus,
    messagesVersion,
    setEscalated,
    setEscalationReason,
    onEscalation,
  ]);
}
