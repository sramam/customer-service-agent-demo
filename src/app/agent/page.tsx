"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ConversationList,
  type ConversationSummary,
} from "@/components/agent-dashboard/conversation-list";
import { ReviewControls } from "@/components/agent-dashboard/review-controls";
import { CustomerInfoCard } from "@/components/agent-dashboard/customer-info-card";
import {
  AgentThreadMessageBody,
  EmployeeAiChatBubbleBody,
  getAssistantThreadKind,
} from "@/components/agent-dashboard/agent-message-body";
import { EscalationBanner } from "@/components/chat/escalation-banner";
import { Send, RefreshCw, MessageSquare, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseEmployeeResponse } from "@/lib/parse-response";
import Link from "next/link";

type ConversationDetail = ConversationSummary;

export default function AgentDashboard() {
  const [conversations, setConversations] = useState<ConversationDetail[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      setConversations(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const { messages: aiMessages, status, sendMessage, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent-chat",
      body: { conversationId: selectedId },
    }),
  });

  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [selectedId, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  const lastAIResponse = [...aiMessages]
    .reverse()
    .find((m) => m.role === "assistant");
  const lastAIText = lastAIResponse?.parts
    ?.filter((p) => p.type === "text")
    .map((p) => p.text)
    .join("");
  const parsed = lastAIText ? parseEmployeeResponse(lastAIText) : null;

  const handleAISend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || !selectedId) return;
      setInput("");
      sendMessage({ text });
    },
    [input, selectedId, sendMessage]
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col shrink-0">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h2 className="text-sm font-semibold">Escalated Conversations</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchConversations}
            className="h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Loading...
            </div>
          ) : (
            <ConversationList
              conversations={conversations}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </ScrollArea>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-sm">
                Select a conversation from the sidebar to begin.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Header with customer info */}
            <div className="px-6 py-3 border-b shrink-0 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {selected.customer?.name ?? selected.customerEmail}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Conversation {selected.id.slice(0, 8)}...
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    selected.status === "ESCALATED"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-green-100 text-green-800"
                  )}
                >
                  {selected.status}
                </span>
              </div>
              {selected.customer && (
                <CustomerInfoCard customer={selected.customer} />
              )}
            </div>

            {/* Single scroll: customer thread + employee workspace */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
              <div className="max-w-3xl mx-auto py-4 px-4 space-y-3">
                {selected.escalationReason && (
                  <EscalationBanner
                    reason={selected.escalationReason}
                    context="employee"
                  />
                )}
                {selected.messages
                  .filter((msg) => msg.audience !== "INTERNAL_ONLY")
                  .map((msg) => {
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
                        "bg-amber-50 border-amber-200 text-amber-900 text-center italic";
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
                          isCustomer ? "ml-auto max-w-[80%]" : "max-w-[80%]"
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
              </div>

              <Separator />

              <div className="border-t bg-gray-50">
                <div className="max-w-3xl mx-auto p-4 space-y-3 pb-8">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Employee AI (internal)
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Scroll with the conversation above. Only the draft below is sent to the customer.
                    </p>
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
                            <div className="min-w-0 overflow-x-auto">
                              <EmployeeAiChatBubbleBody text={text} isUser={isUser} />
                            </div>
                          </div>
                        );
                      })}
                      <div ref={bottomRef} />
                    </div>
                  )}

                  <form onSubmit={handleAISend} className="flex gap-2">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask the Employee AI (internal)…"
                      disabled={status === "streaming"}
                      className="flex-1 bg-white min-w-0"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!input.trim() || status === "streaming"}
                      className="shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>

                  {parsed && selectedId && (
                    <div className="pt-2">
                      <ReviewControls
                        internalNotes={parsed.internalNotes}
                        draftResponse={parsed.draftCustomerResponse}
                        citations={parsed.citations}
                        conversationId={selectedId}
                        onSent={() => {
                          fetchConversations();
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
