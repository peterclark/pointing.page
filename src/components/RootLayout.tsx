/**
 * RootLayout Component
 *
 * Root layout wrapper for all pages in the application.
 * Includes persistent header with navigation, keyboard shortcuts dialog,
 * and command palette indicator.
 */

import { Outlet } from "react-router-dom";
import { AppMenu } from "./AppMenu";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { CommandPaletteIndicator } from "./CommandPaletteIndicator";

/**
 * Root layout component with persistent header
 */
export function RootLayout() {
  return (
    <>
      <AppMenu />
      <Outlet />
      <KeyboardShortcutsDialog />
      <CommandPaletteIndicator />
    </>
  );
}
