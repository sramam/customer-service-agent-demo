"use client";

import { cn } from "@/lib/utils";
import {
  parseCustomerResponse,
  stripLegacyInlineCitationMarkers,
} from "@/lib/parse-response";
import { MarkdownContent } from "@/components/markdown-content";
import type { Source } from "@/lib/types";
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

function deduplicateSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  const deduped: Source[] = [];
  for (const c of sources) {
    const key = c.docFile ?? c.url ?? `${c.source}:${c.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(c);
  }
  return deduped;
}

/** If the body already lists each invoice PDF, hide duplicate invoice rows under Sources. */
function omitRedundantInvoiceSources(body: string, sources: Source[]): Source[] {
  if (sources.length === 0) return sources;
  if (!sources.every((s) => s.source === "invoice")) return sources;
  const linkMatches = body.match(/\/api\/invoices\/download\?key=/g);
  const n = linkMatches?.length ?? 0;
  if (n === 0) return sources;
  if (n >= sources.length) return [];
  return sources;
}

function SourceFootnotes({
  sources,
  onViewDoc,
}: {
  sources: Source[];
  onViewDoc?: (scope: "public" | "internal", file: string, title: string) => void;
}) {
  if (sources.length === 0) return null;
  return (
    <div className="mt-3 pt-2 border-t border-gray-200/60 space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
        Sources
      </div>
      {sources.map((c, i) => {
        const isDoc = c.source === "public-doc" || c.source === "internal-doc";
        const isInvoice = c.source === "invoice";
        const scope = c.source === "internal-doc" ? "internal" : "public";

        return (
          <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
            <span className="tabular-nums font-medium text-gray-600 shrink-0">{i + 1}.</span>
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

  const { displayText, sources } = (() => {
    if (!parsed) return { displayText: rawText, sources: [] as Source[] };
    const rawSources = parsed.sources ?? [];
    const deduped = deduplicateSources(rawSources);
    const body =
      deduped.length > 0 || /\[\d+\]/.test(parsed.text)
        ? stripLegacyInlineCitationMarkers(parsed.text)
        : parsed.text;
    const sources = omitRedundantInvoiceSources(body, deduped);
    return { displayText: body, sources };
  })();

  return (
    <div
      className={cn("rounded-lg px-4 py-3 max-w-[80%]", variantStyles[variant])}
      {...(context === "customer"
        ? {
            "data-testid": "demo-customer-thread-message",
            "data-thread-role": message.role,
          }
        : {})}
    >
      {label && (
        <div className="text-xs font-medium mb-1 opacity-60">{label}</div>
      )}
      <div className="text-sm leading-relaxed">
        {isAI && parsed ? (
          <MarkdownContent content={displayText} />
        ) : (
          <span className="whitespace-pre-wrap">{displayText}</span>
        )}
      </div>
      <SourceFootnotes sources={sources} onViewDoc={onViewDoc} />
    </div>
  );
}
