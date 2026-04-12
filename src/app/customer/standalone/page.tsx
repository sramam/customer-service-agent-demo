"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatPanel } from "@/components/chat/chat-panel";
import { EscalationBanner } from "@/components/chat/escalation-banner";
import { Send, ArrowLeft } from "lucide-react";
import { parseCustomerResponse } from "@/lib/parse-response";
import {
  extractEscalationReasonFromMessage,
  looksLikeEscalationProse,
} from "@/lib/escalation-ui";
import Link from "next/link";
import { Suspense } from "react";
import { useChatInputFocus } from "@/hooks/use-chat-input-focus";

function CustomerChat() {
  const searchParams = useSearchParams();
  const customerEmail = searchParams.get("email") ?? "alice@acmecorp.com";

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [input, setInput] = useState("");
  const [pendingText, setPendingText] = useState<string | null>(null);
  const busyRef = useRef(false);
  const msgCountAtSubmit = useRef(0);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const convIdRef = useRef<string | null>(null);
  const bodyRef = useRef({ conversationId, customerEmail });
  bodyRef.current = { conversationId, customerEmail };

  const customFetch = useCallback(async (url: RequestInfo | URL, init?: RequestInit) => {
    const res = await fetch(url, init);
    const hdr = res.headers.get("X-Conversation-Id");
    if (hdr && hdr !== convIdRef.current) {
      convIdRef.current = hdr;
      setConversationId(hdr);
    }
    return res;
  }, []);

  const transport = useMemo(
    () => new DefaultChatTransport({
      api: "/api/chat",
      body: () => bodyRef.current,
      fetch: customFetch,
    }),
    [customFetch]
  );

  const { messages, status, sendMessage, setMessages } = useChat({ transport });

  useEffect(() => {
    if (conversationId) convIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (
      pendingText &&
      messages.length > msgCountAtSubmit.current &&
      messages.at(-1)?.role === "assistant"
    ) {
      setPendingText(null);
      busyRef.current = false;
    }
  }, [pendingText, messages]);

  useEffect(() => {
    if (escalated || status === "streaming") return;
    const lastMsg = messages.at(-1);
    if (!lastMsg || lastMsg.role !== "assistant") return;

    let reason = extractEscalationReasonFromMessage(lastMsg);
    if (!reason) {
      const text =
        lastMsg.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") ?? "";
      if (text && looksLikeEscalationProse(text)) {
        reason = "Escalated to human agent";
      }
    }
    if (!reason) return;

    setEscalated(true);
    setEscalationReason(reason);
  }, [messages, status, escalated]);

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
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant");
    if (!lastAssistant) return [];
    const textParts =
      lastAssistant.parts?.filter((p) => p.type === "text") ?? [];
    const rawText = textParts.map((p) => p.text).join("");
    if (!rawText) return [];
    const parsed = parseCustomerResponse(rawText);
    const raw = parsed.suggestedQuestions ?? [];
    return raw.filter((q) => !askedQuestions.has(q.trim().toLowerCase()));
  }, [messages, askedQuestions]);

  const submitQuestion = useCallback(
    (text: string) => {
      if (!text.trim() || escalated || busyRef.current) return;
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
    [messages.length, escalated, sendMessage]
  );

  const handleSend = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      submitQuestion(input.trim());
    },
    [input, submitQuestion]
  );

  const canType = !escalated && pendingText === null && status !== "streaming";
  const inputRef = useChatInputFocus({ canType, status, setInput });

  return (
    <div className="flex flex-col h-full">
      <header className="border-b px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold">F5 Support Chat</h1>
            <p className="text-xs text-muted-foreground">{customerEmail}</p>
          </div>
        </div>
        {escalated && (
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
            Escalated
          </span>
        )}
      </header>

      <ChatPanel
        messages={messages}
        context="customer"
        escalationBanner={
          escalated ? (
            <EscalationBanner reason={escalationReason} context="customer" />
          ) : undefined
        }
        pendingUserText={pendingText}
        thinking={pendingText !== null}
      />

      {suggestedQuestions.length > 0 && !escalated && pendingText === null && status !== "streaming" && (
        <div className="px-4 max-w-3xl mx-auto w-full" ref={suggestionsRef}>
          <div className="flex flex-wrap gap-2 pb-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => submitQuestion(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="border-t px-4 py-3 flex gap-2 shrink-0 max-w-3xl mx-auto w-full"
      >
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            escalated
              ? "Waiting for a human agent…"
              : "Message…"
          }
          disabled={escalated || pendingText !== null || status === "streaming"}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={escalated || pendingText !== null || !input.trim() || status === "streaming"}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export default function CustomerChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full text-muted-foreground">
          Loading...
        </div>
      }
    >
      <CustomerChat />
    </Suspense>
  );
}
