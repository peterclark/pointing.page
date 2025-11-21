/**
 * Tests for ProfilePage component
 *
 * Focused tests covering:
 * - Renders account creation form when unauthenticated
 * - Pre-fills name from localStorage
 * - Sends magic link on form submission
 * - Displays authenticated profile with editable name
 * - Updates profile name successfully
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProfilePage } from "./ProfilePage";
import * as useAuthModule from "@/hooks/useAuth";
import * as queries from "@/lib/supabase/queries";
import * as utils from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";

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
      signInWithOtp: vi.fn(),
    },
  },
}));

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  describe("Unauthenticated State", () => {
    it("should render account creation form", () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });

      vi.mocked(utils.getParticipantName).mockReturnValue(null);

      render(
        <BrowserRouter>
          <ProfilePage />
        </BrowserRouter>
      );

      expect(screen.getByText("Create Account")).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("should pre-fill name from localStorage", () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });

      vi.mocked(utils.getParticipantName).mockReturnValue("John Doe");

      render(
        <BrowserRouter>
          <ProfilePage />
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      expect(nameInput.value).toBe("John Doe");
    });

    it("should send magic link on form submission", async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      });

      vi.mocked(utils.getParticipantName).mockReturnValue(null);

      vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
        data: {},
        error: null,
      } as any);

      render(
        <BrowserRouter>
          <ProfilePage />
        </BrowserRouter>
      );

      const nameInput = screen.getByLabelText(/name/i);
      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole("button", { name: /send verification link/i });

      fireEvent.change(nameInput, { target: { value: "Jane Smith" } });
      fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
          email: "jane@example.com",
          options: {
            emailRedirectTo: expect.stringContaining("/profile"),
            data: {
              display_name: "Jane Smith",
            },
          },
        });
      });
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
