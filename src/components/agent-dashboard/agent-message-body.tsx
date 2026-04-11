"use client";

import { MarkdownContent } from "@/components/markdown-content";
import type { StoredMessage } from "@/lib/types";
import {
  displayTextForEmployeeAiMarkdown,
  parseCustomerResponse,
} from "@/lib/parse-response";
import { cn } from "@/lib/utils";

/**
 * After escalation, the DB order is: … user, [system "Escalated…"], [assistant = customer AI reply].
 * The first assistant row after the escalation system message is still F5 customer AI (persisted in
 * onFinish), not the human agent. Only later assistant rows are human.
 */
export function getAssistantThreadKind(
  allMessages: StoredMessage[],
  msg: StoredMessage
): "customer-ai" | "human-agent" {
  if (msg.role !== "assistant") return "customer-ai";

  const escalationSystem = allMessages.find(
    (m) =>
      m.role === "system" &&
      m.content.includes("Escalated to human agent")
  );

  if (!escalationSystem) {
    return "customer-ai";
  }

  const escT = new Date(escalationSystem.createdAt).getTime();
  const msgT = new Date(msg.createdAt).getTime();

  if (msgT <= escT) {
    return "customer-ai";
  }

  const assistantsAfterEscalation = allMessages
    .filter((m) => m.role === "assistant" && new Date(m.createdAt).getTime() > escT)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  if (assistantsAfterEscalation.length === 0) {
    return "customer-ai";
  }

  return assistantsAfterEscalation[0].id === msg.id ? "customer-ai" : "human-agent";
}

export type AgentThreadMessageKind =
  | "system"
  | "customer"
  | "customer-ai"
  | "human-agent";

/** Renders persisted thread messages in the agent dashboard (DB `Message.content`). */
export function AgentThreadMessageBody({
  content,
  kind,
  className,
}: {
  content: string;
  kind: AgentThreadMessageKind;
  className?: string;
}) {
  if (kind === "system") {
    return (
      <div className={cn("text-xs whitespace-pre-wrap italic leading-snug", className)}>
        {content}
      </div>
    );
  }

  const md =
    kind === "customer-ai" || kind === "human-agent"
      ? parseCustomerResponse(content).text
      : content;

  return (
    <MarkdownContent
      content={md}
      className={cn(
        "text-sm leading-snug [&_p]:my-1 [&_p:first-child]:mt-0 [&_ul]:my-1 [&_ol]:my-1 [&_a]:break-all",
        className
      )}
    />
  );
}

/** Renders streaming Employee AI `useChat` messages (delimiter / JSON stripped). */
export function EmployeeAiChatBubbleBody({
  text,
  isUser,
}: {
  text: string;
  isUser: boolean;
}) {
  const md = isUser ? text : displayTextForEmployeeAiMarkdown(text);
  return (
    <MarkdownContent
      content={md}
      className="text-sm leading-snug [&_p]:my-1 [&_p:first-child]:mt-0 [&_ul]:my-1 [&_ol]:my-1"
    />
  );
}
