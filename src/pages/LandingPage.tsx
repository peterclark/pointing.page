import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { LoadingScreen } from "@/components/LoadingScreen";
import { toast } from "sonner";
import { PlayingCard } from "@/components/PlayingCard";
import { fanStyle, isRedCard } from "@/lib/cards";
import { useCardTable } from "@/hooks/useCardTable";
import { useCommandPalette } from "@/hooks/useCommandPalette";

/**
 * Landing Page Component
 *
 * Displays a dealt hand and a "Deal a new room" button that opens the room
 * creation dialog, plus a field to join an existing room by code.
 * This is the entry point for users who want to start a new story pointing session.
 * Also displays error toasts if navigated here with an error message.
 * Manages loading state for room creation flow with LoadingScreen overlay.
 */
export function LandingPage() {
  useCardTable();
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
    <div className="flex min-h-dvh flex-col px-6 pt-4 pb-10">
      <p className="font-display flex h-11 items-center justify-center text-2xl">
        Pointing<span className="text-suit">.</span>page
      </p>

      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-8 sm:max-w-[480px]">
        {/* A dealt hand, purely decorative */}
        <div
          aria-hidden="true"
          className="relative mx-auto h-[180px] w-full sm:h-[250px]"
        >
          {heroHand.map((value, index) => (
            <PlayingCard
              key={value}
              value={value}
              red={isRedCard(index)}
              style={{
                ...fanStyle(index, heroHand.length, { tilt: 9, dip: 5 }),
                left: `calc(50% + ${(index - 2) * 36}px)`,
              }}
              className="fan-card absolute top-4 h-[140px] w-[100px] -translate-x-1/2 sm:h-[198px] sm:w-[140px]"
            />
          ))}
        </div>

        <div className="space-y-3 text-center">
          <h1 className="font-display text-[2.5rem] leading-none sm:text-6xl">
            Deal the story.
            <br />
            Show your hands.
          </h1>
          <p className="text-balance text-ivory/80">
            Everyone picks a card face down. The leader flips them all at once.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            size="lg"
            onClick={() => setIsCreateRoomDialogOpen(true)}
            className="h-14 w-full rounded-2xl bg-ivory text-lg font-extrabold text-ink hover:bg-ivory/90"
          >
            Deal a new room
          </Button>
          <form
            onSubmit={handleJoinByCode}
            className="flex gap-2"
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
              className="h-13 rounded-2xl border-2 border-ivory/30 bg-felt-deep/40 px-4 font-mono tracking-wider text-ivory placeholder:font-card placeholder:tracking-normal placeholder:text-ivory/50"
            />
            <Button
              type="submit"
              variant="outline"
              disabled={!isJoinCodeValid}
              className="h-13 rounded-2xl border-2 border-ivory/55 bg-transparent px-5 text-base font-semibold text-ivory hover:bg-ivory/10 hover:text-ivory"
            >
              Join
            </Button>
          </form>
        </div>
      </main>

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

const heroHand = ["1", "2", "3", "5", "8"];
