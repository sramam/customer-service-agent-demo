function partykitHttpBase(): string | null {
  const raw = process.env.PARTYKIT_HOST?.trim();
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }
  return `https://${raw.replace(/\/$/, "")}`;
}

function secretHeader(): HeadersInit {
  const secret = process.env.PARTYKIT_SECRET ?? "";
  return { "x-partykit-secret": secret };
}

/**
 * Fire-and-forget: signal subscribers to pull canonical rows from the API
 * (GET /api/conversations/[id]/customer-messages). Payload stays minimal for scale.
 */
export function notifyPartyConversationMessage(
  conversationId: string,
  signal: { messageId: string },
): void {
  const base = partykitHttpBase();
  if (!base) return;
  const url = `${base}/parties/main/${encodeURIComponent(conversationId)}`;
  const body = JSON.stringify({
    type: "customer_thread_updated",
    v: 1,
    conversationId,
    messageId: signal.messageId,
  });
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...secretHeader(),
    },
    body,
  }).catch(() => {});
}

/** Notify agent sidebar clients to refetch the escalations list. */
export function notifyPartyEscalationsRefresh(): void {
  const base = partykitHttpBase();
  if (!base) return;
  const url = `${base}/parties/escalations/list`;
  const body = JSON.stringify({ type: "refresh" });
  void fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...secretHeader(),
    },
    body,
  }).catch(() => {});
}
