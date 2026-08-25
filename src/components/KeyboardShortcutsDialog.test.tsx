/**
 * Tests for the keyboard shortcuts help dialog.
 *
 * The dialog is generated from whatever components have registered, so its job
 * is grouping and labelling rather than holding a hardcoded list — which is
 * what these tests pin.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import type { ShortcutCommand } from "@/hooks/useKeyboardShortcuts";

vi.mock("@/hooks/useCommandPalette", () => ({ useCommandPalette: vi.fn() }));

const setIsHelpOpen = vi.fn();

function open(commands: ShortcutCommand[], isHelpOpen = true) {
  vi.mocked(useCommandPalette).mockReturnValue({
    isHelpOpen,
    setIsHelpOpen,
    commands,
  } as never);
}

const command = (
  key: string,
  description: string,
  category?: ShortcutCommand["category"]
): ShortcutCommand => ({ key, description, action: vi.fn(), category });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("KeyboardShortcutsDialog", () => {
  it("stays closed until help is requested", () => {
    open([command("h", "Home", "navigation")], false);
    render(<KeyboardShortcutsDialog />);

    expect(screen.queryByText("Keyboard Shortcuts")).not.toBeInTheDocument();
  });

  it("lists a registered shortcut under its category", () => {
    open([command("r", "New Room", "room")]);
    render(<KeyboardShortcutsDialog />);

    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Rooms")).toBeInTheDocument();
    expect(screen.getByText("New Room")).toBeInTheDocument();
  });

  it("groups shortcuts across every category", () => {
    open([
      command("h", "Home", "navigation"),
      command("r", "New Room", "room"),
      command("d", "Dark theme", "theme"),
      command("?", "Keyboard shortcuts", "help"),
      command("q", "Log out", "account"),
    ]);
    render(<KeyboardShortcutsDialog />);

    for (const label of ["Navigation", "Rooms", "Theme", "Help", "Account"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("files an uncategorised shortcut under Navigation", () => {
    open([command("z", "Mystery")]);
    render(<KeyboardShortcutsDialog />);

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Mystery")).toBeInTheDocument();
  });

  it("omits a category nobody registered for", () => {
    open([command("h", "Home", "navigation")]);
    render(<KeyboardShortcutsDialog />);

    expect(screen.queryByText("Account")).not.toBeInTheDocument();
    expect(screen.queryByText("Theme")).not.toBeInTheDocument();
  });

  it("shows ⌘ on a Mac", () => {
    vi.stubGlobal("navigator", { ...navigator, platform: "MacIntel" });
    open([command("h", "Home", "navigation")]);
    render(<KeyboardShortcutsDialog />);

    // "⌘/" is the open-menu chord, listed once; "⌘K" repeats per command.
    expect(screen.getByText("⌘/")).toBeInTheDocument();
    expect(screen.getAllByText("⌘K").length).toBeGreaterThan(0);
  });

  it("shows Ctrl elsewhere", () => {
    vi.stubGlobal("navigator", { ...navigator, platform: "Win32" });
    open([command("h", "Home", "navigation")]);
    render(<KeyboardShortcutsDialog />);

    expect(screen.getByText("Ctrl/")).toBeInTheDocument();
    expect(screen.getAllByText("CtrlK").length).toBeGreaterThan(0);
  });

  it("renders with nothing registered", () => {
    open([]);
    render(<KeyboardShortcutsDialog />);

    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
  });
});
