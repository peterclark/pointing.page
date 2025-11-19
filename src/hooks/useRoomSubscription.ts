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

import { useEffect, useState, useRef } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/client';

/**
 * Vote with joined participant data
 */
export type VoteWithParticipant = Tables<'votes'> & {
  participant?: Tables<'participants'>;
};

/**
 * Return type for useRoomSubscription hook
 */
export interface RoomSubscriptionData {
  stories: Tables<'stories'>[];
  votes: Tables<'votes'>[];
  participants: Tables<'participants'>[];
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
  const [stories, setStories] = useState<Tables<'stories'>[]>([]);
  const [votes, setVotes] = useState<Tables<'votes'>[]>([]);
  const [participants, setParticipants] = useState<Tables<'participants'>[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);

  // Use ref to track current stories for vote filtering
  const storiesRef = useRef<Tables<'stories'>[]>([]);

  // Track consecutive connection errors
  const errorCountRef = useRef<number>(0);
  const maxErrorsBeforeFailure = 3;

  // Keep ref in sync with state
  useEffect(() => {
    storiesRef.current = stories;
  }, [stories]);

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
      // Network restored
    };

    const handleOffline = () => {
      if (isMounted) {
        setError(new Error('Network connection lost. Please check your internet connection.'));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Fetch initial data for all tables
    const fetchInitialData = async () => {
      try {
        const [storiesResult, votesResult, participantsResult] = await Promise.all([
          supabase
            .from('stories')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: true }),
          supabase
            .from('votes')
            .select('*')
            .in('story_id', []) // Start with empty, will be populated by subscription
            .order('created_at', { ascending: true }),
          supabase
            .from('participants')
            .select('*')
            .eq('room_id', roomId)
            .order('joined_at', { ascending: true }),
        ]);

        // Check for errors
        if (storiesResult.error) {
          throw new Error(`Failed to fetch stories: ${storiesResult.error.message}`);
        }
        if (votesResult.error) {
          throw new Error(`Failed to fetch votes: ${votesResult.error.message}`);
        }
        if (participantsResult.error) {
          throw new Error(`Failed to fetch participants: ${participantsResult.error.message}`);
        }

        // Update state only if component is still mounted
        if (isMounted) {
          setStories(storiesResult.data || []);

          // Fetch votes for active story if it exists
          const activeStory = storiesResult.data?.find(s => s.is_active);
          if (activeStory) {
            const activeVotesResult = await supabase
              .from('votes')
              .select('*')
              .eq('story_id', activeStory.id)
              .order('created_at', { ascending: true });

            if (activeVotesResult.data && isMounted) {
              setVotes(activeVotesResult.data);
            }
          } else {
            setVotes([]);
          }

          setParticipants(participantsResult.data || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error fetching data'));
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
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<'participants'>>) => {
          if (payload.eventType === 'INSERT') {
            console.log(`[useRoomSubscription] Participant joined:`, payload.new);
            const newParticipant = payload.new as Tables<'participants'>;
            setParticipants((prev) => {
              const exists = prev.some((p) => p.id === newParticipant.id);
              if (exists) return prev;
              return [...prev, newParticipant].sort((a, b) =>
                a.joined_at.localeCompare(b.joined_at)
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedParticipant = payload.new as Tables<'participants'>;
            setParticipants((prev) =>
              prev.map((p) => (p.id === updatedParticipant.id ? updatedParticipant : p))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedParticipant = payload.old as Tables<'participants'>;
            setParticipants((prev) => prev.filter((p) => p.id !== deletedParticipant.id));
          }
        }
      )
      // Subscribe to stories
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<'stories'>>) => {
          if (payload.eventType === 'INSERT') {
            const newStory = payload.new as Tables<'stories'>;
            setStories((prev) => {
              const exists = prev.some((s) => s.id === newStory.id);
              if (exists) return prev;
              return [...prev, newStory].sort((a, b) =>
                a.created_at.localeCompare(b.created_at)
              );
            });

            // If new story is active, fetch its votes
            if (newStory.is_active) {
              supabase
                .from('votes')
                .select('*')
                .eq('story_id', newStory.id)
                .order('created_at', { ascending: true })
                .then(({ data }) => {
                  if (data) setVotes(data);
                });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedStory = payload.new as Tables<'stories'>;
            setStories((prev) =>
              prev.map((s) => (s.id === updatedStory.id ? updatedStory : s))
            );

            // If story became active, fetch its votes
            // If story became inactive, clear votes
            if (updatedStory.is_active) {
              supabase
                .from('votes')
                .select('*')
                .eq('story_id', updatedStory.id)
                .order('created_at', { ascending: true })
                .then(({ data }) => {
                  if (data) setVotes(data);
                });
            } else {
              // Check if there's another active story
              setStories((prevStories) => {
                const hasOtherActiveStory = prevStories.some(
                  s => s.id !== updatedStory.id && s.is_active
                );
                if (!hasOtherActiveStory) {
                  setVotes([]);
                }
                return prevStories;
              });
            }
          }
        }
      )
      // Subscribe to votes (no filter here - we filter by active story_id in our state logic)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'votes',
        },
        (payload: RealtimePostgresChangesPayload<Tables<'votes'>>) => {
          // Redact unrevealed vote values from logs for security
          const vote = (payload.new || payload.old) as Tables<'votes'>;
          const logData = vote.is_revealed
            ? vote
            : { ...vote, point_value: '[HIDDEN]' };
          console.log(`[useRoomSubscription] Vote ${payload.eventType}:`, logData);

          // Only update votes if they belong to a story in this room
          const isRelevantVote = (vote: Tables<'votes'>) => {
            return storiesRef.current.some(s => s.id === vote.story_id && s.is_active);
          };

          if (payload.eventType === 'INSERT') {
            const newVote = payload.new as Tables<'votes'>;
            if (isRelevantVote(newVote)) {
              setVotes((prev) => {
                const exists = prev.some((v) => v.id === newVote.id);
                if (exists) return prev;
                return [...prev, newVote].sort((a, b) =>
                  a.created_at.localeCompare(b.created_at)
                );
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedVote = payload.new as Tables<'votes'>;
            if (isRelevantVote(updatedVote)) {
              setVotes((prev) => {
                const exists = prev.some((v) => v.id === updatedVote.id);
                if (exists) {
                  // Update existing vote
                  return prev.map((v) => (v.id === updatedVote.id ? updatedVote : v));
                } else {
                  // Add new vote (wasn't visible before due to RLS)
                  return [...prev, updatedVote].sort((a, b) =>
                    a.created_at.localeCompare(b.created_at)
                  );
                }
              });
            } else {
              // Vote no longer relevant (different story or story inactive)
              const oldVote = payload.old as Tables<'votes'>;
              setVotes((prev) => prev.filter((v) => v.id !== oldVote.id));
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedVote = payload.old as Tables<'votes'>;
            setVotes((prev) => prev.filter((v) => v.id !== deletedVote.id));
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          // Clear reconnecting state and reset error count on successful connection
          // Note: We don't clear errors here because they might be from initial data fetch
          if (isMounted) {
            setIsReconnecting(false);
            errorCountRef.current = 0;
          }
        } else if (status === 'CHANNEL_ERROR') {
          // Try to extract error details from various possible properties
          let errorMessage = 'Connection lost';

          if (err) {

            // Try different property paths that Supabase might use
            if (typeof err === 'string') {
              errorMessage = err;
            } else if (err.message) {
              errorMessage = err.message;
            } else if (err.error) {
              errorMessage = typeof err.error === 'string' ? err.error : err.error.message || JSON.stringify(err.error);
            } else if (err.msg) {
              errorMessage = err.msg;
            } else if (err.details) {
              errorMessage = err.details;
            } else if (err.reason) {
              errorMessage = err.reason;
            }
          }

          if (isMounted) {
            errorCountRef.current += 1;

            // If we've had multiple consecutive errors without successful reconnection, show error
            if (errorCountRef.current >= maxErrorsBeforeFailure) {
              setError(new Error(`Connection error: ${errorMessage}. Please refresh the page.`));
              setIsReconnecting(false);
            } else {
              // First few errors - just show reconnecting state, Supabase will auto-reconnect
              setIsReconnecting(true);
              setError(null);
            }
          }
        } else if (status === 'TIMED_OUT') {
          if (isMounted) {
            errorCountRef.current += 1;
            if (errorCountRef.current >= maxErrorsBeforeFailure) {
              setError(new Error('Connection timed out. Please refresh the page.'));
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
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [roomId]); // Only re-run when roomId changes

  return {
    stories,
    votes,
    participants,
    isLoading,
    error,
    isReconnecting,
  };
}
