import { useState } from "react";
import { Button } from "@/components/ui/button";
import { revealVotes, clearActiveStory } from "@/lib/supabase/queries";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
 * - Reveal Votes: Shows all participant votes (visible before reveal)
 * - Next Story: Clears active story and returns to story form (visible after reveal)
 *
 * Features:
 * - Only visible to room leader
 * - Loading states during actions
 * - Error handling with toast notifications
 * - Primary button styling for Reveal, secondary for Next Story
 */
export function LeaderControls({
  roomId,
  storyId,
  isRevealed,
  isLeader,
}: LeaderControlsProps) {
  const [isRevealing, setIsRevealing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

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
    } catch (error) {
      console.error("Failed to reveal votes:", error);
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
    } catch (error) {
      console.error("Failed to clear active story:", error);
      toast.error("Failed to start next story. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex gap-3 w-full sm:w-auto">
      {!isRevealed ? (
        // Before reveal: Show "Reveal Votes" button
        <Button
          onClick={handleRevealVotes}
          disabled={isRevealing}
          size="lg"
          className="w-full sm:w-auto bg-fuchsia-500 hover:bg-fuchsia-600"
          variant="default"
        >
          {isRevealing && <Loader2 className="h-4 w-4 animate-spin" />}
          Reveal Votes
        </Button>
      ) : (
        // After reveal: Show "Next Story" button
        <Button
          onClick={handleNextStory}
          disabled={isClearing}
          size="lg"
          className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600"
        >
          {isClearing && <Loader2 className="h-4 w-4 animate-spin" />}
          Next Story
          <ChevronDoubleRightIcon />
        </Button>
      )}
    </div>
  );
}
