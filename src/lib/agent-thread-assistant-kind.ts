/**
 * Classifies customer-visible **assistant** rows after escalation: first assistant after
 * the escalation system line is still F5 customer AI; later assistants are the human agent.
 * Shared by the agent dashboard UI and conversation export.
 */
export type ThreadMessageLike = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

export function getAssistantThreadKind(
  allMessages: ThreadMessageLike[],
  msg: ThreadMessageLike,
): "customer-ai" | "human-agent" {
  if (msg.role !== "assistant") return "customer-ai";

  const escalationSystem = allMessages.find(
    (m) =>
      m.role === "system" &&
      m.content.includes("Escalated to human agent"),
  );

  if (!escalationSystem) {
    return "customer-ai";
  }

  const escT = new Date(escalationSystem.createdAt).getTime();
  const msgT = new Date(msg.createdAt).getTime();

  if (msgT <= escT) {
    return "customer-ai";
  }

  const assistantsAfterEscalation = allMessages
    .filter((m) => m.role === "assistant" && new Date(m.createdAt).getTime() > escT)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  if (assistantsAfterEscalation.length === 0) {
    return "customer-ai";
  }

  return assistantsAfterEscalation[0].id === msg.id ? "customer-ai" : "human-agent";
}
