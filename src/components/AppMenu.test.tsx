/**
 * Tests for AppMenu component
 *
 * Focused tests covering:
 * - MenuIcon renders when unauthenticated
 * - Avatar renders when authenticated
 * - Sign In menu item appears when unauthenticated
 * - Log out menu item appears when authenticated
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { AppMenu } from "./AppMenu";
import * as useAuthModule from "@/hooks/useAuth";

// Mock dependencies
vi.mock("@/hooks/useAuth");
vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ setTheme: vi.fn() }),
}));
vi.mock("@/hooks/useCommandPalette", () => ({
  useCommandPalette: () => ({
    registerCommand: vi.fn(() => vi.fn()),
    showHelp: vi.fn(),
    openCreateRoomDialog: vi.fn(),
  }),
}));
vi.mock("@/lib/supabase/auth", () => ({
  signOut: vi.fn(),
}));
vi.mock("@/components/current-user-avatar", () => ({
  CurrentUserAvatar: () => <div data-testid="user-avatar">Avatar</div>,
}));

describe("AppMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Unauthenticated State", () => {
    it("should render MenuIcon when unauthenticated", () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // MenuIcon should be present (lucide-react renders as svg)
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();

      // Avatar should NOT be present
      expect(screen.queryByTestId("user-avatar")).not.toBeInTheDocument();
    });

    it("should show Sign In menu item when unauthenticated", async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // Open the dropdown by clicking the button
      const button = screen.getByRole("button");
      await user.click(button);

      // Wait for Sign In menu item to appear
      await waitFor(() => {
        expect(screen.getByText("Sign In")).toBeInTheDocument();
      });
    });

    it("should NOT show Log out menu item when unauthenticated", async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // Open the dropdown
      const button = screen.getByRole("button");
      await user.click(button);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText("Sign In")).toBeInTheDocument();
      });

      // Log out menu item should NOT be present
      expect(screen.queryByText("Log out")).not.toBeInTheDocument();
    });
  });

  describe("Authenticated State", () => {
    it("should render Avatar when authenticated", () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: mockUser,
        session: null,
        isAuthenticated: true,
        isLoading: false,
      });

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // Avatar should be present
      expect(screen.getByTestId("user-avatar")).toBeInTheDocument();
    });

    it("should show Log out menu item when authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: mockUser,
        session: null,
        isAuthenticated: true,
        isLoading: false,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // Open the dropdown by clicking the button
      const button = screen.getByRole("button");
      await user.click(button);

      // Wait for Log out menu item to appear
      await waitFor(() => {
        expect(screen.getByText("Log out")).toBeInTheDocument();
      });
    });

    it("should NOT show Sign In menu item when authenticated", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: mockUser,
        session: null,
        isAuthenticated: true,
        isLoading: false,
      });

      const user = userEvent.setup();

      render(
        <BrowserRouter>
          <AppMenu />
        </BrowserRouter>
      );

      // Open the dropdown
      const button = screen.getByRole("button");
      await user.click(button);

      // Wait for menu to open
      await waitFor(() => {
        expect(screen.getByText("Log out")).toBeInTheDocument();
      });

      // Sign In menu item should NOT be present
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });
  });
});
