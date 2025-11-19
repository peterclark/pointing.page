/**
 * Real-time Subscription React Hooks
 *
 * This module provides React hooks for subscribing to real-time database changes
 * using Supabase Real-time. All hooks include:
 * - Automatic subscription on mount
 * - Automatic cleanup on unmount
 * - TypeScript type safety
 * - Error handling and reconnection
 * - Initial data fetching
 *
 * Usage:
 * ```tsx
 * function ParticipantList({ roomId }: { roomId: string }) {
 *   const participants = useRoomParticipants(roomId);
 *
 *   return (
 *     <ul>
 *       {participants.map(p => (
 *         <li key={p.id}>{p.name}</li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 *
 * @see /docs/realtime-subscriptions.md for complete documentation
 * @see /src/lib/supabase/subscriptions.example.ts for patterns
 */

import { useEffect, useState } from 'react';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/client';

// ============================================================================
// HOOK: useRoomParticipants
// ============================================================================

/**
 * Subscribe to all participants in a specific room
 *
 * Features:
 * - Fetches initial participant list on mount
 * - Subscribes to INSERT, UPDATE, DELETE events
 * - Automatically updates state when changes occur
 * - Unsubscribes on unmount to prevent memory leaks
 *
 * @param roomId - UUID of the room to monitor
 * @returns Array of participant records (sorted by joined_at)
 *
 * @example
 * ```tsx
 * function RoomPage({ roomId }: { roomId: string }) {
 *   const participants = useRoomParticipants(roomId);
 *
 *   return (
 *     <div>
 *       <h2>Participants ({participants.length})</h2>
 *       {participants.map(p => (
 *         <div key={p.id}>
 *           {p.name} {p.is_leader && '👑'} {p.is_active ? '🟢' : '⚫'}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRoomParticipants(roomId: string): Tables<'participants'>[] {
  const [participants, setParticipants] = useState<Tables<'participants'>[]>([]);

  useEffect(() => {
    // Validate roomId
    if (!roomId) {
      return;
    }

    // Fetch initial data
    supabase
      .from('participants')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
        } else if (data) {
          setParticipants(data);
        }
      });

    // Subscribe to real-time updates
    const channel: RealtimeChannel = supabase
      .channel(`room:${roomId}:participants`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<'participants'>>) => {
          const newParticipant = payload.new as Tables<'participants'>;
          setParticipants((prev) => {
            // Check if participant already exists (shouldn't happen, but defensive)
            const exists = prev.some((p) => p.id === newParticipant.id);
            if (exists) return prev;
            return [...prev, newParticipant].sort((a, b) =>
              a.joined_at.localeCompare(b.joined_at)
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<'participants'>>) => {
          const updatedParticipant = payload.new as Tables<'participants'>;
          setParticipants((prev) =>
            prev.map((p) => (p.id === updatedParticipant.id ? updatedParticipant : p))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<'participants'>>) => {
          const deletedParticipant = payload.old as Tables<'participants'>;
          setParticipants((prev) => prev.filter((p) => p.id !== deletedParticipant.id));
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
        }
        if (status === 'CHANNEL_ERROR') {
        }
        if (status === 'TIMED_OUT') {
        }
      });

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return participants;
}

// ============================================================================
// HOOK: useRoomStories
// ============================================================================

/**
 * Subscribe to all stories in a specific room
 *
 * Features:
 * - Fetches initial story list on mount
 * - Subscribes to INSERT, UPDATE events
 * - Automatically updates state when changes occur
 * - Unsubscribes on unmount
 *
 * @param roomId - UUID of the room to monitor
 * @returns Array of story records (sorted by created_at)
 *
 * @example
 * ```tsx
 * function StoryList({ roomId }: { roomId: string }) {
 *   const stories = useRoomStories(roomId);
 *   const activeStory = stories.find(s => s.is_active);
 *
 *   return (
 *     <div>
 *       <h2>Stories ({stories.length})</h2>
 *       {stories.map(s => (
 *         <div key={s.id}>
 *           {s.title} {s.is_active && '⭐'}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRoomStories(roomId: string): Tables<'stories'>[] {
  const [stories, setStories] = useState<Tables<'stories'>[]>([]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    // Fetch initial data
    supabase
      .from('stories')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
        } else if (data) {
          setStories(data);
        }
      });

    // Subscribe to real-time updates
    const channel: RealtimeChannel = supabase
      .channel(`room:${roomId}:stories`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stories',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<'stories'>>) => {
          const newStory = payload.new as Tables<'stories'>;
          setStories((prev) => {
            const exists = prev.some((s) => s.id === newStory.id);
            if (exists) return prev;
            return [...prev, newStory].sort((a, b) =>
              a.created_at.localeCompare(b.created_at)
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stories',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<'stories'>>) => {
          const updatedStory = payload.new as Tables<'stories'>;
          setStories((prev) =>
            prev.map((s) => (s.id === updatedStory.id ? updatedStory : s))
          );
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
        }
        if (status === 'CHANNEL_ERROR') {
        }
      });

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return stories;
}

// ============================================================================
// HOOK: useStoryVotes
// ============================================================================

/**
 * Subscribe to votes for a specific story
 *
 * Features:
 * - Fetches initial vote list on mount
 * - Subscribes to INSERT, UPDATE events
 * - Automatically updates state when changes occur
 * - RLS policies automatically filter votes (users only see revealed votes or their own)
 * - Unsubscribes on unmount
 *
 * @param storyId - UUID of the story to monitor (null/undefined to skip subscription)
 * @returns Array of vote records (sorted by created_at)
 *
 * @example
 * ```tsx
 * function VoteDisplay({ storyId }: { storyId: string | null }) {
 *   const votes = useStoryVotes(storyId);
 *   const voteCount = votes.length;
 *
 *   return (
 *     <div>
 *       <h3>Votes: {voteCount}</h3>
 *       {votes.map(v => (
 *         <div key={v.id}>
 *           {v.point_value} {v.sentiment && `(${v.sentiment})`}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useStoryVotes(storyId: string | null): Tables<'votes'>[] {
  const [votes, setVotes] = useState<Tables<'votes'>[]>([]);

  useEffect(() => {
    // Reset votes if no storyId
    if (!storyId) {
      setVotes([]);
      return;
    }

    // Fetch initial data
    supabase
      .from('votes')
      .select('*')
      .eq('story_id', storyId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
        } else if (data) {
          setVotes(data);
        }
      });

    // Subscribe to real-time updates
    const channel: RealtimeChannel = supabase
      .channel(`story:${storyId}:votes`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `story_id=eq.${storyId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<'votes'>>) => {
          const newVote = payload.new as Tables<'votes'>;
          setVotes((prev) => {
            const exists = prev.some((v) => v.id === newVote.id);
            if (exists) return prev;
            return [...prev, newVote].sort((a, b) =>
              a.created_at.localeCompare(b.created_at)
            );
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'votes',
          filter: `story_id=eq.${storyId}`,
        },
        (payload: RealtimePostgresChangesPayload<Tables<'votes'>>) => {
          const updatedVote = payload.new as Tables<'votes'>;
          setVotes((prev) =>
            prev.map((v) => (v.id === updatedVote.id ? updatedVote : v))
          );
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
        }
        if (status === 'CHANNEL_ERROR') {
        }
      });

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storyId]);

  return votes;
}

// ============================================================================
// HOOK: useConnectionStatus
// ============================================================================

/**
 * Monitor the real-time connection status
 *
 * Features:
 * - Tracks connection state (connected, disconnected, error)
 * - Useful for displaying connection indicators in UI
 * - Automatically cleans up on unmount
 *
 * @returns Current connection status
 *
 * @example
 * ```tsx
 * function ConnectionIndicator() {
 *   const status = useConnectionStatus();
 *
 *   return (
 *     <div className={`indicator ${status}`}>
 *       {status === 'connected' && '🟢 Connected'}
 *       {status === 'disconnected' && '⚫ Disconnected'}
 *       {status === 'error' && '🔴 Connection Error'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useConnectionStatus(): 'connected' | 'disconnected' | 'error' {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>(
    'disconnected'
  );

  useEffect(() => {
    // Create a dedicated monitoring channel
    const channel = supabase
      .channel('connection-monitor')
      .subscribe((channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          setStatus('connected');
        } else if (channelStatus === 'CLOSED') {
          setStatus('disconnected');
        } else if (channelStatus === 'CHANNEL_ERROR' || channelStatus === 'TIMED_OUT') {
          setStatus('error');
        }
      });

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return status;
}

// ============================================================================
// HOOK: useRoomData (Combined)
// ============================================================================

/**
 * Subscribe to all room-related data on a single channel
 *
 * This is more efficient than using separate hooks for participants and stories
 * when you need both. Reduces the number of WebSocket connections.
 *
 * Features:
 * - Single channel for multiple tables
 * - Fetches initial data for both tables
 * - Subscribes to real-time updates
 * - Unsubscribes on unmount
 *
 * @param roomId - UUID of the room to monitor
 * @returns Object containing participants and stories arrays
 *
 * @example
 * ```tsx
 * function RoomPage({ roomId }: { roomId: string }) {
 *   const { participants, stories } = useRoomData(roomId);
 *
 *   return (
 *     <div>
 *       <h2>Participants: {participants.length}</h2>
 *       <h2>Stories: {stories.length}</h2>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRoomData(roomId: string): {
  participants: Tables<'participants'>[];
  stories: Tables<'stories'>[];
} {
  const [participants, setParticipants] = useState<Tables<'participants'>[]>([]);
  const [stories, setStories] = useState<Tables<'stories'>[]>([]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    // Fetch initial data for both tables
    Promise.all([
      supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at', { ascending: true }),
      supabase
        .from('stories')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true }),
    ]).then(([participantsResult, storiesResult]) => {
      if (participantsResult.error) {
      } else if (participantsResult.data) {
        setParticipants(participantsResult.data);
      }

      if (storiesResult.error) {
      } else if (storiesResult.data) {
        setStories(storiesResult.data);
      }
    });

    // Subscribe to updates for both tables on a single channel
    const channel = supabase
      .channel(`room:${roomId}:all-data`)
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
          } else if (payload.eventType === 'UPDATE') {
            const updatedStory = payload.new as Tables<'stories'>;
            setStories((prev) =>
              prev.map((s) => (s.id === updatedStory.id ? updatedStory : s))
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
        }
        if (status === 'CHANNEL_ERROR') {
        }
      });

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return { participants, stories };
}
