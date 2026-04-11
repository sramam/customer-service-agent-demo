/**
 * Vercel AI SDK: `maxRetries` is the number of retries after the first failed
 * attempt for **retryable** `APICallError`s (with exponential backoff).
 * maxRetries: 2 → up to 3 total attempts per `streamText` / `generateText` call.
 *
 * Streaming routes (`/api/chat`, `/api/agent-chat`) use only SDK retries to avoid
 * duplicate persisted messages. Routing (`classifyRoute`) uses `withAiAttempts`
 * so intermittent **non-retryable** provider errors still get extra tries.
 */
export const AI_SDK_MAX_RETRIES = 2;

/** Extra SDK retries for `/api/agent-chat` (transient provider errors during streaming). */
export const AI_AGENT_STREAM_MAX_RETRIES = 4;

export const AI_OUTER_ATTEMPTS = 3;

/** Outer attempts including the first try (default: {@link AI_OUTER_ATTEMPTS}). */
export async function withAiAttempts<T>(
  fn: () => Promise<T>,
  attempts: number = AI_OUTER_ATTEMPTS,
  baseDelayMs = 500
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, baseDelayMs * (i + 1)));
    }
  }
  throw last;
}
