import { useEffect, useRef } from "react";
import type { ChatStatus, UIMessage } from "ai";
import { isChatBusy } from "@/lib/chat-in-flight";

/** Suppresses a second auto-send for the same thread (e.g. React Strict Mode remount). */
const KICKOFF_DEDUP_MS = 2000;

/**
 * When the agent picks a different escalation thread, reset Employee AI chat and
 * send one kickoff prompt so the first internal response appears without a click.
 * Waits until no request is in flight so only one POST /api/agent-chat runs at a time.
 */
export function useEmployeeAiAutoKickoff(
  selectedId: string | null,
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>,
  setInput: React.Dispatch<React.SetStateAction<string>>,
  sendMessage: (message: { text: string }) => void,
  kickoffPrompt: string,
  status: ChatStatus,
  stop: () => void,
) {
  const prevSelectedIdRef = useRef<string | null>(null);
  const lastKickoffRef = useRef<{ conversationId: string; at: number } | null>(
    null,
  );
  const kickoffPendingRef = useRef(false);

  useEffect(() => {
    if (!selectedId) {
      prevSelectedIdRef.current = null;
      kickoffPendingRef.current = false;
      setMessages([]);
      setInput("");
      return;
    }

    const isNewSelection = prevSelectedIdRef.current !== selectedId;
    if (!isNewSelection) return;

    prevSelectedIdRef.current = selectedId;
    setMessages([]);
    setInput("");
    kickoffPendingRef.current = true;
    if (isChatBusy(status)) {
      stop();
    }
  }, [selectedId, setMessages, setInput, status, stop]);

  useEffect(() => {
    if (!selectedId || !kickoffPendingRef.current) return;
    if (isChatBusy(status)) return;

    const now = Date.now();
    const last = lastKickoffRef.current;
    if (
      last &&
      last.conversationId === selectedId &&
      now - last.at < KICKOFF_DEDUP_MS
    ) {
      kickoffPendingRef.current = false;
      return;
    }
    lastKickoffRef.current = { conversationId: selectedId, at: now };
    kickoffPendingRef.current = false;
    sendMessage({ text: kickoffPrompt });
  }, [selectedId, status, sendMessage, kickoffPrompt]);
}
