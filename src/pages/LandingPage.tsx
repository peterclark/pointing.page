import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { WavyBackground } from "@/components/ui/wavy-background";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";
import Header from "@/components/Header";
import { useCommandPalette } from "@/hooks/useCommandPalette";

/**
 * Landing Page Component
 *
 * Displays a centered "Create Room" button that opens the room creation dialog.
 * This is the entry point for users who want to start a new story pointing session.
 * Also displays error toasts if navigated here with an error message.
 * Manages loading state for room creation flow with LoadingScreen overlay.
 */
export function LandingPage() {
  const { isCreateRoomDialogOpen, setIsCreateRoomDialogOpen } =
    useCommandPalette();
  const [isLoading, setIsLoading] = useState(false);
  const [dbOperationComplete, setDbOperationComplete] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [preservedRoomName, setPreservedRoomName] = useState<string | null>(
    null,
  );

  const [joinCode, setJoinCode] = useState("");
  // Accepts the code as displayed (ABCD-1234) or typed (abcd1234).
  const normalizedJoinCode = joinCode.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const isJoinCodeValid = /^[A-Z0-9]{8}$/.test(normalizedJoinCode);

  const location = useLocation();
  const navigate = useNavigate();
  const hasShownToast = useRef(false);
  const roomCodeRef = useRef<string | null>(null);

  // Display error toast if navigated here with error state
  useEffect(() => {
    if (location.state?.error && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.error(location.state.error);
      // Clear the state so toast doesn't show again on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Handle loading screen completion - navigate to room
  const handleLoadingComplete = useCallback(() => {
    if (roomCodeRef.current) {
      navigate(`/room/${roomCodeRef.current}`);
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

  // Reset error when dialog opens
  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (isJoinCodeValid) navigate(`/join/${normalizedJoinCode}`);
  };

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
    <div className="bg-black">
      {/* The background and brand stay up behind the Create a Room card, moved
          to the top so the card has room beneath them. */}
      <WavyBackground
        containerClassName={
          isCreateRoomDialogOpen ? "justify-start pt-2 md:pt-12" : undefined
        }
        className="mx-auto flex w-full flex-col items-center px-4"
      >
        <Header />
        {!isCreateRoomDialogOpen && (
          <>
            <TypewriterEffectSmooth words={tagline} />
            <Button
              size="lg"
              variant="outline"
              onClick={() => setIsCreateRoomDialogOpen(true)}
              className="h-14 text-xl sm:h-15 sm:text-2xl text-white/75! hover:text-white! border-white/50! hover:border-white! hover:bg-white/10! bg-transparent! mt-[max(9rem,26dvh)] sm:mt-50 w-full max-w-[400px] self-center rounded-full border-2"
            >
              Enter
            </Button>
            <form
              onSubmit={handleJoinByCode}
              className="mt-4 flex w-full max-w-[400px] gap-2 self-center"
              aria-label="Join a room with a code"
            >
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Have a code? ABCD-1234"
                aria-label="Room code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={9}
                className="h-12 rounded-full border-white/30 bg-transparent text-center font-mono tracking-wider text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-white/40"
              />
              <Button
                type="submit"
                variant="outline"
                disabled={!isJoinCodeValid}
                className="h-12 rounded-full border-white/50 bg-transparent px-5 text-white/75 hover:bg-white/10 hover:text-white"
              >
                Join
              </Button>
            </form>
          </>
        )}
      </WavyBackground>

      <CreateRoomDialog
        open={isCreateRoomDialogOpen}
        onOpenChange={handleDialogOpenChange}
        onRoomCreationStart={handleRoomCreationStart}
        onRoomCreationSuccess={handleRoomCreationSuccess}
        onRoomCreationError={handleRoomCreationError}
        preservedRoomName={preservedRoomName}
      />

      <LoadingScreen
        isCreating={true}
        isLoading={isLoading}
        dbOperationComplete={dbOperationComplete}
        onComplete={handleLoadingComplete}
        error={loadingError}
      />
    </div>
  );
}

const tagline = [
  {
    text: "Harness",
    className: "text-white/90",
  },
  {
    text: "the",
    className: "font-light text-white/90",
  },
  {
    text: "power",
    className: "text-white/90",
  },
  {
    text: "of",
    className: "font-light text-white/90",
  },
  {
    text: "collaborative",
    className: "text-white/90",
  },
  {
    text: "story",
    className: "text-white/90",
  },
  {
    text: "pointing.",
    className: "text-blue-500 dark:text-blue-400",
  },
];
