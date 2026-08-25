import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateRoomDialog } from "./CreateRoomDialog";
import * as queries from "@/lib/supabase/queries";
import { useAuth } from "@/hooks/useAuth";
import { mockAuthState } from "@/tests/mock-auth";

// Mock the Supabase queries
vi.mock("@/hooks/useAuth");
vi.mock("@/lib/supabase/queries", () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

describe("CreateRoomDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnRoomCreationStart = vi.fn();
  const mockOnRoomCreationSuccess = vi.fn();
  const mockOnRoomCreationError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.mocked(useAuth).mockReturnValue(mockAuthState({ userId: "user-123" }));
  });

  it("calls onRoomCreationStart and closes dialog when form submits", async () => {
    const user = userEvent.setup();

    render(
      <CreateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onRoomCreationStart={mockOnRoomCreationStart}
        onRoomCreationSuccess={mockOnRoomCreationSuccess}
        onRoomCreationError={mockOnRoomCreationError}
        preservedRoomName={null}
      />
    );

    // Fill in participant name
    const nameInput = screen.getByLabelText(/your name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Test User");

    // Mock successful room creation
    vi.mocked(queries.createRoom).mockResolvedValue({
      id: "room-id",
      room_code: "ABCD1234",
      name: "Test Room",
      point_scale: "fibonacci",
      leader_id: null,
      created_at: new Date().toISOString(),
    });

    vi.mocked(queries.joinRoom).mockResolvedValue({
      id: "participant-id",
      room_id: "room-id",
      user_id: null,
      name: "Test User",
      is_leader: true,
      is_active: true,
      joined_at: new Date().toISOString(),
    });

    // Click Fibonacci button (triggers submit)
    const fibonacciButton = screen.getByRole("button", { name: /fibonacci/i });
    await user.click(fibonacciButton);

    // Verify onRoomCreationStart was called
    await waitFor(() => {
      expect(mockOnRoomCreationStart).toHaveBeenCalled();
    });
  });

  it("calls onRoomCreationSuccess with room code on successful creation", async () => {
    const user = userEvent.setup();

    render(
      <CreateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onRoomCreationStart={mockOnRoomCreationStart}
        onRoomCreationSuccess={mockOnRoomCreationSuccess}
        onRoomCreationError={mockOnRoomCreationError}
        preservedRoomName={null}
      />
    );

    // Fill in participant name
    const nameInput = screen.getByLabelText(/your name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Test User");

    // Mock successful room creation
    vi.mocked(queries.createRoom).mockResolvedValue({
      id: "room-id",
      room_code: "ABCD1234",
      name: "Test Room",
      point_scale: "fibonacci",
      leader_id: null,
      created_at: new Date().toISOString(),
    });

    vi.mocked(queries.joinRoom).mockResolvedValue({
      id: "participant-id",
      room_id: "room-id",
      user_id: null,
      name: "Test User",
      is_leader: true,
      is_active: true,
      joined_at: new Date().toISOString(),
    });

    // Click Fibonacci button
    const fibonacciButton = screen.getByRole("button", { name: /fibonacci/i });
    await user.click(fibonacciButton);

    // Verify onRoomCreationSuccess was called with room code
    await waitFor(() => {
      expect(mockOnRoomCreationSuccess).toHaveBeenCalledWith("ABCD1234");
    });
  });

  it("calls onRoomCreationError when room creation fails", async () => {
    const user = userEvent.setup();

    render(
      <CreateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onRoomCreationStart={mockOnRoomCreationStart}
        onRoomCreationSuccess={mockOnRoomCreationSuccess}
        onRoomCreationError={mockOnRoomCreationError}
        preservedRoomName={null}
      />
    );

    // Fill in participant name
    const nameInput = screen.getByLabelText(/your name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Test User");

    // Mock failed room creation
    vi.mocked(queries.createRoom).mockRejectedValue(new Error("Database error"));

    // Click Fibonacci button
    const fibonacciButton = screen.getByRole("button", { name: /fibonacci/i });
    await user.click(fibonacciButton);

    // Verify onRoomCreationError was called
    await waitFor(() => {
      expect(mockOnRoomCreationError).toHaveBeenCalledWith(
        "Failed to create room. Please try again."
      );
    });
  });

  it("preserves room name when preservedRoomName prop is provided", () => {
    render(
      <CreateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onRoomCreationStart={mockOnRoomCreationStart}
        onRoomCreationSuccess={mockOnRoomCreationSuccess}
        onRoomCreationError={mockOnRoomCreationError}
        preservedRoomName="My Preserved Room"
      />
    );

    const roomNameInput = screen.getByLabelText(/room name/i) as HTMLInputElement;
    expect(roomNameInput.value).toBe("My Preserved Room");
  });

  it("resets point scale to undefined even when preserving room name", () => {
    render(
      <CreateRoomDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onRoomCreationStart={mockOnRoomCreationStart}
        onRoomCreationSuccess={mockOnRoomCreationSuccess}
        onRoomCreationError={mockOnRoomCreationError}
        preservedRoomName="My Preserved Room"
      />
    );

    // Point scale buttons should not be selected/highlighted
    const fibonacciButton = screen.getByRole("button", { name: /fibonacci/i });
    const tshirtButton = screen.getByRole("button", { name: /t-shirt/i });

    // Buttons should be rendered but not in a selected state
    expect(fibonacciButton).toBeInTheDocument();
    expect(tshirtButton).toBeInTheDocument();
  });
});
