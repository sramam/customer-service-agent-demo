"use client";

import type { ReactNode } from "react";
import { MarkdownContent } from "@/components/markdown-content";
import type { CustomerAgentResponse, StoredMessage } from "@/lib/types";
import {
  displayTextForEmployeeAiMarkdown,
  stripLegacyInlineCitationMarkers,
  toCustomerAgentResponse,
  toHumanAgentThreadBody,
} from "@/lib/parse-response";
import { cn } from "@/lib/utils";
import { AlertTriangle, BookOpen, FileDown } from "lucide-react";
import { parseEscalationHandoffMessage } from "@/lib/parse-escalation-handoff";
import { getAssistantThreadKind as getAssistantThreadKindCore } from "@/lib/agent-thread-assistant-kind";

/**
 * After escalation, the DB order is: … user, [system "Escalated…"], [assistant = customer AI reply].
 * The first assistant row after the escalation system message is still F5 customer AI (persisted in
 * onFinish), not the human agent. Only later assistant rows are human.
 */
export function getAssistantThreadKind(
  allMessages: StoredMessage[],
  msg: StoredMessage,
): "customer-ai" | "human-agent" {
  return getAssistantThreadKindCore(allMessages, msg);
}

export type AgentThreadMessageKind =
  | "system"
  | "customer"
  | "customer-ai"
  | "human-agent";

function ThreadSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{children}</p>
  );
}

function ThreadEmptyRow() {
  return <p className="text-xs text-slate-400 italic">—</p>;
}

/** Multi-sentence handoff context: first sentence + nested detail bullets. */
function EscalationContextList({ text }: { text: string }) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 1) {
    return (
      <p className="text-sm text-slate-800 leading-snug whitespace-pre-wrap">{text}</p>
    );
  }
  const [first, ...rest] = sentences;
  return (
    <ul className="list-none space-y-1.5 text-sm text-slate-800 leading-snug">
      <li>
        <span className="font-medium text-slate-900">{first}</span>
        <ul className="mt-1.5 list-disc pl-5 space-y-1 marker:text-slate-400">
          {rest.map((s, i) => (
            <li key={i} className="pl-0.5">
              {s}
            </li>
          ))}
        </ul>
      </li>
    </ul>
  );
}

/** Structured replacement for the long italic “Escalated to human agent:” system line in the agent thread. */
function AgentEscalationHandoffCard({ content }: { content: string }) {
  const parsed = parseEscalationHandoffMessage(content);
  if (!parsed.ok) {
    return (
      <div className="text-xs text-slate-800 whitespace-pre-wrap leading-snug not-italic">
        {content}
      </div>
    );
  }

  const { summary, products, context } = parsed;

  return (
    <div className="space-y-3 text-left not-italic w-full min-w-0">
      <div className="flex items-center gap-2 text-slate-800">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
          Escalation handoff
        </span>
      </div>

      <div className="space-y-2.5 border-t border-slate-200/70 pt-2.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
            Customer ask
          </p>
          <p className="text-sm text-slate-900 leading-snug">
            {summary.trim() || "—"}
          </p>
        </div>

        {products.length > 0 ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Products
            </p>
            <ul className="list-disc pl-5 space-y-0.5 text-sm text-slate-800 marker:text-slate-400">
              {products.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {context?.trim() ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
              Agent context
            </p>
            <EscalationContextList text={context.trim()} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Zod-normalized customer-AI message: body + sources + chip labels (empty sections show “—”). */
function AgentThreadCustomerAiBody({
  data,
  className,
}: {
  data: CustomerAgentResponse;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3 text-left w-full min-w-0", className)}>
      <div className="min-w-0">
        <ThreadSectionLabel>Reply body</ThreadSectionLabel>
        <MarkdownContent
          content={
            data.text.trim()
              ? stripLegacyInlineCitationMarkers(data.text)
              : "—"
          }
          className="text-sm leading-snug [&_p]:my-1 [&_p:first-child]:mt-0 [&_ul]:my-1 [&_ol]:my-1 [&_a]:break-all"
        />
      </div>
      <div className="rounded-md border border-slate-200/90 bg-white/60 px-2.5 py-2">
        <ThreadSectionLabel>Sources</ThreadSectionLabel>
        {data.sources.length === 0 ? (
          <ThreadEmptyRow />
        ) : (
          <ul className="space-y-1.5">
            {data.sources.map((c, i) => (
              <li key={`${c.docFile ?? c.url ?? c.title}-${i}`} className="text-xs text-slate-600 flex gap-1.5 items-start">
                {c.source === "invoice" ? (
                  <FileDown className="h-3 w-3 shrink-0 mt-0.5 text-slate-400" aria-hidden />
                ) : (
                  <BookOpen className="h-3 w-3 shrink-0 mt-0.5 text-slate-400" aria-hidden />
                )}
                <span>
                  <span className="tabular-nums font-medium text-slate-500">{i + 1}.</span>{" "}
                  <span className="font-medium">{c.title || "—"}</span>
                  {c.excerpt ? (
                    <span className="text-slate-500"> — {c.excerpt}</span>
                  ) : (
                    <span className="text-slate-400 italic"> — —</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="rounded-md border border-slate-200/90 bg-white/60 px-2.5 py-2">
        <ThreadSectionLabel>Suggested customer chips</ThreadSectionLabel>
        {data.suggestedQuestions.length === 0 ? (
          <ThreadEmptyRow />
        ) : (
          <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5">
            {data.suggestedQuestions.map((q, i) => (
              <li key={i}>{q || "—"}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function AgentThreadHumanAgentBody({ bodyMarkdown, className }: { bodyMarkdown: string; className?: string }) {
  return (
    <div className={cn("space-y-2 text-left w-full min-w-0", className)}>
      <ThreadSectionLabel>Message to customer</ThreadSectionLabel>
      <MarkdownContent
        content={bodyMarkdown.trim() ? bodyMarkdown : "—"}
        className="text-sm leading-snug [&_p]:my-1 [&_p:first-child]:mt-0 [&_ul]:my-1 [&_ol]:my-1 [&_a]:break-all"
      />
    </div>
  );
}

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
      <div className={cn("text-xs leading-snug", className)}>
        <AgentEscalationHandoffCard content={content} />
      </div>
    );
  }

  if (kind === "customer") {
    return (
      <MarkdownContent
        content={content}
        className={cn(
          "text-sm leading-snug [&_p]:my-1 [&_p:first-child]:mt-0 [&_ul]:my-1 [&_ol]:my-1 [&_a]:break-all",
          className
        )}
      />
    );
  }

  if (kind === "customer-ai") {
    const data = toCustomerAgentResponse(content);
    return <AgentThreadCustomerAiBody data={data} className={className} />;
  }

  const bodyMarkdown = toHumanAgentThreadBody(content);
  return <AgentThreadHumanAgentBody bodyMarkdown={bodyMarkdown} className={className} />;
}

/** Renders streaming Employee AI `useChat` messages (JSON envelope parsed for display). */
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
