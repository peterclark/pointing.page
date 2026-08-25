/**
 * Tests for theme selection and persistence.
 *
 * The provider is the only thing that writes the `light`/`dark` class onto
 * <html>, which every Tailwind dark: variant keys off, so a regression here is
 * a whole-app visual break rather than a local one.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, useTheme } from "./theme-provider";

/** Pretend the OS is in the given colour scheme. */
function setSystemTheme(prefersDark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: prefersDark,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
}

function Probe() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme("light")}>light</button>
      <button onClick={() => setTheme("dark")}>dark</button>
      <button onClick={() => setTheme("system")}>system</button>
    </div>
  );
}

const root = () => window.document.documentElement;

beforeEach(() => {
  localStorage.clear();
  root().classList.remove("light", "dark");
  setSystemTheme(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ThemeProvider", () => {
  it("falls back to the supplied default when nothing is stored", () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(root()).toHaveClass("dark");
  });

  it("prefers a previously stored choice over the default", () => {
    localStorage.setItem("vite-ui-theme", "light");

    render(
      <ThemeProvider defaultTheme="dark">
        <Probe />
      </ThemeProvider>
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(root()).toHaveClass("light");
  });

  it("reads the OS preference when the theme is 'system'", () => {
    setSystemTheme(true);

    render(
      <ThemeProvider defaultTheme="system">
        <Probe />
      </ThemeProvider>
    );

    expect(root()).toHaveClass("dark");
    // The stored preference stays "system" — only the applied class follows.
    expect(screen.getByTestId("theme")).toHaveTextContent("system");
  });

  it("applies light when the OS prefers light", () => {
    setSystemTheme(false);

    render(
      <ThemeProvider defaultTheme="system">
        <Probe />
      </ThemeProvider>
    );

    expect(root()).toHaveClass("light");
  });

  it("swaps the class rather than accumulating both", async () => {
    render(
      <ThemeProvider defaultTheme="light">
        <Probe />
      </ThemeProvider>
    );
    expect(root()).toHaveClass("light");

    await userEvent.click(screen.getByRole("button", { name: "dark" }));

    expect(root()).toHaveClass("dark");
    expect(root()).not.toHaveClass("light");
  });

  it("persists the choice for the next visit", async () => {
    render(
      <ThemeProvider defaultTheme="system">
        <Probe />
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "dark" }));

    expect(localStorage.getItem("vite-ui-theme")).toBe("dark");
  });

  it("honours a custom storage key", async () => {
    render(
      <ThemeProvider defaultTheme="system" storageKey="custom-theme">
        <Probe />
      </ThemeProvider>
    );

    await userEvent.click(screen.getByRole("button", { name: "light" }));

    expect(localStorage.getItem("custom-theme")).toBe("light");
    expect(localStorage.getItem("vite-ui-theme")).toBeNull();
  });

  it("returns to following the OS when set back to 'system'", async () => {
    setSystemTheme(true);

    render(
      <ThemeProvider defaultTheme="light">
        <Probe />
      </ThemeProvider>
    );
    expect(root()).toHaveClass("light");

    await userEvent.click(screen.getByRole("button", { name: "system" }));

    expect(root()).toHaveClass("dark");
  });
});
