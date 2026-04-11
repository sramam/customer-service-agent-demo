"use client";

import { useState, useEffect, useCallback } from "react";
import { MarkdownContent } from "@/components/markdown-content";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DocViewerState {
  scope: "public" | "internal";
  file: string;
  title: string;
}

interface DocViewerPanelProps {
  doc: DocViewerState;
  onClose: () => void;
}

/**
 * Inline slide-over panel for viewing rendered markdown docs.
 * Render this inside a `position: relative` container — it will
 * cover 60% of the container width from the right edge.
 */
export function DocViewerPanel({ doc, onClose }: DocViewerPanelProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDoc = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/docs?scope=${doc.scope}&file=${encodeURIComponent(doc.file)}`
      );
      if (!res.ok) throw new Error("Failed to load document");
      const data = await res.json();
      setContent(data.content);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load document");
    } finally {
      setLoading(false);
    }
  }, [doc.scope, doc.file]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  const isInternal = doc.scope === "internal";

  return (
    <>
      {/* Scrim overlay */}
      <div
        className="absolute inset-0 bg-black/10 z-10 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full w-[60%] z-20 flex flex-col",
          "bg-popover border-l shadow-xl",
          "animate-in slide-in-from-right duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isInternal ? (
              <Lock className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <BookOpen className="h-4 w-4 text-blue-600 shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{doc.title || doc.file}</span>
            {isInternal && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium uppercase shrink-0">
                Internal
              </span>
            )}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading document...
            </div>
          )}
          {error && (
            <div className="text-sm text-red-600 py-8 text-center">{error}</div>
          )}
          {content && <MarkdownContent content={content} />}
        </div>
      </div>
    </>
  );
}
