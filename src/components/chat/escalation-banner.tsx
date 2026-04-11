"use client";

import { AlertTriangle } from "lucide-react";

export function EscalationBanner({
  reason,
  context,
}: {
  reason: string;
  context: "customer" | "employee";
}) {
  return (
    <div className="mx-4 my-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
      <div>
        <div className="text-sm font-medium text-amber-900">
          {context === "customer"
            ? "Your request has been escalated to a support specialist."
            : "Escalated Conversation"}
        </div>
        {context === "employee" && (
          <div className="text-sm text-amber-800 mt-1">
            <span className="font-medium">Reason:</span> {reason}
          </div>
        )}
      </div>
    </div>
  );
}
