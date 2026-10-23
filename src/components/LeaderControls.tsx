import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  revealVotes,
  clearActiveStory,
  revoteStory,
} from "@/lib/supabase/queries";
import { toast } from "sonner";
import { Loader2, RotateCcw } from "lucide-react";
import { ChevronDoubleRightIcon } from "@heroicons/react/24/outline";

interface LeaderControlsProps {
  roomId: string;
  storyId: string | null;
  isRevealed: boolean;
  isLeader: boolean;
}

/**
 * Leader Controls Component
 *
 * Provides leader-only controls for the voting flow:
 * - Flip all cards: Reveals all participant votes (visible before reveal)
 * - Vote again: Starts a new round on the same story (visible after reveal)
 * - Deal next story: Clears active story and returns to story form (visible after reveal)
 *
 * Features:
 * - Only visible to room leader
 * - Loading states during actions
 * - Error handling with toast notifications
 * - Full-width buttons sized for thumbs on the card table
 */
export function LeaderControls({
  roomId,
  storyId,
  isRevealed,
  isLeader,
}: LeaderControlsProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isRevoting, setIsRevoting] = useState(false);

  // Only render if user is the leader
  if (!isLeader) {
    return null;
  }

  // Only show controls if there's an active story
  if (!storyId) {
    return null;
  }

  /**
   * Handles revealing all votes for the current story
   */
  const handleRevealVotes = async () => {
    setIsRevealing(true);
    try {
      await revealVotes(storyId);
      toast.success("Votes revealed!");
    } catch (_error) {
      toast.error("Failed to reveal votes. Please try again.");
    } finally {
      setIsRevealing(false);
    }
  };

  /**
   * Handles clearing the active story to start next story
   */
  const handleNextStory = async () => {
    setIsClearing(true);
    try {
      await clearActiveStory(roomId);
      toast.success("Ready for next story!");
    } catch (_error) {
      toast.error("Failed to start next story. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  /**
   * Starts a new round on a copy of the story, keeping this round's result
   */
  const handleVoteAgain = async () => {
    setIsRevoting(true);
    try {
      await revoteStory(storyId);
      toast.success("New round started");
    } catch (_error) {
      toast.error("Failed to start a new round. Please try again.");
    } finally {
      setIsRevoting(false);
    }
  };

  return (
    <div className="flex w-full gap-3">
      {!isRevealed ? (
        // Before reveal: everyone's card turns over at once
        <Button
          onClick={handleRevealVotes}
          disabled={isRevealing}
          size="lg"
          className="h-14 flex-1 rounded-2xl bg-suit text-lg font-extrabold text-white hover:bg-suit/90"
        >
          {isRevealing && <Loader2 className="h-4 w-4 animate-spin" />}
          Flip all cards
        </Button>
      ) : (
        // After reveal: vote again on the same story, or move on
        <>
          <Button
            onClick={handleVoteAgain}
            disabled={isRevoting || isClearing}
            size="lg"
            variant="outline"
            className="h-14 rounded-2xl border-2 border-ivory/55 bg-transparent px-5 text-base text-ivory hover:bg-ivory/10 hover:text-ivory"
          >
            {isRevoting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            Vote again
          </Button>
          <Button
            onClick={handleNextStory}
            disabled={isClearing || isRevoting}
            size="lg"
            className="h-14 flex-1 rounded-2xl bg-ivory text-lg font-extrabold text-ink hover:bg-ivory/90"
          >
            {isClearing && <Loader2 className="h-4 w-4 animate-spin" />}
            Deal next story
            <ChevronDoubleRightIcon />
          </Button>
        </>
      )}
    </div>
  );
}
