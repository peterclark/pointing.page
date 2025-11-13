/**
 * Type Testing File
 *
 * This file demonstrates and validates TypeScript type safety for Supabase operations.
 * It's not meant to be imported or run - it exists to verify types at compile time.
 *
 * If this file compiles without errors, it proves:
 * - Database types are correctly generated
 * - Query functions are properly typed
 * - React hooks have correct return types
 * - Enum types work as expected
 */

import type { Tables, TablesInsert, TablesUpdate, Enums } from './client';
import {
  getRoomByCode,
  createRoom,
  joinRoom,
  submitVote,
  revealVotes,
  createStory,
  getActiveParticipants,
} from './queries';

// ============================================================================
// TABLE ROW TYPES
// ============================================================================

// These should compile without errors
const room: Tables<'rooms'> = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  room_code: 'ABC12345',
  name: 'Sprint Planning',
  leader_id: '123e4567-e89b-12d3-a456-426614174001',
  point_scale: 'fibonacci',
  created_at: '2025-11-12T00:00:00Z',
};

const participant: Tables<'participants'> = {
  id: '123e4567-e89b-12d3-a456-426614174002',
  room_id: room.id,
  user_id: null, // Can be null for anonymous users
  name: 'John Doe',
  is_leader: true,
  is_active: true,
  joined_at: '2025-11-12T00:00:00Z',
};

const story: Tables<'stories'> = {
  id: '123e4567-e89b-12d3-a456-426614174003',
  room_id: room.id,
  title: 'User Authentication',
  description: 'Implement JWT auth',
  is_active: true,
  final_average: 5,
  created_at: '2025-11-12T00:00:00Z',
};

const vote: Tables<'votes'> = {
  id: '123e4567-e89b-12d3-a456-426614174004',
  story_id: story.id,
  participant_id: participant.id,
  point_value: '5',
  sentiment: 'confident',
  is_revealed: false,
  created_at: '2025-11-12T00:00:00Z',
};

const profile: Tables<'profiles'> = {
  id: '123e4567-e89b-12d3-a456-426614174005',
  user_id: '123e4567-e89b-12d3-a456-426614174006',
  display_name: 'John Doe',
  created_at: '2025-11-12T00:00:00Z',
};

// ============================================================================
// INSERT TYPES
// ============================================================================

// These should compile - optional fields can be omitted
const newRoom: TablesInsert<'rooms'> = {
  name: 'New Room',
  room_code: 'XYZ78910',
  // id, created_at, leader_id, point_scale are optional
};

const newParticipant: TablesInsert<'participants'> = {
  room_id: room.id,
  name: 'Jane Smith',
  // id, user_id, is_leader, is_active, joined_at are optional
};

// ============================================================================
// UPDATE TYPES
// ============================================================================

// These should compile - all fields are optional
const roomUpdate: TablesUpdate<'rooms'> = {
  name: 'Updated Room Name',
  // All other fields are optional
};

const participantUpdate: TablesUpdate<'participants'> = {
  is_active: false,
  // All other fields are optional
};

// ============================================================================
// ENUM TYPES
// ============================================================================

// These should compile
const pointScale1: Enums<'point_scale_enum'> = 'fibonacci';
const pointScale2: Enums<'point_scale_enum'> = 't-shirt';

// @ts-expect-error - This should NOT compile (invalid enum value)
const invalidPointScale: Enums<'point_scale_enum'> = 'invalid';

// ============================================================================
// QUERY FUNCTION TYPES
// ============================================================================

// Test query function return types
async function testQueryTypes() {
  // getRoomByCode returns Tables<'rooms'> | null
  const foundRoom = await getRoomByCode('ABC12345');
  if (foundRoom) {
    // TypeScript knows this is Tables<'rooms'>
    const roomName: string = foundRoom.name;
    const roomCode: string = foundRoom.room_code;
    const pointScale: 'fibonacci' | 't-shirt' = foundRoom.point_scale;
  }

  // createRoom returns Tables<'rooms'>
  const createdRoom = await createRoom('New Room', 'fibonacci');
  const createdRoomId: string = createdRoom.id;
  const createdRoomName: string = createdRoom.name;

  // joinRoom returns Tables<'participants'>
  const joinedParticipant = await joinRoom(createdRoom.id, null, 'John Doe');
  const participantName: string = joinedParticipant.name;
  const isLeader: boolean = joinedParticipant.is_leader;

  // createStory returns Tables<'stories'>
  const createdStory = await createStory(createdRoom.id, 'Story Title', 'Description');
  const storyTitle: string = createdStory.title;
  const storyDescription: string | null = createdStory.description;

  // submitVote returns Tables<'votes'>
  const submittedVote = await submitVote(
    createdStory.id,
    joinedParticipant.id,
    '5',
    'confident'
  );
  const voteValue: string = submittedVote.point_value;
  const voteRevealed: boolean = submittedVote.is_revealed;

  // revealVotes returns void
  await revealVotes(createdStory.id);

  // getActiveParticipants returns Tables<'participants'>[]
  const activeParticipants = await getActiveParticipants(createdRoom.id);
  const firstParticipant: Tables<'participants'> | undefined = activeParticipants[0];
  if (firstParticipant) {
    const participantId: string = firstParticipant.id;
  }
}

// ============================================================================
// REACT HOOK TYPES
// ============================================================================

// Import hooks to test their types
import { useRoomParticipants, useRoomStories, useStoryVotes } from '@/hooks/useRealtimeSubscription';

function testHookTypes(roomId: string, storyId: string) {
  // useRoomParticipants returns Tables<'participants'>[]
  const participants = useRoomParticipants(roomId);
  const firstParticipant: Tables<'participants'> | undefined = participants[0];

  // useRoomStories returns Tables<'stories'>[]
  const stories = useRoomStories(roomId);
  const firstStory: Tables<'stories'> | undefined = stories[0];

  // useStoryVotes returns Tables<'votes'>[]
  const votes = useStoryVotes(storyId);
  const firstVote: Tables<'votes'> | undefined = votes[0];
}

// ============================================================================
// TYPE NARROWING AND REFINEMENT
// ============================================================================

// Test that nullable fields work correctly
function testNullableFields(participant: Tables<'participants'>) {
  // user_id can be null
  const userId: string | null = participant.user_id;

  // Type narrowing should work
  if (participant.user_id !== null) {
    // TypeScript knows this is string, not null
    const definiteUserId: string = participant.user_id;
  }
}

function testOptionalFields(story: Tables<'stories'>) {
  // description can be null
  const description: string | null = story.description;

  // final_average can be null
  const finalAverage: number | null = story.final_average;

  // Type guard for description
  if (story.description !== null) {
    const definiteDescription: string = story.description;
  }
}

// ============================================================================
// TYPE ERRORS (These should NOT compile)
// ============================================================================

// @ts-expect-error - Missing required field 'name'
const invalidRoom: Tables<'rooms'> = {
  id: '123',
  room_code: 'ABC',
  point_scale: 'fibonacci',
  created_at: '2025-11-12',
};

// @ts-expect-error - Invalid point_scale value
const invalidPointScaleRoom: Tables<'rooms'> = {
  id: '123',
  room_code: 'ABC',
  name: 'Room',
  leader_id: null,
  point_scale: 'custom', // Not 'fibonacci' or 't-shirt'
  created_at: '2025-11-12',
};

// @ts-expect-error - Wrong type for is_leader (should be boolean)
const invalidParticipant: Tables<'participants'> = {
  id: '123',
  room_id: '456',
  user_id: null,
  name: 'John',
  is_leader: 'true', // Should be boolean, not string
  is_active: true,
  joined_at: '2025-11-12',
};

// ============================================================================
// CONCLUSION
// ============================================================================

/**
 * If this file compiles without errors (except for the intentional @ts-expect-error lines),
 * it proves that:
 *
 * 1. Database types are correctly generated from the schema
 * 2. All table types (Row, Insert, Update) work as expected
 * 3. Enum types correctly restrict values
 * 4. Query functions have proper type signatures
 * 5. React hooks return correct types
 * 6. Nullable and optional fields are properly typed
 * 7. Type narrowing and refinement work correctly
 * 8. Invalid values are caught at compile time
 *
 * This demonstrates complete type safety for the Supabase integration.
 */

export {}; // Make this a module
