"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dbCustomerMessagesToUiMessages,
  type DbCustomerMessage,
} from "@/lib/customer-chat-merge";
import type { UIMessage } from "ai";

export type CustomerConversationRow = {
  id: string;
  status: string;
  escalationReason: string | null;
  updatedAt: string;
};

export function CustomerThreadPicker({
  email,
  activeConversationId,
  onNewConversation,
  onThreadLoaded,
}: {
  email: string;
  activeConversationId: string | null;
  onNewConversation: () => void;
  onThreadLoaded: (args: {
    conversationId: string;
    status: string;
    escalationReason: string;
    messages: UIMessage[];
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<CustomerConversationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/conversations/customer?email=${encodeURIComponent(email)}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as CustomerConversationRow[];
      setList(data);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  async function selectThread(row: CustomerConversationRow) {
    setOpen(false);
    const res = await fetch(
      `/api/conversations/${encodeURIComponent(row.id)}/customer-messages`,
    );
    if (!res.ok) return;
    const data = (await res.json()) as { messages?: DbCustomerMessage[] };
    const ui = dbCustomerMessagesToUiMessages(data.messages ?? []);
    onThreadLoaded({
      conversationId: row.id,
      status: row.status,
      escalationReason: row.escalationReason ?? "",
      messages: ui,
    });
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label="Conversations menu"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) void refreshList();
            return next;
          });
        }}
      >
        <Menu className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border border-gray-200 bg-white shadow-md py-1 text-sm">
          <button
            type="button"
            className="w-full px-3 py-2 text-left hover:bg-muted"
            onClick={() => {
              setOpen(false);
              onNewConversation();
            }}
          >
            New conversation
          </button>
          <div className="border-t my-1" />
          <div className="max-h-64 overflow-y-auto px-1">
            {loading && (
              <div className="px-2 py-2 text-muted-foreground text-xs">
                Loading…
              </div>
            )}
            {!loading && list.length === 0 && (
              <div className="px-2 py-2 text-muted-foreground text-xs">
                No saved conversations yet.
              </div>
            )}
            {list.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`w-full rounded px-2 py-1.5 text-left hover:bg-muted ${
                  activeConversationId === row.id ? "bg-blue-50" : ""
                }`}
                onClick={() => void selectThread(row)}
              >
                <div className="truncate text-xs font-medium">
                  {row.status}
                  {row.status === "ESCALATED" ? " · Escalated" : ""}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {new Date(row.updatedAt).toLocaleString()} · {row.id.slice(0, 8)}…
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
