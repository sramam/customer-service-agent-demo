import type { LanguageModelV3, LanguageModelV3StreamPart } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import { getAnthropicApiKey } from "@/lib/anthropic-model";

function hasMeaningfulPrimaryOutput(part: LanguageModelV3StreamPart): boolean {
  if (part.type === "text-delta" && part.delta.length > 0) return true;
  if (part.type === "tool-input-start") return true;
  if (part.type === "reasoning-delta" && part.delta.length > 0) return true;
  return false;
}

async function pumpStreamToController(
  stream: ReadableStream<LanguageModelV3StreamPart>,
  controller: ReadableStreamDefaultController<LanguageModelV3StreamPart>,
) {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      controller.enqueue(value);
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * If the primary provider errors **before** any meaningful output, retry once with `fallback`.
 * Mid-stream errors after text/tools have started are passed through (same as today).
 */
export function withOpenAiAnthropicFallback(
  primary: LanguageModelV3,
  fallback: LanguageModelV3,
  label: string,
): LanguageModelV3 {
  return wrapLanguageModel({
    model: primary,
    middleware: {
      specificationVersion: "v3",
      wrapStream: async ({ doStream, params }) => {
        let primaryResult: Awaited<ReturnType<LanguageModelV3["doStream"]>>;
        try {
          primaryResult = await doStream();
        } catch (err) {
          console.warn(
            `[ai] ${label}: primary stream failed to start; using Anthropic fallback`,
            err,
          );
          return fallback.doStream(params);
        }

        const stream = new ReadableStream<LanguageModelV3StreamPart>({
          async start(controller) {
            const reader = primaryResult.stream.getReader();
            const buffer: LanguageModelV3StreamPart[] = [];
            let passedThrough = false;

            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) {
                  if (!passedThrough) {
                    for (const b of buffer) controller.enqueue(b);
                  }
                  controller.close();
                  return;
                }

                if (passedThrough) {
                  controller.enqueue(value);
                  continue;
                }

                if (hasMeaningfulPrimaryOutput(value)) {
                  for (const b of buffer) controller.enqueue(b);
                  buffer.length = 0;
                  controller.enqueue(value);
                  passedThrough = true;
                  continue;
                }

                if (value.type === "error") {
                  console.warn(
                    `[ai] ${label}: primary stream error before meaningful output; using Anthropic fallback`,
                    value.error,
                  );
                  const fb = await fallback.doStream(params);
                  await pumpStreamToController(fb.stream, controller);
                  controller.close();
                  return;
                }

                buffer.push(value);
              }
            } catch (e) {
              controller.error(e);
            } finally {
              reader.releaseLock();
            }
          },
        });

        return { ...primaryResult, stream };
      },
    },
  });
}

export function anthropicFallbackIfConfigured(
  primary: LanguageModelV3,
  label: string,
  getFallback: () => LanguageModelV3,
): LanguageModelV3 {
  if (!getAnthropicApiKey()) {
    return primary;
  }
  return withOpenAiAnthropicFallback(primary, getFallback(), label);
}
