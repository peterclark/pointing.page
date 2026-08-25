import { useEffect, useState, useCallback } from "react";

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
      const command = commands.find(
        (cmd) => cmd.key.toLowerCase() === key.toLowerCase()
      );
      if (command) {
        command.action();
        setIsWaiting(false);
      }
    },
    [commands]
  );

  /**
   * Clear the waiting state
   */
  const clearWaiting = useCallback(() => {
    setIsWaiting(false);
  }, []);

  /**
   * Auto-disarm the chord.
   *
   * This has to be its own effect. The keydown effect below re-runs whenever
   * `isWaiting` flips, and its cleanup would cancel a timer started inside the
   * handler before it ever fired — leaving the palette armed indefinitely.
   * Here the timer is scoped to the armed state itself, so disarming (by
   * command, Escape or unmount) cancels it as a side effect.
   */
  useEffect(() => {
    if (!isWaiting) return;

    const timer = setTimeout(() => setIsWaiting(false), timeout);
    return () => clearTimeout(timer);
  }, [isWaiting, timeout]);

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
        return;
      }

      if (isWaiting) {
        // Second key press: execute command
        event.preventDefault();

        // Special case for '?' key
        const key = event.key === "?" ? "?" : event.key.toLowerCase();

        // Ignore if command/ctrl/alt are pressed (but allow shift for ? and other characters)
        if (event.metaKey || event.ctrlKey || event.altKey) {
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
    };
  }, [enabled, disableInInputs, isWaiting, executeCommand, clearWaiting, isInputElement]);

  return {
    isWaiting,
    commands,
    executeCommand,
    clearWaiting,
  };
}
