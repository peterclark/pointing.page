import type { Tables } from "@/lib/supabase/client";
import {
  calculateFibonacciConsensus,
  calculateTshirtConsensus,
  cn,
  isConsensusVote,
  sortVotesByValue,
} from "@/lib/utils";
import { PlayingCard } from "@/components/PlayingCard";
import { fanStyle, isRedCard } from "@/lib/cards";

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
 * - The result as one oversized number, with its label, vote count and spread
 * - Everyone's card face up in a fan, named at the bottom of the card
 * - Gold edge on votes within one step of the consensus
 * - Sorted by point value (ascending)
 * - The fan tightens to fit narrow screens
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
  const participantMap = new Map(participants.map((p) => [p.id, p]));

  // Calculate consensus
  const pointValues = revealedVotes.map((v) => v.point_value);
  let consensusDisplayValue: string | number;
  let consensusLabel: string;
  let actualConsensusValue: string | number; // The value to use for highlighting

  if (pointScale === "fibonacci") {
    const result = calculateFibonacciConsensus(pointValues);
    if (result.consensus === 0 && pointValues.every((v) => v === "?")) {
      consensusDisplayValue = "No Consensus";
      consensusLabel = 'All votes are "?"';
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
      consensusLabel = 'All votes are "?"';
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

  // Lowest and highest real estimates, in scale order ("?" sorts last).
  const estimates = sortedVotes.filter((v) => v.point_value !== "?");
  const spread =
    estimates.length > 1 &&
    estimates[0].point_value !== estimates[estimates.length - 1].point_value
      ? `${estimates[0].point_value} to ${estimates[estimates.length - 1].point_value}`
      : null;

  const hasConsensus = consensusDisplayValue !== "No Consensus";
  const headline = String(consensusDisplayValue);

  return (
    <section aria-label="Results" className="space-y-8">
      <div className="flex items-start gap-6">
        <div
          data-testid="result-headline"
          className={cn(
            "font-card font-extrabold leading-[0.85] tracking-tighter",
            headline.length > 4
              ? "text-5xl sm:text-6xl"
              : "text-[9rem] sm:text-[11rem]"
          )}
        >
          {headline}
        </div>
        <dl className="flex flex-col gap-3 pt-3">
          <div>
            <dt className="text-xs font-semibold tracking-[0.15em] text-ivory/65 uppercase">
              Result
            </dt>
            <dd className="text-2xl font-extrabold">{consensusLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold tracking-[0.15em] text-ivory/65 uppercase">
              Votes
            </dt>
            <dd className="text-2xl font-extrabold">{revealedVotes.length}</dd>
          </div>
          {spread && (
            <div>
              <dt className="text-xs font-semibold tracking-[0.15em] text-ivory/65 uppercase">
                Spread
              </dt>
              <dd className="text-2xl font-extrabold">{spread}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Everyone's card, face up, in a fan that tightens to fit */}
      <ul className="flex justify-center px-2 pb-2" aria-label="Individual votes">
        {sortedVotes.map((vote, index) => {
          const participant = participantMap.get(vote.participant_id);
          const isConsensus = isConsensusVote(
            vote.point_value,
            actualConsensusValue,
            pointScale
          );

          // Only apply consensus highlighting if we have a valid consensus
          const agrees = hasConsensus && vote.point_value !== "?" && isConsensus;
          const isLast = index === sortedVotes.length - 1;

          return (
            <li
              key={vote.id}
              data-consensus={agrees}
              className={cn(
                "relative h-[124px] min-w-6",
                isLast ? "shrink-0 basis-[84px]" : "shrink basis-[84px]"
              )}
            >
              <PlayingCard
                value={vote.point_value}
                red={isRedCard(index)}
                highlighted={agrees}
                style={fanStyle(index, sortedVotes.length, { tilt: 2, dip: 2 })}
                className="fan-card absolute top-0 left-0 h-[118px] w-[84px]"
              >
                <span className="absolute inset-x-0 bottom-2 truncate px-1.5 text-center text-xs font-semibold text-ink">
                  {participant?.name || "Unknown"}
                </span>
              </PlayingCard>
            </li>
          );
        })}
      </ul>

      {hasConsensus && (
        <p className="flex items-center gap-3 text-sm text-ivory/85">
          <span
            aria-hidden="true"
            className="size-3.5 shrink-0 rounded shadow-[0_0_0_3px_var(--color-gold)]"
          />
          Gold cards are within one step of the result.
        </p>
      )}
    </section>
  );
}
