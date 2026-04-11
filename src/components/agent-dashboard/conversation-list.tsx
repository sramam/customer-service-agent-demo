"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

import type { ConversationSummary } from "@/lib/types";
export type { ConversationSummary };

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        No escalated conversations yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((c) => {
        const lastCustomerMsg = [...c.messages]
          .reverse()
          .find((m) => m.role === "user");
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              "text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors",
              selectedId === c.id && "bg-blue-50 border-l-2 border-l-blue-500"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="min-w-0 mr-2">
                <span className="text-sm font-medium truncate block">
                  {c.customer?.name ?? c.customerEmail}
                </span>
                {c.customer && (
                  <span className="text-[10px] text-muted-foreground truncate block">
                    {c.customer.company}
                  </span>
                )}
              </div>
              <Badge
                variant={c.status === "ESCALATED" ? "destructive" : "secondary"}
                className="text-[10px] shrink-0"
              >
                {c.status}
              </Badge>
            </div>
            {c.escalationReason && (
              <div className="text-xs text-amber-700 truncate mb-1">
                {c.escalationReason}
              </div>
            )}
            {lastCustomerMsg && (
              <div className="text-xs text-muted-foreground truncate">
                {lastCustomerMsg.content.slice(0, 80)}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground mt-1">
              {new Date(c.updatedAt).toLocaleString()}
            </div>
          </button>
        );
      })}
    </div>
  );
}
