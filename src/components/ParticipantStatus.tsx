import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle } from "lucide-react";
import type { Tables } from "@/lib/supabase/client";

interface ParticipantStatusProps {
  participants: Tables<"participants">[];
  votes: Tables<"votes">[];
  isRevealed: boolean;
}

/**
 * Participant Status Component
 *
 * Shows all active participants with their voting status.
 * Features:
 * - Real-time display of who has voted
 * - Leader indicator with crown emoji
 * - Shows point values after reveal
 * - Responsive layout (wraps on mobile)
 * - Visual icons for voted/not voted status
 */
export function ParticipantStatus({
  participants,
  votes,
  isRevealed,
}: ParticipantStatusProps) {
  // Create a map of participant_id to vote for quick lookup
  const voteMap = new Map(votes.map((vote) => [vote.participant_id, vote]));

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {participants.map((participant) => {
        const vote = voteMap.get(participant.id);
        const hasVoted = !!vote;

        return (
          <Badge
            key={participant.id}
            variant={hasVoted ? "default" : "outline"}
            className="gap-1.5 py-1.5 px-3"
          >
            {hasVoted ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
            <span>
              {participant.is_leader && <span className="mr-1">👑</span>}
              {participant.name}
              {isRevealed && vote && (
                <span className="ml-1.5 font-bold">{vote.point_value}</span>
              )}
            </span>
          </Badge>
        );
      })}
    </div>
  );
}
