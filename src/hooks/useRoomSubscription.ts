/**
 * useRoomSubscription Hook
 *
 * Combined real-time subscription hook for voting flow.
 * Subscribes to stories, votes, and participants on a single channel for efficiency.
 * Follows Pattern 5 (Combined Room Data) from subscriptions.example.ts
 *
 * Features:
 * - Single channel for all room data (efficient)
 * - Server-side filtering by room_id
 * - Handles INSERT, UPDATE, DELETE events
 * - Returns combined data with loading/error states
 * - Automatic cleanup on unmount
 *
 * Usage:
 * ```tsx
 * function VotingRoom({ roomId }: { roomId: string }) {
 *   const { stories, votes, participants, isLoading, error } = useRoomSubscription(roomId);
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   const activeStory = stories.find(s => s.is_active);
 *   // ... use the data
 * }
 * ```
 */

import { useEffect, useState, useRef, useMemo } from "react";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/client";

/**
 * Vote with joined participant data
 */
export type VoteWithParticipant = Tables<"votes"> & {
  participant?: Tables<"participants">;
};

/**
 * Return type for useRoomSubscription hook
 */
export interface RoomSubscriptionData {
  stories: Tables<"stories">[];
  votes: Tables<"votes">[];
  /**
   * Ids of participants who have voted on the active story.
   *
   * Separate from `votes` because RLS withholds another participant's
   * unrevealed vote row entirely, so `votes` cannot answer "who has voted"
   * for anyone but you. `vote_receipts` carries the fact without the estimate.
   */
  votedParticipantIds: Set<string>;
  participants: Tables<"participants">[];
  isLoading: boolean;
  error: Error | null;
  isReconnecting: boolean;
}

/**
 * Subscribe to all room data (stories, votes, participants) on a single channel
 *
 * @param roomId - UUID of the room to monitor
 * @returns Object containing stories, votes, participants, loading state, and error state
 */
export function useRoomSubscription(roomId: string): RoomSubscriptionData {
  const [stories, setStories] = useState<Tables<"stories">[]>([]);
  const [votes, setVotes] = useState<Tables<"votes">[]>([]);
  const [votedParticipantIds, setVotedParticipantIds] = useState<Set<string>>(
    () => new Set()
  );
  const [participants, setParticipants] = useState<Tables<"participants">[]>(
    []
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // Track consecutive connection errors
  const errorCountRef = useRef<number>(0);
  const maxErrorsBeforeFailure = 3;

  useEffect(() => {
    // Validate roomId
    if (!roomId) {
      setIsLoading(false);
      return;
    }

    // Track if component is still mounted (prevent state updates after unmount)
    let isMounted = true;

    // Reset state when roomId changes
    setIsLoading(true);
    setError(null);

    // Monitor network connection status
    const handleOnline = () => {
      // handleOffline sets an error; nothing else clears it, so the banner used
      // to outlive the outage that caused it.
      if (isMounted) setError(null);
    };

    const handleOffline = () => {
      if (isMounted) {
        setError(
          new Error(
            "Network connection lost. Please check your internet connection."
          )
        );
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Fetch initial data for all tables
    const fetchInitialData = async () => {
      try {
        // Votes are not fetched here: they belong to whichever story is active,
        // and the effect below owns loading and subscribing to exactly that set.
        const [storiesResult, participantsResult] = await Promise.all([
          supabase
            .from("stories")
            .select("*")
            .eq("room_id", roomId)
            .order("created_at", { ascending: true }),
          supabase
            .from("participants")
            .select("*")
            .eq("room_id", roomId)
            .order("joined_at", { ascending: true }),
        ]);

        // Check for errors
        if (storiesResult.error) {
          throw new Error(
            `Failed to fetch stories: ${storiesResult.error.message}`
          );
        }
        if (participantsResult.error) {
          throw new Error(
            `Failed to fetch participants: ${participantsResult.error.message}`
          );
        }

        // Update state only if component is still mounted
        if (isMounted) {
          setStories(storiesResult.data || []);
          setParticipants(participantsResult.data || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching data")
          );
          setIsLoading(false);
        }
      }
    };

    fetchInitialData();

    // Subscribe to real-time updates for all tables on a single channel
    const channel: RealtimeChannel = supabase
      .channel(`room:${roomId}:voting-data`)
      // Subscribe to participants
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<"participants">>) => {
          if (payload.eventType === "INSERT") {
            console.log(
              `[useRoomSubscription] Participant joined:`,
              payload.new
            );
            const newParticipant = payload.new as Tables<"participants">;
            setParticipants((prev) => {
              const exists = prev.some((p) => p.id === newParticipant.id);
              if (exists) return prev;
              return [...prev, newParticipant].sort((a, b) =>
                a.joined_at.localeCompare(b.joined_at)
              );
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedParticipant = payload.new as Tables<"participants">;
            setParticipants((prev) =>
              prev.map((p) =>
                p.id === updatedParticipant.id ? updatedParticipant : p
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedParticipant = payload.old as Tables<"participants">;
            setParticipants((prev) =>
              prev.filter((p) => p.id !== deletedParticipant.id)
            );
          }
        }
      )
      // Subscribe to stories
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "stories",
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<"stories">>) => {
          if (payload.eventType === "INSERT") {
            const newStory = payload.new as Tables<"stories">;
            setStories((prev) => {
              const exists = prev.some((s) => s.id === newStory.id);
              if (exists) return prev;
              return [...prev, newStory].sort((a, b) =>
                a.created_at.localeCompare(b.created_at)
              );
            });
          } else if (payload.eventType === "UPDATE") {
            const updatedStory = payload.new as Tables<"stories">;
            setStories((prev) =>
              prev.map((s) => (s.id === updatedStory.id ? updatedStory : s))
            );
          }
        }
      )
      .subscribe((status, err) => {
        if (status === "SUBSCRIBED") {
          // Clear reconnecting state and reset error count on successful connection
          // Note: We don't clear errors here because they might be from initial data fetch
          if (isMounted) {
            setIsReconnecting(false);
            errorCountRef.current = 0;
          }
        } else if (status === "CHANNEL_ERROR") {
          if (isMounted) {
            errorCountRef.current += 1;

            // If we've had multiple consecutive errors without successful reconnection, show error
            if (errorCountRef.current >= maxErrorsBeforeFailure) {
              setError(
                new Error(`Connection error: ${err}. Please refresh the page.`)
              );
              setIsReconnecting(false);
            } else {
              // First few errors - just show reconnecting state, Supabase will auto-reconnect
              setIsReconnecting(true);
              setError(null);
            }
          }
        } else if (status === "TIMED_OUT") {
          if (isMounted) {
            errorCountRef.current += 1;
            if (errorCountRef.current >= maxErrorsBeforeFailure) {
              setError(
                new Error("Connection timed out. Please refresh the page.")
              );
              setIsReconnecting(false);
            } else {
              setIsReconnecting(true);
              setError(null);
            }
          }
        }
      });

    // Cleanup on unmount or roomId change
    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [roomId]); // Only re-run when roomId changes

  // Only the active story's votes are ever displayed, so that is the only set
  // worth loading or listening to.
  const activeStoryId = useMemo(
    () => stories.find((s) => s.is_active)?.id ?? null,
    [stories]
  );

  useEffect(() => {
    if (!activeStoryId) {
      setVotes([]);
      return;
    }

    let isMounted = true;

    supabase
      .from("votes")
      .select("*")
      .eq("story_id", activeStoryId)
      .order("created_at", { ascending: true })
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) {
          setError(new Error(`Failed to fetch votes: ${fetchError.message}`));
          return;
        }
        setVotes(data ?? []);
      });

    // Server-side filter. Without it this subscription received every vote
    // change in the database — every room, every story — and discarded the
    // irrelevant ones in the browser, which both leaked other rooms' unrevealed
    // estimates and scaled with total app usage rather than room size.
    const channel: RealtimeChannel = supabase
      .channel(`story:${activeStoryId}:votes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "votes",
          filter: `story_id=eq.${activeStoryId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<"votes">>) => {
          if (payload.eventType === "INSERT") {
            const newVote = payload.new as Tables<"votes">;
            setVotes((prev) =>
              prev.some((v) => v.id === newVote.id)
                ? prev
                : [...prev, newVote].sort((a, b) =>
                    a.created_at.localeCompare(b.created_at)
                  )
            );
          } else if (payload.eventType === "UPDATE") {
            const updatedVote = payload.new as Tables<"votes">;
            setVotes((prev) =>
              prev.some((v) => v.id === updatedVote.id)
                ? prev.map((v) => (v.id === updatedVote.id ? updatedVote : v))
                : // A reveal makes a vote readable that RLS previously withheld,
                  // so it arrives as an UPDATE for a row never seen before.
                  [...prev, updatedVote].sort((a, b) =>
                    a.created_at.localeCompare(b.created_at)
                  )
            );
          } else if (payload.eventType === "DELETE") {
            const deletedVote = payload.old as Tables<"votes">;
            setVotes((prev) => prev.filter((v) => v.id !== deletedVote.id));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeStoryId]);

  // Who has voted, as distinct from what they voted. RLS hides another
  // participant's unrevealed vote row outright, so this is the only signal the
  // board has while a round is still open.
  useEffect(() => {
    if (!activeStoryId) {
      setVotedParticipantIds(new Set());
      return;
    }

    let isMounted = true;

    supabase
      .from("vote_receipts")
      .select("participant_id")
      .eq("story_id", activeStoryId)
      .then(({ data, error: fetchError }) => {
        if (!isMounted) return;
        if (fetchError) {
          console.error(
            "[useRoomSubscription] Failed to fetch vote receipts:",
            fetchError
          );
          return;
        }
        setVotedParticipantIds(new Set((data ?? []).map((r) => r.participant_id)));
      });

    const channel: RealtimeChannel = supabase
      .channel(`story:${activeStoryId}:receipts`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vote_receipts",
          filter: `story_id=eq.${activeStoryId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<"vote_receipts">>) => {
          setVotedParticipantIds((prev) => {
            const next = new Set(prev);
            if (payload.eventType === "DELETE") {
              next.delete((payload.old as Tables<"vote_receipts">).participant_id);
            } else {
              next.add((payload.new as Tables<"vote_receipts">).participant_id);
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeStoryId]);

  return {
    stories,
    votes,
    votedParticipantIds,
    participants,
    isLoading,
    error,
    isReconnecting,
  };
}
