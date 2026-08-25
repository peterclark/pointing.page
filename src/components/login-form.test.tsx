/**
 * Tests for the social sign-in form.
 *
 * The branch that matters is the identity choice. Every visitor arrives holding
 * an anonymous session, and their rooms are keyed to that `auth.uid()`. Calling
 * `signInWithOAuth()` on a guest would mint a *new* user and strand every room
 * they joined; `linkIdentity()` attaches the provider to the identity they
 * already have. Picking the wrong one loses user data silently, so both paths
 * are pinned here.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";
import { supabase } from "@/lib/supabase/client";
import { toast } from "sonner";

vi.mock("@/lib/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      linkIdentity: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

/** Put a user of the given kind behind `getUser()`. */
function signedInAs(kind: "guest" | "account" | "nobody") {
  const user =
    kind === "nobody" ? null : { id: "user-1", is_anonymous: kind === "guest" };
  vi.mocked(supabase.auth.getUser).mockResolvedValue({
    data: { user },
    error: null,
  } as never);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(supabase.auth.linkIdentity).mockResolvedValue({ error: null } as never);
  vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({ error: null } as never);
});

describe("LoginForm", () => {
  it("offers both providers", () => {
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: "Google" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "GitHub" })).toBeInTheDocument();
  });

  it("links the provider to a guest's existing identity", async () => {
    signedInAs("guest");
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: "Google" }));

    await waitFor(() =>
      expect(supabase.auth.linkIdentity).toHaveBeenCalledWith({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/` },
      })
    );
    // Signing in would have created a second user and stranded their rooms.
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it("signs in normally when the visitor already has an account", async () => {
    signedInAs("account");
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: "GitHub" }));

    await waitFor(() =>
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: "github",
        options: { redirectTo: `${window.location.origin}/` },
      })
    );
    expect(supabase.auth.linkIdentity).not.toHaveBeenCalled();
  });

  it("signs in normally when there is no session at all", async () => {
    signedInAs("nobody");
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: "Google" }));

    await waitFor(() => expect(supabase.auth.signInWithOAuth).toHaveBeenCalled());
    expect(supabase.auth.linkIdentity).not.toHaveBeenCalled();
  });

  it("surfaces a linking failure instead of stranding the guest silently", async () => {
    signedInAs("guest");
    // Manual Linking disabled in the dashboard produces exactly this.
    vi.mocked(supabase.auth.linkIdentity).mockResolvedValue({
      error: new Error("Manual linking is disabled"),
    } as never);

    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Google" }));

    await waitFor(() =>
      expect(screen.getByText("Manual linking is disabled")).toBeInTheDocument()
    );
    expect(toast.error).toHaveBeenCalledWith("Manual linking is disabled");
  });

  it("re-enables the buttons after a failure so the visitor can retry", async () => {
    signedInAs("account");
    vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
      error: new Error("provider unavailable"),
    } as never);

    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Google" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Google" })).toBeEnabled()
    );
  });

  it("disables both buttons while the redirect is in flight", async () => {
    signedInAs("guest");
    vi.mocked(supabase.auth.linkIdentity).mockReturnValue(
      new Promise(() => {}) as never
    );

    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: "Google" }));

    // Both buttons relabel, so neither provider can be double-submitted.
    await waitFor(() => {
      const buttons = screen.getAllByRole("button", { name: "Connecting..." });
      expect(buttons).toHaveLength(2);
      buttons.forEach((button) => expect(button).toBeDisabled());
    });
  });
});
