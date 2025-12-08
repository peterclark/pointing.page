import {
  createContext,
  useState,
  useCallback,
  type ReactNode,
  useMemo,
} from "react";
import {
  useKeyboardShortcuts,
  type ShortcutCommand,
} from "@/hooks/useKeyboardShortcuts";

export interface CommandPaletteContextValue {
  isWaiting: boolean;
  commands: ShortcutCommand[];
  registerCommand: (command: ShortcutCommand) => () => void;
  executeCommand: (key: string) => void;
  clearWaiting: () => void;
  showHelp: () => void;
  isHelpOpen: boolean;
  setIsHelpOpen: (open: boolean) => void;
  isCreateRoomDialogOpen: boolean;
  setIsCreateRoomDialogOpen: (open: boolean) => void;
  openCreateRoomDialog: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const CommandPaletteContext = createContext<
  CommandPaletteContextValue | undefined
>(undefined);

interface CommandPaletteProviderProps {
  children: ReactNode;
}

export function CommandPaletteProvider({
  children,
}: CommandPaletteProviderProps) {
  const [commands, setCommands] = useState<ShortcutCommand[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCreateRoomDialogOpen, setIsCreateRoomDialogOpen] = useState(false);

  const { isWaiting, executeCommand, clearWaiting } = useKeyboardShortcuts(
    commands,
    {
      enabled: true,
      disableInInputs: true,
      timeout: 2000,
    }
  );

  /**
   * Register a new command and return a cleanup function
   */
  const registerCommand = useCallback(
    (command: ShortcutCommand): (() => void) => {
      setCommands((prev) => {
        // Prevent duplicate registration
        const exists = prev.some((cmd) => cmd.key === command.key);
        if (exists) {
          console.warn(
            `[CommandPalette] Command with key "${command.key}" already registered`
          );
          return prev;
        }
        return [...prev, command];
      });

      // Return cleanup function
      return () => {
        setCommands((prev) => prev.filter((cmd) => cmd.key !== command.key));
      };
    },
    []
  );

  /**
   * Show the keyboard shortcuts help dialog
   */
  const showHelp = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  /**
   * Open the create room dialog
   */
  const openCreateRoomDialog = useCallback(() => {
    setIsCreateRoomDialogOpen(true);
  }, []);

  const value = useMemo(
    () => ({
      isWaiting,
      commands,
      registerCommand,
      executeCommand,
      clearWaiting,
      showHelp,
      isHelpOpen,
      setIsHelpOpen,
      isCreateRoomDialogOpen,
      setIsCreateRoomDialogOpen,
      openCreateRoomDialog,
    }),
    [
      isWaiting,
      commands,
      registerCommand,
      executeCommand,
      clearWaiting,
      showHelp,
      isHelpOpen,
      isCreateRoomDialogOpen,
      openCreateRoomDialog,
    ]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}
