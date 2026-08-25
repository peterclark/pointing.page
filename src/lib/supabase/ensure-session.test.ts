/**
 * Tests for `ensureSession`, the anonymous-auth bootstrap.
 *
 * This is what gives every visitor an `auth.uid()`, which is the thing that
 * makes server-side vote privacy expressible at all.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ensureSession } from "./auth";
import { supabase } from "./client";

vi.mock("./client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signInAnonymously: vi.fn(),
    },
  },
}));

const session = { user: { id: "user-1", is_anonymous: true } };

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ensureSession", () => {
  it("reuses an existing session rather than minting a second identity", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session },
      error: null,
    } as never);

    await expect(ensureSession()).resolves.toEqual(session);

    // A returning visitor must keep the same auth.uid(), or they lose every
    // participant row they own.
    expect(supabase.auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("signs in anonymously when there is no session", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    vi.mocked(supabase.auth.signInAnonymously).mockResolvedValue({
      data: { session },
      error: null,
    } as never);

    await expect(ensureSession()).resolves.toEqual(session);
    expect(supabase.auth.signInAnonymously).toHaveBeenCalled();
  });

  it("returns null rather than throwing when sign-in fails", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    vi.mocked(supabase.auth.signInAnonymously).mockResolvedValue({
      data: { session: null },
      error: { message: "network down" },
    } as never);

    // The caller renders a degraded, read-only app; it does not crash.
    await expect(ensureSession()).resolves.toBeNull();
  });
});
