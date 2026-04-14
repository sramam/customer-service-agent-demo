"use client";

import { useState, useRef, useCallback, useMemo, useEffect, useLayoutEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { EmployeeAiBusyBar } from "@/components/agent-dashboard/employee-ai-busy-bar";
import { ReviewControls } from "@/components/agent-dashboard/review-controls";
import { AgentCustomerHeader } from "@/components/agent-dashboard/agent-customer-header";
import {
  AgentThreadMessageBody,
  EmployeeAiChatBubbleBody,
  getAssistantThreadKind,
} from "@/components/agent-dashboard/agent-message-body";
import { Send, RefreshCw, MessageSquare, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  displayEmployeeAiUserText,
  EMPLOYEE_AI_SUGGEST_DRAFT_PROMPT,
  getLastNonEmptyAssistantText,
} from "@/lib/employee-ai-ui";
import { parseEmployeeResponse } from "@/lib/parse-response";
import { useAgentThreadRealtime } from "@/hooks/use-agent-thread-realtime";
import { useAgentConversationSync } from "@/hooks/use-agent-conversation-sync";
import { useConversationsPartykit } from "@/hooks/use-conversations-partykit";
import { AgentEscalationsBurger } from "@/components/agent-dashboard/agent-thread-menu";
import { useEmployeeAiScrollFollow } from "@/hooks/use-employee-ai-scroll-follow";
import { useAgentThreadTailIntoView } from "@/hooks/use-agent-thread-tail-into-view";
import { useEmployeeAiAutoKickoff } from "@/hooks/use-employee-ai-auto-kickoff";
import { isChatBusy } from "@/lib/chat-in-flight";
import { CLIENT_STREAM_AUTO_RETRY_MAX } from "@/lib/ai-retry";
import { useEmployeeAiRefreshOnCustomerMessage } from "@/hooks/use-employee-ai-refresh-on-customer-message";
import { useChatStreamAutoRetry } from "@/hooks/use-chat-stream-auto-retry";
import Link from "next/link";

export default function AgentDashboard() {
  const { conversations, loading, refetch } = useConversationsPartykit();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useAgentThreadRealtime(selectedId, refetch);
  useAgentConversationSync(refetch);
  const [input, setInput] = useState("");
  const employeeScrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadTailRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const visibleThreadMessages = useMemo(
    () => selected?.messages.filter((msg) => msg.audience !== "INTERNAL_ONLY") ?? [],
    [selected?.messages],
  );
  const lastThreadMessageId = visibleThreadMessages[visibleThreadMessages.length - 1]?.id;

  const employeeStreamRetry = useChatStreamAutoRetry(selectedId);

  const agentBodyRef = useRef({
    conversationId: selectedId,
    streamRetryAttempt: 0,
    streamRetryMax: CLIENT_STREAM_AUTO_RETRY_MAX,
  });
  agentBodyRef.current = {
    conversationId: selectedId,
    ...employeeStreamRetry.getStreamRetryMetaForBody(),
  };

  const agentTransport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/agent-chat",
        body: () => agentBodyRef.current,
      }),
    [],
  );

  const {
    messages: aiMessages,
    status,
    sendMessage,
    setMessages,
    stop,
    error: employeeAiError,
    clearError: clearEmployeeAiError,
    regenerate: regenerateEmployee,
  } = useChat({
    transport: agentTransport,
    onError: employeeStreamRetry.onError,
    onFinish: employeeStreamRetry.onFinish,
  });

  useLayoutEffect(() => {
    employeeStreamRetry.setRetryDeps(clearEmployeeAiError, regenerateEmployee);
  }, [employeeStreamRetry, clearEmployeeAiError, regenerateEmployee]);

  useEffect(() => {
    employeeStreamRetry.syncStatus(status);
  }, [status, employeeStreamRetry]);

  useEmployeeAiAutoKickoff(
    selectedId,
    setMessages,
    setInput,
    sendMessage,
    EMPLOYEE_AI_SUGGEST_DRAFT_PROMPT,
    status,
    stop,
  );

  useEmployeeAiRefreshOnCustomerMessage(
    selectedId,
    selected?.messages,
    setMessages,
    setInput,
    sendMessage,
    EMPLOYEE_AI_SUGGEST_DRAFT_PROMPT,
    status,
    stop,
  );

  useEmployeeAiScrollFollow(
    employeeScrollRef,
    bottomRef,
    aiMessages,
    selectedId,
  );

  useAgentThreadTailIntoView(threadTailRef, selectedId, lastThreadMessageId);

  const lastAIText = getLastNonEmptyAssistantText(aiMessages);
  const parsed = lastAIText ? parseEmployeeResponse(lastAIText) : null;

  const handleAISend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || !selectedId || isChatBusy(status)) return;
      setInput("");
      sendMessage({ text });
    },
    [input, selectedId, sendMessage, status]
  );

  const handleSuggestEmployeeDraft = useCallback(() => {
    if (!selectedId || isChatBusy(status)) return;
    clearEmployeeAiError();
    sendMessage({ text: EMPLOYEE_AI_SUGGEST_DRAFT_PROMPT });
  }, [selectedId, status, sendMessage, clearEmployeeAiError]);

  return (
    <div className="flex h-full flex-col min-h-0">
      <div className="flex items-center gap-2 border-b px-4 py-2 shrink-0">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <AgentEscalationsBurger
          conversations={conversations}
          loading={loading}
          selectedId={selectedId}
          onSelect={(id) => {
            setSelectedId(id);
            void refetch();
          }}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          className="h-8 w-8"
          title="Refresh list"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2 px-4">
              <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-sm">
                Open the menu (☰) to choose an escalated conversation.
              </p>
            </div>
          </div>
        ) : (
          <>
            <AgentCustomerHeader
              key={selected.id}
              title={selected.customer?.name ?? selected.customerEmail}
              conversationIdPreview={`${selected.id.slice(0, 8)}...`}
              status={selected.status}
              customer={selected.customer ?? null}
            />

            {/* Single scroll: customer thread + employee workspace */}
            <div
              ref={employeeScrollRef}
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
            >
              <div className="max-w-3xl mx-auto py-4 px-4 space-y-3">
                {visibleThreadMessages.map((msg) => {
                    const isCustomer = msg.role === "user";
                    const isSystem = msg.role === "system";
                    const isHumanApproved = msg.role === "assistant";

                    let bgClass = "bg-white border-gray-200";
                    let label = "";
                    let bodyKind: "system" | "customer" | "customer-ai" | "human-agent" = "customer-ai";

                    if (isCustomer) {
                      bgClass = "bg-white border-gray-200";
                      label = "Customer";
                      bodyKind = "customer";
                    } else if (isSystem) {
                      bgClass =
                        "bg-slate-50/90 border-slate-200 text-slate-900 text-left max-w-full";
                      label = "";
                      bodyKind = "system";
                    } else if (isHumanApproved) {
                      const assistantKind = getAssistantThreadKind(
                        selected.messages,
                        msg
                      );
                      if (assistantKind === "human-agent") {
                        bgClass = "bg-emerald-50 border-emerald-200";
                        label = "Agent (You)";
                        bodyKind = "human-agent";
                      } else {
                        bgClass = "bg-blue-50 border-blue-100";
                        label = "AI Response";
                        bodyKind = "customer-ai";
                      }
                    }

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "rounded-lg px-4 py-3 border text-sm",
                          bgClass,
                          isCustomer
                            ? "ml-auto max-w-[80%]"
                            : isSystem
                              ? "w-full max-w-full"
                              : "max-w-[80%]"
                        )}
                      >
                        {label && (
                          <div className="text-xs font-medium mb-1 opacity-60">
                            {label}
                          </div>
                        )}
                        <AgentThreadMessageBody content={msg.content} kind={bodyKind} />
                      </div>
                    );
                  })}
                <div ref={threadTailRef} className="h-px w-full scroll-mt-2" aria-hidden />
              </div>

              <Separator />

              <div className="border-t bg-gray-50">
                <div className="max-w-3xl mx-auto p-4 space-y-3 pb-8">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Employee AI (internal)
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Selecting a thread runs Employee AI once. Internal notes appear in the chat; the customer draft is
                      only in the draft panel below (not duplicated in the bubble). Use the button to refresh after
                      new customer messages. Only the draft you approve is sent to the customer.
                    </p>
                    <EmployeeAiBusyBar busy={isChatBusy(status)} />
                    {employeeAiError && (
                      <p
                        className="text-[11px] text-red-900 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-2"
                        role="alert"
                      >
                        Employee AI hit an error (often a transient OpenAI{" "}
                        <code className="font-mono text-[10px]">server_error</code>). Up to three automatic retries run
                        with backoff; if this message remains, use &quot;Suggest internal notes + draft&quot; again.
                      </p>
                    )}
                  </div>

                  {aiMessages.length > 0 && (
                    <div className="space-y-2 max-w-full">
                      {aiMessages.map((msg) => {
                        const text = msg.parts
                          ?.filter((p) => p.type === "text")
                          .map((p) => p.text)
                          .join("");
                        if (!text) return null;
                        const isUser = msg.role === "user";
                        const bubbleText = isUser
                          ? displayEmployeeAiUserText(text)
                          : text;
                        return (
                          <div
                            key={msg.id}
                            className={cn(
                              "text-sm rounded px-3 py-2 min-w-0 max-w-full",
                              isUser
                                ? "bg-white border ml-auto max-w-[80%] text-right"
                                : "bg-gray-100 border max-w-[80%]"
                            )}
                          >
                            {!isUser && (
                              <div className="text-xs font-medium text-gray-500 mb-1">
                                Employee AI
                              </div>
                            )}
                            {isUser && (
                              <div className="text-xs font-medium text-gray-500 mb-1">
                                You
                              </div>
                            )}
                            <div className="min-w-0 overflow-x-auto">
                              <EmployeeAiChatBubbleBody
                                text={bubbleText}
                                isUser={isUser}
                              />
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="self-start text-xs h-7"
                      disabled={!selectedId || isChatBusy(status)}
                      onClick={handleSuggestEmployeeDraft}
                    >
                      Suggest internal notes + draft
                    </Button>
                    <form onSubmit={handleAISend} className="flex gap-2">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask the Employee AI (internal)…"
                        disabled={isChatBusy(status)}
                        className="flex-1 bg-white min-w-0"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!input.trim() || isChatBusy(status)}
                        className="shrink-0"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>

                  {parsed && selectedId && (
                    <div className="pt-2">
                      <ReviewControls
                        internalNotes={parsed.internalNotes}
                        draftResponse={parsed.draftCustomerResponse}
                        sources={parsed.sources}
                        conversationId={selectedId}
                        onSent={() => {
                          void refetch();
                          setMessages([]);
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
