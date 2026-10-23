import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PlayingCard } from "@/components/PlayingCard";
import { fanStyle, isRedCard } from "@/lib/cards";
import { useCardTable } from "@/hooks/useCardTable";
import { useCommandPalette } from "@/hooks/useCommandPalette";

/**
 * Landing Page Component
 *
 * Displays a dealt hand and a "Deal a new room" button that opens the room
 * creation dialog (rendered by CreateRoomFlow in RootLayout), plus a field to
 * join an existing room by code.
 * This is the entry point for users who want to start a new story pointing session.
 * Also displays error toasts if navigated here with an error message.
 */
export function LandingPage() {
  useCardTable();
  const { openCreateRoomDialog } = useCommandPalette();

  const [joinCode, setJoinCode] = useState("");
  // Accepts the code as displayed (ABCD-1234) or typed (abcd1234).
  const normalizedJoinCode = joinCode.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const isJoinCodeValid = /^[A-Z0-9]{8}$/.test(normalizedJoinCode);

  const location = useLocation();
  const navigate = useNavigate();
  const hasShownToast = useRef(false);

  // Display error toast if navigated here with error state
  useEffect(() => {
    if (location.state?.error && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.error(location.state.error);
      // Clear the state so toast doesn't show again on page refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (isJoinCodeValid) navigate(`/join/${normalizedJoinCode}`);
  };

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
            onClick={() => openCreateRoomDialog()}
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
    </div>
  );
}

const heroHand = ["1", "2", "3", "5", "8"];
