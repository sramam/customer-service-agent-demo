import { useEffect, type RefObject } from "react";

const NEAR_BOTTOM_PX = 160;

/**
 * Follows the Employee AI transcript while messages stream, without fighting the user:
 * uses `block: "end"` (not the default `"start"`, which pins the anchor to the top of
 * the viewport and jumps the scroll away from what you're reading).
 * Only auto-scrolls if the user is already near the bottom of `scrollContainerRef`.
 */
export function useEmployeeAiScrollFollow(
  scrollContainerRef: RefObject<HTMLElement | null>,
  bottomRef: RefObject<HTMLElement | null>,
  aiMessages: unknown[],
  selectedConversationId: string | null,
) {
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedConversationId]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) return;
    const nearBottom =
      root.scrollHeight - root.scrollTop - root.clientHeight < NEAR_BOTTOM_PX;
    if (!nearBottom) return;
    const id = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [aiMessages]);
}
