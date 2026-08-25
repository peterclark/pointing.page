/**
 * Test Utilities
 *
 * Shared utilities for testing database operations and infrastructure.
 * Provides:
 * - Database cleanup functions
 * - Test data generators
 * - Assertion helpers
 */

import { supabase } from '@/lib/supabase/client';
import type { Tables } from '@/lib/supabase/client';

/**
 * Generate a random email for testing
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Generate a random display name for testing
 */
export function generateTestName(): string {
  const adjectives = ['Quick', 'Happy', 'Clever', 'Bright', 'Swift'];
  const nouns = ['Fox', 'Panda', 'Eagle', 'Tiger', 'Wolf'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}${noun}`;
}

/**
 * Clean up test data by deleting all rooms created during tests
 * This cascades to participants, stories, and votes due to foreign key constraints
 */
export async function cleanupTestRooms(): Promise<void> {
  try {
    // Delete all rooms - this will cascade to all related records
    const { error } = await supabase
      .from('rooms')
      .delete()
      .like('name', 'Test%'); // Only delete rooms with "Test" prefix

    if (error) {
      console.error('[Test Cleanup] Error deleting test rooms:', error);
    }
  } catch (err) {
    console.error('[Test Cleanup] Unexpected error:', err);
  }
}

/**
 * Create a test room for testing purposes
 */
export async function createTestRoom(
  name?: string,
  pointScale: 'fibonacci' | 't-shirt' = 'fibonacci'
): Promise<Tables<'rooms'>> {
  const roomName = name || `Test Room ${Date.now()}`;

  // Generate room code
  const { data: roomCode, error: codeError } = await supabase
    .rpc('generate_room_code');

  if (codeError || !roomCode) {
    throw new Error(`Failed to generate room code: ${codeError?.message}`);
  }

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name: roomName,
      point_scale: pointScale,
      room_code: roomCode,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test room: ${error?.message}`);
  }

  return data;
}

/**
 * Create a test participant for a room
 */
export async function createTestParticipant(
  roomId: string,
  userId: string | null = null,
  name?: string,
  isLeader: boolean = false
): Promise<Tables<'participants'>> {
  const participantName = name || generateTestName();

  const { data, error } = await supabase
    .from('participants')
    .insert({
      room_id: roomId,
      user_id: userId,
      name: participantName,
      is_leader: isLeader,
      is_active: true,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test participant: ${error?.message}`);
  }

  // If this is the leader, update the room's leader_id
  if (isLeader) {
    await supabase
      .from('rooms')
      .update({ leader_id: data.id })
      .eq('id', roomId);
  }

  return data;
}

/**
 * Create a test story for a room
 */
export async function createTestStory(
  roomId: string,
  title?: string,
  description?: string,
  isActive: boolean = false
): Promise<Tables<'stories'>> {
  const storyTitle = title || `Test Story ${Date.now()}`;

  const { data, error } = await supabase
    .from('stories')
    .insert({
      room_id: roomId,
      title: storyTitle,
      description: description || null,
      is_active: isActive,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test story: ${error?.message}`);
  }

  return data;
}

/**
 * Create a test vote for a story
 */
export async function createTestVote(
  storyId: string,
  participantId: string,
  pointValue: string,
  sentiment?: string,
  isRevealed: boolean = false
): Promise<Tables<'votes'>> {
  const { data, error } = await supabase
    .from('votes')
    .insert({
      story_id: storyId,
      participant_id: participantId,
      point_value: pointValue,
      sentiment: sentiment || null,
      is_revealed: isRevealed,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test vote: ${error?.message}`);
  }

  return data;
}

/**
 * Wait for a specified amount of time (for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function until it succeeds or max attempts are reached
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 5,
  delayMs: number = 500
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts) {
        await wait(delayMs);
      }
    }
  }

  throw new Error(`Failed after ${maxAttempts} attempts: ${lastError?.message}`);
}
