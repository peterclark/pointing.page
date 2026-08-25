/**
 * Test for the root layout wrapper.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RootLayout } from "./RootLayout";

vi.mock("./AppMenu", () => ({ AppMenu: () => <nav>menu</nav> }));
vi.mock("./KeyboardShortcutsDialog", () => ({
  KeyboardShortcutsDialog: () => <div>shortcuts</div>,
}));
vi.mock("./CommandPaletteIndicator", () => ({
  CommandPaletteIndicator: () => <div>indicator</div>,
}));

describe("RootLayout", () => {
  it("renders the route alongside the persistent chrome", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<p>page content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("page content")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByText("shortcuts")).toBeInTheDocument();
    expect(screen.getByText("indicator")).toBeInTheDocument();
  });
});
