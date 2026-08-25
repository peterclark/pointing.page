/**
 * Tests for the theme dropdown.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeToggle } from "./mode-toggle";
import { useTheme } from "./theme-provider";

vi.mock("./theme-provider", () => ({ useTheme: vi.fn() }));

const setTheme = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(useTheme).mockReturnValue({ theme: "system", setTheme });
});

describe("ModeToggle", () => {
  it("labels the trigger for screen readers", () => {
    render(<ModeToggle />);

    expect(screen.getByRole("button", { name: "Toggle theme" })).toBeInTheDocument();
  });

  it.each([
    ["Light", "light"],
    ["Dark", "dark"],
    ["System", "system"],
  ])("selects %s", async (label, value) => {
    render(<ModeToggle />);

    await userEvent.click(screen.getByRole("button", { name: "Toggle theme" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: label }));

    expect(setTheme).toHaveBeenCalledWith(value);
  });
});
