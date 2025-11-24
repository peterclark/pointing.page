/**
 * Tests for useAuth hook
 *
 * Focused tests covering:
 * - Auth state initialization
 * - Auth state change listener
 * - Session retrieval
 * - Cleanup on unmount
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "./useAuth";
import { supabase } from "@/lib/supabase/client";

// Mock the Supabase client
vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    // Mock empty session
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("should set authenticated user when session exists", async () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    };

    const mockSession = {
      user: mockUser,
      access_token: "token",
      refresh_token: "refresh",
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: "bearer",
    };

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
  });

  it("should handle auth state changes via listener", async () => {
    let authCallback: ((event: string, session: any) => void) | null = null;

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation(
      (callback) => {
        authCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }
    );

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Initially no user
    expect(result.current.isAuthenticated).toBe(false);

    // Simulate sign in
    const mockUser = {
      id: "user-456",
      email: "newuser@example.com",
      aud: "authenticated",
      role: "authenticated",
      created_at: "2024-01-01T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
    };

    const mockSession = {
      user: mockUser,
      access_token: "token",
      refresh_token: "refresh",
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: "bearer",
    };

    authCallback?.("SIGNED_IN", mockSession);

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.session).toEqual(mockSession);
  });

  it("should cleanup subscription on unmount", () => {
    const unsubscribeMock = vi.fn();

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    });

    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledOnce();
  });
});
