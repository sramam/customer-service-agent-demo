"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, FileText, BookOpen, FileDown, ExternalLink } from "lucide-react";
import type { Citation } from "@/lib/types";
import { MarkdownContent } from "@/components/markdown-content";

export function ReviewControls({
  internalNotes,
  draftResponse,
  citations,
  conversationId,
  onSent,
  onViewDoc,
}: {
  internalNotes: string;
  draftResponse: string;
  citations: Citation[];
  conversationId: string;
  onSent: () => void;
  onViewDoc?: (scope: "public" | "internal", file: string, title: string) => void;
}) {
  const [editedDraft, setEditedDraft] = useState(draftResponse);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setEditedDraft(draftResponse);
  }, [draftResponse]);

  const internalCitations = citations.filter((c) => c.source === "internal-doc");
  const publicCitations = citations.filter((c) => c.source !== "internal-doc");

  async function handleApprove() {
    if (!editedDraft.trim()) return;
    setSending(true);
    try {
      await fetch(`/api/conversations/${conversationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedDraft }),
      });
      onSent();
    } finally {
      setSending(false);
    }
  }

  function renderCitationRow(c: Citation, i: number) {
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
        <span className="font-mono">{c.label}</span>
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
      {internalNotes && (
        <div className="bg-gray-100 border-b p-4" data-testid="demo-internal-notes">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Internal Notes — Not sent to customer
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mb-3">
            Internal docs, runbooks, and agent-only context stay here. Only the draft below is sent to the customer.
            Reusing internal wording in a customer reply is a deliberate copy-and-paste—never merged automatically.
          </p>
          <div className="text-gray-800 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:first:mt-0 [&_h2]:text-base [&_h2]:font-semibold">
            <MarkdownContent
              content={internalNotes}
              className="[&_*]:select-text [&_a]:pointer-events-auto"
            />
          </div>
          {internalCitations.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-300/50 space-y-1 pointer-events-auto">
              {internalCitations.map((c, i) => renderCitationRow(c, i))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 bg-white">
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
          placeholder="Draft customer reply (markdown). Edited text is sent to the customer chat as-is."
        />
        {publicCitations.length > 0 && (
          <div className="mb-3 space-y-1">
            <div className="text-xs font-medium text-gray-500">Citations (will be included):</div>
            {publicCitations.map((c, i) => renderCitationRow(c, i))}
          </div>
        )}
        <div className="flex justify-end">
          <Button type="button" data-testid="demo-send-to-customer" onClick={handleApprove} disabled={sending || !editedDraft.trim()}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? "Sending..." : "Send to Customer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
