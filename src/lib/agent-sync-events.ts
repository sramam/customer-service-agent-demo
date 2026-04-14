/** Split-view demo: customer pane notifies agent when customer-visible messages change (same browser tab). */
export const F5_CONVERSATION_MESSAGES_UPDATED = "f5-conversation-messages-updated";

export type F5ConversationMessagesUpdatedDetail = {
  conversationId: string;
};

/** Customer chat: JSON export finished after ⌘D / Ctrl+D (see `useCustomerConversationDownloadHotkey`). */
export const F5_CUSTOMER_CONVERSATION_EXPORTED = "f5-customer-conversation-exported";

export type F5CustomerConversationExportedDetail = {
  filename: string;
  exportedAt: string;
  conversationId: string | null;
};
