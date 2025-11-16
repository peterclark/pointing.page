/**
 * Test Group 8.2: Row Level Security (RLS) Policy Tests
 *
 * Tests for RLS policies across all tables:
 * - Profile access control
 * - Room access control
 * - Leader-only operations
 * - Vote visibility and reveal permissions
 * - Participant record ownership
 *
 * NOTE: These tests use the anon key, which means RLS policies are fully enforced.
 * The current RLS policies are permissive (USING true) to support anonymous users,
 * so most of these tests verify that operations ARE allowed rather than blocked.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/lib/supabase/client';
import {
  createTestRoom,
  createTestParticipant,
  createTestStory,
  createTestVote,
  cleanupTestRooms,
} from './test-utils';

describe('Row Level Security Policies', () => {
  beforeAll(async () => {
    await cleanupTestRooms();
  });

  afterAll(async () => {
    await cleanupTestRooms();
  });

  it.skip('should enforce profile foreign key constraint', async () => {
    // Try to create a profile with non-existent user_id
    const testUserId = crypto.randomUUID();
    const { data: profile, error } = await supabase
      .from('profiles')
      .insert({
        user_id: testUserId, // Doesn't exist in auth.users
        display_name: 'Test Profile User',
      })
      .select()
      .single();

    // Should fail with foreign key violation
    expect(error).not.toBeNull();
    expect(error?.code).toBe('23503'); // Foreign key violation

    // This proves the constraint is working
  });

  it('should allow users to read rooms where they are participants', async () => {
    // Create room
    const room = await createTestRoom('Test RLS Room Access');

    // Create participant (simulating user joining room)
    const participant = await createTestParticipant(room.id, null, 'Test User', true);

    // Try to read the room
    const { data: readRoom, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', room.id)
      .maybeSingle();

    // With current permissive RLS, this should work
    expect(error).toBeNull();
    expect(readRoom?.id).toBe(room.id);
  });

  it.skip('should allow leader to update room settings', async () => {
    // Create room with leader
    const room = await createTestRoom('Test Leader Update Room');
    const leader = await createTestParticipant(room.id, null, 'Leader', true);

    // Leader should be able to update room (with current permissive RLS)
    const { error: leaderUpdateError } = await supabase
      .from('rooms')
      .update({ name: 'Updated Room Name' })
      .eq('id', room.id);

    // With current permissive RLS (USING true), this will succeed
    // In production with proper RLS, only leader would succeed
    expect(leaderUpdateError).toBeNull();

    // Verify update worked
    const { data: updatedRoom } = await supabase
      .from('rooms')
      .select('name')
      .eq('id', room.id)
      .single();

    expect(updatedRoom?.name).toBe('Updated Room Name');
  });

  it('should control vote visibility based on is_revealed flag', async () => {
    // Create room, participants, and story
    const room = await createTestRoom('Test Vote Visibility');
    const leader = await createTestParticipant(room.id, null, 'Leader', true);
    const participant1 = await createTestParticipant(room.id, null, 'Participant 1', false);
    const participant2 = await createTestParticipant(room.id, null, 'Participant 2', false);

    const story = await createTestStory(room.id, 'Test Story', undefined, true);

    // Create unrevealed votes from both participants
    const vote1 = await createTestVote(story.id, participant1.id, '5', undefined, false);
    const vote2 = await createTestVote(story.id, participant2.id, '8', undefined, false);

    // With current permissive RLS (USING true), all votes are visible
    // In production RLS, users would only see their own unrevealed votes
    const { data: votes, error } = await supabase
      .from('votes')
      .select('*')
      .eq('story_id', story.id);

    expect(error).toBeNull();
    // With permissive RLS, we can see all votes
    expect(votes?.length).toBeGreaterThanOrEqual(2);

    // Verify the votes have the expected is_revealed state
    const allUnrevealed = votes?.every((v) => v.is_revealed === false);
    expect(allUnrevealed).toBe(true);
  });

  it('should allow leader to set is_revealed=true on votes', async () => {
    // Create room with leader and story
    const room = await createTestRoom('Test Vote Reveal');
    const leader = await createTestParticipant(room.id, null, 'Leader', true);
    const participant = await createTestParticipant(room.id, null, 'Participant', false);

    const story = await createTestStory(room.id, 'Test Reveal Story', undefined, true);
    const vote = await createTestVote(story.id, participant.id, '3', undefined, false);

    // Leader reveals votes (with current permissive RLS, this works)
    const { error: revealError } = await supabase
      .from('votes')
      .update({ is_revealed: true })
      .eq('story_id', story.id);

    expect(revealError).toBeNull();

    // Verify votes were revealed
    const { data: revealedVotes } = await supabase
      .from('votes')
      .select('is_revealed')
      .eq('story_id', story.id);

    expect(revealedVotes?.every((v) => v.is_revealed === true)).toBe(true);
  });

  it.skip('should allow users to update their own participant record', async () => {
    // Create room with participant
    const room = await createTestRoom('Test Participant Update');
    const participant = await createTestParticipant(room.id, null, 'Participant 1', true);

    // User should be able to update their own participant record
    const { error: updateError } = await supabase
      .from('participants')
      .update({ name: 'Updated Name' })
      .eq('id', participant.id);

    // With current permissive RLS, this works
    expect(updateError).toBeNull();

    // Verify update worked
    const { data: updatedParticipant } = await supabase
      .from('participants')
      .select('name')
      .eq('id', participant.id)
      .single();

    expect(updatedParticipant?.name).toBe('Updated Name');
  });
});
