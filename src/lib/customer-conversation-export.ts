import type { UIMessage } from "ai";
import {
  getAssistantThreadKind,
  type ThreadMessageLike,
} from "@/lib/agent-thread-assistant-kind";

/** Bumped when export shape changes (v2: timestamps; v3: speakers; v4: channel + resolutionSource). */
export const CUSTOMER_CONVERSATION_EXPORT_SCHEMA_VERSION = 4 as const;

/** Narrative framing: labels are for a **support agent** viewer (who is customer vs AI vs human). */
export type ConversationExportFraming = "agent_workspace";

/** Who spoke — from the agent workspace / video script perspective (not raw `role`). */
export type AgentPerspectiveSpeaker =
  | "customer"
  | "customer_ai"
  | "human_agent"
  | "system_escalation"
  | "system";

export const AGENT_PERSPECTIVE_SPEAKER_LABELS: Record<AgentPerspectiveSpeaker, string> = {
  customer: "Customer",
  customer_ai: "F5 Support (AI)",
  human_agent: "Human agent",
  system_escalation: "System (escalation handoff)",
  system: "System",
};

function textFromUiMessage(m: UIMessage): string {
  return (
    m.parts
      ?.filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("") ?? ""
  );
}

function normalizeText(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/** Align with DB / merge logic: role + normalized text → first server timestamp wins. */
export function fingerprintMessageForTimestamp(role: string, text: string): string {
  return `${role}:${normalizeText(text)}`;
}

/** Build synthetic `UIMessage`s from DB rows (canonical order: ascending `createdAt`). */
export function serverRowsToUiMessages(
  rows: CustomerConversationServerRow[],
): import("ai").UIMessage[] {
  const sorted = [...rows].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  return sorted.map((r) => ({
    id: r.id,
    role: r.role as import("ai").UIMessage["role"],
    parts: [{ type: "text" as const, text: r.content }],
    metadata: { createdAt: r.createdAt },
  }));
}

export type CustomerConversationTranscriptLine = {
  /** Raw chat role (`user` | `assistant` | `system`). */
  role: string;
  /** Who is speaking from the **agent workspace** perspective (video / script). */
  speaker: AgentPerspectiveSpeaker;
  /** Human-readable label for `speaker` (e.g. "Human agent" vs "F5 Support (AI)"). */
  speakerLabel: string;
  id: string;
  text: string;
  /** ISO 8601 from the server when the message is persisted (customer-visible row). */
  createdAt: string | null;
  /**
   * Milliseconds after the **first** message in this transcript that has a known `createdAt`.
   * Useful for video pacing; `null` when `createdAt` is unknown.
   */
  offsetMsFromStart: number | null;
  /** `rules` = escalation + order heuristics; `ai` = LLM relabel (API `resolveWithAi`). */
  resolutionSource?: "rules" | "ai";
};

export type CustomerConversationServerRow = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

/** `browser` = ⌘D export; `api` = canonical GET `/api/conversations/[id]/agent-export` (best for Playwright). */
export type ConversationExportChannel = "browser" | "api";

export type CustomerConversationExportPayload = {
  schemaVersion: typeof CUSTOMER_CONVERSATION_EXPORT_SCHEMA_VERSION;
  /** How to read `transcript[].speaker` / `speakerLabel` for scripts and video. */
  framing: ConversationExportFraming;
  /** Where this JSON was produced (API export avoids client/server id drift). */
  exportChannel: ConversationExportChannel;
  exportedAt: string;
  source: "f5-customer-chat";
  conversationId: string | null;
  customerEmail: string;
  escalated: boolean;
  escalationReason: string;
  chatStatus: string;
  pendingUserText: string | null;
  /** When `pendingUserText` is set, this is the export time (approximate “pending bubble” time). */
  pendingUserTextNotedAt: string | null;
  /** ISO time of the first / last server-backed message in `transcript` (video window). */
  timelineFirstKnownAt: string | null;
  timelineLastKnownAt: string | null;
  /** Full `useChat` messages (AI SDK UI shape). */
  messages: UIMessage[];
  /** Flattened rows with timestamps for scripting / Remotion. */
  transcript: CustomerConversationTranscriptLine[];
  /** Optional: rows from GET /api/conversations/[id]/customer-messages (same order as API). */
  serverMessages?: CustomerConversationServerRow[];
  /** Set when `resolveWithAi` was requested but the model failed (rules-only transcript). */
  aiSpeakerResolutionError?: string;
};

function createdAtFromMetadata(m: UIMessage): string | null {
  const meta = m.metadata;
  if (!meta || typeof meta !== "object") return null;
  const c = (meta as { createdAt?: unknown }).createdAt;
  return typeof c === "string" ? c : null;
}

/**
 * Resolve `createdAt` per UI message using server rows: prefer id match, then fingerprint.
 */
export function resolveCreatedAtForMessages(
  messages: UIMessage[],
  serverRows: CustomerConversationServerRow[] | undefined,
): Map<string, string> {
  const out = new Map<string, string>();
  const byFpFirst = new Map<string, string>();

  if (serverRows?.length) {
    for (const row of serverRows) {
      const fp = fingerprintMessageForTimestamp(row.role, row.content);
      if (!byFpFirst.has(fp)) byFpFirst.set(fp, row.createdAt);
      out.set(row.id, row.createdAt);
    }
  }

  for (const m of messages) {
    if (out.has(m.id)) continue;
    const fromMeta = createdAtFromMetadata(m);
    if (fromMeta) {
      out.set(m.id, fromMeta);
      continue;
    }
    if (serverRows?.length) {
      const fp = fingerprintMessageForTimestamp(m.role, textFromUiMessage(m));
      const t = byFpFirst.get(fp);
      if (t) out.set(m.id, t);
    }
  }

  return out;
}

function buildThreadMessagesForKind(
  messages: UIMessage[],
  createdAtByMessageId: Map<string, string>,
  serverMessages: CustomerConversationServerRow[] | undefined,
): ThreadMessageLike[] {
  if (serverMessages?.length) {
    return [...serverMessages]
      .map((r) => ({
        id: r.id,
        role: r.role,
        content: r.content,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }
  return messages.map((m, i) => {
    const t =
      createdAtByMessageId.get(m.id) ??
      createdAtFromMetadata(m) ??
      new Date(Date.UTC(2020, 0, 1, 0, 0, i)).toISOString();
    return {
      id: m.id,
      role: m.role,
      content: textFromUiMessage(m),
      createdAt: t,
    };
  });
}

function resolveAgentPerspectiveSpeaker(
  m: UIMessage,
  text: string,
  threadForKind: ThreadMessageLike[],
): { speaker: AgentPerspectiveSpeaker; speakerLabel: string } {
  if (m.role === "user") {
    return { speaker: "customer", speakerLabel: AGENT_PERSPECTIVE_SPEAKER_LABELS.customer };
  }
  if (m.role === "system") {
    const speaker: AgentPerspectiveSpeaker = text.includes("Escalated to human agent")
      ? "system_escalation"
      : "system";
    return {
      speaker,
      speakerLabel: AGENT_PERSPECTIVE_SPEAKER_LABELS[speaker],
    };
  }
  if (m.role === "assistant") {
    const tm = threadForKind.find((x) => x.id === m.id);
    if (!tm) {
      return { speaker: "customer_ai", speakerLabel: AGENT_PERSPECTIVE_SPEAKER_LABELS.customer_ai };
    }
    const kind = getAssistantThreadKind(threadForKind, tm);
    if (kind === "human-agent") {
      return { speaker: "human_agent", speakerLabel: AGENT_PERSPECTIVE_SPEAKER_LABELS.human_agent };
    }
    return { speaker: "customer_ai", speakerLabel: AGENT_PERSPECTIVE_SPEAKER_LABELS.customer_ai };
  }
  return { speaker: "system", speakerLabel: AGENT_PERSPECTIVE_SPEAKER_LABELS.system };
}

function buildTranscript(
  messages: UIMessage[],
  createdAtByMessageId: Map<string, string>,
  serverMessages: CustomerConversationServerRow[] | undefined,
): CustomerConversationTranscriptLine[] {
  const threadForKind = buildThreadMessagesForKind(
    messages,
    createdAtByMessageId,
    serverMessages,
  );

  const lines: CustomerConversationTranscriptLine[] = messages.map((m) => {
    const text = textFromUiMessage(m);
    const createdAt = createdAtByMessageId.get(m.id) ?? createdAtFromMetadata(m) ?? null;
    const { speaker, speakerLabel } = resolveAgentPerspectiveSpeaker(m, text, threadForKind);
    return {
      role: m.role,
      speaker,
      speakerLabel,
      id: m.id,
      text,
      createdAt,
      offsetMsFromStart: null,
      resolutionSource: "rules" as const,
    };
  });

  const withTime = lines.filter((l) => l.createdAt);
  if (withTime.length === 0) {
    return lines;
  }

  const t0 = Math.min(...withTime.map((l) => Date.parse(l.createdAt!)));

  return lines.map((l) => ({
    ...l,
    offsetMsFromStart:
      l.createdAt !== null ? Date.parse(l.createdAt) - t0 : null,
  }));
}

export function buildCustomerConversationExport(input: {
  messages: UIMessage[];
  conversationId: string | null;
  customerEmail: string;
  escalated: boolean;
  escalationReason: string;
  chatStatus: string;
  pendingUserText: string | null;
  /** From GET /api/conversations/[id]/customer-messages when available. */
  serverMessages?: CustomerConversationServerRow[];
  exportChannel?: ConversationExportChannel;
}): CustomerConversationExportPayload {
  const exportedAt = new Date().toISOString();
  const createdAtByMessageId = resolveCreatedAtForMessages(
    input.messages,
    input.serverMessages,
  );
  const transcript = buildTranscript(
    input.messages,
    createdAtByMessageId,
    input.serverMessages,
  );

  const times = transcript
    .map((l) => l.createdAt)
    .filter((t): t is string => t !== null)
    .map((t) => Date.parse(t))
    .sort((a, b) => a - b);

  const timelineFirstKnownAt =
    times.length > 0 ? new Date(times[0]!).toISOString() : null;
  const timelineLastKnownAt =
    times.length > 0 ? new Date(times[times.length - 1]!).toISOString() : null;

  const pendingUserTextNotedAt =
    input.pendingUserText?.trim() ? exportedAt : null;

  return {
    schemaVersion: CUSTOMER_CONVERSATION_EXPORT_SCHEMA_VERSION,
    framing: "agent_workspace",
    exportChannel: input.exportChannel ?? "browser",
    exportedAt,
    source: "f5-customer-chat",
    conversationId: input.conversationId,
    customerEmail: input.customerEmail,
    escalated: input.escalated,
    escalationReason: input.escalationReason,
    chatStatus: input.chatStatus,
    pendingUserText: input.pendingUserText,
    pendingUserTextNotedAt,
    timelineFirstKnownAt,
    timelineLastKnownAt,
    messages: input.messages,
    transcript,
    serverMessages: input.serverMessages,
  };
}

/** Canonical export from DB rows only (no client `useChat` state) — use from API + Playwright. */
export function buildCanonicalAgentExportFromDb(input: {
  conversationId: string;
  customerEmail: string;
  status: string;
  escalationReason: string | null;
  serverMessages: CustomerConversationServerRow[];
}): CustomerConversationExportPayload {
  const ui = serverRowsToUiMessages(input.serverMessages);
  return buildCustomerConversationExport({
    messages: ui,
    conversationId: input.conversationId,
    customerEmail: input.customerEmail,
    escalated: input.status === "ESCALATED",
    escalationReason: input.escalationReason ?? "",
    chatStatus: "ready",
    pendingUserText: null,
    serverMessages: input.serverMessages,
    exportChannel: "api",
  });
}

export function downloadCustomerConversationJson(payload: CustomerConversationExportPayload): {
  filename: string;
  blobUrl: string;
} {
  const idPart = payload.conversationId?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) ?? "new";
  const filename = `f5-customer-conversation-${idPart}-${payload.exportedAt.replace(/[:.]/g, "-")}.json`;
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 2_000);
  return { filename, blobUrl };
}
