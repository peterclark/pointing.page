import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight } from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

/**
 * Keyboard Shortcuts Help Dialog
 *
 * Displays all available keyboard shortcuts organized by category.
 * Shows platform-specific modifier key (⌘ on Mac, Ctrl on Windows/Linux).
 */
export function KeyboardShortcutsDialog() {
  const { isHelpOpen, setIsHelpOpen, commands } = useCommandPalette();

  // Detect platform for display
  const isMac =
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const modifierKey = isMac ? "⌘" : "Ctrl";

  // Group commands by category
  const categories = {
    navigation: [] as typeof commands,
    room: [] as typeof commands,
    theme: [] as typeof commands,
    help: [] as typeof commands,
    account: [] as typeof commands,
  };

  commands.forEach((cmd) => {
    const category = cmd.category || "navigation";
    if (categories[category]) {
      categories[category].push(cmd);
    }
  });

  const categoryLabels = {
    navigation: "Navigation",
    room: "Rooms",
    theme: "Theme",
    help: "Help",
    account: "Account",
  };

  return (
    <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Quick access to all features via keyboard
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Global Shortcuts Section */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Global
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 rounded-md hover:bg-muted/50 transition-colors">
                <span className="text-sm">Open menu</span>
                <kbd className="flex items-center justify-center text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-sm dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 w-8 h-8">
                  {modifierKey}/
                </kbd>
              </div>
              <div className="flex items-center justify-between px-3 rounded-md hover:bg-muted/50 transition-colors">
                <span className="text-sm">Command palette</span>
                <div className="flex items-center gap-2">
                  <kbd className="flex items-center justify-center text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-sm dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 w-8 h-8">
                    {modifierKey}K
                  </kbd>
                  <span className="text-xs text-muted-foreground">then key</span>
                </div>
              </div>
            </div>
          </div>
          {Object.entries(categories).map(([categoryKey, categoryCommands]) => {
            if (categoryCommands.length === 0) return null;

            return (
              <div key={categoryKey}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  {categoryLabels[categoryKey as keyof typeof categoryLabels]}
                </h3>
                <div className="space-y-2">
                  {categoryCommands.map((cmd) => (
                    <div
                      key={cmd.key}
                      className="flex items-center justify-between px-3 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm">{cmd.description}</span>
                      <div className="flex items-center gap-2">
                        <kbd className="flex items-center justify-center text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-sm dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 w-8 h-8">
                          {modifierKey}K
                        </kbd>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <kbd className="flex items-center justify-center text-sm font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-sm dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500 w-8 h-8">
                          {cmd.key === "?" ? "?" : cmd.key.toUpperCase()}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Press{" "}
            <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
              ESC
            </kbd>{" "}
            to cancel or close dialogs
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
