import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { UIMessage } from "ai";
import usePartySocket from "partysocket/react";
import {
  mergeDbRowsIntoCustomerChat,
  type DbCustomerMessage,
} from "@/lib/customer-chat-merge";

/**
 * PartyKit signals a customer-visible update; client pulls canonical rows from the API
 * to avoid races and duplicate payloads on the wire.
 */
export function useCustomerMessagePartykit(
  escalated: boolean,
  conversationId: string | null,
  setMessages: Dispatch<SetStateAction<UIMessage[]>>,
) {
  const mergedDbIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    mergedDbIdsRef.current = new Set();
  }, [conversationId]);

  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "";

  usePartySocket({
    host,
    party: "main",
    room: conversationId ?? "_",
    enabled: !!host && escalated && !!conversationId,
    onMessage(event) {
      try {
        const payload = JSON.parse(String(event.data)) as {
          type?: string;
          conversationId?: string;
          messageId?: string;
        };
        if (
          payload.type !== "customer_thread_updated" ||
          !payload.conversationId ||
          !conversationId ||
          payload.conversationId !== conversationId
        ) {
          return;
        }
        void (async () => {
          try {
            const res = await fetch(
              `/api/conversations/${encodeURIComponent(conversationId)}/customer-messages`,
            );
            if (!res.ok) return;
            const data = (await res.json()) as { messages?: DbCustomerMessage[] };
            const rows = data.messages ?? [];
            setMessages((prev) =>
              mergeDbRowsIntoCustomerChat(prev, rows, mergedDbIdsRef),
            );
          } catch {
            /* ignore */
          }
        })();
      } catch {
        /* ignore */
      }
    },
  });
}
