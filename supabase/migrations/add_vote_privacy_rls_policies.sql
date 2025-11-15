-- ============================================================================
-- Vote Privacy RLS Policies
-- ============================================================================
--
-- This migration adds Row Level Security policies to enforce vote privacy
-- using Supabase Anonymous Auth. Votes are hidden until revealed by the leader.
--
-- Prerequisites:
-- - Anonymous auth must be enabled in Supabase Dashboard
-- - Users must be authenticated (even anonymously) to access votes
--
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================================

-- Enable RLS on votes table (if not already enabled)
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (allows re-running this migration)
DROP POLICY IF EXISTS "Users can see their own votes" ON votes;
DROP POLICY IF EXISTS "Users can see revealed votes" ON votes;
DROP POLICY IF EXISTS "Users can insert their own votes" ON votes;
DROP POLICY IF EXISTS "Users can update their own unrevealed votes" ON votes;
DROP POLICY IF EXISTS "Leaders can reveal votes" ON votes;
DROP POLICY IF EXISTS "Users can delete their own unrevealed votes" ON votes;

-- ============================================================================
-- SELECT Policies (Read Access)
-- ============================================================================

-- Policy 1: Users can always see their own votes (revealed or not)
CREATE POLICY "Users can see their own votes" ON votes
  FOR SELECT
  USING (
    participant_id IN (
      SELECT id FROM participants
      WHERE user_id = auth.uid()
    )
  );

-- Policy 2: Users can see revealed votes from other participants
CREATE POLICY "Users can see revealed votes" ON votes
  FOR SELECT
  USING (is_revealed = true);

-- ============================================================================
-- INSERT Policies (Create Access)
-- ============================================================================

-- Policy 3: Users can insert votes for their own participant records
CREATE POLICY "Users can insert their own votes" ON votes
  FOR INSERT
  WITH CHECK (
    participant_id IN (
      SELECT id FROM participants
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- UPDATE Policies (Modify Access)
-- ============================================================================

-- Policy 4: Users can update their own unrevealed votes (change vote before reveal)
CREATE POLICY "Users can update their own unrevealed votes" ON votes
  FOR UPDATE
  USING (
    is_revealed = false
    AND participant_id IN (
      SELECT id FROM participants
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    is_revealed = false
    AND participant_id IN (
      SELECT id FROM participants
      WHERE user_id = auth.uid()
    )
  );

-- Policy 5: Leaders can reveal votes (set is_revealed = true)
CREATE POLICY "Leaders can reveal votes" ON votes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      JOIN stories s ON s.id = votes.story_id
      WHERE p.user_id = auth.uid()
        AND p.room_id = s.room_id
        AND p.is_leader = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants p
      JOIN stories s ON s.id = votes.story_id
      WHERE p.user_id = auth.uid()
        AND p.room_id = s.room_id
        AND p.is_leader = true
    )
  );

-- ============================================================================
-- DELETE Policies (Remove Access)
-- ============================================================================

-- Policy 6: Users can delete their own unrevealed votes (optional - allows vote retraction)
CREATE POLICY "Users can delete their own unrevealed votes" ON votes
  FOR DELETE
  USING (
    is_revealed = false
    AND participant_id IN (
      SELECT id FROM participants
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- Verification Queries
-- ============================================================================
--
-- Run these queries to verify policies are working:
--
-- 1. Check enabled policies:
-- SELECT tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'votes';
--
-- 2. Test as a user (replace with actual user_id):
-- SET request.jwt.claims = '{"sub": "user-uuid-here"}';
-- SELECT * FROM votes;
--
-- ============================================================================

-- Add helpful comment
COMMENT ON TABLE votes IS 'Vote records with RLS policies enforcing vote privacy until reveal';
