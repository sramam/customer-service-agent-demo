import { useCallback, useEffect, useState } from "react";
import usePartySocket from "partysocket/react";
import type { ConversationSummary } from "@/components/agent-dashboard/conversation-list";

/**
 * Escalation list: refetches when PartyKit broadcasts `{ type: "refresh" }`.
 * Falls back to initial HTTP load when `NEXT_PUBLIC_PARTYKIT_HOST` is unset.
 */
export function useConversationsPartykit() {
  const [conversations, setConversations] = useState<ConversationSummary[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as ConversationSummary[];
      setConversations(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "";

  usePartySocket({
    host,
    party: "escalations",
    room: "list",
    enabled: !!host,
    onMessage() {
      void refetch();
    },
  });

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { conversations, setConversations, loading, refetch };
}
