import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModelV3 } from "@ai-sdk/provider";

/** Anthropic API key for Claude fallback (`ANTHROPIC_API_KEY`). */
export function getAnthropicApiKey(): string | undefined {
  const k = process.env.ANTHROPIC_API_KEY?.trim();
  return k || undefined;
}

export function createAnthropicLanguageModel(modelId: string): LanguageModelV3 {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("Anthropic API key missing: set ANTHROPIC_API_KEY");
  }
  return createAnthropic({ apiKey })(modelId);
}
