import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoomByCode } from "@/lib/supabase/queries";

/**
 * Join Room Handler Component
 *
 * Pure navigation logic component that validates a room code from the URL
 * and redirects to the appropriate page.
 *
 * Behaviors:
 * - Extracts room code from URL parameter
 * - Normalizes to uppercase
 * - Validates room exists
 * - Success: Navigate to /room/:roomCode
 * - Room not found: Navigate to / with error toast
 * - Network error: Navigate to / with error toast
 *
 * No UI is rendered - this is pure navigation logic.
 */
export function JoinRoomHandler() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const handleJoinRoom = async () => {
      // Validate room code parameter exists
      if (!roomCode) {
        navigate("/", { state: { error: "Room not found" } });
        return;
      }

      // Normalize room code: uppercase and validate alphanumeric
      const normalizedCode = roomCode.toUpperCase().trim();

      // Validate alphanumeric format (8 characters)
      const alphanumericRegex = /^[A-Z0-9]{8}$/;
      if (!alphanumericRegex.test(normalizedCode)) {
        navigate("/", { state: { error: "Invalid room code format" } });
        return;
      }

      try {
        // Check if room exists
        const room = await getRoomByCode(normalizedCode);

        if (!room) {
          navigate("/", { state: { error: "Room not found" } });
          return;
        }

        // Success: Navigate to the room
        navigate(`/room/${normalizedCode}`);
      } catch (error) {
        console.error("Failed to join room:", error);
        navigate("/", { state: { error: "Failed to join room. Please try again." } });
      }
    };

    handleJoinRoom();
  }, [roomCode, navigate]);

  // No UI - just navigation logic
  return null;
}
