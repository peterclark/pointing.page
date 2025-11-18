import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { JoinRoomHandler } from "./JoinRoomHandler";
import * as queries from "@/lib/supabase/queries";

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: vi.fn(),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/lib/supabase/queries", () => ({
  getRoomByCode: vi.fn(),
}));

// Import after mocks
import { useParams } from "react-router-dom";

describe("JoinRoomHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("displays LoadingScreen with 'Joining your room...' message", () => {
    vi.mocked(useParams).mockReturnValue({ roomCode: "ABC12345" });
    vi.mocked(queries.getRoomByCode).mockResolvedValue({
      id: "room-id",
      room_code: "ABC12345",
      name: "Test Room",
      point_scale: "fibonacci",
      created_at: new Date().toISOString(),
      leader_id: null,
    });

    render(<JoinRoomHandler />);

    expect(screen.getByText("Joining your room...")).toBeInTheDocument();
  });

  it("navigates to room page after pulse animation when room exists", async () => {
    vi.mocked(useParams).mockReturnValue({ roomCode: "abc12345" });
    vi.mocked(queries.getRoomByCode).mockResolvedValue({
      id: "room-id",
      room_code: "ABC12345",
      name: "Test Room",
      point_scale: "fibonacci",
      created_at: new Date().toISOString(),
      leader_id: null,
    });

    render(<JoinRoomHandler />);

    // Wait for database operation to complete
    await vi.waitFor(() => {
      expect(queries.getRoomByCode).toHaveBeenCalledWith("ABC12345");
    });

    // Advance timer to 100% (5 seconds)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Advance timer for pulse animation (1 second)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Now navigation should occur
    expect(mockNavigate).toHaveBeenCalledWith("/room/ABC12345");
  });

  it("displays error when room code format is invalid", async () => {
    vi.mocked(useParams).mockReturnValue({ roomCode: "invalid" });

    render(<JoinRoomHandler />);

    // Error should be displayed immediately
    await vi.waitFor(() => {
      expect(screen.getByText("Invalid room code format")).toBeInTheDocument();
    });
  });

  it("displays error when room is not found", async () => {
    vi.mocked(useParams).mockReturnValue({ roomCode: "ABCD1234" });
    vi.mocked(queries.getRoomByCode).mockResolvedValue(null);

    render(<JoinRoomHandler />);

    await vi.waitFor(() => {
      expect(screen.getByText("Room not found")).toBeInTheDocument();
    });
  });

  it("displays error on network failure", async () => {
    vi.mocked(useParams).mockReturnValue({ roomCode: "abc12345" });
    vi.mocked(queries.getRoomByCode).mockRejectedValue(
      new Error("Network error")
    );

    render(<JoinRoomHandler />);

    await vi.waitFor(() => {
      expect(screen.getByText("Failed to join room. Please try again.")).toBeInTheDocument();
    });
  });

  it("navigates to landing page with error state on error after pulse", async () => {
    vi.mocked(useParams).mockReturnValue({ roomCode: "ABCD1234" });
    vi.mocked(queries.getRoomByCode).mockResolvedValue(null);

    render(<JoinRoomHandler />);

    // Wait for error to be set
    await vi.waitFor(() => {
      expect(screen.getByText("Room not found")).toBeInTheDocument();
    });

    // Advance timer to 100% (5 seconds)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Advance timer for pulse animation (1 second)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should navigate to landing page with error
    expect(mockNavigate).toHaveBeenCalledWith("/", {
      state: { error: "Room not found" },
    });
  });
});
