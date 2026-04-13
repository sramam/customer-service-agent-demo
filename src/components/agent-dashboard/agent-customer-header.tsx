"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerInfoCard } from "@/components/agent-dashboard/customer-info-card";
import type { CustomerInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  conversationIdPreview: string;
  status: string;
  customer: CustomerInfo | null;
  variant?: "default" | "compact";
};

export function AgentCustomerHeader({
  title,
  conversationIdPreview,
  status,
  customer,
  variant = "default",
}: Props) {
  const [detailsOpen, setDetailsOpen] = useState(true);
  const hasDetails = !!customer;

  return (
    <div
      className={cn(
        "border-b shrink-0 space-y-2",
        variant === "compact" ? "px-4 py-2.5" : "px-6 py-3",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-1 min-w-0 flex-1">
          {hasDetails ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("shrink-0 -ml-1", variant === "compact" ? "h-7 w-7" : "h-8 w-8")}
              aria-expanded={detailsOpen}
              aria-label={detailsOpen ? "Hide customer details" : "Show customer details"}
              onClick={() => setDetailsOpen((o) => !o)}
            >
              <ChevronDown
                className={cn(
                  "transition-transform duration-200",
                  variant === "compact" ? "h-3.5 w-3.5" : "h-4 w-4",
                  !detailsOpen && "-rotate-90",
                )}
              />
            </Button>
          ) : null}
          <div className="min-w-0 pt-0.5">
            <h2
              className={cn(
                "font-semibold",
                variant === "compact" ? "text-sm" : "text-lg",
              )}
            >
              {title}
            </h2>
            <p
              className={cn(
                "text-muted-foreground",
                variant === "compact" ? "text-[10px]" : "text-xs",
              )}
            >
              {variant === "compact" ? "Conv " : "Conversation "}
              {conversationIdPreview}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "rounded-full font-medium shrink-0",
            variant === "compact"
              ? "text-[10px] px-2 py-0.5"
              : "text-xs px-2 py-1",
            status === "ESCALATED"
              ? "bg-amber-100 text-amber-800"
              : "bg-green-100 text-green-800",
          )}
        >
          {status}
        </span>
      </div>
      {hasDetails && detailsOpen ? (
        <CustomerInfoCard customer={customer} />
      ) : null}
    </div>
  );
}
