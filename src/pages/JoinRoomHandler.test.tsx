import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { JoinRoomHandler } from "./JoinRoomHandler";
import * as queries from "@/lib/supabase/queries";

// Mock dependencies
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: vi.fn(),
  useNavigate: () => mockNavigate,
}));

// Note: JoinRoomHandler doesn't use toast directly
// It passes errors via navigate state to LandingPage

vi.mock("@/lib/supabase/queries", () => ({
  getRoomByCode: vi.fn(),
}));

// Import after mocks
import { useParams } from "react-router-dom";

describe("JoinRoomHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to room page when room exists", async () => {
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

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/room/ABC12345");
    });
  });

  it("navigates to home with error when room not found", async () => {
    vi.mocked(useParams).mockReturnValue({ roomCode: "ABCD1234" });
    vi.mocked(queries.getRoomByCode).mockResolvedValue(null);

    render(<JoinRoomHandler />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", {
        state: { error: "Room not found" },
      });
    });
  });

  it("navigates to home with error when room code format is invalid", async () => {
    vi.mocked(useParams).mockReturnValue({ roomCode: "invalid" });

    render(<JoinRoomHandler />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", {
        state: { error: "Invalid room code format" },
      });
    });
  });

  it("navigates to home with error on network failure", async () => {
    vi.mocked(useParams).mockReturnValue({ roomCode: "abc12345" });
    vi.mocked(queries.getRoomByCode).mockRejectedValue(
      new Error("Network error")
    );

    render(<JoinRoomHandler />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/", {
        state: { error: "Failed to join room. Please try again." },
      });
    });
  });
});
