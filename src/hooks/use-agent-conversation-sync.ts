import { useEffect } from "react";
import { F5_CONVERSATION_MESSAGES_UPDATED } from "@/lib/agent-sync-events";

/**
 * Split-view / same-tab: when the customer pane finishes sending a message (escalated
 * thread), refetch agent conversation data immediately. PartyKit (or 3s polling when
 * NEXT_PUBLIC_PARTYKIT_HOST is unset) covers other tabs and deploys.
 */
export function useAgentConversationSync(
  refetch: () => void | Promise<void>,
) {
  useEffect(() => {
    function handler() {
      void refetch();
    }
    window.addEventListener(F5_CONVERSATION_MESSAGES_UPDATED, handler);
    return () =>
      window.removeEventListener(F5_CONVERSATION_MESSAGES_UPDATED, handler);
  }, [refetch]);
}
