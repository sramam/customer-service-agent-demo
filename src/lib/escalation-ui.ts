import type { UIMessage } from "ai";

/**
 * AI SDK v6 represents tool UI parts as `type: "tool-<toolName>"` (e.g. `tool-requestEscalation`)
 * with `state`, `input`, and `output` — not `type: "tool-invocation"`.
 */
function reasonFromToolPayload(input: unknown, output: unknown): string {
  const inp = input as
    | {
        reason?: string;
        changeSummary?: string;
        productsInvolved?: string[];
        contextForAgent?: string;
      }
    | undefined;
  const out = output as { reason?: string } | undefined;
  if (out?.reason) return out.reason;
  if (inp?.reason) return inp.reason;
  if (inp?.changeSummary) {
    const lines = [inp.changeSummary.trim(), `Products: ${(inp.productsInvolved ?? []).join(", ")}`];
    if (inp.contextForAgent?.trim()) {
      lines.push(`Context: ${inp.contextForAgent.trim()}`);
    }
    return lines.filter((l) => l.length > 0).join("\n");
  }
  return "Escalated to human agent";
}

export function extractEscalationReasonFromMessage(
  msg: UIMessage | undefined
): string | null {
  if (!msg || msg.role !== "assistant") return null;
  const parts = msg.parts ?? [];

  for (const p of parts) {
    const part = p as {
      type: string;
      state?: string;
      toolName?: string;
      input?: unknown;
      output?: unknown;
    };

    if (part.type === "dynamic-tool" && part.toolName === "requestEscalation") {
      if (
        part.state === "output-available" ||
        part.state === "output-error"
      ) {
        return reasonFromToolPayload(part.input, part.output);
      }
    }

    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      const name = part.type.slice("tool-".length);
      if (name === "requestEscalation" || name.toLowerCase().includes("escalat")) {
        if (
          part.state === "output-available" ||
          part.state === "output-error"
        ) {
          return reasonFromToolPayload(part.input, part.output);
        }
      }
    }

    // Legacy shape (older SDK / examples)
    if (part.type === "tool-invocation") {
      const legacy = part as unknown as {
        toolInvocation?: {
          toolName?: string;
          state?: string;
          args?: { reason?: string };
        };
      };
      const inv = legacy.toolInvocation;
      if (
        inv?.toolName === "requestEscalation" &&
        inv.state === "result"
      ) {
        return inv.args?.reason ?? "Escalated to human agent";
      }
    }
  }

  return null;
}

/** Heuristic when the model describes escalation in prose but tool parts are missing. */
export function looksLikeEscalationProse(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /escalat/.test(t) &&
    (/human agent|specialist|support team|human support/.test(t) ||
      /been escalated|request has been escalated/.test(t))
  );
}
