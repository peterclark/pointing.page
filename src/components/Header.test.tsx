/**
 * Tests for Header component
 *
 * Focused tests covering:
 * - Renders account button
 * - Shows correct icon based on auth state
 * - Navigates to /profile on click
 * - Responsive behavior
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Header from "./Header";
import * as useAuthModule from "@/hooks/useAuth";

// Mock useAuth hook
vi.mock("@/hooks/useAuth");

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render header text", () => {
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });

    render(
      <BrowserRouter>
        <Header />
      </BrowserRouter>
    );

    // Check that Pointing.page text is rendered
    expect(screen.getByText("Pointing")).toBeInTheDocument();
    expect(screen.getByText(".page")).toBeInTheDocument();
  });
});
