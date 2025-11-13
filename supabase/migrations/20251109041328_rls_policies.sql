-- Migration: Row Level Security (RLS) Policies
-- Description: Enable RLS on all tables and create comprehensive access control policies
-- This migration implements security policies for profiles, rooms, participants, stories, and votes tables
-- Policy design supports both authenticated and anonymous users where appropriate

-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PROFILES TABLE POLICIES
-- =====================================================
-- Users can only read, update, and delete their own profile
-- INSERT is handled by trigger (on_auth_user_created)

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS profiles_delete ON profiles;

-- SELECT: Users can read their own profile only
CREATE POLICY profiles_select ON profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- UPDATE: Users can update only their own profile
CREATE POLICY profiles_update ON profiles
  FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE: Users can delete only their own profile
CREATE POLICY profiles_delete ON profiles
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- ROOMS TABLE POLICIES
-- =====================================================
-- Rooms can be created by anyone (anonymous flow)
-- Only participants in a room can read it
-- Only the room leader can update room settings

DROP POLICY IF EXISTS rooms_select ON rooms;
DROP POLICY IF EXISTS rooms_insert ON rooms;
DROP POLICY IF EXISTS rooms_update ON rooms;

-- SELECT: Users can read rooms where they have an active participant record
-- Note: This checks for ANY participant record (not just active) to allow viewing room history
CREATE POLICY rooms_select ON rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = rooms.id
        AND participants.user_id = auth.uid()
    )
  );

-- INSERT: Anyone can create rooms (supports anonymous room creation)
CREATE POLICY rooms_insert ON rooms
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Only room leader can update room settings
CREATE POLICY rooms_update ON rooms
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = rooms.id
        AND participants.user_id = auth.uid()
        AND participants.is_leader = true
    )
  );

-- DELETE: No policy - rooms persist indefinitely for MVP
-- (Can be added later if room deletion feature is needed)

-- =====================================================
-- PARTICIPANTS TABLE POLICIES
-- =====================================================
-- Anyone can insert (for joining rooms)
-- Users can read all participants in rooms they've joined
-- Users can only update/delete their own participant record

DROP POLICY IF EXISTS participants_select ON participants;
DROP POLICY IF EXISTS participants_insert ON participants;
DROP POLICY IF EXISTS participants_update ON participants;
DROP POLICY IF EXISTS participants_delete ON participants;

-- SELECT: Users can read all participants in rooms they've joined
-- This allows viewing the full participant list for any room you're in
CREATE POLICY participants_select ON participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants AS p
      WHERE p.room_id = participants.room_id
        AND p.user_id = auth.uid()
    )
  );

-- INSERT: Anyone can insert participant records (for joining rooms)
-- This supports the anonymous joining flow
CREATE POLICY participants_insert ON participants
  FOR INSERT
  WITH CHECK (true);

-- UPDATE: Users can update only their own participant record
-- This allows updating name, is_active status, etc.
CREATE POLICY participants_update ON participants
  FOR UPDATE
  USING (user_id = auth.uid());

-- DELETE: Users can delete only their own participant record (for leaving rooms)
CREATE POLICY participants_delete ON participants
  FOR DELETE
  USING (user_id = auth.uid());

-- =====================================================
-- STORIES TABLE POLICIES
-- =====================================================
-- Only room participants can read stories
-- Only room leader can create, update stories
-- No delete policy (stories persist for session history)

DROP POLICY IF EXISTS stories_select ON stories;
DROP POLICY IF EXISTS stories_insert ON stories;
DROP POLICY IF EXISTS stories_update ON stories;

-- SELECT: Users can read stories in rooms they've joined
CREATE POLICY stories_select ON stories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = stories.room_id
        AND participants.user_id = auth.uid()
    )
  );

-- INSERT: Only room leader can create stories
CREATE POLICY stories_insert ON stories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = stories.room_id
        AND participants.user_id = auth.uid()
        AND participants.is_leader = true
    )
  );

-- UPDATE: Only room leader can update stories (title, description, is_active, final_average)
CREATE POLICY stories_update ON stories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = stories.room_id
        AND participants.user_id = auth.uid()
        AND participants.is_leader = true
    )
  );

-- DELETE: No policy - stories persist for session history
-- (Can be added later if story deletion feature is needed)

-- =====================================================
-- VOTES TABLE POLICIES
-- =====================================================
-- Critical security: Hide unrevealed votes from other participants
-- Users can read their own votes OR revealed votes in their room
-- Users can insert votes for their own participant_id
-- Users can update their own unrevealed votes
-- Leaders can reveal votes (update is_revealed flag)
-- Users can delete their own unrevealed votes

DROP POLICY IF EXISTS votes_select ON votes;
DROP POLICY IF EXISTS votes_insert ON votes;
DROP POLICY IF EXISTS votes_update_own ON votes;
DROP POLICY IF EXISTS votes_update_reveal ON votes;
DROP POLICY IF EXISTS votes_delete ON votes;

-- SELECT: Users can read their own votes OR revealed votes in their room
-- This is the CRITICAL policy that prevents vote peeking before reveal
CREATE POLICY votes_select ON votes
  FOR SELECT
  USING (
    -- User can read their own vote (revealed or not)
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = votes.participant_id
        AND participants.user_id = auth.uid()
    )
    OR
    -- User can read revealed votes in rooms they've joined
    (
      votes.is_revealed = true
      AND EXISTS (
        SELECT 1 FROM participants p
        JOIN stories s ON s.id = votes.story_id
        WHERE p.room_id = s.room_id
          AND p.user_id = auth.uid()
      )
    )
  );

-- INSERT: Users can insert votes for their own participant_id only
CREATE POLICY votes_insert ON votes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = votes.participant_id
        AND participants.user_id = auth.uid()
    )
  );

-- UPDATE (Own Votes): Users can update their own unrevealed votes
-- This allows changing vote before reveal
CREATE POLICY votes_update_own ON votes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = votes.participant_id
        AND participants.user_id = auth.uid()
    )
    AND votes.is_revealed = false
  );

-- UPDATE (Reveal): Room leader can reveal votes (set is_revealed to true)
-- This is a separate policy to allow leaders to reveal all votes
CREATE POLICY votes_update_reveal ON votes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      JOIN stories s ON s.id = votes.story_id
      WHERE p.room_id = s.room_id
        AND p.user_id = auth.uid()
        AND p.is_leader = true
    )
  );

-- DELETE: Users can delete only their own unrevealed votes
-- Once revealed, votes cannot be deleted (for session history)
CREATE POLICY votes_delete ON votes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = votes.participant_id
        AND participants.user_id = auth.uid()
    )
    AND votes.is_revealed = false
  );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- All tables now have RLS enabled with comprehensive policies
-- Key security features:
-- 1. Vote visibility strictly enforced (hidden until revealed)
-- 2. Leader-only operations (story CRUD, vote reveal)
-- 3. Users can only modify their own records
-- 4. Anonymous users can create rooms and join as participants
-- 5. Profile access restricted to owner only
