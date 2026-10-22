/**
 * Database Query Utility Functions
 *
 * This module provides typed utility functions for all main database operations
 * in the Story Pointer application. All functions include:
 * - Full TypeScript type safety
 * - Error handling with descriptive messages
 * - Row Level Security (RLS) enforcement
 * - Proper null/undefined handling
 *
 * Usage:
 * ```ts
 * import { getRoomByCode, createRoom, joinRoom } from '@/lib/supabase/queries';
 *
 * const room = await getRoomByCode('ABC12345');
 * const newRoom = await createRoom('Sprint Planning', 'Jane Doe', 'fibonacci');
 * const participant = await joinRoom(room.id, 'John Doe');
 * ```
 *
 * @see /docs/database-schema.md for schema documentation
 * @see /docs/rls-policies.md for access control details
 */

import { supabase } from './client';
import type { Tables, Enums } from './client';

/**
 * Custom error class for database operations
 */
export class DatabaseError extends Error {
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// ROOM OPERATIONS
// ============================================================================

/**
 * Get a room by its room code
 *
 * @param roomCode - The 8-character alphanumeric room code (case-insensitive)
 * @returns Room data if found, null if not found
 * @throws DatabaseError if the query fails
 */
export async function getRoomByCode(
  roomCode: string
): Promise<Tables<'rooms'> | null> {
  try {
    // Rooms are readable directly only by their members, so a visitor who has
    // the code but has not joined yet looks the room up through this function.
    const { data, error } = await supabase
      .rpc('get_room_by_code', { code: roomCode.toUpperCase() })
      .maybeSingle();

    if (error) {
      throw new DatabaseError(
        `Failed to get room by code: ${error.message}`,
        error.code,
        error
      );
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while getting room by code',
      undefined,
      err
    );
  }
}

/**
 * Create a new room with the caller as its leader
 *
 * Goes through the `create_room` database function, which inserts the room and
 * the creator's leader participant in one transaction. Clients hold no INSERT
 * privilege on rooms or participants, so leadership can only be assigned by the
 * database, never claimed by a client.
 *
 * @param name - Display name for the room
 * @param participantName - The creator's display name in the room
 * @param pointScale - Estimation scale ('fibonacci' or 't-shirt')
 * @returns The created room data
 * @throws DatabaseError if creation fails
 */
export async function createRoom(
  name: string,
  participantName: string,
  pointScale: Enums<'point_scale_enum'> = 'fibonacci'
): Promise<Tables<'rooms'>> {
  try {
    const { data, error } = await supabase
      .rpc('create_room', {
        room_name: name,
        scale: pointScale,
        display_name: participantName,
      })
      .single();

    if (error) {
      throw new DatabaseError(
        `Failed to create room: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      throw new DatabaseError('Room created but no data returned');
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while creating room',
      undefined,
      err
    );
  }
}

/**
 * Update room settings
 *
 * Only the room leader can update the room.
 * RLS policies enforce this restriction at the database level.
 *
 * @param roomId - UUID of the room to update
 * @param updates - Partial room data to update
 * @returns Updated room data
 * @throws DatabaseError if update fails or user is not leader
 */
export async function updateRoom(
  roomId: string,
  updates: { name?: string; point_scale?: Enums<'point_scale_enum'> }
): Promise<Tables<'rooms'>> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single();

    if (error) {
      // RLS policy will prevent update if user is not leader
      if (error.code === 'PGRST116') {
        throw new DatabaseError(
          'Only the room leader can update room settings',
          error.code,
          error
        );
      }
      throw new DatabaseError(
        `Failed to update room: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      throw new DatabaseError('Room updated but no data returned');
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while updating room',
      undefined,
      err
    );
  }
}

// ============================================================================
// PARTICIPANT OPERATIONS
// ============================================================================

/**
 * Join a room as the current user
 *
 * Goes through the `join_room` database function, which inserts the caller's
 * participant row or reactivates and renames an existing one. The database
 * decides leadership: the caller is promoted only when the room has no usable
 * leader, under a lock so two simultaneous joiners cannot both become leader.
 * The caller's identity comes from the session (`auth.uid()`), not a parameter.
 *
 * @param roomId - UUID of the room to join
 * @param name - Display name for this participant in the room
 * @returns The participant record (existing or newly created)
 * @throws DatabaseError if join fails
 */
export async function joinRoom(
  roomId: string,
  name: string
): Promise<Tables<'participants'>> {
  try {
    const { data, error } = await supabase
      .rpc('join_room', {
        target_room_id: roomId,
        display_name: name,
      })
      .single();

    if (error) {
      throw new DatabaseError(
        `Failed to join room: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      throw new DatabaseError('Participant created but no data returned');
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while joining room',
      undefined,
      err
    );
  }
}

/**
 * Get all active participants in a room
 *
 * @param roomId - UUID of the room
 * @returns Array of active participant records
 * @throws DatabaseError if query fails
 */
export async function getActiveParticipants(
  roomId: string
): Promise<Tables<'participants'>[]> {
  try {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (error) {
      throw new DatabaseError(
        `Failed to get active participants: ${error.message}`,
        error.code,
        error
      );
    }

    return data || [];
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while getting active participants',
      undefined,
      err
    );
  }
}

/**
 * Leave a room (set is_active to false)
 *
 * If the participant is the leader, the database trigger will automatically
 * promote another active participant to leader.
 *
 * @param participantId - UUID of the participant record
 * @throws DatabaseError if update fails
 */
export async function leaveRoom(participantId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('participants')
      .update({ is_active: false })
      .eq('id', participantId);

    if (error) {
      throw new DatabaseError(
        `Failed to leave room: ${error.message}`,
        error.code,
        error
      );
    }
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while leaving room',
      undefined,
      err
    );
  }
}

// ============================================================================
// STORY OPERATIONS
// ============================================================================

/**
 * Create a new story in a room
 *
 * Only the room leader can create stories.
 * RLS policies enforce this restriction at the database level.
 *
 * @param roomId - UUID of the room
 * @param title - Story title
 * @param description - Optional story description
 * @returns The created story data
 * @throws DatabaseError if creation fails or user is not leader
 */
export async function createStory(
  roomId: string,
  title: string,
  description?: string
): Promise<Tables<'stories'>> {
  try {
    const { data, error } = await supabase
      .from('stories')
      .insert({
        room_id: roomId,
        title,
        description: description || null,
        is_active: false, // Leader activates it when ready
      })
      .select()
      .single();

    if (error) {
      // RLS policy will prevent insert if user is not leader
      if (error.code === 'PGRST116') {
        throw new DatabaseError(
          'Only the room leader can create stories',
          error.code,
          error
        );
      }
      throw new DatabaseError(
        `Failed to create story: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      throw new DatabaseError('Story created but no data returned');
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while creating story',
      undefined,
      err
    );
  }
}

/**
 * Make a story the room's only active story
 *
 * Goes through the `set_active_story` database function, which checks
 * leadership and switches every story in the room in one statement, so there
 * is never a moment with zero or two active stories.
 *
 * @param storyId - UUID of the story to activate
 * @returns The updated story data
 * @throws DatabaseError if the caller is not the leader or the update fails
 */
export async function setActiveStory(
  storyId: string
): Promise<Tables<'stories'>> {
  try {
    const { data, error } = await supabase
      .rpc('set_active_story', { target_story_id: storyId })
      .single();

    if (error) {
      if (error.code === '42501') {
        throw new DatabaseError(
          'Only the room leader can activate stories',
          error.code,
          error
        );
      }
      throw new DatabaseError(
        `Failed to activate story: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      throw new DatabaseError('Story activated but no data returned');
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while activating story',
      undefined,
      err
    );
  }
}

/**
 * Start a new voting round on a story
 *
 * Goes through the `revote_story` database function, which copies the story
 * and makes the copy active. The revealed round keeps its votes and result.
 *
 * @param storyId - UUID of the revealed story to vote on again
 * @returns The new, active story
 * @throws DatabaseError if the caller is not the leader or the copy fails
 */
export async function revoteStory(
  storyId: string
): Promise<Tables<'stories'>> {
  try {
    const { data, error } = await supabase
      .rpc('revote_story', { target_story_id: storyId })
      .single();

    if (error) {
      if (error.code === '42501') {
        throw new DatabaseError(
          'Only the room leader can start a new round',
          error.code,
          error
        );
      }
      throw new DatabaseError(
        `Failed to start a new round: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      throw new DatabaseError('New round started but no data returned');
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while starting a new round',
      undefined,
      err
    );
  }
}

/**
 * Clear the active story in a room (deactivates all stories)
 *
 * This is used to return to the story creation form after voting is complete.
 * Only the room leader can clear the active story.
 * RLS policies enforce this restriction at the database level.
 *
 * @param roomId - UUID of the room
 * @throws DatabaseError if update fails or user is not leader
 */
export async function clearActiveStory(roomId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('stories')
      .update({ is_active: false })
      .eq('room_id', roomId);

    if (error) {
      if (error.code === 'PGRST116') {
        throw new DatabaseError(
          'Only the room leader can clear active story',
          error.code,
          error
        );
      }
      throw new DatabaseError(
        `Failed to clear active story: ${error.message}`,
        error.code,
        error
      );
    }
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while clearing active story',
      undefined,
      err
    );
  }
}

/**
 * Get the active story in a room
 *
 * @param roomId - UUID of the room
 * @returns The active story or null if no story is active
 * @throws DatabaseError if query fails
 */
export async function getActiveStory(
  roomId: string
): Promise<Tables<'stories'> | null> {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('room_id', roomId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(
        `Failed to get active story: ${error.message}`,
        error.code,
        error
      );
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while getting active story',
      undefined,
      err
    );
  }
}

// ============================================================================
// VOTE OPERATIONS
// ============================================================================

/**
 * Submit or update a vote for a story
 *
 * If the participant already has a vote for this story, it will be updated.
 * Otherwise, a new vote record is created.
 *
 * @param storyId - UUID of the story being voted on
 * @param participantId - UUID of the participant submitting the vote
 * @param pointValue - The estimate value (string to support different scales)
 * @param sentiment - Optional sentiment indicator (e.g., 'confident', 'concerned')
 * @returns The vote data (existing or newly created)
 * @throws DatabaseError if submission fails
 */
export async function submitVote(
  storyId: string,
  participantId: string,
  pointValue: string,
  sentiment?: string
): Promise<Tables<'votes'>> {
  try {
    // Try to upsert (insert or update if exists)
    const { data, error } = await supabase
      .from('votes')
      .upsert(
        {
          story_id: storyId,
          participant_id: participantId,
          point_value: pointValue,
          sentiment: sentiment || null,
        },
        {
          onConflict: 'story_id,participant_id',
        }
      )
      .select()
      .single();

    if (error) {
      throw new DatabaseError(
        `Failed to submit vote: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      throw new DatabaseError('Vote submitted but no data returned');
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while submitting vote',
      undefined,
      err
    );
  }
}

/**
 * Reveal all votes for a story
 *
 * Also marks the story revealed and records the mean of its numeric votes as
 * `final_average`, so a story with no votes can still be revealed.
 *
 * Goes through the `reveal_votes` database function rather than an UPDATE.
 * RLS grants permission per row, never per column, so a leader-shaped UPDATE
 * policy on votes would also let the leader rewrite other people's estimates.
 * The function checks leadership and touches only `is_revealed`.
 *
 * @param storyId - UUID of the story to reveal votes for
 * @throws DatabaseError if reveal fails or the caller is not the leader
 */
export async function revealVotes(storyId: string): Promise<void> {
  try {
    const { error } = await supabase.rpc('reveal_votes', {
      target_story_id: storyId,
    });

    if (error) {
      // The function raises insufficient_privilege for a non-leader caller.
      if (error.code === '42501') {
        throw new DatabaseError(
          'Only the room leader can reveal votes',
          error.code,
          error
        );
      }
      throw new DatabaseError(
        `Failed to reveal votes: ${error.message}`,
        error.code,
        error
      );
    }
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while revealing votes',
      undefined,
      err
    );
  }
}

/**
 * Get all votes for a story
 *
 * Note: RLS policies enforce that users can only see:
 * - Their own votes (regardless of is_revealed)
 * - Other users' votes where is_revealed=true
 *
 * @param storyId - UUID of the story
 * @returns Array of vote records
 * @throws DatabaseError if query fails
 */
export async function getStoryVotes(
  storyId: string
): Promise<Tables<'votes'>[]> {
  try {
    const { data, error } = await supabase
      .from('votes')
      .select('*')
      .eq('story_id', storyId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new DatabaseError(
        `Failed to get story votes: ${error.message}`,
        error.code,
        error
      );
    }

    return data || [];
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while getting story votes',
      undefined,
      err
    );
  }
}

// ============================================================================
// PROFILE OPERATIONS
// ============================================================================

/**
 * Get a user's profile by their user ID
 *
 * @param userId - UUID of the authenticated user
 * @returns Profile data if found, null if not found
 * @throws DatabaseError if query fails
 */
export async function getProfile(
  userId: string
): Promise<Tables<'profiles'> | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(
        `Failed to get profile: ${error.message}`,
        error.code,
        error
      );
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while getting profile',
      undefined,
      err
    );
  }
}

/**
 * Create a new profile for an authenticated user
 *
 * @param userId - UUID of the authenticated user
 * @param displayName - User's display name
 * @returns The created profile data
 * @throws DatabaseError if creation fails
 */
export async function createProfile(
  userId: string,
  displayName: string
): Promise<Tables<'profiles'>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        display_name: displayName,
      })
      .select()
      .single();

    if (error) {
      throw new DatabaseError(
        `Failed to create profile: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      throw new DatabaseError('Profile created but no data returned');
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while creating profile',
      undefined,
      err
    );
  }
}

/**
 * Update a user's profile display name
 *
 * @param userId - UUID of the authenticated user
 * @param displayName - New display name
 * @returns The updated profile data
 * @throws DatabaseError if update fails
 */
export async function updateProfile(
  userId: string,
  displayName: string
): Promise<Tables<'profiles'>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(
        `Failed to update profile: ${error.message}`,
        error.code,
        error
      );
    }

    if (!data) {
      throw new DatabaseError('Profile updated but no data returned');
    }

    return data;
  } catch (err) {
    if (err instanceof DatabaseError) throw err;
    throw new DatabaseError(
      'Unexpected error while updating profile',
      undefined,
      err
    );
  }
}
