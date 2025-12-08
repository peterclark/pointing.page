/**
 * Integration tests for account linking flow
 *
 * Strategic tests covering critical gaps:
 * - Complete account creation to linking flow
 * - Name propagation from form -> localStorage -> profile
 * - Account linking with existing participation
 * - Cross-page navigation via header
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProfilePage } from "@/pages/ProfilePage";
import { Header } from "@/components/Header";
import ProfileButton from "@/components/ProfileButton";
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
      signInWithOAuth: vi.fn(),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
  },
}));

describe("Account Linking Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Storage.prototype.getItem = vi.fn();
    Storage.prototype.setItem = vi.fn();
    Storage.prototype.removeItem = vi.fn();
  });

  it.skip("should complete full account creation and linking flow", async () => {
    // SKIPPED: This test checks for magic link UI which was replaced with OAuth
    // Scenario: User creates account -> receives magic link -> gets linked

    // Step 1: Unauthenticated user on profile page
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });

    vi.mocked(utils.getParticipantName).mockReturnValue("Test User");
    vi.mocked(utils.getParticipantId).mockReturnValue("local-id-123");

    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: {},
      error: null,
    } as any);

    const { rerender } = render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    // Fill form and submit
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send verification link/i,
    });

    expect(nameInput).toHaveValue("Test User"); // Pre-filled from localStorage

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    // Verify magic link sent and name stored
    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        options: {
          emailRedirectTo: expect.stringContaining("/profile"),
          data: {
            display_name: "Test User",
          },
        },
      });
    });

    expect(Storage.prototype.setItem).toHaveBeenCalledWith(
      "pending_profile_name",
      "Test User"
    );

    // Step 2: User clicks magic link and becomes authenticated
    const mockUser = {
      id: "user-789",
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

    // Mock profile doesn't exist (new user)
    vi.mocked(queries.getProfile).mockResolvedValue(null);

    // Mock successful profile creation
    vi.mocked(queries.createProfile).mockResolvedValue({
      id: "profile-789",
      user_id: "user-789",
      display_name: "Test User",
      created_at: "2024-01-01T00:00:00Z",
    });

    // Mock successful linking
    vi.mocked(queries.linkParticipantsToUser).mockResolvedValue(undefined);

    // Trigger rerender with authenticated state
    Storage.prototype.getItem = vi.fn((key) => {
      if (key === "pending_profile_name") return "Test User";
      if (key === "participant_id") return "local-id-123";
      return null;
    });

    rerender(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    // Verify account linking happens
    await waitFor(() => {
      expect(queries.createProfile).toHaveBeenCalledWith(
        "user-789",
        "Test User"
      );
    });

    await waitFor(() => {
      expect(queries.linkParticipantsToUser).toHaveBeenCalledWith(
        "local-id-123",
        "user-789"
      );
    });

    // Verify pending name cleared
    await waitFor(() => {
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith(
        "pending_profile_name"
      );
    });
  });

  it("should handle profile update with localStorage sync", async () => {
    // Scenario: Authenticated user updates name -> localStorage updates

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

    // Wait for profile to load
    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    const nameInput = await screen.findByDisplayValue("Old Name");
    fireEvent.change(nameInput, { target: { value: "New Name" } });

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    // Verify update and localStorage sync
    await waitFor(() => {
      expect(queries.updateProfile).toHaveBeenCalledWith(
        "user-456",
        "New Name"
      );
    });

    await waitFor(() => {
      expect(utils.saveParticipantName).toHaveBeenCalledWith("New Name");
    });
  });

  it("should handle existing profile gracefully during linking", async () => {
    // Scenario: User already has profile (returning user) - no new profile creation

    const mockUser = {
      id: "user-999",
      email: "existing@example.com",
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

    // Profile already exists - return it on all calls
    const existingProfile = {
      id: "profile-999",
      user_id: "user-999",
      display_name: "Existing User",
      created_at: "2024-01-01T00:00:00Z",
    };

    vi.mocked(queries.getProfile).mockResolvedValue(existingProfile);

    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    // Verify profile loads
    await waitFor(() => {
      expect(screen.getByText("Profile")).toBeInTheDocument();
    });

    // Wait for profile name to display
    await waitFor(
      () => {
        const nameInput = screen.getByDisplayValue(
          "Existing User"
        ) as HTMLInputElement;
        expect(nameInput).toBeInTheDocument();
      },
      { timeout: 2000 }
    );

    // createProfile should NOT be called for existing users
    expect(queries.createProfile).not.toHaveBeenCalled();
  });

  it("should navigate from header to profile page", async () => {
    // Scenario: User clicks account button -> navigates to profile

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });

    vi.mocked(utils.getParticipantName).mockReturnValue(null);

    render(
      <BrowserRouter>
        <ProfileButton />
        <Routes>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    );

    // Click account button
    const accountButton = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(accountButton);

    // Verify navigation to profile page
    await waitFor(() => {
      expect(screen.getByText(/create account/i)).toBeInTheDocument();
    });
  });

  it.skip("should handle magic link send error with user feedback", async () => {
    // SKIPPED: This test checks for magic link UI which was replaced with OAuth
    // Scenario: Magic link fails to send - user can retry

    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });

    vi.mocked(utils.getParticipantName).mockReturnValue("Test User");

    vi.mocked(supabase.auth.signInWithOtp).mockResolvedValue({
      data: {},
      error: {
        message: "Rate limit exceeded",
        name: "RateLimitError",
        status: 429,
      },
    } as any);

    render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole("button", {
      name: /send verification link/i,
    });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(submitButton);

    // Verify error handling
    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalled();
    });

    // Form should remain enabled for retry
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it("should prevent duplicate account linking attempts", async () => {
    // Scenario: Ensure linking only happens once per user session

    const mockUser = {
      id: "user-333",
      email: "duplicate@example.com",
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

    vi.mocked(queries.getProfile).mockResolvedValue(null);
    vi.mocked(utils.getParticipantId).mockReturnValue("local-id-789");

    vi.mocked(queries.createProfile).mockResolvedValue({
      id: "profile-333",
      user_id: "user-333",
      display_name: "Duplicate Test",
      created_at: "2024-01-01T00:00:00Z",
    });

    vi.mocked(queries.linkParticipantsToUser).mockResolvedValue(undefined);

    Storage.prototype.getItem = vi.fn((key) => {
      if (key === "pending_profile_name") return "Duplicate Test";
      if (key === "participant_id") return "local-id-789";
      return null;
    });

    const { rerender } = render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    // Wait for initial linking
    await waitFor(() => {
      expect(queries.linkParticipantsToUser).toHaveBeenCalledTimes(1);
    });

    vi.mocked(queries.getProfile).mockResolvedValue({
      id: "profile-333",
      user_id: "user-333",
      display_name: "Duplicate Test",
      created_at: "2024-01-01T00:00:00Z",
    });

    // Trigger rerender
    rerender(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    // Linking should NOT be called again
    await waitFor(() => {
      expect(queries.linkParticipantsToUser).toHaveBeenCalledTimes(1);
    });
  });
});
