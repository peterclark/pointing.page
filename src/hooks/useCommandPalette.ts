import { useContext } from "react";
import {
  CommandPaletteContext,
  type CommandPaletteContextValue,
} from "@/contexts/CommandPaletteContext";

/**
 * Hook to access the command palette context
 */
export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (context === undefined) {
    throw new Error(
      "useCommandPalette must be used within a CommandPaletteProvider"
    );
  }
  return context;
}
