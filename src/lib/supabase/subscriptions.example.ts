/**
 * Example TypeScript Subscription Patterns for Story Pointer Real-time Features
 *
 * This file demonstrates how to subscribe to database changes using Supabase Real-time.
 * These patterns are used throughout the application to enable live collaborative features.
 *
 * Key Concepts:
 * - Server-side filtering reduces bandwidth (filter by room_id, story_id)
 * - RLS policies automatically secure real-time events
 * - Always unsubscribe when component unmounts to prevent memory leaks
 * - Handle reconnection with exponential backoff
 *
 * @see /docs/realtime-subscriptions.md for complete documentation
 */

import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Import types (these would come from database.types.ts in Phase 6)
type Participant = {
  id: string;
  room_id: string;
  user_id: string | null;
  name: string;
  is_leader: boolean;
  is_active: boolean;
  joined_at: string;
};

type Story = {
  id: string;
  room_id: string;
  title: string;
  description: string | null;
  is_active: boolean;
  final_average: number | null;
  created_at: string;
};

type Vote = {
  id: string;
  story_id: string;
  participant_id: string;
  point_value: string;
  sentiment: string | null;
  is_revealed: boolean;
  created_at: string;
};

type Room = {
  id: string;
  room_code: string;
  name: string;
  leader_id: string | null;
  point_scale: 'fibonacci' | 't-shirt';
  created_at: string;
};

// Import supabase client (would be initialized in /src/lib/supabase/client.ts)
// For this example, we'll use a placeholder
declare const supabase: any;

// ============================================================================
// PATTERN 1: Subscribe to Room Participants
// ============================================================================

/**
 * Subscribe to all participants in a specific room.
 *
 * Use Case:
 * - Display participant list
 * - Update presence indicators
 * - Show when participants join/leave
 *
 * @param roomId - The UUID of the room to monitor
 * @param onInsert - Callback when a new participant joins
 * @param onUpdate - Callback when a participant is updated (name, leader status, active status)
 * @param onDelete - Callback when a participant leaves
 * @returns RealtimeChannel that can be unsubscribed later
 */
export function subscribeToRoomParticipants(
  roomId: string,
  callbacks: {
    onInsert?: (participant: Participant) => void;
    onUpdate?: (participant: Participant) => void;
    onDelete?: (participant: Participant) => void;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`room:${roomId}:participants`)
    .on(
      'postgres_changes',
      {
        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
        schema: 'public',
        table: 'participants',
        filter: `room_id=eq.${roomId}` // Server-side filtering
      },
      (payload: RealtimePostgresChangesPayload<Participant>) => {
        console.log(`[Realtime] Participant ${payload.eventType}:`, payload.new || payload.old);

        switch (payload.eventType) {
          case 'INSERT':
            callbacks.onInsert?.(payload.new);
            break;
          case 'UPDATE':
            callbacks.onUpdate?.(payload.new);
            break;
          case 'DELETE':
            callbacks.onDelete?.(payload.old);
            break;
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to participants in room ${roomId}`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Error subscribing to participants:`, err);
      }
    });

  return channel;
}

// ============================================================================
// PATTERN 2: Subscribe to Room Stories
// ============================================================================

/**
 * Subscribe to all stories in a specific room.
 *
 * Use Case:
 * - Display story list
 * - Highlight active story
 * - Update final averages after reveal
 *
 * @param roomId - The UUID of the room to monitor
 * @param onInsert - Callback when a new story is created
 * @param onUpdate - Callback when a story is updated (title, description, is_active, final_average)
 * @returns RealtimeChannel that can be unsubscribed later
 */
export function subscribeToRoomStories(
  roomId: string,
  callbacks: {
    onInsert?: (story: Story) => void;
    onUpdate?: (story: Story) => void;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`room:${roomId}:stories`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stories',
        filter: `room_id=eq.${roomId}`
      },
      (payload: RealtimePostgresChangesPayload<Story>) => {
        console.log(`[Realtime] Story ${payload.eventType}:`, payload.new || payload.old);

        switch (payload.eventType) {
          case 'INSERT':
            callbacks.onInsert?.(payload.new);
            break;
          case 'UPDATE':
            callbacks.onUpdate?.(payload.new);
            break;
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to stories in room ${roomId}`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Error subscribing to stories:`, err);
      }
    });

  return channel;
}

// ============================================================================
// PATTERN 3: Subscribe to Story Votes
// ============================================================================

/**
 * Subscribe to votes for a specific story.
 *
 * Use Case:
 * - Show vote count (number of participants who have voted)
 * - Display revealed votes
 * - Trigger UI updates when votes are revealed
 *
 * Important: RLS policies automatically filter votes based on is_revealed status.
 * Users only receive updates for:
 * - Their own votes (regardless of is_revealed)
 * - Other users' votes where is_revealed=true
 *
 * @param storyId - The UUID of the story to monitor
 * @param onInsert - Callback when a new vote is submitted
 * @param onUpdate - Callback when a vote is updated (value change or reveal)
 * @returns RealtimeChannel that can be unsubscribed later
 */
export function subscribeToStoryVotes(
  storyId: string,
  callbacks: {
    onInsert?: (vote: Vote) => void;
    onUpdate?: (vote: Vote) => void;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`story:${storyId}:votes`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'votes',
        filter: `story_id=eq.${storyId}`
      },
      (payload: RealtimePostgresChangesPayload<Vote>) => {
        console.log(`[Realtime] Vote ${payload.eventType}:`, payload.new || payload.old);

        switch (payload.eventType) {
          case 'INSERT':
            callbacks.onInsert?.(payload.new);
            break;
          case 'UPDATE':
            callbacks.onUpdate?.(payload.new);
            break;
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to votes for story ${storyId}`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Error subscribing to votes:`, err);
      }
    });

  return channel;
}

// ============================================================================
// PATTERN 4: Subscribe to Room Updates
// ============================================================================

/**
 * Subscribe to updates for a specific room (name, leader, point scale).
 *
 * Use Case:
 * - Update room header when name changes
 * - Update leader badge when leader changes
 * - Detect point scale changes
 *
 * @param roomId - The UUID of the room to monitor
 * @param onUpdate - Callback when room is updated
 * @returns RealtimeChannel that can be unsubscribed later
 */
export function subscribeToRoomUpdates(
  roomId: string,
  onUpdate: (room: Room) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`room:${roomId}:updates`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      },
      (payload: RealtimePostgresChangesPayload<Room>) => {
        console.log(`[Realtime] Room updated:`, payload.new);
        onUpdate(payload.new);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to room ${roomId} updates`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Error subscribing to room updates:`, err);
      }
    });

  return channel;
}

// ============================================================================
// PATTERN 5: Combined Room Data (Multiple Tables on One Channel)
// ============================================================================

/**
 * Subscribe to all room-related changes on a single channel.
 *
 * This is more efficient than creating separate channels for each table.
 *
 * Use Case:
 * - Room page that needs to monitor participants, stories, votes, and room updates
 *
 * @param roomId - The UUID of the room to monitor
 * @param callbacks - Callbacks for each table's events
 * @returns RealtimeChannel that can be unsubscribed later
 */
export function subscribeToRoomData(
  roomId: string,
  callbacks: {
    onParticipantChange?: (payload: RealtimePostgresChangesPayload<Participant>) => void;
    onStoryChange?: (payload: RealtimePostgresChangesPayload<Story>) => void;
    onRoomChange?: (payload: RealtimePostgresChangesPayload<Room>) => void;
  }
): RealtimeChannel {
  const channel = supabase
    .channel(`room:${roomId}:all-data`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `room_id=eq.${roomId}`
      },
      (payload: RealtimePostgresChangesPayload<Participant>) => {
        console.log(`[Realtime] Participant ${payload.eventType}:`, payload.new || payload.old);
        callbacks.onParticipantChange?.(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'stories',
        filter: `room_id=eq.${roomId}`
      },
      (payload: RealtimePostgresChangesPayload<Story>) => {
        console.log(`[Realtime] Story ${payload.eventType}:`, payload.new || payload.old);
        callbacks.onStoryChange?.(payload);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      },
      (payload: RealtimePostgresChangesPayload<Room>) => {
        console.log(`[Realtime] Room updated:`, payload.new);
        callbacks.onRoomChange?.(payload);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Subscribed to all data for room ${roomId}`);
      }
      if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Error subscribing to room data:`, err);
      }
    });

  return channel;
}

// ============================================================================
// PATTERN 6: Subscription with Reconnection Logic
// ============================================================================

/**
 * Subscribe with automatic reconnection using exponential backoff.
 *
 * Use Case:
 * - Production environments where network interruptions are expected
 * - Long-running subscriptions that need to be resilient
 *
 * @param channelName - Unique name for this channel
 * @param subscribeCallback - Function that creates and returns the channel
 * @param maxRetries - Maximum number of reconnection attempts (default: 5)
 * @returns Object with channel and cleanup function
 */
export function subscribeWithReconnect(
  channelName: string,
  subscribeCallback: () => RealtimeChannel,
  maxRetries: number = 5
): {
  channel: RealtimeChannel;
  cleanup: () => void;
} {
  let channel: RealtimeChannel;
  let retryCount = 0;
  const baseDelay = 1000; // 1 second

  function attemptSubscribe() {
    channel = subscribeCallback();

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Successfully subscribed to ${channelName}`);
        retryCount = 0; // Reset retry count on successful connection
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`[Realtime] Connection error for ${channelName}:`, err);

        if (retryCount < maxRetries) {
          const delay = baseDelay * Math.pow(2, retryCount);
          console.log(`[Realtime] Retrying ${channelName} in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);

          setTimeout(() => {
            retryCount++;
            // Remove old channel before retrying
            supabase.removeChannel(channel);
            attemptSubscribe();
          }, delay);
        } else {
          console.error(`[Realtime] Max retries reached for ${channelName}. Giving up.`);
        }
      }

      if (status === 'CLOSED') {
        console.log(`[Realtime] Connection closed for ${channelName}`);
      }
    });
  }

  attemptSubscribe();

  return {
    channel,
    cleanup: () => {
      retryCount = maxRetries; // Prevent further retries
      supabase.removeChannel(channel);
    }
  };
}

// ============================================================================
// PATTERN 7: React Hook Example (for Phase 6)
// ============================================================================

/**
 * Example React hook for subscribing to room participants.
 *
 * This would be implemented in /src/hooks/useRealtimeSubscription.ts in Phase 6.
 *
 * Usage:
 * ```tsx
 * function ParticipantList({ roomId }: { roomId: string }) {
 *   const participants = useRoomParticipants(roomId);
 *
 *   return (
 *     <ul>
 *       {participants.map(p => (
 *         <li key={p.id}>
 *           {p.name} {p.is_leader && '(Leader)'}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
/*
import { useEffect, useState } from 'react';

export function useRoomParticipants(roomId: string): Participant[] {
  const [participants, setParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    // Initial fetch
    supabase
      .from('participants')
      .select('*')
      .eq('room_id', roomId)
      .then(({ data }) => {
        if (data) setParticipants(data);
      });

    // Subscribe to real-time updates
    const channel = subscribeToRoomParticipants(
      roomId,
      {
        onInsert: (participant) => {
          setParticipants((prev) => [...prev, participant]);
        },
        onUpdate: (participant) => {
          setParticipants((prev) =>
            prev.map((p) => (p.id === participant.id ? participant : p))
          );
        },
        onDelete: (participant) => {
          setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
        }
      }
    );

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return participants;
}
*/

// ============================================================================
// PATTERN 8: Unsubscribe Helper
// ============================================================================

/**
 * Utility to clean up multiple channels at once.
 *
 * Use Case:
 * - Component unmount with multiple active subscriptions
 * - User logout to close all connections
 *
 * @param channels - Array of RealtimeChannel instances to remove
 */
export async function unsubscribeAll(channels: RealtimeChannel[]): Promise<void> {
  console.log(`[Realtime] Unsubscribing from ${channels.length} channels...`);

  await Promise.all(
    channels.map((channel) => supabase.removeChannel(channel))
  );

  console.log(`[Realtime] Successfully unsubscribed from all channels`);
}

// ============================================================================
// PATTERN 9: Connection Status Monitor
// ============================================================================

/**
 * Monitor the overall connection status of real-time.
 *
 * Use Case:
 * - Display connection indicator in UI
 * - Log connection issues for debugging
 *
 * @param onStatusChange - Callback when connection status changes
 * @returns Cleanup function to stop monitoring
 */
export function monitorConnectionStatus(
  onStatusChange: (status: 'connected' | 'disconnected' | 'error') => void
): () => void {
  // Supabase doesn't expose a global connection status directly,
  // so we create a dedicated monitoring channel
  const monitorChannel = supabase
    .channel('connection-monitor')
    .subscribe((status: string, err?: Error) => {
      if (status === 'SUBSCRIBED') {
        onStatusChange('connected');
      } else if (status === 'CLOSED') {
        onStatusChange('disconnected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        onStatusChange('error');
      }
    });

  // Return cleanup function
  return () => {
    supabase.removeChannel(monitorChannel);
  };
}

// ============================================================================
// PATTERN 10: Throttled Event Handler
// ============================================================================

/**
 * Throttle rapid real-time events to prevent excessive UI updates.
 *
 * Use Case:
 * - High-frequency updates (many participants joining/leaving)
 * - Performance optimization for slow devices
 *
 * @param callback - Function to call (throttled)
 * @param delay - Minimum time between calls in milliseconds
 * @returns Throttled version of the callback
 */
export function throttleRealtimeHandler<T>(
  callback: (payload: T) => void,
  delay: number = 500
): (payload: T) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return (payload: T) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      // Immediate execution
      lastCall = now;
      callback(payload);
    } else {
      // Schedule execution
      if (timeoutId) clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        callback(payload);
        timeoutId = null;
      }, delay - timeSinceLastCall);
    }
  };
}

// ============================================================================
// Example Usage in a Component
// ============================================================================

/**
 * Example: Room Page Component with Multiple Subscriptions
 *
 * This demonstrates how to use the subscription patterns in a real React component.
 */
/*
function RoomPage({ roomId }: { roomId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [room, setRoom] = useState<Room | null>(null);

  useEffect(() => {
    // Track all channels for cleanup
    const channels: RealtimeChannel[] = [];

    // Subscribe to participants
    const participantsChannel = subscribeToRoomParticipants(
      roomId,
      {
        onInsert: (p) => setParticipants((prev) => [...prev, p]),
        onUpdate: (p) => setParticipants((prev) =>
          prev.map((existing) => existing.id === p.id ? p : existing)
        ),
        onDelete: (p) => setParticipants((prev) =>
          prev.filter((existing) => existing.id !== p.id)
        )
      }
    );
    channels.push(participantsChannel);

    // Subscribe to stories
    const storiesChannel = subscribeToRoomStories(
      roomId,
      {
        onInsert: (s) => setStories((prev) => [...prev, s]),
        onUpdate: (s) => setStories((prev) =>
          prev.map((existing) => existing.id === s.id ? s : existing)
        )
      }
    );
    channels.push(storiesChannel);

    // Subscribe to room updates
    const roomChannel = subscribeToRoomUpdates(
      roomId,
      (r) => setRoom(r)
    );
    channels.push(roomChannel);

    // Cleanup on unmount
    return () => {
      unsubscribeAll(channels);
    };
  }, [roomId]);

  return (
    <div>
      <h1>{room?.name || 'Loading...'}</h1>

      <section>
        <h2>Participants ({participants.length})</h2>
        <ul>
          {participants.map(p => (
            <li key={p.id}>
              {p.name} {p.is_leader && '👑'}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Stories ({stories.length})</h2>
        <ul>
          {stories.map(s => (
            <li key={s.id}>
              {s.title} {s.is_active && '⭐'}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
*/
