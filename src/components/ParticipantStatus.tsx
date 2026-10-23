import { PlayingCard } from "@/components/PlayingCard";
import type { Tables } from "@/lib/supabase/client";

interface ParticipantStatusProps {
  participants: Tables<"participants">[];
  votes: Tables<"votes">[];
  /**
   * Ids of participants who have voted.
   *
   * Cannot be derived from `votes`: RLS withholds another participant's
   * unrevealed vote row entirely, so `votes` only ever contains your own until
   * the leader reveals. Sourced from `vote_receipts`, which carries the fact
   * without the estimate.
   */
  votedParticipantIds: Set<string>;
  isRevealed: boolean;
}

/**
 * Participant Status Component
 *
 * Shows each participant as a seat at the table with their card.
 * Features:
 * - A face-down card once someone has voted, without revealing what
 * - An empty dashed slot while they are still choosing
 * - Leader indicator with crown emoji
 * - Shows point values face up after reveal
 * - Cards overlap slightly and wrap onto more rows in a large room
 */
export function ParticipantStatus({
  participants,
  votes,
  votedParticipantIds,
  isRevealed,
}: ParticipantStatusProps) {
  // Values, for display after the reveal. Before it, this holds only your own.
  const voteMap = new Map(votes.map((vote) => [vote.participant_id, vote]));

  return (
    <ul className="flex flex-wrap justify-center gap-y-4 pl-2">
      {participants.map((participant, index) => {
        const vote = voteMap.get(participant.id);
        // Union with the votes we can see, as a floor. `votes` is already
        // RLS-filtered to your own plus anything revealed, so this can never
        // surface a status the viewer was not entitled to — but it keeps your
        // own card down if receipts are unavailable, which happens in a Netlify
        // deploy preview (new client, production database, migration not yet
        // applied) and briefly on merge before the migration lands.
        const hasVoted = votedParticipantIds.has(participant.id) || !!vote;
        const shownValue = isRevealed && vote ? vote.point_value : undefined;

        return (
          <li
            key={participant.id}
            data-voted={hasVoted}
            className="-ml-2 flex w-[72px] flex-col items-center gap-1.5"
            style={{ zIndex: index }}
          >
            {shownValue !== undefined ? (
              <PlayingCard value={shownValue} className="h-[100px] w-[72px]" />
            ) : hasVoted ? (
              <PlayingCard className="h-[100px] w-[72px]" />
            ) : (
              <div className="h-[100px] w-[72px] rounded-[10px] border-2 border-dashed border-ivory/40 bg-felt-deep/60" />
            )}
            <span className="max-w-full truncate text-[13px] font-semibold">
              {participant.is_leader && (
                <span className="mr-0.5" aria-label="Leader">
                  👑
                </span>
              )}
              {participant.name}
              <span className="sr-only">
                {hasVoted ? ", card down" : ", still choosing"}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
