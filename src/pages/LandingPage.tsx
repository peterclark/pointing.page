import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CreateRoomDialog } from "@/components/CreateRoomDialog";
import { toast } from "sonner";
import { WavyBackground } from "@/components/ui/wavy-background";
import { TypewriterEffectSmooth } from "@/components/ui/typewriter-effect";

/**
 * Landing Page Component
 *
 * Displays a centered "Create Room" button that opens the room creation dialog.
 * This is the entry point for users who want to start a new story pointing session.
 * Also displays error toasts if navigated here with an error message.
 */
export function LandingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const location = useLocation();
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

  return (
    <div>
      <WavyBackground className="mx-auto flex flex-col">
        <p className="text-2xl md:text-4xl lg:text-7xl text-fuchsia-400 font-bold inter-var text-center">
          Pointing
          <span className="text-base md:text-2xl lg:text-3xl font-light">
            .page
          </span>
        </p>
        <TypewriterEffectSmooth words={tagline} />
        <Button
          size="lg"
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
          className="h-15 text-2xl text-white/75 mt-50 min-w-[400px] self-center rounded-full border-2"
        >
          Enter
        </Button>
      </WavyBackground>

      <CreateRoomDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}

const tagline = [
  {
    text: "Harness",
    // className: "text-fuchsia-500 dark:text-fuchsia-400",
  },
  {
    text: "the",
  },
  {
    text: "power",
    // className: "text-cyan-500 dark:text-cyan-400",
  },
  {
    text: "of",
  },
  {
    text: "collaborative",
    // className: "text-pink-500 dark:text-pink-400",
  },
  {
    text: "story",
  },
  {
    text: "pointing.",
    className: "text-blue-500 dark:text-blue-400",
  },
];
