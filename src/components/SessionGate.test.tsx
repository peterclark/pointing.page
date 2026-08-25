/**
 * Tests for the session bootstrap gate.
 *
 * The gate exists so no query runs before `auth.uid()` is available. Every RLS
 * policy keys on it, so a query that beats the session is evaluated as an
 * anonymous stranger — it returns no votes and rejects every write.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SessionGate } from "./SessionGate";
import { ensureSession } from "@/lib/supabase/auth";

vi.mock("@/lib/supabase/auth", () => ({ ensureSession: vi.fn() }));

/** A promise plus the handle to settle it, so a test can hold the gate open. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("SessionGate", () => {
  it("withholds children until the session resolves", async () => {
    const gate = deferred<null>();
    vi.mocked(ensureSession).mockReturnValue(gate.promise);

    render(
      <SessionGate>
        <p>room</p>
      </SessionGate>
    );

    expect(screen.queryByText("room")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();

    gate.resolve(null);

    await waitFor(() => expect(screen.getByText("room")).toBeInTheDocument());
  });

  it("signs in before anything beneath it can query", async () => {
    vi.mocked(ensureSession).mockResolvedValue(null);

    render(
      <SessionGate>
        <p>room</p>
      </SessionGate>
    );

    await waitFor(() => expect(screen.getByText("room")).toBeInTheDocument());
    expect(ensureSession).toHaveBeenCalled();
  });

  it("renders the app anyway when sign-in fails", async () => {
    // Policies fail closed, so the result is a read-only app showing revealed
    // votes. That beats a permanent spinner over a working network.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(ensureSession).mockRejectedValue(new Error("network down"));

    render(
      <SessionGate>
        <p>room</p>
      </SessionGate>
    );

    await waitFor(() => expect(screen.getByText("room")).toBeInTheDocument());
  });
});
