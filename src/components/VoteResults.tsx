import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/supabase/client";
import {
  calculateFibonacciConsensus,
  calculateTshirtConsensus,
  isConsensusVote,
  sortVotesByValue,
} from "@/lib/utils";

interface VoteResultsProps {
  votes: Tables<"votes">[];
  participants: Tables<"participants">[];
  pointScale: "fibonacci" | "t-shirt";
}

/**
 * Vote Results Component
 *
 * Displays revealed votes with consensus highlighting.
 * Features:
 * - Prominent consensus/average display at top
 * - Individual vote cards with participant names
 * - Green borders for consensus votes (within threshold)
 * - Yellow borders for outlier votes
 * - Sorted by point value (ascending)
 * - Mobile-responsive grid layout
 */
export function VoteResults({
  votes,
  participants,
  pointScale,
}: VoteResultsProps) {
  // Only show revealed votes
  const revealedVotes = votes.filter((vote) => vote.is_revealed);

  // If no revealed votes, don't render anything
  if (revealedVotes.length === 0) {
    return null;
  }

  // Create a map of participant_id to participant for quick lookup
  const participantMap = new Map(
    participants.map((p) => [p.id, p])
  );

  // Calculate consensus
  const pointValues = revealedVotes.map((v) => v.point_value);
  let consensusDisplayValue: string | number;
  let consensusLabel: string;
  let actualConsensusValue: string | number; // The value to use for highlighting

  if (pointScale === "fibonacci") {
    const result = calculateFibonacciConsensus(pointValues);
    if (result.consensus === 0 && pointValues.every((v) => v === "?")) {
      consensusDisplayValue = "No Consensus";
      consensusLabel = "All votes are \"?\"";
      actualConsensusValue = 0;
    } else if (result.consensus === 0) {
      consensusDisplayValue = "No Consensus";
      consensusLabel = "No valid votes";
      actualConsensusValue = 0;
    } else {
      // Check if all valid votes are the same as consensus
      const validVotes = pointValues.filter((v) => v !== "?");
      const allSame = validVotes.every(
        (v) => parseInt(v, 10) === result.consensus
      );
      if (allSame && validVotes.length > 0) {
        consensusDisplayValue = result.consensus;
        consensusLabel = "Consensus";
      } else {
        consensusDisplayValue = result.average.toFixed(1);
        consensusLabel = "Average";
      }
      actualConsensusValue = result.consensus;
    }
  } else {
    // T-shirt scale
    const result = calculateTshirtConsensus(pointValues);
    if (result.consensus === "" && pointValues.every((v) => v === "?")) {
      consensusDisplayValue = "No Consensus";
      consensusLabel = "All votes are \"?\"";
      actualConsensusValue = "";
    } else if (result.consensus === "") {
      consensusDisplayValue = "No Consensus";
      consensusLabel = "No valid votes";
      actualConsensusValue = "";
    } else {
      // Check if all valid votes are the same as consensus
      const validVotes = pointValues.filter((v) => v !== "?");
      const allSame = validVotes.every((v) => v === result.consensus);
      if (allSame && validVotes.length > 0) {
        consensusDisplayValue = result.consensus;
        consensusLabel = "Consensus";
      } else {
        consensusDisplayValue = result.mode;
        consensusLabel = "Most Common";
      }
      actualConsensusValue = result.consensus;
    }
  }

  // Sort votes by value
  const sortedVotes = sortVotesByValue(revealedVotes, pointScale);

  return (
    <div className="space-y-6">
      {/* Consensus Card */}
      <Card className="border-2 border-primary">
        <CardContent className="p-6 text-center">
          <div className="text-4xl font-bold">{consensusDisplayValue}</div>
          <div className="text-sm text-muted-foreground mt-2">
            {consensusLabel}
          </div>
        </CardContent>
      </Card>

      {/* Individual Votes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {sortedVotes.map((vote) => {
          const participant = participantMap.get(vote.participant_id);
          const isConsensus = isConsensusVote(
            vote.point_value,
            actualConsensusValue,
            pointScale
          );

          // Only apply consensus highlighting if we have a valid consensus
          const showHighlighting =
            consensusDisplayValue !== "No Consensus" && vote.point_value !== "?";

          return (
            <Card
              key={vote.id}
              className={
                showHighlighting
                  ? isConsensus
                    ? "border-2 border-green-500"
                    : "border-2 border-yellow-500"
                  : ""
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-normal">
                  {participant?.name || "Unknown"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="text-3xl font-bold">{vote.point_value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
