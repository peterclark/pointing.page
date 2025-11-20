import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoomByCode } from "@/lib/supabase/queries";
import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Join Room Handler Component
 *
 * Validates a room code from the URL and displays loading screen
 * during validation, then redirects to the appropriate page.
 *
 * Behaviors:
 * - Extracts room code from URL parameter
 * - Normalizes to uppercase
 * - Shows LoadingScreen with "Joining your room..." message
 * - Validates room exists with 5-second loading animation
 * - Success: Navigate to /room/:roomCode after pulse
 * - Room not found: Navigate to / with error toast
 * - Network error: Navigate to / with error toast
 */
export function JoinRoomHandler() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  const [isLoading] = useState(true);
  const [dbOperationComplete, setDbOperationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedRoomCode, setValidatedRoomCode] = useState<string | null>(
    null
  );

  // Handle loading completion - navigate to room or landing
  const handleLoadingComplete = useCallback(() => {
    if (validatedRoomCode) {
      navigate(`/room/${validatedRoomCode}`);
    } else if (error) {
      navigate("/", { state: { error } });
    }
  }, [validatedRoomCode, error, navigate]);

  useEffect(() => {
    const handleJoinRoom = async () => {
      // Validate room code parameter exists
      if (!roomCode) {
        setError("Room not found");
        setDbOperationComplete(true);
        return;
      }

      // Normalize room code: uppercase and validate alphanumeric
      const normalizedCode = roomCode.toUpperCase().trim();

      // Validate alphanumeric format (8 characters)
      const alphanumericRegex = /^[A-Z0-9]{8}$/;
      if (!alphanumericRegex.test(normalizedCode)) {
        setError("Invalid room code format");
        setDbOperationComplete(true);
        return;
      }

      try {
        // Check if room exists
        const room = await getRoomByCode(normalizedCode);

        if (!room) {
          setError("Room not found");
          setDbOperationComplete(true);
          return;
        }

        // Success: Set validated room code and mark operation complete
        setValidatedRoomCode(normalizedCode);
        setDbOperationComplete(true);
      } catch (_error) {
        setError("Failed to join room. Please try again.");
        setDbOperationComplete(true);
      }
    };

    handleJoinRoom();
  }, [roomCode]);

  return (
    <LoadingScreen
      isCreating={false}
      isLoading={isLoading}
      dbOperationComplete={dbOperationComplete}
      onComplete={handleLoadingComplete}
      error={error}
    />
  );
}
