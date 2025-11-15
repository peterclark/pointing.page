import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { LandingPage } from "@/pages/LandingPage";
import { ActiveRoomPage } from "@/pages/ActiveRoomPage";
import { JoinRoomHandler } from "@/pages/JoinRoomHandler";
import * as queries from "@/lib/supabase/queries";
import * as utils from "@/lib/utils";
import { toast } from "sonner";

// Mock all external dependencies
vi.mock("@/lib/supabase/queries");
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

/**
 * Integration Tests for Room Creation & Management Feature
 *
 * These tests verify end-to-end workflows covering:
 * - Complete room creation flow (landing -> dialog -> active room)
 * - Join room via URL with valid/invalid codes
 * - localStorage persistence across sessions
 * - Error scenarios and user feedback
 *
 * Following testing standards: focused on critical user workflows,
 * minimal test count, behavior-focused assertions.
 */
describe("Room Creation Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Mock clipboard API
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("completes full room creation workflow from landing to active room", async () => {
    // Mock successful room creation
    const mockRoom = {
      id: "room-uuid",
      room_code: "TESTCODE",
      name: "Purple-Elephant",
      point_scale: "fibonacci" as const,
      created_at: new Date().toISOString(),
      leader_id: null,
    };

    const mockParticipant = {
      id: "participant-uuid",
      room_id: "room-uuid",
      user_id: null,
      name: "Test User",
      is_leader: true,
      is_active: true,
      joined_at: new Date().toISOString(),
    };

    vi.mocked(queries.createRoom).mockResolvedValue(mockRoom);
    vi.mocked(queries.joinRoom).mockResolvedValue(mockParticipant);

    // Create router with landing page
    const router = createMemoryRouter(
      [
        { path: "/", element: <LandingPage /> },
        { path: "/room/:roomCode", element: <ActiveRoomPage /> },
      ],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    // Step 1: User lands on page and clicks "Create Room"
    const createButton = screen.getByRole("button", { name: /create room/i });
    expect(createButton).toBeInTheDocument();
    fireEvent.click(createButton);

    // Step 2: Dialog opens with pre-filled room name
    await waitFor(() => {
      expect(screen.getByText("Create a Room")).toBeInTheDocument();
    });

    // Room name should be auto-generated (check format: Word-Word)
    const roomNameInput = screen.getByLabelText(/room name/i) as HTMLInputElement;
    expect(roomNameInput.value).toMatch(/^[A-Z][a-z]+-[A-Z][a-z]+$/);

    // Step 3: Enter participant name
    const participantInput = screen.getByLabelText(/your name/i);
    fireEvent.change(participantInput, { target: { value: "Test User" } });

    // Step 4: Select point scale (Fibonacci button should now be enabled)
    const fibonacciButton = screen.getByRole("button", { name: /fibonacci/i });
    expect(fibonacciButton).not.toBeDisabled();
    fireEvent.click(fibonacciButton);

    // Step 5: Verify room creation and navigation
    await waitFor(() => {
      expect(queries.createRoom).toHaveBeenCalledWith(
        expect.stringMatching(/^[A-Z][a-z]+-[A-Z][a-z]+$/),
        "fibonacci"
      );
      expect(queries.joinRoom).toHaveBeenCalledWith(
        "room-uuid",
        null,
        "Test User"
      );
    });

    // Verify localStorage was updated with participant name
    expect(localStorage.getItem("participant_name")).toBe("Test User");

    // Verify participant_id was generated
    const participantId = localStorage.getItem("participant_id");
    expect(participantId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("validates room code format before attempting to join", async () => {
    // Create router with join handler
    const router = createMemoryRouter(
      [
        { path: "/", element: <LandingPage /> },
        { path: "/join/:roomCode", element: <JoinRoomHandler /> },
      ],
      { initialEntries: ["/join/invalid"] } // Invalid: too short
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid room code format");
      // Should not call getRoomByCode for invalid format
      expect(queries.getRoomByCode).not.toHaveBeenCalled();
    });
  });

  it("handles network errors gracefully during room creation", async () => {
    vi.mocked(queries.createRoom).mockRejectedValue(
      new Error("Network request failed")
    );

    const router = createMemoryRouter(
      [{ path: "/", element: <LandingPage /> }],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    // Open dialog
    const createButton = screen.getByRole("button", { name: /create room/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Create a Room")).toBeInTheDocument();
    });

    // Enter participant name and select scale
    const participantInput = screen.getByLabelText(/your name/i);
    fireEvent.change(participantInput, { target: { value: "Test User" } });

    const fibonacciButton = screen.getByRole("button", { name: /fibonacci/i });
    fireEvent.click(fibonacciButton);

    // Should show error toast
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to create room. Please try again."
      );
    });

    // Dialog should remain open (not close on error)
    expect(screen.getByText("Create a Room")).toBeInTheDocument();
  });
});

describe("Join Room Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("successfully joins valid room via URL", async () => {
    const mockRoom = {
      id: "room-uuid",
      room_code: "VALID123",
      name: "Test Room",
      point_scale: "fibonacci" as const,
      created_at: new Date().toISOString(),
      leader_id: null,
    };

    vi.mocked(queries.getRoomByCode).mockResolvedValue(mockRoom);

    const router = createMemoryRouter(
      [
        { path: "/", element: <LandingPage /> },
        { path: "/join/:roomCode", element: <JoinRoomHandler /> },
        { path: "/room/:roomCode", element: <ActiveRoomPage /> },
      ],
      { initialEntries: ["/join/valid123"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(queries.getRoomByCode).toHaveBeenCalledWith("VALID123");
    });

    // Should navigate to room page (check for room code display)
    await waitFor(() => {
      expect(screen.getByText(/VALI-D123/i)).toBeInTheDocument();
    });
  });

  it("redirects to home when room code not found", async () => {
    vi.mocked(queries.getRoomByCode).mockResolvedValue(null);

    const router = createMemoryRouter(
      [
        { path: "/", element: <LandingPage /> },
        { path: "/join/:roomCode", element: <JoinRoomHandler /> },
      ],
      { initialEntries: ["/join/notfound"] }
    );

    render(<RouterProvider router={router} />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Room not found");
    });

    // Should show landing page
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create room/i })).toBeInTheDocument();
    });
  });
});

describe("localStorage Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("generates participant_id once and persists across calls", () => {
    // First call generates ID
    const id1 = utils.getParticipantId();
    expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(localStorage.getItem("participant_id")).toBe(id1);

    // Second call returns same ID
    const id2 = utils.getParticipantId();
    expect(id2).toBe(id1);
    expect(localStorage.getItem("participant_id")).toBe(id1);

    // Verify only one entry in localStorage for participant_id
    const keys = Object.keys(localStorage);
    expect(keys.filter(k => k === "participant_id")).toHaveLength(1);
  });

  it("pre-fills participant name from localStorage in create room dialog", async () => {
    // Set up existing participant name in localStorage
    localStorage.setItem("participant_name", "Returning User");

    const mockRoom = {
      id: "room-uuid",
      room_code: "TEST1234",
      name: "Test Room",
      point_scale: "fibonacci" as const,
      created_at: new Date().toISOString(),
      leader_id: null,
    };

    vi.mocked(queries.createRoom).mockResolvedValue(mockRoom);
    vi.mocked(queries.joinRoom).mockResolvedValue({
      id: "participant-uuid",
      room_id: "room-uuid",
      user_id: null,
      name: "Returning User",
      is_leader: true,
      is_active: true,
      joined_at: new Date().toISOString(),
    });

    const router = createMemoryRouter(
      [{ path: "/", element: <LandingPage /> }],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    // Open dialog
    const createButton = screen.getByRole("button", { name: /create room/i });
    fireEvent.click(createButton);

    // Verify participant name is pre-filled
    await waitFor(() => {
      const participantInput = screen.getByLabelText(/your name/i) as HTMLInputElement;
      expect(participantInput.value).toBe("Returning User");
    });
  });
});

describe("Copy Room Link Functionality", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock clipboard API
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  it("copies full shareable URL to clipboard", async () => {
    const router = createMemoryRouter(
      [{ path: "/room/:roomCode", element: <ActiveRoomPage /> }],
      { initialEntries: ["/room/TEST1234"] }
    );

    render(<RouterProvider router={router} />);

    const copyButton = screen.getByRole("button", { name: /copy link/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("/join/TEST1234")
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Link copied to clipboard!",
        { duration: 3000 }
      );
    });
  });

  it("shows error toast when clipboard API fails", async () => {
    // Mock clipboard to fail
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Clipboard access denied")),
      },
      writable: true,
      configurable: true,
    });

    const router = createMemoryRouter(
      [{ path: "/room/:roomCode", element: <ActiveRoomPage /> }],
      { initialEntries: ["/room/TEST1234"] }
    );

    render(<RouterProvider router={router} />);

    const copyButton = screen.getByRole("button", { name: /copy link/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to copy. Please try manually.",
        { duration: 5000 }
      );
    });
  });
});

describe("Form Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear(); // Ensure no pre-filled name
  });

  it("disables point scale buttons until participant name is entered", async () => {
    const router = createMemoryRouter(
      [{ path: "/", element: <LandingPage /> }],
      { initialEntries: ["/"] }
    );

    render(<RouterProvider router={router} />);

    const createButton = screen.getByRole("button", { name: /create room/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Create a Room")).toBeInTheDocument();
    });

    // Clear the participant name field to test disabled state
    const participantInput = screen.getByLabelText(/your name/i) as HTMLInputElement;
    fireEvent.change(participantInput, { target: { value: "" } });

    // Wait for React to update the disabled state
    await waitFor(() => {
      const fibonacciButton = screen.getByRole("button", { name: /fibonacci/i });
      expect(fibonacciButton).toBeDisabled();
    });

    const tshirtButton = screen.getByRole("button", { name: /t-shirt/i });
    expect(tshirtButton).toBeDisabled();

    // Enter participant name
    fireEvent.change(participantInput, { target: { value: "User" } });

    // Buttons should now be enabled
    await waitFor(() => {
      const fibonacciButton = screen.getByRole("button", { name: /fibonacci/i });
      expect(fibonacciButton).not.toBeDisabled();
    });

    const tshirtButtonEnabled = screen.getByRole("button", { name: /t-shirt/i });
    expect(tshirtButtonEnabled).not.toBeDisabled();
  });
});
