"use client";

import { useRef, useEffect } from "react";
import { MessageBubble } from "./message-bubble";
import type { UIMessage } from "ai";

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 self-start bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 max-w-[80%]">
      <span className="text-xs font-medium opacity-60">{label}</span>
      <span className="flex items-center gap-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:300ms]" />
      </span>
    </div>
  );
}

export function ChatPanel({
  messages,
  context,
  escalationBanner,
  onViewDoc,
  pendingUserText,
  thinking,
}: {
  messages: UIMessage[];
  context: "customer" | "employee";
  escalationBanner?: React.ReactNode;
  onViewDoc?: (scope: "public" | "internal", file: string, title: string) => void;
  pendingUserText?: string | null;
  thinking?: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingUserText, thinking]);

  const thinkingLabel = context === "customer" ? "F5 Support" : "Employee AI";

  const showPending = pendingUserText && messages.at(-1)?.role !== "user";

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-4">
      <div className="flex flex-col gap-3 py-4 max-w-3xl mx-auto">
        {escalationBanner}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} context={context} onViewDoc={onViewDoc} />
        ))}
        {showPending && (
          <div className="rounded-lg px-4 py-3 max-w-[80%] bg-white border border-gray-200 text-gray-900 self-end">
            <div className="text-xs font-medium mb-1 opacity-60">You</div>
            <span className="text-sm whitespace-pre-wrap">{pendingUserText}</span>
          </div>
        )}
        {thinking && <ThinkingIndicator label={thinkingLabel} />}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
