import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useCommandPalette } from "@/hooks/useCommandPalette";

/**
 * Create Room Flow Component
 *
 * The room creation dialog and its loading screen. Lives in RootLayout so the
 * "Deal a new room" button, the menu's New Room item and the ⌘K R shortcut all
 * open the same dialog from any page.
 */
export function CreateRoomFlow() {
  const { isCreateRoomDialogOpen, setIsCreateRoomDialogOpen } =
    useCommandPalette();
  const [isLoading, setIsLoading] = useState(false);
  const [dbOperationComplete, setDbOperationComplete] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [preservedRoomName, setPreservedRoomName] = useState<string | null>(
    null,
  );

  const navigate = useNavigate();
  const roomCodeRef = useRef<string | null>(null);

  // Handle loading screen completion - navigate to room
  const handleLoadingComplete = useCallback(() => {
    setIsLoading(false);
    setDbOperationComplete(false);
    if (roomCodeRef.current) {
      navigate(`/room/${roomCodeRef.current}`);
      roomCodeRef.current = null;
    }
  }, [navigate]);

  // Handle room creation start
  const handleRoomCreationStart = useCallback(
    (roomName: string) => {
      setPreservedRoomName(roomName);
      setIsCreateRoomDialogOpen(false);
      setIsLoading(true);
      setDbOperationComplete(false);
      setLoadingError(null);
    },
    [setIsCreateRoomDialogOpen],
  );

  // Handle room creation success
  const handleRoomCreationSuccess = useCallback((roomCode: string) => {
    roomCodeRef.current = roomCode;
    setDbOperationComplete(true);
    setPreservedRoomName(null);
  }, []);

  // Handle room creation error
  const handleRoomCreationError = useCallback(
    (error: string) => {
      setIsLoading(false);
      setDbOperationComplete(false);
      setLoadingError(error);
      toast.error(error);
      // Reopen dialog with preserved room name
      setIsCreateRoomDialogOpen(true);
    },
    [setIsCreateRoomDialogOpen],
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsCreateRoomDialogOpen(open);
      if (open) {
        setLoadingError(null);
      } else {
        // If closing without loading, clear preserved name
        if (!isLoading) {
          setPreservedRoomName(null);
        }
      }
    },
    [isLoading, setIsCreateRoomDialogOpen],
  );

  return (
    <>
      <CreateRoomDialog
        open={isCreateRoomDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onRoomCreationStart={handleRoomCreationStart}
        onRoomCreationSuccess={handleRoomCreationSuccess}
        onRoomCreationError={handleRoomCreationError}
        preservedRoomName={preservedRoomName}
      />

      {/* Mounted only while loading, so each new room starts from 0% */}
      {isLoading && (
        <LoadingScreen
          isCreating={true}
          isLoading={isLoading}
          dbOperationComplete={dbOperationComplete}
          onComplete={handleLoadingComplete}
          error={loadingError}
        />
      )}
    </>
  );
}
