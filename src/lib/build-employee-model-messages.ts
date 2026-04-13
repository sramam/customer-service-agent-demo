import type { ModelMessage } from "ai";

type Row = {
  role: string;
  content: string;
  audience: string;
  createdAt: Date;
};

/**
 * Single chronological transcript for employee AI: customer-visible thread plus
 * internal employee↔employee-ai turns. DB is authoritative — not client useChat.
 */
export function buildEmployeeModelMessages(rows: Row[]): ModelMessage[] {
  const sorted = [...rows].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const out: ModelMessage[] = [];

  for (const m of sorted) {
    if (m.audience === "CUSTOMER_VISIBLE") {
      if (m.role === "user") {
        out.push({ role: "user", content: m.content });
      } else if (m.role === "assistant") {
        out.push({ role: "assistant", content: m.content });
      } else if (m.role === "system") {
        out.push({ role: "user", content: `[SYSTEM] ${m.content}` });
      }
    } else if (m.audience === "INTERNAL_ONLY") {
      if (m.role === "employee") {
        out.push({ role: "user", content: `[INTERNAL AGENT] ${m.content}` });
      } else if (m.role === "employee-ai") {
        out.push({ role: "assistant", content: m.content });
      }
    }
  }

  return out;
}
