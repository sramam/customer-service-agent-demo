import { useEffect, useRef } from "react";
import usePartySocket from "partysocket/react";

/**
 * Keeps the escalated thread in sync when the customer posts: same PartyKit room as
 * `notifyPartyConversationMessage` (party `main`, room = conversation id).
 * Falls back to light polling when NEXT_PUBLIC_PARTYKIT_HOST is unset.
 */
export function useAgentThreadRealtime(
  conversationId: string | null,
  refetch: () => void | Promise<void>,
) {
  const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "";
  const hostRef = useRef(host);
  hostRef.current = host;

  usePartySocket({
    host,
    party: "main",
    room: conversationId ?? "_",
    enabled: !!host && !!conversationId,
    onMessage() {
      void refetch();
    },
  });

  /** When PartyKit is off, poll as a fallback. With NEXT_PUBLIC_PARTYKIT_HOST set, the socket handles updates. */
  useEffect(() => {
    if (!conversationId) return;
    if (hostRef.current) return;
    const id = setInterval(() => {
      void refetch();
    }, 3000);
    return () => clearInterval(id);
  }, [conversationId, refetch]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refetch]);
}
