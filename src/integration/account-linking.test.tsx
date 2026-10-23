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
      expect(screen.getByRole("heading", { name: /take a seat/i })).toBeInTheDocument();
    });
  });

  it("upgrades the guest profile once and does not repeat on rerender", async () => {
    // Signing in links the provider to the existing anonymous identity, so
    // auth.uid() is unchanged and the participant rows stay attached. What does
    // need fixing is the display name: the trigger stamped a "Guest ..."
    // placeholder when the anonymous session was created.
    const mockUser = {
      id: "user-333",
      email: "duplicate@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: { full_name: "Duplicate Test" },
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
      isAnonymous: false,
      isLoading: false,
    });

    vi.mocked(queries.getProfile).mockResolvedValue({
      id: "profile-333",
      user_id: "user-333",
      display_name: "Guest 9c06613a",
      created_at: "2024-01-01T00:00:00Z",
    });
    vi.mocked(queries.updateProfile).mockResolvedValue({
      id: "profile-333",
      user_id: "user-333",
      display_name: "Duplicate Test",
      created_at: "2024-01-01T00:00:00Z",
    });

    const { rerender } = render(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(queries.updateProfile).toHaveBeenCalledWith(
        "user-333",
        "Duplicate Test"
      );
    });

    rerender(
      <BrowserRouter>
        <ProfilePage />
      </BrowserRouter>
    );

    // linkingAttemptedRef keeps this to a single upgrade per user.
    await waitFor(() => {
      expect(queries.updateProfile).toHaveBeenCalledTimes(1);
    });
  });
});
