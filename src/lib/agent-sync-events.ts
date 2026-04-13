/** Split-view demo: customer pane notifies agent when customer-visible messages change (same browser tab). */
export const F5_CONVERSATION_MESSAGES_UPDATED = "f5-conversation-messages-updated";

export type F5ConversationMessagesUpdatedDetail = {
  conversationId: string;
};
