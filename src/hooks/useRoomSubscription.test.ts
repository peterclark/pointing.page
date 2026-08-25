/**
 * Tests for useRoomSubscription hook
 *
 * Focuses on:
 * - Initial data fetching
 * - Real-time subscription updates (INSERT, UPDATE)
 * - Error handling
 * - Cleanup on unmount
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRoomSubscription } from './useRoomSubscription';
import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/client';

// Mock the supabase client
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}));

describe('useRoomSubscription', () => {
  let mockChannel: any;
  let mockSubscriptionCallbacks: Record<string, any>;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock subscription callbacks
    mockSubscriptionCallbacks = {};

    // Setup mock channel
    mockChannel = {
      on: vi.fn().mockImplementation((type, config, callback) => {
        // Store callbacks by table name for testing
        const key = `${config.table}-${config.event}`;
        mockSubscriptionCallbacks[key] = callback;
        return mockChannel;
      }),
      subscribe: vi.fn().mockImplementation((callback) => {
        // The votes channel subscribes without a status callback.
        if (callback) setTimeout(() => callback('SUBSCRIBED'), 0);
        return mockChannel;
      }),
    };

    // Mock supabase.channel to return our mock channel
    vi.mocked(supabase.channel).mockReturnValue(mockChannel);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch initial data on mount', async () => {
    const roomId = 'test-room-id';
    const mockStories: Tables<'stories'>[] = [
      {
        id: 'story-1',
        room_id: roomId,
        title: 'Test Story',
        description: 'Test Description',
        is_active: true,
        final_average: null,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];
    const mockParticipants: Tables<'participants'>[] = [
      {
        id: 'participant-1',
        room_id: roomId,
        name: 'Alice',
        is_leader: true,
        is_active: true,
        joined_at: '2025-01-01T00:00:00Z',
        user_id: null,
      },
    ];
    const mockVotes: Tables<'votes'>[] = [
      {
        id: 'vote-1',
        story_id: 'story-1',
        participant_id: 'participant-1',
        point_value: '5',
        sentiment: null,
        is_revealed: false,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    // Mock initial data fetch
    const mockFrom = vi.fn().mockImplementation((table) => {
      if (table === 'stories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockStories,
            error: null,
          }),
        };
      } else if (table === 'participants') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockParticipants,
            error: null,
          }),
        };
      } else if (table === 'votes') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: mockVotes,
            error: null,
          }),
        };
      }

      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useRoomSubscription(roomId));

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.stories).toEqual([]);
    expect(result.current.votes).toEqual([]);
    expect(result.current.participants).toEqual([]);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Check data is populated
    expect(result.current.stories).toEqual(mockStories);
    expect(result.current.participants).toEqual(mockParticipants);
    expect(result.current.votes).toEqual(mockVotes);
    expect(result.current.error).toBeNull();
  });

  it('should handle INSERT events for participants', async () => {
    const roomId = 'test-room-id';

    // Mock initial empty data
    const mockFrom = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useRoomSubscription(roomId));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate INSERT event for participant
    const newParticipant: Tables<'participants'> = {
      id: 'participant-2',
      room_id: roomId,
      name: 'Bob',
      is_leader: false,
      is_active: true,
      joined_at: '2025-01-01T01:00:00Z',
      user_id: null,
    };

    const insertCallback = mockSubscriptionCallbacks['participants-*'];
    expect(insertCallback).toBeDefined();

    insertCallback({
      eventType: 'INSERT',
      new: newParticipant,
      old: {},
    });

    // Wait for state update
    await waitFor(() => {
      expect(result.current.participants).toHaveLength(1);
    });

    expect(result.current.participants[0]).toEqual(newParticipant);
  });

  it('should handle UPDATE events for stories', async () => {
    const roomId = 'test-room-id';
    const mockStory: Tables<'stories'> = {
      id: 'story-1',
      room_id: roomId,
      title: 'Original Title',
      description: null,
      is_active: false,
      final_average: null,
      created_at: '2025-01-01T00:00:00Z',
    };

    // Mock initial data with one story
    const mockFrom = vi.fn().mockImplementation((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: table === 'stories' ? [mockStory] : [],
        error: null,
      }),
    }));

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useRoomSubscription(roomId));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stories[0].title).toBe('Original Title');

    // Simulate UPDATE event for story
    const updatedStory: Tables<'stories'> = {
      ...mockStory,
      title: 'Updated Title',
      is_active: true,
    };

    const updateCallback = mockSubscriptionCallbacks['stories-*'];
    expect(updateCallback).toBeDefined();

    updateCallback({
      eventType: 'UPDATE',
      new: updatedStory,
      old: mockStory,
    });

    // Wait for state update
    await waitFor(() => {
      expect(result.current.stories[0].title).toBe('Updated Title');
    });

    expect(result.current.stories[0].is_active).toBe(true);
  });

  it('should handle errors during initial data fetch', async () => {
    const roomId = 'test-room-id';
    const errorMessage = 'Database connection failed';

    // Mock error response
    const mockFrom = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      }),
    }));

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useRoomSubscription(roomId));

    // Wait for error state
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 3000 });

    expect(result.current.error?.message).toContain('Failed to fetch');
  });

  it('should cleanup subscription on unmount', async () => {
    const roomId = 'test-room-id';

    // Mock initial empty data
    const mockFrom = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { unmount } = renderHook(() => useRoomSubscription(roomId));

    // Wait for subscription to be established
    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    // Unmount the hook
    unmount();

    // Verify removeChannel was called
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('should handle subscription connection errors', async () => {
    const roomId = 'test-room-id';

    // Mock initial data
    const mockFrom = vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }));

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    // Mock subscription error - need to send 3 errors to trigger error state (maxErrorsBeforeFailure = 3)
    mockChannel.subscribe = vi.fn().mockImplementation((callback) => {
      setTimeout(() => {
        callback('CHANNEL_ERROR', { message: 'Connection failed' });
        callback('CHANNEL_ERROR', { message: 'Connection failed' });
        callback('CHANNEL_ERROR', { message: 'Connection failed' });
      }, 0);
      return mockChannel;
    });

    const { result } = renderHook(() => useRoomSubscription(roomId));

    // Wait for error to be set (after 3 consecutive errors)
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 3000 });

    expect(result.current.error?.message).toContain('Connection error');
  });

  it('should handle DELETE events for participants', async () => {
    const roomId = 'test-room-id';
    const mockParticipant: Tables<'participants'> = {
      id: 'participant-1',
      room_id: roomId,
      name: 'Alice',
      is_leader: true,
      is_active: true,
      joined_at: '2025-01-01T00:00:00Z',
      user_id: null,
    };

    // Mock initial data with one participant
    const mockFrom = vi.fn().mockImplementation((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: table === 'participants' ? [mockParticipant] : [],
        error: null,
      }),
    }));

    vi.mocked(supabase.from).mockImplementation(mockFrom);

    const { result } = renderHook(() => useRoomSubscription(roomId));

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.participants).toHaveLength(1);

    // Simulate DELETE event for participant
    const deleteCallback = mockSubscriptionCallbacks['participants-*'];
    expect(deleteCallback).toBeDefined();

    deleteCallback({
      eventType: 'DELETE',
      new: {},
      old: mockParticipant,
    });

    // Wait for state update
    await waitFor(() => {
      expect(result.current.participants).toHaveLength(0);
    });
  });

  it('should handle empty roomId gracefully', () => {
    const { result } = renderHook(() => useRoomSubscription(''));

    // Should not be loading and have no error
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.stories).toEqual([]);
    expect(result.current.votes).toEqual([]);
    expect(result.current.participants).toEqual([]);

    // Should not create a subscription
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('scopes the votes subscription to the active story', async () => {
    const roomId = 'test-room-id';
    const stories: Tables<'stories'>[] = [
      {
        id: 'story-1',
        room_id: roomId,
        title: 'Active',
        description: null,
        is_active: true,
        final_average: null,
        created_at: '2025-01-01T00:00:00Z',
      },
    ];

    vi.mocked(supabase.from).mockImplementation(((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: table === 'stories' ? stories : [],
        error: null,
      }),
    })) as never);

    const { result } = renderHook(() => useRoomSubscription(roomId));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const voteSubscription = mockChannel.on.mock.calls.find(
      ([, config]: [string, { table: string }]) => config.table === 'votes'
    );

    // Without this filter the subscription received every vote change in the
    // database — every room, every story — and discarded the irrelevant ones in
    // the browser, leaking other rooms' unrevealed estimates over the socket.
    expect(voteSubscription).toBeDefined();
    expect(voteSubscription![1].filter).toBe('story_id=eq.story-1');
  });

  it('does not open a votes subscription when no story is active', async () => {
    const roomId = 'test-room-id';

    vi.mocked(supabase.from).mockImplementation((() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })) as never);

    const { result } = renderHook(() => useRoomSubscription(roomId));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const voteSubscription = mockChannel.on.mock.calls.find(
      ([, config]: [string, { table: string }]) => config.table === 'votes'
    );

    expect(voteSubscription).toBeUndefined();
    expect(result.current.votes).toEqual([]);
  });


  /** Room with one active story, so the votes channel is live. */
  const activeStory: Tables<'stories'> = {
    id: 'story-1',
    room_id: 'test-room-id',
    title: 'Active',
    description: null,
    is_active: true,
    final_average: null,
    created_at: '2025-01-01T00:00:00Z',
  };

  const seedVote: Tables<'votes'> = {
    id: 'vote-1',
    story_id: 'story-1',
    participant_id: 'participant-1',
    point_value: '5',
    sentiment: null,
    is_revealed: false,
    created_at: '2025-01-01T00:00:00Z',
  };

  /** Mount with an active story and the given starting votes. */
  async function mountWithActiveStory(votes: Tables<'votes'>[] = []) {
    vi.mocked(supabase.from).mockImplementation(((table: string) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: table === 'stories' ? [activeStory] : table === 'votes' ? votes : [],
        error: null,
      }),
    })) as never);

    const hook = renderHook(() => useRoomSubscription('test-room-id'));
    await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
    await waitFor(() => expect(mockSubscriptionCallbacks['votes-*']).toBeDefined());
    return hook;
  }

  it('adds an incoming vote for the active story', async () => {
    const { result } = await mountWithActiveStory();

    mockSubscriptionCallbacks['votes-*']({
      eventType: 'INSERT',
      new: seedVote,
      old: {},
    });

    await waitFor(() => expect(result.current.votes).toHaveLength(1));
    expect(result.current.votes[0]).toEqual(seedVote);
  });

  it('ignores a duplicate INSERT for a vote it already holds', async () => {
    const { result } = await mountWithActiveStory([seedVote]);

    mockSubscriptionCallbacks['votes-*']({
      eventType: 'INSERT',
      new: seedVote,
      old: {},
    });

    await waitFor(() => expect(result.current.votes).toHaveLength(1));
  });

  it('applies an UPDATE to a vote it already holds', async () => {
    const { result } = await mountWithActiveStory([seedVote]);

    mockSubscriptionCallbacks['votes-*']({
      eventType: 'UPDATE',
      new: { ...seedVote, point_value: '8' },
      old: seedVote,
    });

    await waitFor(() => expect(result.current.votes[0].point_value).toBe('8'));
    expect(result.current.votes).toHaveLength(1);
  });

  it('adopts a vote that becomes visible only on reveal', async () => {
    // RLS withholds another participant's unrevealed vote entirely, so the
    // reveal arrives as an UPDATE for a row this client has never seen.
    const { result } = await mountWithActiveStory([]);

    mockSubscriptionCallbacks['votes-*']({
      eventType: 'UPDATE',
      new: { ...seedVote, id: 'vote-2', is_revealed: true },
      old: {},
    });

    await waitFor(() => expect(result.current.votes).toHaveLength(1));
    expect(result.current.votes[0].is_revealed).toBe(true);
  });

  it('removes a deleted vote', async () => {
    const { result } = await mountWithActiveStory([seedVote]);

    mockSubscriptionCallbacks['votes-*']({
      eventType: 'DELETE',
      new: {},
      old: seedVote,
    });

    await waitFor(() => expect(result.current.votes).toHaveLength(0));
  });

  it('drops the votes when the active story is cleared', async () => {
    const { result } = await mountWithActiveStory([seedVote]);
    await waitFor(() => expect(result.current.votes).toHaveLength(1));

    mockSubscriptionCallbacks['stories-*']({
      eventType: 'UPDATE',
      new: { ...activeStory, is_active: false },
      old: activeStory,
    });

    await waitFor(() => expect(result.current.votes).toEqual([]));
  });

  it('adds a newly created story', async () => {
    const { result } = await mountWithActiveStory();

    const second: Tables<'stories'> = {
      ...activeStory,
      id: 'story-2',
      title: 'Second',
      is_active: false,
      created_at: '2025-01-02T00:00:00Z',
    };

    mockSubscriptionCallbacks['stories-*']({
      eventType: 'INSERT',
      new: second,
      old: {},
    });

    await waitFor(() => expect(result.current.stories).toHaveLength(2));
    // Kept in creation order, so the board does not reshuffle on each event.
    expect(result.current.stories.map((s) => s.id)).toEqual(['story-1', 'story-2']);
  });

  it('applies a participant rename', async () => {
    const { result } = await mountWithActiveStory();

    const participant: Tables<'participants'> = {
      id: 'participant-1',
      room_id: 'test-room-id',
      name: 'Ada',
      is_leader: false,
      is_active: true,
      joined_at: '2025-01-01T00:00:00Z',
      user_id: 'user-1',
    };

    mockSubscriptionCallbacks['participants-*']({
      eventType: 'INSERT',
      new: participant,
      old: {},
    });
    await waitFor(() => expect(result.current.participants).toHaveLength(1));

    mockSubscriptionCallbacks['participants-*']({
      eventType: 'UPDATE',
      new: { ...participant, name: 'Ada L.', is_leader: true },
      old: participant,
    });

    await waitFor(() => expect(result.current.participants[0].name).toBe('Ada L.'));
    expect(result.current.participants[0].is_leader).toBe(true);
  });

  it('reports a lost network connection, and clears it on recovery', async () => {
    const { result } = await mountWithActiveStory();

    window.dispatchEvent(new Event('offline'));
    await waitFor(() => expect(result.current.error?.message).toMatch(/connection lost/i));

    window.dispatchEvent(new Event('online'));

    // The banner used to outlive the outage: handleOnline was an empty function.
    await waitFor(() => expect(result.current.error).toBeNull());
  });

  it('shows reconnecting before giving up on repeated channel errors', async () => {
    vi.mocked(supabase.from).mockImplementation((() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })) as never);

    let emit: (status: string, err?: unknown) => void = () => {};
    mockChannel.subscribe = vi.fn().mockImplementation((callback) => {
      if (callback) emit = callback;
      return mockChannel;
    });

    const { result } = renderHook(() => useRoomSubscription('test-room-id'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    emit('CHANNEL_ERROR', { message: 'blip' });
    await waitFor(() => expect(result.current.isReconnecting).toBe(true));
    expect(result.current.error).toBeNull();

    emit('SUBSCRIBED');
    await waitFor(() => expect(result.current.isReconnecting).toBe(false));
  });

  it('surfaces an error after three timeouts', async () => {
    vi.mocked(supabase.from).mockImplementation((() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })) as never);

    let emit: (status: string, err?: unknown) => void = () => {};
    mockChannel.subscribe = vi.fn().mockImplementation((callback) => {
      if (callback) emit = callback;
      return mockChannel;
    });

    const { result } = renderHook(() => useRoomSubscription('test-room-id'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    emit('TIMED_OUT');
    await waitFor(() => expect(result.current.isReconnecting).toBe(true));

    emit('TIMED_OUT');
    emit('TIMED_OUT');

    await waitFor(() => expect(result.current.error?.message).toMatch(/timed out/i));
    expect(result.current.isReconnecting).toBe(false);
  });

});
