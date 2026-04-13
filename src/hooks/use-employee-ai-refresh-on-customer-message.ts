import { useEffect, useRef } from "react";
import type { ChatStatus, UIMessage } from "ai";
import type { StoredMessage } from "@/lib/types";
import { isChatBusy } from "@/lib/chat-in-flight";

function lastCustomerVisibleUserMessageId(
  threadMessages: StoredMessage[] | undefined,
): string | null {
  if (!threadMessages?.length) return null;
  const users = threadMessages.filter(
    (m) => m.audience === "CUSTOMER_VISIBLE" && m.role === "user",
  );
  const last = users[users.length - 1];
  return last?.id ?? null;
}

/**
 * When the customer posts a new message on the open thread, refresh Employee AI:
 * stop streaming, clear copilot state, re-run the suggest-draft kickoff so notes/draft match the latest thread.
 * Defers kickoff until idle so only one /api/agent-chat request runs at a time.
 */
export function useEmployeeAiRefreshOnCustomerMessage(
  selectedId: string | null,
  threadMessages: StoredMessage[] | undefined,
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>,
  setInput: React.Dispatch<React.SetStateAction<string>>,
  sendMessage: (message: { text: string }) => void,
  kickoffPrompt: string,
  status: ChatStatus,
  stop: () => void,
) {
  const prevThreadRef = useRef<string | null>(null);
  const lastCustomerMsgIdRef = useRef<string | null>(null);
  const refreshPendingRef = useRef(false);

  useEffect(() => {
    if (!selectedId) {
      prevThreadRef.current = null;
      lastCustomerMsgIdRef.current = null;
      refreshPendingRef.current = false;
      return;
    }

    const lastId = lastCustomerVisibleUserMessageId(threadMessages);

    if (prevThreadRef.current !== selectedId) {
      prevThreadRef.current = selectedId;
      lastCustomerMsgIdRef.current = lastId;
      return;
    }

    if (lastId === null) {
      return;
    }

    if (lastCustomerMsgIdRef.current === null) {
      lastCustomerMsgIdRef.current = lastId;
      return;
    }

    if (lastId === lastCustomerMsgIdRef.current) {
      return;
    }

    lastCustomerMsgIdRef.current = lastId;
    refreshPendingRef.current = true;

    if (isChatBusy(status)) {
      stop();
    }
    setMessages([]);
    setInput("");
  }, [
    selectedId,
    threadMessages,
    setMessages,
    setInput,
    status,
    stop,
  ]);

  // Must depend on `threadMessages`: when the customer posts, only this changes — selectedId/status/sendMessage often stay the same, so without this the kickoff never ran.
  useEffect(() => {
    if (!selectedId || !refreshPendingRef.current) return;
    if (isChatBusy(status)) return;
    refreshPendingRef.current = false;
    sendMessage({ text: kickoffPrompt });
  }, [selectedId, status, sendMessage, kickoffPrompt, threadMessages]);
}
