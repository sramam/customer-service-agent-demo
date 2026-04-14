import { createUIMessageStream, generateId } from "ai";
import type { UIMessage } from "ai";

/**
 * Minimal UI message stream for a single assistant text (used when replaying validated
 * output or returning a schema-valid fallback without running `streamText` again).
 */
export function createSyntheticAssistantTextStream(
  text: string,
  originalMessages?: UIMessage[],
) {
  return createUIMessageStream({
    originalMessages,
    execute({ writer }) {
      const messageId = generateId();
      const textId = generateId();
      writer.write({ type: "start", messageId });
      writer.write({ type: "text-start", id: textId });
      writer.write({ type: "text-delta", id: textId, delta: text });
      writer.write({ type: "text-end", id: textId });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });
}
