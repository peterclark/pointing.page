/**
 * Tests for the ⌘K chord indicator.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { CommandPaletteIndicator } from "./CommandPaletteIndicator";
import { useCommandPalette } from "@/hooks/useCommandPalette";

vi.mock("@/hooks/useCommandPalette", () => ({ useCommandPalette: vi.fn() }));

function setArmed(isWaiting: boolean) {
  vi.mocked(useCommandPalette).mockReturnValue({ isWaiting } as never);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("CommandPaletteIndicator", () => {
  it("renders nothing while the chord is unarmed", () => {
    setArmed(false);
    const { container } = render(<CommandPaletteIndicator />);

    // The 100ms fade-out timer must not make an unarmed indicator appear.
    act(() => vi.advanceTimersByTime(200));

    expect(container).toBeEmptyDOMElement();
  });

  it("appears while armed", () => {
    setArmed(true);
    render(<CommandPaletteIndicator />);

    expect(screen.getByText("pressed")).toBeInTheDocument();
    expect(screen.getByText("Type a command key...")).toBeInTheDocument();
  });

  it("shows ⌘ on a Mac", () => {
    vi.stubGlobal("navigator", { ...navigator, platform: "MacIntel" });
    setArmed(true);
    render(<CommandPaletteIndicator />);

    expect(screen.getByText("⌘K")).toBeInTheDocument();
  });

  it("shows Ctrl elsewhere", () => {
    vi.stubGlobal("navigator", { ...navigator, platform: "Win32" });
    setArmed(true);
    render(<CommandPaletteIndicator />);

    expect(screen.getByText("CtrlK")).toBeInTheDocument();
  });

  it("lingers briefly after disarming, then disappears", () => {
    setArmed(true);
    const { rerender, container } = render(<CommandPaletteIndicator />);
    expect(screen.getByText("pressed")).toBeInTheDocument();

    setArmed(false);
    rerender(<CommandPaletteIndicator />);

    // Still mounted, so the fade-out animation has something to animate.
    expect(screen.getByText("pressed")).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(100));

    expect(container).toBeEmptyDOMElement();
  });
});
