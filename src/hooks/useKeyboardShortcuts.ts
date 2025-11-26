import { useEffect, useState, useCallback, useRef } from "react";

export interface ShortcutCommand {
  key: string;
  description: string;
  action: () => void;
  category?: "navigation" | "theme" | "room" | "help" | "account";
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  disableInInputs?: boolean;
  timeout?: number; // milliseconds to wait for second key
}

/**
 * Custom hook to handle command palette keyboard shortcuts (⌘K pattern)
 *
 * Usage:
 * const { isWaiting, executeCommand } = useKeyboardShortcuts({
 *   enabled: true,
 *   disableInInputs: true,
 *   timeout: 2000
 * });
 */
export function useKeyboardShortcuts(
  commands: ShortcutCommand[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const {
    enabled = true,
    disableInInputs = true,
    timeout = 2000,
  } = options;

  const [isWaiting, setIsWaiting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if the current focused element is an input field
   */
  const isInputElement = useCallback((element: Element | null): boolean => {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    const isEditable = element.getAttribute("contenteditable") === "true";
    return (
      tagName === "input" ||
      tagName === "textarea" ||
      tagName === "select" ||
      isEditable
    );
  }, []);

  /**
   * Execute a command by its key
   */
  const executeCommand = useCallback(
    (key: string) => {
      console.log('[useKeyboardShortcuts] Executing command for key:', key);
      console.log('[useKeyboardShortcuts] Available commands:', commands.map(c => c.key));
      const command = commands.find((cmd) => cmd.key.toLowerCase() === key.toLowerCase());
      if (command) {
        console.log('[useKeyboardShortcuts] Found command:', command.description);
        command.action();
        setIsWaiting(false);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } else {
        console.log('[useKeyboardShortcuts] No command found for key:', key);
      }
    },
    [commands]
  );

  /**
   * Clear the waiting state
   */
  const clearWaiting = useCallback(() => {
    setIsWaiting(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we should disable shortcuts in input fields
      if (disableInInputs && isInputElement(document.activeElement)) {
        return;
      }

      // Detect ⌘K (Mac) or Ctrl+K (Windows/Linux)
      const isTriggerKey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (isTriggerKey && !isWaiting) {
        // First key press: ⌘K or Ctrl+K
        event.preventDefault();
        setIsWaiting(true);

        // Set timeout to clear waiting state
        timeoutRef.current = setTimeout(() => {
          setIsWaiting(false);
          timeoutRef.current = null;
        }, timeout);

        return;
      }

      if (isWaiting) {
        // Second key press: execute command
        event.preventDefault();

        // Special case for '?' key
        const key = event.key === "?" ? "?" : event.key.toLowerCase();
        console.log('[useKeyboardShortcuts] Second key pressed:', event.key, '-> normalized:', key);

        // Ignore if command/ctrl/alt are pressed (but allow shift for ? and other characters)
        if (event.metaKey || event.ctrlKey || event.altKey) {
          console.log('[useKeyboardShortcuts] Ignoring because modifier key pressed');
          return;
        }

        executeCommand(key);
      }

      // Allow ESC to cancel waiting state
      if (event.key === "Escape" && isWaiting) {
        event.preventDefault();
        clearWaiting();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, disableInInputs, isWaiting, timeout, executeCommand, clearWaiting, isInputElement]);

  return {
    isWaiting,
    commands,
    executeCommand,
    clearWaiting,
  };
}
