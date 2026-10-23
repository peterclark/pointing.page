/**
 * Tests for the Supabase auth helpers.
 *
 * These wrappers own the user-facing feedback for sign-out and the
 * fail-soft behaviour of the user lookups, so both paths are covered.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signOut,
  getCurrentUser,
  isAuthenticated,
  rememberOAuthProvider,
  resumeSignInAfterLinkConflict,
} from "./auth";
import { supabase } from "./client";
import { toast } from "sonner";

vi.mock("./client", () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
      getUser: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const user = { id: "user-1", email: "ada@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("signOut", () => {
  it("confirms to the user on success", async () => {
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    await expect(signOut()).resolves.toBeUndefined();

    expect(toast.success).toHaveBeenCalledWith("Logged out successfully");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("surfaces a toast and rethrows when sign-out fails", async () => {
    const error = new Error("network down");
     
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error } as any);

    await expect(signOut()).rejects.toThrow("network down");

    expect(toast.error).toHaveBeenCalledWith("Failed to log out");
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("getCurrentUser", () => {
  it("returns the authenticated user", async () => {
     
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user }, error: null } as any);

    await expect(getCurrentUser()).resolves.toEqual(user);
  });

  it("returns null instead of throwing when the lookup errors", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: { message: "no session" },
       
    } as any);

    await expect(getCurrentUser()).resolves.toBeNull();
  });
});

describe("isAuthenticated", () => {
  it("is true when a user is returned", async () => {
     
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user }, error: null } as any);

    await expect(isAuthenticated()).resolves.toBe(true);
  });

  it("is false when there is no user", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null,
       
    } as any);

    await expect(isAuthenticated()).resolves.toBe(false);
  });
});

describe("resumeSignInAfterLinkConflict", () => {
  const conflict =
    "/#error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user";

  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState(null, "", "/");
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({ error: null } as never);
  });

  it("signs a returning user in to the account that owns the provider", async () => {
    rememberOAuthProvider("google");
    window.history.replaceState(null, "", conflict);

    await expect(resumeSignInAfterLinkConflict()).resolves.toBe(true);

    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
    expect(window.location.hash).toBe("");
    expect(sessionStorage.getItem("pending_oauth_provider")).toBeNull();
  });

  it("does nothing on an ordinary page load", async () => {
    rememberOAuthProvider("github");

    await expect(resumeSignInAfterLinkConflict()).resolves.toBe(false);
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("leaves the guest alone when it doesn't know which provider was used", async () => {
    window.history.replaceState(null, "", conflict);

    await expect(resumeSignInAfterLinkConflict()).resolves.toBe(false);
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });
});
