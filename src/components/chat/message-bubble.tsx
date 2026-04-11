"use client";

import { cn } from "@/lib/utils";
import { parseCustomerResponse, segmentText } from "@/lib/parse-response";
import { MarkdownContent } from "@/components/markdown-content";
import type { Citation } from "@/lib/types";
import type { UIMessage } from "ai";
import { FileDown, BookOpen, ExternalLink } from "lucide-react";

type Variant = "customer" | "customer-ai" | "employee" | "employee-ai" | "system";

function getVariant(msg: UIMessage, context: "customer" | "employee"): Variant {
  if (msg.role === "user") return context === "employee" ? "employee" : "customer";
  if (msg.role === "assistant" || msg.role === "system") {
    if (context === "employee") return "employee-ai";
    return "customer-ai";
  }
  return "system";
}

const variantStyles: Record<Variant, string> = {
  customer: "bg-white border border-gray-200 text-gray-900 self-end",
  "customer-ai": "bg-blue-50 border border-blue-100 text-gray-900 self-start",
  employee: "bg-emerald-50 border border-emerald-200 text-gray-900 self-end",
  "employee-ai": "bg-gray-100 border border-gray-200 text-gray-900 self-start",
  system: "bg-amber-50 border border-amber-200 text-amber-900 self-center text-center text-sm italic",
};

const labelMap: Record<Variant, string | null> = {
  customer: "You",
  "customer-ai": "F5 Support",
  employee: "You",
  "employee-ai": "Employee AI",
  system: null,
};

function deduplicateCitations(citations: Citation[]): {
  citations: Citation[];
  labelMap: Map<string, string>;
} {
  const seen = new Map<string, number>();
  const deduped: Citation[] = [];

  const labelMap = new Map<string, string>();

  for (const c of citations) {
    const key = c.docFile ?? c.url ?? `${c.source}:${c.title}`;
    if (seen.has(key)) {
      const newIdx = seen.get(key)!;
      labelMap.set(c.label, `[${newIdx + 1}]`);
    } else {
      const idx = deduped.length;
      seen.set(key, idx);
      const newLabel = `[${idx + 1}]`;
      labelMap.set(c.label, newLabel);
      deduped.push({ ...c, label: newLabel });
    }
  }

  return { citations: deduped, labelMap };
}

function remapInlineMarkers(text: string, labelMap: Map<string, string>): string {
  return text.replace(/\[\d+\]/g, (match) => labelMap.get(match) ?? match);
}

function CitationFootnotes({
  citations,
  onViewDoc,
}: {
  citations: Citation[];
  onViewDoc?: (scope: "public" | "internal", file: string, title: string) => void;
}) {
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 pt-2 border-t border-gray-200/60 space-y-1.5">
      {citations.map((c, i) => {
        const isDoc = c.source === "public-doc" || c.source === "internal-doc";
        const isInvoice = c.source === "invoice";
        const scope = c.source === "internal-doc" ? "internal" : "public";

        return (
          <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
            <span className="font-mono font-medium shrink-0">{c.label}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                {isInvoice ? (
                  <FileDown className="h-3 w-3 shrink-0" />
                ) : (
                  <BookOpen className="h-3 w-3 shrink-0" />
                )}
                <span className="font-medium">{c.title}</span>
              </div>
              {c.excerpt && (
                <div className="text-gray-400 mt-0.5 line-clamp-2">{c.excerpt}</div>
              )}
              <div className="flex items-center gap-3 mt-0.5">
                {isDoc && c.docFile && c.docFile.endsWith(".md") && onViewDoc && (
                  <button
                    onClick={() => onViewDoc(scope, c.docFile!, c.title)}
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    View document
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
                {isInvoice && c.url && (
                  <a
                    href={c.url}
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download PDF
                    <FileDown className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InlineCitationMarker({
  label,
  citation,
}: {
  label: string;
  citation: Citation | undefined;
}) {
  return (
    <span
      className="inline-flex items-center justify-center text-[10px] font-mono font-bold text-blue-700 bg-blue-100 rounded px-1 py-0.5 mx-0.5 cursor-help"
      title={citation ? `${citation.title}: ${citation.excerpt}` : label}
    >
      {label}
    </span>
  );
}

export function MessageBubble({
  message,
  context,
  onViewDoc,
}: {
  message: UIMessage;
  context: "customer" | "employee";
  onViewDoc?: (scope: "public" | "internal", file: string, title: string) => void;
}) {
  const variant = getVariant(message, context);
  const label = labelMap[variant];
  const textParts = message.parts?.filter((p) => p.type === "text") ?? [];
  const rawText = textParts.map((p) => p.text).join("");

  if (!rawText) return null;

  const isAI = variant === "customer-ai" || variant === "employee-ai";
  const parsed = isAI ? parseCustomerResponse(rawText) : null;

  const { displayText, citations } = (() => {
    if (!parsed) return { displayText: rawText, citations: [] as Citation[] };
    const rawCitations = parsed.citations ?? [];
    if (rawCitations.length === 0) return { displayText: parsed.text, citations: rawCitations };
    const { citations: deduped, labelMap } = deduplicateCitations(rawCitations);
    return { displayText: remapInlineMarkers(parsed.text, labelMap), citations: deduped };
  })();

  const segments = citations.length > 0 ? segmentText(displayText, citations) : null;

  return (
    <div className={cn("rounded-lg px-4 py-3 max-w-[80%]", variantStyles[variant])}>
      {label && (
        <div className="text-xs font-medium mb-1 opacity-60">{label}</div>
      )}
      <div className="text-sm leading-relaxed">
        {isAI && parsed ? (
          segments ? (
            segments.map((seg, i) =>
              seg.type === "text" ? (
                <MarkdownContent key={i} content={seg.value} className="inline-markdown" />
              ) : (
                <InlineCitationMarker
                  key={i}
                  label={seg.label}
                  citation={seg.citation}
                />
              )
            )
          ) : (
            <MarkdownContent content={displayText} />
          )
        ) : (
          <span className="whitespace-pre-wrap">{displayText}</span>
        )}
      </div>
      <CitationFootnotes citations={citations} onViewDoc={onViewDoc} />
    </div>
  );
}
