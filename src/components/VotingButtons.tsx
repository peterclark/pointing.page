import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getPointScaleValues } from "@/lib/utils";
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
 * Displays point value buttons for participants to cast votes.
 * Features:
 * - Dynamic button values based on room's point scale
 * - Visual highlight for currently selected vote
 * - Optimistic updates with rollback on error
 * - Disabled state after votes are revealed
 * - Large, touch-friendly buttons
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
    } catch (error) {
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
    <div className="flex justify-around gap-2 flex-wrap">
      {pointValues.map((value) => {
        const isSelected = displayedVote === value;
        const isDisabled = isRevealed || isSubmitting;

        return (
          <Button
            key={value}
            type="button"
            size="lg"
            variant={isSelected ? "default" : "outline"}
            disabled={isDisabled}
            onClick={() => handleVoteClick(value)}
            className={`flex-1 aspect-square text-xl font-bold ${
              isSelected ? "ring-2 ring-primary" : ""
            } ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {value}
          </Button>
        );
      })}
    </div>
  );
}
