import type { JSONSchema7 } from "@ai-sdk/provider";
import { jsonSchema } from "ai";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { Options } from "zod-to-json-schema";

/**
 * Convert a Zod schema to the AI SDK’s `jsonSchema()` wrapper: providers receive **JSON Schema** on
 * the wire, while validation still uses **Zod** (`safeParse`). Prefer over raw Zod in `generateObject`
 * when you need control over serialization (e.g. `target: "openAi"`, email as `format:email` vs regex).
 */
export function zodToAiSchema<T extends z.ZodTypeAny>(
  zod: T,
  opts?: Partial<Options<"openAi" | "jsonSchema7">>,
) {
  const raw = zodToJsonSchema(zod, {
    $refStrategy: "none",
    target: "openAi",
    emailStrategy: "format:email",
    ...opts,
  });

  return jsonSchema<z.infer<T>>(raw as JSONSchema7, {
    validate: (value) => {
      const r = zod.safeParse(value);
      if (r.success) {
        return { success: true, value: r.data };
      }
      return {
        success: false,
        error: new Error(
          r.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`).join("; "),
        ),
      };
    },
  });
}
