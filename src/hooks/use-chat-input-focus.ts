import { useCallback, useEffect, useRef } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

type Status = "ready" | "streaming" | "submitted" | "error" | string;

/**
 * Refocuses the chat input after the assistant finishes, and routes unhandled
 * printable keystrokes to the input so typing works without clicking first.
 */
export function useChatInputFocus(options: {
  canType: boolean;
  status: Status;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  /** When false, only refocus after replies — no document-level key capture (use on split UIs with multiple chat inputs). */
  captureGlobalKeys?: boolean;
}) {
  const { canType, status, setInput, captureGlobalKeys = true } = options;
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const prevStatus = useRef(status);
  const prevCanType = useRef(canType);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  useEffect(() => {
    const finishedStreaming =
      prevStatus.current === "streaming" && status !== "streaming";
    const becameReady = !prevCanType.current && canType;
    if (canType && (finishedStreaming || becameReady)) {
      focusInput();
    }
    prevStatus.current = status;
    prevCanType.current = canType;
  }, [status, canType, focusInput]);

  useEffect(() => {
    if (!captureGlobalKeys) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!canType) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      // Single printable character; avoid stealing Space (scroll / UI) on first focus
      if (e.key !== " " && e.key.length !== 1) return;

      e.preventDefault();
      if (e.key === " ") {
        setInput((prev) => prev + " ");
      } else {
        setInput((prev) => prev + e.key);
      }
      focusInput();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [canType, setInput, focusInput, captureGlobalKeys]);

  return inputRef;
}
