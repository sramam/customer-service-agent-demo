/**
 * Non-streaming counterpart to `anthropicFallbackIfConfigured` / `withOpenAiAnthropicFallback`
 * in `ai-fallback-language-model.ts` — same `ANTHROPIC_API_KEY` and `ANTHROPIC_FALLBACK_MODEL`.
 */
import { generateObject, type FlexibleSchema, type InferSchema } from "ai";
import { openai } from "@ai-sdk/openai";
import { createAnthropicLanguageModel, getAnthropicApiKey } from "@/lib/anthropic-model";

function anthropicFallbackModelId(): string {
  return process.env.ANTHROPIC_FALLBACK_MODEL ?? "claude-sonnet-4-6";
}

/**
 * `generateObject` with OpenAI, then one retry on Anthropic when `ANTHROPIC_API_KEY` is set.
 * Accepts **Zod**, **`zodToAiSchema()`**, or any `FlexibleSchema` from the AI SDK.
 */
export async function generateObjectPromptWithAnthropicFallback<
  SCHEMA extends FlexibleSchema<unknown>,
>(args: {
  label: string;
  openaiModelId: string;
  schema: SCHEMA;
  prompt: string;
}): Promise<{ object: InferSchema<SCHEMA> }> {
  const { label, openaiModelId, schema, prompt } = args;
  const primary = openai(openaiModelId);

  try {
    const r = await generateObject({
      model: primary,
      schema,
      prompt,
    });
    return { object: r.object as InferSchema<SCHEMA> };
  } catch (err) {
    if (!getAnthropicApiKey()) {
      throw err;
    }
    const fbId = anthropicFallbackModelId();
    console.warn(
      `[ai] ${label}: generateObject failed on OpenAI; retrying with Anthropic (${fbId})`,
      err,
    );
    const fallback = createAnthropicLanguageModel(fbId);
    const r = await generateObject({
      model: fallback,
      schema,
      prompt,
    });
    return { object: r.object as InferSchema<SCHEMA> };
  }
}

/** Same as {@link generateObjectPromptWithAnthropicFallback} for multimodal prompts (e.g. vision). */
export async function generateObjectMessagesWithAnthropicFallback<
  SCHEMA extends FlexibleSchema<unknown>,
>(args: {
  label: string;
  openaiModelId: string;
  schema: SCHEMA;
  messages: Parameters<typeof generateObject>[0] extends infer P
    ? P extends { messages: infer M }
      ? M extends undefined
        ? never
        : M
      : never
    : never;
}): Promise<{ object: InferSchema<SCHEMA> }> {
  const { label, openaiModelId, schema, messages } = args;
  const primary = openai(openaiModelId);

  try {
    const r = await generateObject({
      model: primary,
      schema,
      messages,
    });
    return { object: r.object as InferSchema<SCHEMA> };
  } catch (err) {
    if (!getAnthropicApiKey()) {
      throw err;
    }
    const fbId = anthropicFallbackModelId();
    console.warn(
      `[ai] ${label}: generateObject failed on OpenAI; retrying with Anthropic (${fbId})`,
      err,
    );
    const fallback = createAnthropicLanguageModel(fbId);
    const r = await generateObject({
      model: fallback,
      schema,
      messages,
    });
    return { object: r.object as InferSchema<SCHEMA> };
  }
}
