"use client";

import { useState, useCallback, useMemo, useEffect, useLayoutEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ChatPanel } from "@/components/chat/chat-panel";
import { EscalationBanner } from "@/components/chat/escalation-banner";
import { ReviewControls } from "@/components/agent-dashboard/review-controls";
import { AgentCustomerHeader } from "@/components/agent-dashboard/agent-customer-header";
import {
  AgentThreadMessageBody,
  EmployeeAiChatBubbleBody,
  getAssistantThreadKind,
} from "@/components/agent-dashboard/agent-message-body";
import { ProductBadge } from "@/components/product-icon";
import { DocViewerPanel, type DocViewerState } from "@/components/doc-viewer-dialog";
import { parseCustomerResponse } from "@/lib/parse-response";
import {
  displayEmployeeAiUserText,
  EMPLOYEE_AI_SUGGEST_DRAFT_PROMPT,
  getLastNonEmptyAssistantText,
} from "@/lib/employee-ai-ui";
import { parseEmployeeResponse } from "@/lib/parse-response";
import { useCustomerEscalationSyncFromDb } from "@/hooks/use-customer-escalation-sync-from-db";
import { cn } from "@/lib/utils";
import { useAgentThreadRealtime } from "@/hooks/use-agent-thread-realtime";
import { useAgentConversationSync } from "@/hooks/use-agent-conversation-sync";
import { useCustomerMessagePartykit } from "@/hooks/use-customer-message-partykit";
import { useConversationsPartykit } from "@/hooks/use-conversations-partykit";
import { EmployeeAiBusyBar } from "@/components/agent-dashboard/employee-ai-busy-bar";
import { AgentEscalationsBurger } from "@/components/agent-dashboard/agent-thread-menu";
import { F5_CONVERSATION_MESSAGES_UPDATED } from "@/lib/agent-sync-events";
import { useEmployeeAiAutoKickoff } from "@/hooks/use-employee-ai-auto-kickoff";
import { useEmployeeAiRefreshOnCustomerMessage } from "@/hooks/use-employee-ai-refresh-on-customer-message";
import { useEmployeeAiScrollFollow } from "@/hooks/use-employee-ai-scroll-follow";
import { useAgentThreadTailIntoView } from "@/hooks/use-agent-thread-tail-into-view";
import { useChatInputFocus } from "@/hooks/use-chat-input-focus";
import { isChatBusy } from "@/lib/chat-in-flight";
import { useChatStreamAutoRetry } from "@/hooks/use-chat-stream-auto-retry";
import { CLIENT_STREAM_AUTO_RETRY_MAX } from "@/lib/ai-retry";
import { CustomerThreadPicker } from "@/components/customer/customer-thread-picker";
import { useDemoCustomerClaim } from "@/hooks/use-demo-customer-claim";
import Image from "next/image";
import {
  Send,
  ArrowRight,
  ArrowLeft,
  Headset,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  FileText,
  X,
} from "lucide-react";

const CUSTOMERS = [
  { email: "alice@acmecorp.com", name: "Alice Chen", company: "Acme Corp", plan: "Enterprise / Premium", products: ["BIG-IP LTM", "BIG-IP ASM", "NGINX One", "Distributed Cloud WAAP"] },
  { email: "bob@globallogistics.io", name: "Bob Martinez", company: "Global Logistics Inc", plan: "Business / Standard", products: ["BIG-IP LTM", "SSL Orchestrator"] },
  { email: "carla@nordikbank.se", name: "Carla Johansson", company: "Nordik Bank AB", plan: "Enterprise / Premium", products: ["Distributed Cloud WAAP", "NGINX App Protect", "F5 DNS", "NGINX One"] },
  { email: "david@startuplab.dev", name: "David Park", company: "StartupLab", plan: "Starter / Basic", products: ["NGINX One"] },
  { email: "elena@medicohealth.eu", name: "Elena Rossi", company: "Medico Health Systems", plan: "Enterprise / Premium", products: ["BIG-IP LTM", "BIG-IP APM", "BIG-IQ", "SSL Orchestrator"] },
];

const PRODUCT_QUESTIONS: Record<string, string[]> = {
  "BIG-IP LTM": [
    "What traffic management features does BIG-IP LTM offer?",
    "How do I configure virtual servers on BIG-IP LTM?",
    "What health monitors are available in LTM?",
  ],
  "BIG-IP ASM": [
    "What are BIG-IP ASM's key WAF capabilities?",
    "How does ASM protect against OWASP Top 10?",
    "How do I tune ASM security policies to reduce false positives?",
  ],
  "BIG-IP APM": [
    "How does BIG-IP APM handle VPN and SSO?",
    "What MFA integrations does APM support?",
    "How do I set up per-app VPN with APM?",
  ],
  "BIG-IQ": [
    "How does BIG-IQ centralize device management?",
    "Can I manage license pools across devices with BIG-IQ?",
    "What visibility and analytics does BIG-IQ provide?",
  ],
  "NGINX One": [
    "What's included in NGINX One?",
    "How do I configure load balancing in NGINX One?",
    "What monitoring and observability does NGINX One offer?",
  ],
  "NGINX App Protect": [
    "How does NGINX App Protect differ from BIG-IP ASM?",
    "What deployment models does App Protect support?",
    "How do I update App Protect attack signatures?",
  ],
  "Distributed Cloud WAAP": [
    "What does Distributed Cloud WAAP protect against?",
    "How is Distributed Cloud WAAP deployed at the edge?",
    "What bot mitigation capabilities does DC WAAP include?",
  ],
  "SSL Orchestrator": [
    "How does SSL Orchestrator handle encrypted traffic inspection?",
    "What service chains can SSL Orchestrator manage?",
    "How do I configure bypass rules for sensitive traffic?",
  ],
  "F5 DNS": [
    "What global server load balancing features does F5 DNS offer?",
    "How does F5 DNS handle site failover and disaster recovery?",
    "What DNS query types and records does F5 DNS support?",
  ],
};

const ACCOUNT_QUESTIONS = [
  "Can I download my latest invoice?",
  "What is my current account status and support tier?",
  "What products are on my account?",
  "When does my current contract renew?",
];

function getStarterQuestions(products: string[]): string[] {
  const techQs: string[] = [];
  for (let i = 0; i < products.length && techQs.length < 3; i++) {
    const pqs = PRODUCT_QUESTIONS[products[i]];
    if (pqs) techQs.push(pqs[i % pqs.length]);
  }
  const acctSlots = Math.min(2, 5 - techQs.length);
  return [...techQs, ...ACCOUNT_QUESTIONS.slice(0, Math.max(1, acctSlots))];
}

// ─── Customer Panel ──────────────────────────────────────────────────────────

function CustomerPicker({
  onSelect,
  isProfileInUse,
}: {
  onSelect: (email: string) => void | Promise<void>;
  isProfileInUse: (email: string) => boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Image src="/logos/f5.svg" alt="F5" width={28} height={28} />
          <div>
            <h1 className="text-lg font-bold tracking-tight">F5 Support Chat</h1>
            <p className="text-xs text-muted-foreground">
              Select your account to begin. Each profile can only be used in one browser session at
              a time for this demo.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {CUSTOMERS.map((c) => {
            const inUse = isProfileInUse(c.email);
            return (
              <button
                key={c.email}
                type="button"
                disabled={inUse}
                data-testid={`demo-select-customer-${c.email.replace(/[@.]/g, "-")}`}
                onClick={() => void onSelect(c.email)}
                title={
                  inUse
                    ? "Another previewer is using this demo profile — choose a different customer or try again later."
                    : undefined
                }
                className={cn(
                  "group w-full border rounded-lg p-4 bg-white text-left transition-all",
                  inUse
                    ? "opacity-55 cursor-not-allowed border-slate-200 bg-slate-50"
                    : "hover:border-blue-300 hover:shadow-sm cursor-pointer",
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div
                      className={cn(
                        "font-semibold text-sm transition-colors",
                        !inUse && "group-hover:text-blue-700",
                      )}
                    >
                      {c.name}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.company}</div>
                  </div>
                  {inUse ? (
                    <span className="text-[10px] font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                      In use
                    </span>
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors mt-0.5" />
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground mb-2">{c.plan}</div>
                <div className="flex flex-wrap gap-1">
                  {c.products.map((p) => (
                    <ProductBadge key={p} name={p} size="xs" />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CustomerChatInline({
  email,
  onBack,
  onEscalation,
  onNewConversation,
}: {
  email: string;
  onBack: () => void;
  onEscalation: (conversationId: string) => void;
  onNewConversation: () => void;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [input, setInput] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const busyRef = useRef(false);
  const msgCountAtSubmit = useRef(0);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [docViewer, setDocViewer] = useState<DocViewerState | null>(null);
  const customer = CUSTOMERS.find((c) => c.email === email)!;
  const convIdRef = useRef<string | null>(null);
  const bodyRef = useRef({ conversationId, customerEmail: email });
  bodyRef.current = { conversationId, customerEmail: email };

  const handleViewDoc = useCallback((scope: "public" | "internal", file: string, title: string) => {
    setDocViewer({ scope, file, title });
  }, []);

  const customFetch = useCallback(async (url: RequestInfo | URL, init?: RequestInit) => {
    const res = await fetch(url, init);
    const hdr = res.headers.get("X-Conversation-Id");
    if (hdr && hdr !== convIdRef.current) {
      convIdRef.current = hdr;
      // Sync before React re-renders so the next sendMessage() uses this id (avoids a 2nd /api/chat creating a duplicate conversation).
      bodyRef.current = { conversationId: hdr, customerEmail: email };
      setConversationId(hdr);
    }
    return res;
  }, [email]);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: () => bodyRef.current,
      fetch: customFetch,
    }),
    [customFetch]
  );

  const customerStreamRetry = useChatStreamAutoRetry(conversationId);

  const {
    messages,
    status,
    sendMessage,
    setMessages,
    regenerate: regenerateCustomer,
    clearError: clearCustomerChatError,
  } = useChat({
    transport,
    onError: customerStreamRetry.onError,
    onFinish: customerStreamRetry.onFinish,
  });

  useLayoutEffect(() => {
    customerStreamRetry.setRetryDeps(clearCustomerChatError, regenerateCustomer);
  }, [customerStreamRetry, clearCustomerChatError, regenerateCustomer]);

  useEffect(() => {
    customerStreamRetry.syncStatus(status);
  }, [status, customerStreamRetry]);

  useCustomerEscalationSyncFromDb(
    conversationId,
    status,
    messages.length,
    setEscalated,
    setEscalationReason,
    onEscalation,
  );

  useCustomerMessagePartykit(escalated, conversationId, setMessages);

  /** Agent "Send to Customer" persists via API; merge into this chat so the left pane updates. */
  useEffect(() => {
    function handleAgentSentToCustomer(e: Event) {
      const ce = e as CustomEvent<{
        conversationId: string;
        content: string;
      }>;
      const { conversationId: cid, content } = ce.detail ?? {};
      if (!cid || !content?.trim() || cid !== conversationId) return;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          parts: [{ type: "text" as const, text: content }],
        },
      ]);
    }
    window.addEventListener(
      "f5-customer-sent-from-agent",
      handleAgentSentToCustomer,
    );
    return () =>
      window.removeEventListener(
        "f5-customer-sent-from-agent",
        handleAgentSentToCustomer,
      );
  }, [conversationId, setMessages]);

  useEffect(() => {
    if (conversationId) convIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (!pendingText || isChatBusy(status)) return;
    if (messages.length <= msgCountAtSubmit.current) return;
    const last = messages.at(-1);
    const done =
      last?.role === "assistant" ||
      (escalated && last?.role === "user");
    if (done) {
      setPendingText(null);
      busyRef.current = false;
      if (escalated && last?.role === "user" && convIdRef.current) {
        window.dispatchEvent(
          new CustomEvent(F5_CONVERSATION_MESSAGES_UPDATED, {
            detail: { conversationId: convIdRef.current },
          }),
        );
      }
    }
  }, [pendingText, messages, status, escalated]);

  const starterQuestions = useMemo(() => getStarterQuestions(customer.products), [customer.products]);

  const askedQuestions = useMemo(() => {
    const set = new Set<string>();
    for (const m of messages) {
      if (m.role === "user") {
        const t = m.parts?.filter((p) => p.type === "text").map((p) => p.text).join("").trim();
        if (t) set.add(t.toLowerCase());
      }
    }
    if (pendingText) set.add(pendingText.trim().toLowerCase());
    return set;
  }, [messages, pendingText]);

  const suggestedQuestions = useMemo(() => {
    const raw = messages.length === 0
      ? starterQuestions
      : (() => {
          const last = [...messages].reverse().find((m) => m.role === "assistant");
          if (!last) return [];
          const text = last.parts?.filter((p) => p.type === "text").map((p) => p.text).join("") ?? "";
          if (!text) return [];
          return parseCustomerResponse(text).suggestedQuestions ?? [];
        })();
    return raw.filter((q) => !askedQuestions.has(q.trim().toLowerCase()));
  }, [messages, starterQuestions, askedQuestions]);

  const submitQuestion = useCallback(
    (text: string) => {
      if (!text.trim() || busyRef.current || isChatBusy(status)) return;
      busyRef.current = true;
      msgCountAtSubmit.current = messages.length;
      if (suggestionsRef.current) {
        suggestionsRef.current.style.pointerEvents = "none";
        suggestionsRef.current.style.opacity = "0.5";
      }
      setInput("");
      setPendingText(text);
      sendMessage({ text });
    },
    [messages.length, sendMessage, status]
  );

  const canTypeCustomer = pendingText === null && !isChatBusy(status);
  const customerInputRef = useChatInputFocus({
    canType: canTypeCustomer,
    status,
    setInput,
    captureGlobalKeys: false,
  });

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      <header className="border-b px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <CustomerThreadPicker
            email={email}
            activeConversationId={conversationId}
            onNewConversation={onNewConversation}
            onThreadLoaded={({
              conversationId: cid,
              status,
              escalationReason: er,
              messages: ms,
            }) => {
              convIdRef.current = cid;
              bodyRef.current = { conversationId: cid, customerEmail: email };
              setConversationId(cid);
              setEscalated(status === "ESCALATED");
              setEscalationReason(er);
              setMessages(ms);
            }}
          />
          <div>
            <div className="text-sm font-semibold">{customer.name}</div>
            <div className="text-[11px] text-muted-foreground">{customer.company} — {email}</div>
          </div>
        </div>
        {escalated && (
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">Escalated</span>
        )}
      </header>

      <ChatPanel
        messages={messages}
        context="customer"
        escalationBanner={escalated ? <EscalationBanner reason={escalationReason} context="customer" /> : undefined}
        onViewDoc={handleViewDoc}
        pendingUserText={pendingText}
        thinking={pendingText !== null && isChatBusy(status)}
      />

      {suggestedQuestions.length > 0 && !escalated && pendingText === null && !isChatBusy(status) && (
        <div className="px-3" ref={suggestionsRef}>
          <div className="flex flex-wrap gap-1.5 pb-2">
            {suggestedQuestions.map((q, i) => (
              <button key={i} onClick={() => submitQuestion(q)} className="text-[11px] px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer text-left">
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); submitQuestion(input.trim()); }} className="border-t px-3 py-2.5 flex gap-2 shrink-0" data-testid="demo-customer-chat-form">
        <Input
          ref={customerInputRef}
          data-testid="demo-customer-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            escalated ? "Reply to support…" : "Message…"
          }
          disabled={pendingText !== null || isChatBusy(status)}
          className="flex-1 text-sm"
        />
        <Button type="submit" size="icon" disabled={pendingText !== null || !input.trim() || isChatBusy(status)}>
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {docViewer && (
        <DocViewerPanel doc={docViewer} onClose={() => setDocViewer(null)} />
      )}
    </div>
  );
}

// ─── Agent Panel ─────────────────────────────────────────────────────────────

function AgentPanelInline({ autoSelectId }: { autoSelectId: string | null }) {
  const { conversations, loading, refetch } = useConversationsPartykit();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useAgentThreadRealtime(selectedId, refetch);
  useAgentConversationSync(refetch);
  const [input, setInput] = useState("");
  const [docViewer, setDocViewer] = useState<DocViewerState | null>(null);
  const employeeScrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadTailRef = useRef<HTMLDivElement>(null);

  const handleViewDoc = useCallback((scope: "public" | "internal", file: string, title: string) => {
    setDocViewer({ scope, file, title });
  }, []);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const visibleThreadMessages = useMemo(
    () => selected?.messages.filter((m) => m.audience !== "INTERNAL_ONLY") ?? [],
    [selected?.messages],
  );
  const lastThreadMessageId = visibleThreadMessages[visibleThreadMessages.length - 1]?.id;

  useEffect(() => {
    if (autoSelectId) {
      void refetch();
    }
  }, [autoSelectId, refetch]);

  useEffect(() => {
    if (autoSelectId && conversations.some((c) => c.id === autoSelectId)) {
      setSelectedId(autoSelectId);
    }
  }, [autoSelectId, conversations]);

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
    () => new DefaultChatTransport({
      api: "/api/agent-chat",
      body: () => agentBodyRef.current,
    }),
    []
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

  const handleAISend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !selectedId || isChatBusy(status)) return;
    setInput("");
    sendMessage({ text });
  }, [input, selectedId, sendMessage, status]);

  const handleSuggestEmployeeDraft = useCallback(() => {
    if (!selectedId || isChatBusy(status)) return;
    clearEmployeeAiError();
    sendMessage({ text: EMPLOYEE_AI_SUGGEST_DRAFT_PROMPT });
  }, [selectedId, status, sendMessage, clearEmployeeAiError]);

  const canTypeAgent = !!selectedId && !isChatBusy(status);
  const agentInputRef = useChatInputFocus({
    canType: canTypeAgent,
    status,
    setInput,
    captureGlobalKeys: false,
  });

  return (
    <div className="flex flex-1 min-h-0 relative flex-col">
      <div className="flex items-center gap-2 border-b px-2 py-1.5 shrink-0">
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
          className="h-7 w-7"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2 px-2">
              <Headset className="h-10 w-10 mx-auto opacity-20" />
              <p className="text-xs">Open the menu (☰) to choose a conversation.</p>
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
              variant="compact"
            />

            {/* Single scroll: conversation + employee workspace read as one continuous thread */}
            <div
              ref={employeeScrollRef}
              data-testid="demo-agent-work-scroll"
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
            >
              <div className="py-3 px-2 flex flex-col gap-2">
                {selected.escalationReason && <EscalationBanner reason={selected.escalationReason} context="employee" />}
                {visibleThreadMessages.map((msg) => {
                  const isCustomer = msg.role === "user";
                  const isSystem = msg.role === "system";
                  let label = "";
                  let bodyKind: "system" | "customer" | "customer-ai" | "human-agent" = "customer-ai";
                  if (isCustomer) {
                    label = "Customer";
                    bodyKind = "customer";
                  } else if (isSystem) {
                    bodyKind = "system";
                  } else {
                    const assistantKind = getAssistantThreadKind(selected.messages, msg);
                    if (assistantKind === "human-agent") {
                      label = "Agent (You)";
                      bodyKind = "human-agent";
                    } else {
                      label = "AI Response";
                      bodyKind = "customer-ai";
                    }
                  }
                  if (isSystem) {
                    return (
                      <div key={msg.id} className="self-center max-w-[min(92%,24rem)] my-0.5">
                        <div className="rounded-full border border-amber-200/90 bg-amber-50 px-3 py-1.5 text-center shadow-sm">
                          <AgentThreadMessageBody content={msg.content} kind="system" />
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex max-w-[min(92%,26rem)] flex-col gap-0.5",
                        isCustomer ? "self-start" : "self-end items-end"
                      )}
                    >
                      {label ? (
                        <span
                          className={cn(
                            "text-[10px] font-medium text-muted-foreground px-1",
                            !isCustomer && "text-right"
                          )}
                        >
                          {label}
                        </span>
                      ) : null}
                      <div
                        className={cn(
                          "rounded-2xl border px-3 py-2.5 text-sm leading-snug shadow-sm",
                          isCustomer && "rounded-tl-md border-slate-200/90 bg-slate-100 text-gray-900",
                          !isCustomer &&
                            bodyKind === "human-agent" &&
                            "rounded-tr-md border-emerald-200 bg-emerald-50 text-gray-900",
                          !isCustomer &&
                            bodyKind === "customer-ai" &&
                            "rounded-tr-md border-blue-100 bg-blue-50 text-gray-900"
                        )}
                      >
                        <AgentThreadMessageBody content={msg.content} kind={bodyKind} />
                      </div>
                    </div>
                  );
                })}
                <div ref={threadTailRef} className="h-px w-full shrink-0 scroll-mt-2" aria-hidden />
              </div>

              <Separator />

              <div className="border-t bg-gray-50 p-3 space-y-3 pb-6">
                <div>
                  <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Employee AI (internal)</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    When you select a thread, Employee AI runs automatically. Internal notes stream in the chat; the
                    customer-facing draft is only in the Draft Customer Response panel (not duplicated in the
                    chat bubble). Use &quot;Suggest internal notes + draft&quot; to refresh after new customer
                    messages. Only text you approve from the draft panel goes to the customer.
                  </p>
                  <EmployeeAiBusyBar busy={isChatBusy(status)} />
                  {employeeAiError && (
                    <p
                      className="text-[10px] text-red-900 bg-red-50 border border-red-200 rounded px-2 py-1.5 mt-2"
                      role="alert"
                    >
                      Employee AI hit an error (often a transient OpenAI{" "}
                      <code className="font-mono text-[9px]">server_error</code>). Up to three automatic retries run with
                      backoff; if this message remains, use &quot;Suggest internal notes + draft&quot; again.
                    </p>
                  )}
                </div>
                {aiMessages.length > 0 && (
                  <div className="flex max-w-full flex-col gap-2">
                    {aiMessages.map((msg) => {
                      const text = msg.parts?.filter((p) => p.type === "text").map((p) => p.text).join("");
                      if (!text) return null;
                      const isUser = msg.role === "user";
                      const bubbleText = isUser
                        ? displayEmployeeAiUserText(text)
                        : text;
                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex max-w-[min(92%,26rem)] flex-col gap-0.5",
                            isUser ? "self-end items-end" : "self-start"
                          )}
                        >
                          {!isUser ? (
                            <span className="text-[10px] font-medium text-muted-foreground px-1">Employee AI</span>
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground px-1 text-right">You</span>
                          )}
                          <div
                            className={cn(
                              "min-w-0 rounded-2xl border px-3 py-2.5 text-sm shadow-sm",
                              isUser
                                ? "rounded-tr-md border-emerald-200/90 bg-emerald-50/90"
                                : "rounded-tl-md border-gray-200 bg-gray-50"
                            )}
                          >
                            <div className="min-w-0 overflow-x-auto">
                              <EmployeeAiChatBubbleBody text={bubbleText} isUser={isUser} />
                            </div>
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
                    <Input ref={agentInputRef} data-testid="demo-employee-ai-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the Employee AI (internal)…" disabled={isChatBusy(status)} className="flex-1 bg-white text-xs min-w-0" />
                    <Button type="submit" data-testid="demo-employee-ai-send" size="icon" disabled={!input.trim() || isChatBusy(status)} className="h-8 w-8 shrink-0">
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
                {parsed && selectedId && (
                  <div className="pt-1">
                    <ReviewControls
                      internalNotes={parsed.internalNotes}
                      draftResponse={parsed.draftCustomerResponse}
                      citations={parsed.citations}
                      conversationId={selectedId}
                      onSent={() => { void refetch(); setMessages([]); }}
                      onViewDoc={handleViewDoc}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {docViewer && (
        <DocViewerPanel doc={docViewer} onClose={() => setDocViewer(null)} />
      )}
    </div>
  );
}

// ─── Main Split Layout ───────────────────────────────────────────────────────

function SplitDemoPage() {
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  /** Bumps when a customer is chosen from the picker so each "start" gets a fresh conversation id. */
  const [customerChatSession, setCustomerChatSession] = useState(0);
  const [agentOpen, setAgentOpen] = useState(false);
  const [autoSelectConvId, setAutoSelectConvId] = useState<string | null>(null);

  const demoClaim = useDemoCustomerClaim(selectedEmail);

  const handleSelectCustomer = useCallback(
    async (email: string) => {
      try {
        const ok = await demoClaim.tryClaim(email);
        if (!ok) {
          window.alert(
            "This demo profile is in use in another browser or tab. Choose a different customer, or try again after the other session goes idle (~90s).",
          );
          return;
        }
        setSelectedEmail(email);
        setCustomerChatSession((s) => s + 1);
      } catch (e) {
        window.alert(
          e instanceof Error ? e.message : "Could not reserve this demo profile. Try again.",
        );
      }
    },
    [demoClaim],
  );

  const handleClaimLostDismiss = useCallback(() => {
    demoClaim.clearClaimLost();
    setSelectedEmail(null);
    setAgentOpen(false);
    setAutoSelectConvId(null);
  }, [demoClaim]);

  const handleEscalation = useCallback((conversationId: string) => {
    setAgentOpen(true);
    setAutoSelectConvId(conversationId);
  }, []);

  return (
    <div className="flex h-full min-h-0">
      {/* Left: Customer side */}
      <div className={cn(
        "flex flex-col min-h-0 border-r transition-all duration-500 ease-in-out shrink-0",
        agentOpen ? "w-[45%]" : "w-full"
      )}>
        {/* Customer header bar */}
        <div className="border-b px-4 py-2 flex items-center justify-between shrink-0 bg-blue-50/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Customer</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            Public docs only
          </div>
        </div>

        {!selectedEmail ? (
          <CustomerPicker
            onSelect={handleSelectCustomer}
            isProfileInUse={demoClaim.isLockedForPicker}
          />
        ) : (
          <div className="relative flex flex-1 min-h-0 flex-col">
            {demoClaim.claimLost && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/90 p-6">
                <div className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-4 text-center shadow-sm">
                  <p className="text-sm font-medium text-amber-950">
                    This demo profile is active in another session
                  </p>
                  <p className="mt-2 text-xs text-amber-900/90">
                    Another previewer may have taken over after this tab went idle, or you opened the
                    same profile elsewhere. Return to the list to pick a different customer.
                  </p>
                  <Button className="mt-4" type="button" onClick={handleClaimLostDismiss}>
                    Back to customer list
                  </Button>
                </div>
              </div>
            )}
            <CustomerChatInline
              key={`${selectedEmail}-${customerChatSession}`}
              email={selectedEmail}
              onNewConversation={() => setCustomerChatSession((s) => s + 1)}
              onBack={() => {
                setSelectedEmail(null);
                setAgentOpen(false);
                setAutoSelectConvId(null);
              }}
              onEscalation={handleEscalation}
            />
          </div>
        )}
      </div>

      {/* Right: Agent side — slides in */}
      <div
        data-testid="demo-agent-column"
        className={cn(
          "flex flex-col min-h-0 transition-all duration-500 ease-in-out overflow-hidden",
          // `w-0` alone is not enough: flex default `min-width: auto` keeps this column
          // as wide as the header content, overlapping the customer pane and stealing clicks.
          agentOpen
            ? "w-[55%] min-w-0 opacity-100"
            : "w-0 min-w-0 max-w-0 opacity-0 pointer-events-none"
        )}
      >
        {/* Agent header bar */}
        <div className="border-b px-4 py-2 flex items-center justify-between shrink-0 bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <Headset className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Agent</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <FileText className="h-3 w-3" />
              Full access + human review
            </span>
            <button
              onClick={() => setAgentOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Close agent panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {agentOpen && <AgentPanelInline autoSelectId={autoSelectConvId} />}
      </div>

      {/* Toggle agent panel when not auto-opened */}
      {!agentOpen && selectedEmail && (
        <button
          type="button"
          data-testid="demo-open-agent-panel"
          onClick={() => setAgentOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-emerald-600 text-white px-2 py-6 rounded-l-lg shadow-lg hover:bg-emerald-700 transition-colors cursor-pointer z-50"
          title="Open agent panel"
        >
          <Headset className="h-4 w-4 mb-1" />
          <span className="text-[9px] font-medium writing-mode-vertical" style={{ writingMode: "vertical-rl" }}>
            Agent
          </span>
        </button>
      )}
    </div>
  );
}

export default function CustomerDemoPage() {
  return (
    <div className="h-[100dvh] min-h-0 overflow-hidden">
      <SplitDemoPage />
    </div>
  );
}
