/**
 * Tests for ProfilePage component
 *
 * Focused tests covering:
 * - Component structure is preserved after social auth migration
 * - Authenticated profile with editable name
 * - Updates profile name successfully
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProfilePage } from "./ProfilePage";
import * as useAuthModule from "@/hooks/useAuth";
import * as queries from "@/lib/supabase/queries";
import * as utils from "@/lib/utils";

// Mock modules
vi.mock("@/hooks/useAuth");
vi.mock("@/lib/supabase/queries");
vi.mock("@/lib/utils", async () => {
  const actual = await vi.importActual("@/lib/utils");
  return {
    ...actual,
    getParticipantName: vi.fn(),
    getParticipantId: vi.fn(),
    saveParticipantName: vi.fn(),
  };
});
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: vi.fn(),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
  })),
}));
vi.mock("@/components/login-form", () => ({
  LoginForm: () => <div>Login Form</div>,
}));
vi.mock("@/components/current-user-avatar", () => ({
  CurrentUserAvatar: () => <div>Avatar</div>,
}));
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  describe("Component Structure", () => {
    it("should render unauthenticated view with Card structure", () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });

      render(
        <BrowserRouter>
          <ProfilePage />
        </BrowserRouter>
      );

      // Verify Card structure is preserved
      expect(screen.getByText("Create Account")).toBeInTheDocument();
      expect(screen.getByText(/sign in with google or github/i)).toBeInTheDocument();
    });

    it("should render loading state", () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: true,
      });

      render(
        <BrowserRouter>
          <ProfilePage />
        </BrowserRouter>
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Authenticated State", () => {
    it("should display authenticated profile", async () => {
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
        session: {
          user: mockUser,
          access_token: "token",
          refresh_token: "refresh",
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: "bearer",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      vi.mocked(queries.getProfile).mockResolvedValue({
        id: "profile-123",
        user_id: "user-123",
        display_name: "Test User",
        created_at: "2024-01-01T00:00:00Z",
      });

      render(
        <BrowserRouter>
          <ProfilePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Profile")).toBeInTheDocument();
      });

      await waitFor(() => {
        const emailInput = screen.getByDisplayValue("test@example.com");
        expect(emailInput).toBeDisabled();
      });
    });

    it("should update profile name successfully", async () => {
      const mockUser = {
        id: "user-456",
        email: "user@example.com",
        aud: "authenticated",
        role: "authenticated",
        created_at: "2024-01-01T00:00:00Z",
        app_metadata: {},
        user_metadata: {},
      };

      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: mockUser,
        session: {
          user: mockUser,
          access_token: "token",
          refresh_token: "refresh",
          expires_in: 3600,
          expires_at: Date.now() + 3600000,
          token_type: "bearer",
        },
        isAuthenticated: true,
        isLoading: false,
      });

      vi.mocked(queries.getProfile).mockResolvedValue({
        id: "profile-456",
        user_id: "user-456",
        display_name: "Old Name",
        created_at: "2024-01-01T00:00:00Z",
      });

      vi.mocked(queries.updateProfile).mockResolvedValue({
        id: "profile-456",
        user_id: "user-456",
        display_name: "New Name",
        created_at: "2024-01-01T00:00:00Z",
      });

      render(
        <BrowserRouter>
          <ProfilePage />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText("Profile")).toBeInTheDocument();
      });

      const nameInput = await screen.findByDisplayValue("Old Name");
      fireEvent.change(nameInput, { target: { value: "New Name" } });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(queries.updateProfile).toHaveBeenCalledWith("user-456", "New Name");
      });
    });
  });
});
