"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Visible while Employee AI is submitted/streaming (OpenAI, Claude fallback, tools).
 * `data-testid` is stable for Playwright: wait for visible → hidden for end of turn.
 */
export function EmployeeAiBusyBar({ busy }: { busy: boolean }) {
  return (
    <div
      data-testid="demo-employee-ai-busy"
      role="status"
      aria-live="polite"
      aria-busy={busy}
      className={cn(
        "mb-2 flex items-center gap-2 rounded-md border border-emerald-200/90 bg-emerald-50/95 px-2.5 py-1.5 text-[11px] font-medium text-emerald-950 shadow-sm",
        !busy && "hidden",
      )}
    >
      <Loader2
        className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-700"
        aria-hidden
      />
      <span>Employee AI is responding…</span>
    </div>
  );
}
