"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, FileText, BookOpen, FileDown, ExternalLink } from "lucide-react";
import type { Source } from "@/lib/types";
import { stripLegacyInlineCitationMarkers } from "@/lib/parse-response";
import { MarkdownContent } from "@/components/markdown-content";

export function ReviewControls({
  internalNotes,
  draftResponse,
  sources,
  conversationId,
  onSent,
  onViewDoc,
}: {
  internalNotes: string;
  draftResponse: string;
  sources: Source[];
  conversationId: string;
  onSent: () => void;
  onViewDoc?: (scope: "public" | "internal", file: string, title: string) => void;
}) {
  const [editedDraft, setEditedDraft] = useState(() =>
    stripLegacyInlineCitationMarkers(draftResponse),
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setEditedDraft(stripLegacyInlineCitationMarkers(draftResponse));
  }, [draftResponse]);

  const internalSources = sources.filter((c) => c.source === "internal-doc");
  const publicSources = sources.filter((c) => c.source !== "internal-doc");

  async function handleApprove() {
    if (!editedDraft.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedDraft }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error("[ReviewControls] approve failed", res.status, errBody);
        return;
      }
      window.dispatchEvent(
        new CustomEvent("f5-customer-sent-from-agent", {
          detail: { conversationId, content: editedDraft },
        }),
      );
      onSent();
    } finally {
      setSending(false);
    }
  }

  function renderSourceRow(c: Source, i: number) {
    const isDoc = c.source === "public-doc" || c.source === "internal-doc";
    const isInvoice = c.source === "invoice";
    const scope = c.source === "internal-doc" ? "internal" : "public";

    return (
      <div key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
        {isInvoice ? (
          <FileDown className="h-3 w-3" />
        ) : (
          <BookOpen className="h-3 w-3" />
        )}
        <span className="tabular-nums font-medium text-gray-600">{i + 1}.</span>
        <span className="font-medium">{c.title}</span>
        {isDoc && c.docFile && c.docFile.endsWith(".md") && onViewDoc && (
          <button
            onClick={() => onViewDoc(scope, c.docFile!, c.title)}
            className="text-blue-600 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            View
            <ExternalLink className="h-2.5 w-2.5" />
          </button>
        )}
        {isInvoice && c.url && (
          <a href={c.url} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            PDF
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden relative isolate bg-white shadow-sm" data-testid="demo-review-controls">
      <div className="p-4 bg-white border-b">
        <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
          Draft Customer Response — Editable
        </div>
        {!draftResponse.trim() && (
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2">
            No draft in this AI reply (conversation-only). Ask the Employee AI to propose customer text, or write the message yourself.
          </p>
        )}
        <Textarea
          data-testid="demo-draft-response"
          value={editedDraft}
          onChange={(e) => setEditedDraft(e.target.value)}
          rows={10}
          className="mb-3 text-sm leading-relaxed min-h-[180px] resize-y max-h-[min(60vh,480px)]"
          placeholder="Draft customer reply (markdown). When you need several facts, ask for all of them in one message — edited text is sent as-is."
        />
        {publicSources.length > 0 && (
          <div className="mb-3 space-y-1">
            <div className="text-xs font-medium text-gray-500">Sources (for context):</div>
            {publicSources.map((c, i) => renderSourceRow(c, i))}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" data-testid="demo-send-to-customer" onClick={handleApprove} disabled={sending || !editedDraft.trim()}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send to Customer"}
          </Button>
        </div>
      </div>

      {internalNotes && (
        <div className="bg-gray-100 p-4" data-testid="demo-internal-notes">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Internal Notes — Not sent to customer
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">
            Internal docs, runbooks, and agent-only context stay here. Only the draft above is sent to the customer.
            Reusing internal wording in a customer reply is a deliberate copy-and-paste—never merged automatically.
          </p>
          <div className="text-gray-800 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:first:mt-0 [&_h2]:text-base [&_h2]:font-semibold">
            <MarkdownContent
              content={stripLegacyInlineCitationMarkers(internalNotes)}
              className="[&_*]:select-text [&_a]:pointer-events-auto"
            />
          </div>
          {internalSources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-300/50 space-y-1 pointer-events-auto">
              {internalSources.map((c, i) => renderSourceRow(c, i))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
