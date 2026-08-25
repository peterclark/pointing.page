/**
 * Tests for the command palette registry.
 *
 * Components register their shortcuts on mount and unregister on unmount, so
 * the registry's correctness under repeated mounts is what keeps ⌘K from either
 * losing commands or accumulating duplicates.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPaletteProvider } from "./CommandPaletteContext";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { useEffect } from "react";

/** Registers one command for its lifetime and reports registry state. */
function Registrar({ shortcut, onRun }: { shortcut: string; onRun: () => void }) {
  const { registerCommand, commands } = useCommandPalette();

  useEffect(
    () =>
      registerCommand({
        key: shortcut,
        description: `Run ${shortcut}`,
        action: onRun,
      }),
    [registerCommand, shortcut, onRun]
  );

  return <span data-testid="count">{commands.length}</span>;
}

function Controls() {
  const {
    isHelpOpen,
    showHelp,
    setIsHelpOpen,
    isCreateRoomDialogOpen,
    openCreateRoomDialog,
    setIsCreateRoomDialogOpen,
    executeCommand,
  } = useCommandPalette();

  return (
    <div>
      <span data-testid="help">{String(isHelpOpen)}</span>
      <span data-testid="create">{String(isCreateRoomDialogOpen)}</span>
      <button onClick={showHelp}>show help</button>
      <button onClick={() => setIsHelpOpen(false)}>close help</button>
      <button onClick={openCreateRoomDialog}>open create</button>
      <button onClick={() => setIsCreateRoomDialogOpen(false)}>close create</button>
      <button onClick={() => executeCommand("x")}>run x</button>
    </div>
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("CommandPaletteProvider", () => {
  it("starts with no commands registered", () => {
    render(
      <CommandPaletteProvider>
        <Registrar shortcut="a" onRun={vi.fn()} />
      </CommandPaletteProvider>
    );

    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("keeps commands from separate components side by side", () => {
    render(
      <CommandPaletteProvider>
        <Registrar shortcut="a" onRun={vi.fn()} />
        <Registrar shortcut="b" onRun={vi.fn()} />
      </CommandPaletteProvider>
    );

    expect(screen.getAllByTestId("count")[0]).toHaveTextContent("2");
  });

  it("refuses a duplicate key and says so", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(
      <CommandPaletteProvider>
        <Registrar shortcut="a" onRun={vi.fn()} />
        <Registrar shortcut="a" onRun={vi.fn()} />
      </CommandPaletteProvider>
    );

    expect(screen.getAllByTestId("count")[0]).toHaveTextContent("1");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"a" already registered'));
  });

  it("unregisters a command when its component unmounts", () => {
    const { rerender } = render(
      <CommandPaletteProvider>
        <Registrar shortcut="a" onRun={vi.fn()} />
        <Registrar shortcut="b" onRun={vi.fn()} />
      </CommandPaletteProvider>
    );
    expect(screen.getAllByTestId("count")[0]).toHaveTextContent("2");

    rerender(
      <CommandPaletteProvider>
        <Registrar shortcut="a" onRun={vi.fn()} />
      </CommandPaletteProvider>
    );

    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("runs a registered command by key", async () => {
    const onRun = vi.fn();

    render(
      <CommandPaletteProvider>
        <Registrar shortcut="x" onRun={onRun} />
        <Controls />
      </CommandPaletteProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "run x" }));

    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("opens and closes the shortcuts help", async () => {
    render(
      <CommandPaletteProvider>
        <Controls />
      </CommandPaletteProvider>
    );
    expect(screen.getByTestId("help")).toHaveTextContent("false");

    await userEvent.click(screen.getByRole("button", { name: "show help" }));
    expect(screen.getByTestId("help")).toHaveTextContent("true");

    await userEvent.click(screen.getByRole("button", { name: "close help" }));
    expect(screen.getByTestId("help")).toHaveTextContent("false");
  });

  it("opens and closes the create-room dialog", async () => {
    render(
      <CommandPaletteProvider>
        <Controls />
      </CommandPaletteProvider>
    );
    expect(screen.getByTestId("create")).toHaveTextContent("false");

    await userEvent.click(screen.getByRole("button", { name: "open create" }));
    expect(screen.getByTestId("create")).toHaveTextContent("true");

    await userEvent.click(screen.getByRole("button", { name: "close create" }));
    expect(screen.getByTestId("create")).toHaveTextContent("false");
  });

  it("arms on ⌘K and dispatches the second key to a registered command", async () => {
    const onRun = vi.fn();

    render(
      <CommandPaletteProvider>
        <Registrar shortcut="x" onRun={onRun} />
      </CommandPaletteProvider>
    );

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
      );
    });
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "x", bubbles: true })
      );
    });

    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it("throws when used outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    function Orphan() {
      useCommandPalette();
      return null;
    }

    expect(() => render(<Orphan />)).toThrow(/CommandPaletteProvider/);
  });
});
