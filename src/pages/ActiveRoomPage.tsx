import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatRoomCode, copyToClipboard } from "@/lib/utils";
import { getRoomByCode } from "@/lib/supabase/queries";
import type { Tables } from "@/lib/supabase/client";
import { toast } from "sonner";

/**
 * Active Room Page Component
 *
 * Main room interface showing the room code and name with copy functionality.
 * Validates room exists before displaying.
 *
 * Future enhancements will include:
 * - Participant list
 * - Story voting interface
 * - Real-time updates
 *
 * Current features:
 * - Validates room exists
 * - Displays room name and formatted room code prominently
 * - Copy to clipboard button with toast notifications
 * - Responsive layout
 */
export function ActiveRoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<Tables<"rooms"> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate room exists on mount
  useEffect(() => {
    const validateRoom = async () => {
      if (!roomCode) {
        navigate("/", { state: { error: "Invalid room code" } });
        return;
      }

      // Normalize room code
      const normalizedCode = roomCode.toUpperCase().trim();

      // Validate format (8 alphanumeric characters)
      const alphanumericRegex = /^[A-Z0-9]{8}$/;
      if (!alphanumericRegex.test(normalizedCode)) {
        navigate("/", { state: { error: "Invalid room code format" } });
        return;
      }

      try {
        const roomData = await getRoomByCode(normalizedCode);

        if (!roomData) {
          navigate("/", { state: { error: "Room not found" } });
          return;
        }

        setRoom(roomData);
      } catch (error) {
        console.error("Failed to fetch room:", error);
        navigate("/", { state: { error: "Failed to load room. Please try again." } });
      } finally {
        setIsLoading(false);
      }
    };

    validateRoom();
  }, [roomCode, navigate]);

  const handleCopyRoomCode = async () => {
    if (!roomCode) return;

    // Create full shareable URL
    const shareableUrl = `${window.location.origin}/join/${roomCode}`;
    const success = await copyToClipboard(shareableUrl);

    if (success) {
      toast.success("Link copied to clipboard!", {
        duration: 3000,
      });
    } else {
      toast.error("Failed to copy. Please try manually.", {
        duration: 5000,
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading room...</p>
      </div>
    );
  }

  // Fallback if room is not loaded (shouldn't happen due to validation)
  if (!room || !roomCode) {
    return null;
  }

  const formattedCode = formatRoomCode(roomCode);

  return (
    <div className="container mx-auto min-h-screen px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Room Header Section */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Room Name */}
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-bold">{room.name}</h1>
            </div>

            {/* Room Code and Copy Button */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <p className="text-sm text-muted-foreground">Room Code</p>
                <p className="mt-1 font-mono text-2xl font-bold tracking-wider">
                  {formattedCode}
                </p>
              </div>

              <Button
                onClick={handleCopyRoomCode}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <ClipboardDocumentIcon className="h-5 w-5" />
                Copy Link
              </Button>
            </div>
          </div>
        </Card>

        {/* Placeholder for future room interface */}
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <p className="text-lg">Room interface coming soon...</p>
            <p className="mt-2 text-sm">
              Features like participant list, story voting, and real-time
              updates will be added here.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
