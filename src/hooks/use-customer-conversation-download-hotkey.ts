"use client";

import { useEffect, useRef } from "react";
import type { ChatStatus, UIMessage } from "ai";
import type { CustomerConversationServerRow } from "@/lib/customer-conversation-export";
import {
  buildCustomerConversationExport,
  downloadCustomerConversationJson,
} from "@/lib/customer-conversation-export";
import { F5_CUSTOMER_CONVERSATION_EXPORTED } from "@/lib/agent-sync-events";

async function fetchCustomerVisibleServerMessages(
  conversationId: string,
): Promise<CustomerConversationServerRow[] | undefined> {
  try {
    const res = await fetch(
      `/api/conversations/${encodeURIComponent(conversationId)}/customer-messages`,
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as { messages?: CustomerConversationServerRow[] };
    return data.messages;
  } catch {
    return undefined;
  }
}

/**
 * Hidden shortcut: **⌘D** (macOS **Meta+d**) or **Ctrl+d** — downloads the current customer chat as JSON.
 * Includes **timestamps** when messages exist in the DB (`transcript[].createdAt`, `offsetMsFromStart`).
 * Useful for Playwright + video: set up `page.waitForEvent('download')`, then `keyboard.press('Meta+d')`.
 */
export function useCustomerConversationDownloadHotkey(opts: {
  messages: UIMessage[];
  conversationId: string | null;
  customerEmail: string;
  escalated: boolean;
  escalationReason: string;
  status: ChatStatus;
  pendingUserText: string | null;
  enabled?: boolean;
}): void {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (opts.enabled === false) return;

    function onKeyDown(e: KeyboardEvent) {
      const isD = e.key === "d" || e.key === "D";
      if (!isD || (!e.metaKey && !e.ctrlKey)) return;
      if (e.altKey || e.shiftKey) return;
      if (e.repeat) return;

      e.preventDefault();
      e.stopPropagation();

      const o = optsRef.current;

      void (async () => {
        let serverMessages: CustomerConversationServerRow[] | undefined;
        if (o.conversationId) {
          serverMessages = await fetchCustomerVisibleServerMessages(o.conversationId);
        }

        const payload = buildCustomerConversationExport({
          messages: o.messages,
          conversationId: o.conversationId,
          customerEmail: o.customerEmail,
          escalated: o.escalated,
          escalationReason: o.escalationReason,
          chatStatus: String(o.status),
          pendingUserText: o.pendingUserText,
          serverMessages,
          exportChannel: "browser",
        });
        const { filename } = downloadCustomerConversationJson(payload);
        window.dispatchEvent(
          new CustomEvent(F5_CUSTOMER_CONVERSATION_EXPORTED, {
            detail: {
              filename,
              exportedAt: payload.exportedAt,
              conversationId: payload.conversationId,
            },
          }),
        );
      })();
    }

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [opts.enabled]);
}
