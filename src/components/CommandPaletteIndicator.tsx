import { useEffect, useState } from "react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

/**
 * Command Palette Indicator
 *
 * Shows a visual indicator when ⌘K is pressed and waiting for second key.
 * Displays in the bottom-right corner with fade in/out animation.
 */
export function CommandPaletteIndicator() {
  const { isWaiting } = useCommandPalette();
  const [show, setShow] = useState(false);

  // Detect platform for display
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const modifierKey = isMac ? "⌘" : "Ctrl";

  useEffect(() => {
    if (isWaiting) {
      setShow(true);
    } else {
      // Keep showing for a brief moment before fading out
      const timeout = setTimeout(() => setShow(false), 100);
      return () => clearTimeout(timeout);
    }
  }, [isWaiting]);

  if (!show) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 transition-all duration-200 ${
        isWaiting ? "opacity-100 scale-100" : "opacity-0 scale-95"
      }`}
    >
      <div className="bg-background border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
            {modifierKey}K
          </kbd>
          <span className="text-sm text-muted-foreground">pressed</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <span className="text-sm text-muted-foreground">
          Type a command key...
        </span>
      </div>
    </div>
  );
}
