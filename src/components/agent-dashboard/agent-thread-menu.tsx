"use client";

import { useEffect, useState, useRef } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ConversationSummary } from "@/components/agent-dashboard/conversation-list";

/**
 * Single burger: all escalated threads (replaces the agent sidebar).
 */
export function AgentEscalationsBurger({
  conversations,
  loading,
  selectedId,
  onSelect,
}: {
  conversations: ConversationSummary[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label="Escalations menu"
        onClick={() => setOpen((o) => !o)}
      >
        <Menu className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-80 max-w-[min(100vw-2rem,20rem)] rounded-md border border-gray-200 bg-white shadow-md py-1 text-sm">
          <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Escalations
          </div>
          <div className="max-h-72 overflow-y-auto px-1">
            {loading && (
              <div className="px-2 py-2 text-muted-foreground text-xs">
                Loading…
              </div>
            )}
            {!loading && conversations.length === 0 && (
              <div className="px-2 py-2 text-muted-foreground text-xs">
                No escalated conversations yet.
              </div>
            )}
            {!loading &&
              conversations.map((c) => {
                const lastCustomerMsg = [...c.messages]
                  .reverse()
                  .find((m) => m.role === "user");
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`w-full rounded px-2 py-2 text-left hover:bg-muted ${
                      selectedId === c.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => {
                      setOpen(false);
                      onSelect(c.id);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <span className="truncate text-xs font-medium">
                        {c.customer?.name ?? c.customerEmail}
                      </span>
                      <Badge
                        variant={
                          c.status === "ESCALATED" ? "destructive" : "secondary"
                        }
                        className="text-[10px] shrink-0"
                      >
                        {c.status}
                      </Badge>
                    </div>
                    {c.customer && (
                      <div className="truncate text-[10px] text-muted-foreground">
                        {c.customer.company}
                      </div>
                    )}
                    {lastCustomerMsg && (
                      <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {lastCustomerMsg.content.slice(0, 72)}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(c.updatedAt).toLocaleString()}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
