import { vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type { AuthState } from "@/hooks/useAuth";

/**
 * Build a `useAuth()` return value for tests.
 *
 * Every visitor now holds a session — anonymous sign-in runs before the app
 * renders — so components read their identity from `useAuth()` rather than from
 * localStorage, and a suite that leaves it unmocked renders the signed-out path
 * for everything.
 *
 * ```ts
 * vi.mock("@/hooks/useAuth");
 * vi.mocked(useAuth).mockReturnValue(mockAuthState({ userId: "user-123" }));
 * ```
 */
export function mockAuthState(
  options: {
    /** `auth.uid()`. Match this to the `user_id` on your participant fixtures. */
    userId?: string | null;
    /** A guest session, as created by `signInAnonymously()`. Defaults to true. */
    isAnonymous?: boolean;
    isLoading?: boolean;
  } = {}
): AuthState {
  const { userId = "user-123", isAnonymous = true, isLoading = false } = options;

  if (!userId) {
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      isAnonymous: false,
      isLoading,
    };
  }

  const user = {
    id: userId,
    is_anonymous: isAnonymous,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2025-01-01T00:00:00Z",
  } as User;

  return {
    user,
    session: { user } as AuthState["session"],
    isAuthenticated: !isAnonymous,
    isAnonymous,
    isLoading,
  };
}

/** Convenience for `vi.mocked(useAuth).mockReturnValue(mockAuthState(...))`. */
export function applyAuthMock(
  useAuthMock: { mockReturnValue: (v: AuthState) => unknown },
  options?: Parameters<typeof mockAuthState>[0]
) {
  useAuthMock.mockReturnValue(mockAuthState(options));
}

/** Re-export so suites can `vi.mock` without importing vitest twice. */
export const __vi = vi;
