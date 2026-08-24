/**
 * Tests for the two-stroke command-palette shortcut hook (⌘K, then a key).
 *
 * Covers the chord state machine — arming, dispatch, cancellation, timeout —
 * and the guards that keep shortcuts from firing while the user is typing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useKeyboardShortcuts, type ShortcutCommand } from "./useKeyboardShortcuts";

/** Dispatch a keydown on document, the element the hook listens on. */
function press(key: string, init: KeyboardEventInit = {}) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init })
    );
  });
}

/** Arm the chord with ⌘K. */
function arm() {
  press("k", { metaKey: true });
}

let commands: ShortcutCommand[];
let home: ReturnType<typeof vi.fn>;
let help: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "log").mockImplementation(() => {});
  home = vi.fn();
  help = vi.fn();
  commands = [
    { key: "h", description: "Go home", action: home, category: "navigation" },
    { key: "?", description: "Show help", action: help, category: "help" },
  ];
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("useKeyboardShortcuts", () => {
  it("starts unarmed", () => {
    const { result } = renderHook(() => useKeyboardShortcuts(commands));

    expect(result.current.isWaiting).toBe(false);
  });

  it("arms on ⌘K and runs the matching command on the second key", () => {
    const { result } = renderHook(() => useKeyboardShortcuts(commands));

    arm();
    expect(result.current.isWaiting).toBe(true);

    press("h");
    expect(home).toHaveBeenCalledTimes(1);
    expect(result.current.isWaiting).toBe(false);
  });

  it("arms on Ctrl+K for non-Mac keyboards", () => {
    const { result } = renderHook(() => useKeyboardShortcuts(commands));

    press("k", { ctrlKey: true });

    expect(result.current.isWaiting).toBe(true);
  });

  it("matches command keys case-insensitively", () => {
    renderHook(() => useKeyboardShortcuts(commands));

    arm();
    press("H");

    expect(home).toHaveBeenCalledTimes(1);
  });

  it("dispatches '?' even though it needs Shift", () => {
    renderHook(() => useKeyboardShortcuts(commands));

    arm();
    press("?", { shiftKey: true });

    expect(help).toHaveBeenCalledTimes(1);
  });

  it("stays armed when the second key matches nothing", () => {
    const { result } = renderHook(() => useKeyboardShortcuts(commands));

    arm();
    press("z");

    expect(home).not.toHaveBeenCalled();
    expect(help).not.toHaveBeenCalled();
    expect(result.current.isWaiting).toBe(true);
  });

  it("ignores a second key held with a modifier", () => {
    renderHook(() => useKeyboardShortcuts(commands));

    arm();
    press("h", { altKey: true });

    expect(home).not.toHaveBeenCalled();
  });

  it("disarms on Escape", () => {
    const { result } = renderHook(() => useKeyboardShortcuts(commands));

    arm();
    press("Escape");

    expect(result.current.isWaiting).toBe(false);
    expect(home).not.toHaveBeenCalled();
  });

  it("disarms once the chord times out", () => {
    const { result } = renderHook(() => useKeyboardShortcuts(commands, { timeout: 1000 }));

    arm();
    expect(result.current.isWaiting).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isWaiting).toBe(false);
  });

  it("does nothing at all when disabled", () => {
    const { result } = renderHook(() => useKeyboardShortcuts(commands, { enabled: false }));

    arm();
    press("h");

    expect(result.current.isWaiting).toBe(false);
    expect(home).not.toHaveBeenCalled();
  });

  it("does not arm while focus is in a text input", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => useKeyboardShortcuts(commands));
    arm();

    expect(result.current.isWaiting).toBe(false);
  });

  it("does not arm while focus is in a contenteditable region", () => {
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "true");
    editor.tabIndex = 0;
    document.body.appendChild(editor);
    editor.focus();

    const { result } = renderHook(() => useKeyboardShortcuts(commands));
    arm();

    expect(result.current.isWaiting).toBe(false);
  });

  it("still arms inside inputs when disableInInputs is off", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() =>
      useKeyboardShortcuts(commands, { disableInInputs: false })
    );
    arm();

    expect(result.current.isWaiting).toBe(true);
  });

  it("exposes executeCommand for triggering a command without the chord", () => {
    const { result } = renderHook(() => useKeyboardShortcuts(commands));

    act(() => {
      result.current.executeCommand("h");
    });

    expect(home).toHaveBeenCalledTimes(1);
  });

  it("stops listening after unmount", () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts(commands));

    unmount();
    arm();
    press("h");

    expect(home).not.toHaveBeenCalled();
  });
});
