/**
 * Tests for the viewport breakpoint hook backing the responsive layouts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "./use-mobile";

const listeners = new Set<() => void>();

/** Set the viewport width and notify anything subscribed to the media query. */
function setViewportWidth(width: number) {
  window.innerWidth = width;
  act(() => {
    listeners.forEach((fn) => fn());
  });
}

beforeEach(() => {
  listeners.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: window.innerWidth < 768,
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIsMobile", () => {
  it("is true below the 768px breakpoint", () => {
    window.innerWidth = 480;

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it("is false at and above the breakpoint", () => {
    window.innerWidth = 768;

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it("tracks viewport changes after mount", () => {
    window.innerWidth = 1280;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    setViewportWidth(375);

    expect(result.current).toBe(true);
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() => useIsMobile());
    expect(listeners.size).toBe(1);

    unmount();

    expect(listeners.size).toBe(0);
  });
});
