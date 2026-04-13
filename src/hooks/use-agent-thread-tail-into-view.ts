import { useLayoutEffect, type RefObject } from "react";

/**
 * Keeps the end of the customer-visible thread in view when the conversation loads
 * or new thread messages arrive (so latest customer lines are not left above the fold).
 */
export function useAgentThreadTailIntoView(
  threadTailRef: RefObject<HTMLElement | null>,
  conversationId: string | null,
  lastThreadMessageId: string | undefined,
) {
  useLayoutEffect(() => {
    if (!conversationId || !lastThreadMessageId) return;
    const id = requestAnimationFrame(() => {
      threadTailRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [conversationId, lastThreadMessageId]);
}
