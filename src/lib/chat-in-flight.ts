import type { ChatStatus } from "ai";

/** True while a chat request is in flight (submitted or streaming). */
export function isChatBusy(status: ChatStatus): boolean {
  return status === "submitted" || status === "streaming";
}
