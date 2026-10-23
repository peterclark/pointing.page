import { useState } from "react";
import { PlayingCard } from "@/components/PlayingCard";
import { fanStyle, isRedCard } from "@/lib/cards";
import { cn, getPointScaleValues } from "@/lib/utils";
import { submitVote } from "@/lib/supabase/queries";
import { toast } from "sonner";

interface VotingButtonsProps {
  storyId: string;
  participantId: string;
  pointScale: "fibonacci" | "t-shirt";
  currentVote: string | null;
  isRevealed: boolean;
}

/**
 * Voting Buttons Component
 *
 * Displays the room's point values as a fanned hand of playing cards.
 * Features:
 * - Dynamic card values based on room's point scale
 * - The picked card lifts out of the hand with a gold edge
 * - Optimistic updates with rollback on error
 * - Disabled state after votes are revealed
 * - Large, touch-friendly cards that overlap to fit narrow screens
 */
export function VotingButtons({
  storyId,
  participantId,
  pointScale,
  currentVote,
  isRevealed,
}: VotingButtonsProps) {
  const [optimisticVote, setOptimisticVote] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the point values for the selected scale
  const pointValues = getPointScaleValues(pointScale);

  // Use optimistic vote if set, otherwise use current vote
  const displayedVote = optimisticVote ?? currentVote;

  const handleVoteClick = async (pointValue: string) => {
    // Don't allow voting after reveal
    if (isRevealed) return;

    // Optimistic update
    setOptimisticVote(pointValue);
    setIsSubmitting(true);

    try {
      await submitVote(storyId, participantId, pointValue);
      // Success - the subscription will update currentVote
    } catch (_error) {
      toast.error("Failed to submit vote. Please try again.");
      // Rollback optimistic update
      setOptimisticVote(null);
    } finally {
      setIsSubmitting(false);
      // Clear optimistic vote after a short delay
      setTimeout(() => setOptimisticVote(null), 500);
    }
  };

  return (
    <div
      role="group"
      aria-label="Your estimate"
      className="flex justify-center px-2 pt-10 pb-2"
    >
      {pointValues.map((value, index) => {
        const isSelected = displayedVote === value;
        const isDisabled = isRevealed || isSubmitting;
        const isLast = index === pointValues.length - 1;

        // Each slot shrinks as the screen narrows; the card inside keeps its
        // size and overlaps the next slot, so the hand always fits.
        return (
          <div
            key={value}
            className={cn(
              "relative h-[142px] min-w-5 sm:h-[168px]",
              isLast
                ? "shrink-0 basis-[100px] sm:basis-[120px]"
                : "shrink basis-[76px]"
            )}
          >
            <button
              type="button"
              disabled={isDisabled}
              aria-pressed={isSelected}
              aria-label={value}
              onClick={() => handleVoteClick(value)}
              style={fanStyle(index, pointValues.length)}
              className={cn(
                "fan-card absolute top-0 left-0 rounded-xl outline-none",
                "focus-visible:ring-4 focus-visible:ring-gold/70",
                isDisabled && !isSelected && "cursor-not-allowed opacity-70"
              )}
            >
              <PlayingCard
                value={value}
                red={isRedCard(index)}
                highlighted={isSelected}
                className="h-[142px] w-[100px] sm:h-[168px] sm:w-[120px]"
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
