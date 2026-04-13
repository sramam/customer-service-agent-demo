import { useCallback, useEffect, useRef } from "react";
import type { ChatStatus } from "ai";
import { CLIENT_STREAM_AUTO_RETRY_MAX } from "@/lib/ai-retry";
import { isChatBusy } from "@/lib/chat-in-flight";

const DEFAULT_MAX_ATTEMPTS = CLIENT_STREAM_AUTO_RETRY_MAX;
const DEFAULT_DELAYS_MS = [1200, 2500, 5000];

/**
 * Automatic `regenerate()` after stream failures (e.g. OpenAI mid-stream `server_error`),
 * with backoff. Pair with `useChat` — call `syncStatus(status)` whenever status changes
 * (e.g. `useEffect(() => syncStatus(status), [status])`).
 */
export function useChatStreamAutoRetry(
  conversationKey: string | null,
  options?: { maxAttempts?: number; delaysMs?: number[] },
) {
  const attemptRef = useRef(0);
  /** 0 = first POST for this turn; 1..maxAttempts = after that many scheduled regenerates. */
  const streamRetryAttemptForBodyRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<ChatStatus>("ready");
  const depsRef = useRef({
    clearError: () => {},
    regenerate: async () => {},
  });

  const maxAttempts = options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const delaysMs = options?.delaysMs ?? DEFAULT_DELAYS_MS;

  const setRetryDeps = useCallback(
    (clearError: () => void, regenerate: () => Promise<void>) => {
      depsRef.current = { clearError, regenerate };
    },
    [],
  );

  const syncStatus = useCallback((status: ChatStatus) => {
    statusRef.current = status;
    if (isChatBusy(status) && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    attemptRef.current = 0;
    streamRetryAttemptForBodyRef.current = 0;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [conversationKey]);

  const onError = useCallback(
    (_error: Error) => {
      if (attemptRef.current >= maxAttempts) return;
      if (timeoutRef.current) return;
      // Do not check isChatBusy here: @ai-sdk/react calls onError *before* transitioning
      // status away from "streaming", so a busy check would block all mid-stream retries.

      const delay =
        delaysMs[attemptRef.current] ?? delaysMs[delaysMs.length - 1];
      timeoutRef.current = setTimeout(async () => {
        timeoutRef.current = null;
        attemptRef.current += 1;
        streamRetryAttemptForBodyRef.current = attemptRef.current;
        const { clearError, regenerate } = depsRef.current;
        clearError();
        if (isChatBusy(statusRef.current)) {
          attemptRef.current -= 1;
          return;
        }
        try {
          await regenerate();
        } catch {
          /* another onError may fire */
        }
      }, delay);
    },
    [maxAttempts, delaysMs],
  );

  const onFinish = useCallback((event: { isError: boolean }) => {
    if (!event.isError) {
      attemptRef.current = 0;
      streamRetryAttemptForBodyRef.current = 0;
    } else {
      // Clear label so the next manual send is not mistaken for a final retry; a scheduled
      // auto-retry timeout runs later and sets streamRetryAttemptForBodyRef again.
      streamRetryAttemptForBodyRef.current = 0;
    }
  }, []);

  const getStreamRetryMetaForBody = useCallback(() => {
    return {
      streamRetryAttempt: streamRetryAttemptForBodyRef.current,
      streamRetryMax: maxAttempts,
    };
  }, [maxAttempts]);

  return { onError, onFinish, setRetryDeps, syncStatus, getStreamRetryMetaForBody };
}
