-- RLS Policies Test Suite
-- This file contains SQL tests to verify Row Level Security policies
-- Run these tests manually against the dev database to verify policy behavior

-- =====================================================
-- TEST SETUP
-- =====================================================
-- Note: These tests assume you have authenticated users to test with
-- You can create test users via the Supabase Auth dashboard or API

-- Test User 1 ID (replace with actual auth.users.id)
-- Example: '00000000-0000-0000-0000-000000000001'

-- Test User 2 ID (replace with actual auth.users.id)
-- Example: '00000000-0000-0000-0000-000000000002'

-- =====================================================
-- TEST 1: Profiles RLS - Users can only read their own profile
-- =====================================================
-- Setup: Create two profiles
-- Expected: User 1 can only see their own profile

-- As User 1: Should see 1 row (their own profile)
-- SET LOCAL role TO authenticated;
-- SET LOCAL request.jwt.claims TO '{"sub": "user-1-uuid"}';
-- SELECT COUNT(*) FROM profiles WHERE user_id = 'user-1-uuid';
-- Expected: 1

-- As User 1: Should see 0 rows (cannot see user 2's profile)
-- SELECT COUNT(*) FROM profiles WHERE user_id = 'user-2-uuid';
-- Expected: 0

-- =====================================================
-- TEST 2: Rooms RLS - Users can only read rooms they've joined
-- =====================================================
-- Setup: Create room, add User 1 as participant
-- Expected: User 1 can read the room, User 2 cannot

-- Check if User 1 can see rooms they're in
-- SELECT COUNT(*) FROM rooms WHERE id IN (
--   SELECT room_id FROM participants WHERE user_id = 'user-1-uuid'
-- );
-- Expected: Count of rooms User 1 has joined

-- User 2 trying to read User 1's room (should fail)
-- SET LOCAL request.jwt.claims TO '{"sub": "user-2-uuid"}';
-- SELECT COUNT(*) FROM rooms WHERE id = 'room-1-uuid';
-- Expected: 0 (no access without being a participant)

-- =====================================================
-- TEST 3: Rooms RLS - Only leader can update room
-- =====================================================
-- Setup: User 1 is leader, User 2 is regular participant
-- Expected: User 1 can update, User 2 cannot

-- As User 1 (leader): Should succeed
-- UPDATE rooms SET name = 'Updated Name' WHERE id = 'room-1-uuid';
-- Expected: 1 row updated

-- As User 2 (not leader): Should fail
-- SET LOCAL request.jwt.claims TO '{"sub": "user-2-uuid"}';
-- UPDATE rooms SET name = 'Hacked Name' WHERE id = 'room-1-uuid';
-- Expected: 0 rows updated (policy blocks it)

-- =====================================================
-- TEST 4: Participants RLS - Users can read all participants in their rooms
-- =====================================================
-- Setup: Room with 3 participants (User 1, User 2, User 3)
-- Expected: User 1 can see all 3 participants

-- As User 1: Should see all participants in their room
-- SELECT COUNT(*) FROM participants WHERE room_id = 'room-1-uuid';
-- Expected: 3

-- =====================================================
-- TEST 5: Participants RLS - Users can only update their own record
-- =====================================================
-- As User 1: Should succeed updating own record
-- UPDATE participants SET name = 'New Name' WHERE user_id = 'user-1-uuid';
-- Expected: 1 row updated

-- As User 1: Should fail updating User 2's record
-- UPDATE participants SET name = 'Hacked' WHERE user_id = 'user-2-uuid';
-- Expected: 0 rows updated (policy blocks it)

-- =====================================================
-- TEST 6: Stories RLS - Only participants can read stories
-- =====================================================
-- Setup: Room 1 has stories, User 1 is participant, User 3 is not
-- Expected: User 1 can read, User 3 cannot

-- As User 1 (participant): Should see stories
-- SELECT COUNT(*) FROM stories WHERE room_id = 'room-1-uuid';
-- Expected: Count of stories in room

-- As User 3 (not participant): Should see nothing
-- SET LOCAL request.jwt.claims TO '{"sub": "user-3-uuid"}';
-- SELECT COUNT(*) FROM stories WHERE room_id = 'room-1-uuid';
-- Expected: 0

-- =====================================================
-- TEST 7: Stories RLS - Only leader can create stories
-- =====================================================
-- As User 1 (leader): Should succeed
-- INSERT INTO stories (room_id, title, description) VALUES ('room-1-uuid', 'Test Story', 'Description');
-- Expected: 1 row inserted

-- As User 2 (not leader): Should fail
-- SET LOCAL request.jwt.claims TO '{"sub": "user-2-uuid"}';
-- INSERT INTO stories (room_id, title, description) VALUES ('room-1-uuid', 'Hacked Story', 'Fail');
-- Expected: Error (policy violation)

-- =====================================================
-- TEST 8: Votes RLS - Users cannot see unrevealed votes from others
-- =====================================================
-- Setup: Story with 3 votes, all unrevealed
-- Expected: Each user can only see their own vote

-- As User 1: Should see only their own vote (is_revealed = false)
-- SELECT COUNT(*) FROM votes WHERE story_id = 'story-1-uuid';
-- Expected: 1 (only their own vote)

-- =====================================================
-- TEST 9: Votes RLS - Users can see all revealed votes
-- =====================================================
-- Setup: Leader reveals all votes (sets is_revealed = true)
-- Expected: All participants can now see all votes

-- As Leader: Reveal all votes
-- UPDATE votes SET is_revealed = true WHERE story_id = 'story-1-uuid';
-- Expected: All votes updated

-- As User 1: Should now see all 3 votes
-- SELECT COUNT(*) FROM votes WHERE story_id = 'story-1-uuid' AND is_revealed = true;
-- Expected: 3

-- =====================================================
-- TEST 10: Votes RLS - Only leader can reveal votes
-- =====================================================
-- Setup: User 2 is not leader
-- Expected: User 2 cannot reveal votes

-- As User 2 (not leader): Should fail
-- SET LOCAL request.jwt.claims TO '{"sub": "user-2-uuid"}';
-- UPDATE votes SET is_revealed = true WHERE story_id = 'story-2-uuid';
-- Expected: 0 rows updated (policy blocks non-leader)

-- As User 1 (leader): Should succeed
-- SET LOCAL request.jwt.claims TO '{"sub": "user-1-uuid"}';
-- UPDATE votes SET is_revealed = true WHERE story_id = 'story-2-uuid';
-- Expected: All votes updated

-- =====================================================
-- TEST 11: Votes RLS - Users can update their own unrevealed votes
-- =====================================================
-- As User 1: Should succeed updating own unrevealed vote
-- UPDATE votes SET point_value = '5'
-- WHERE story_id = 'story-1-uuid'
--   AND participant_id IN (SELECT id FROM participants WHERE user_id = 'user-1-uuid')
--   AND is_revealed = false;
-- Expected: 1 row updated

-- As User 1: Should fail updating already revealed vote
-- UPDATE votes SET point_value = '8'
-- WHERE story_id = 'story-1-uuid'
--   AND is_revealed = true;
-- Expected: 0 rows updated (policy blocks updating revealed votes)

-- =====================================================
-- TEST 12: Votes RLS - Users can only delete their own unrevealed votes
-- =====================================================
-- As User 1: Should succeed deleting own unrevealed vote
-- DELETE FROM votes
-- WHERE story_id = 'story-3-uuid'
--   AND participant_id IN (SELECT id FROM participants WHERE user_id = 'user-1-uuid')
--   AND is_revealed = false;
-- Expected: 1 row deleted

-- As User 1: Should fail deleting revealed vote
-- DELETE FROM votes WHERE story_id = 'story-1-uuid' AND is_revealed = true;
-- Expected: 0 rows deleted (policy blocks it)

-- =====================================================
-- TEST 13: Anonymous Users - Can create rooms and join
-- =====================================================
-- As Anonymous (no auth): Should succeed creating room
-- SET LOCAL role TO anon;
-- RESET request.jwt.claims;
-- INSERT INTO rooms (name, point_scale) VALUES ('Anonymous Room', 'fibonacci');
-- Expected: 1 row inserted

-- As Anonymous: Should succeed joining room
-- INSERT INTO participants (room_id, user_id, name) VALUES ('room-uuid', NULL, 'Anonymous User');
-- Expected: 1 row inserted

-- =====================================================
-- MANUAL TESTING PROCEDURE
-- =====================================================
-- 1. Create test users via Supabase Auth:
--    - Go to Authentication > Users in dashboard
--    - Create 3 test users with email addresses
--    - Note their user IDs
--
-- 2. Replace placeholder UUIDs in tests with actual values
--
-- 3. Use Supabase SQL Editor to run tests:
--    - Go to SQL Editor in dashboard
--    - Run each test section individually
--    - Verify results match expectations
--
-- 4. Test with actual authentication:
--    - Use the test-auth.html file to authenticate
--    - Use browser dev tools to run queries with real JWT
--    - Verify policies work with actual auth context

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'rooms', 'participants', 'stories', 'votes');
-- Expected: All tables should have rowsecurity = true

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Expected: Should see all 18 policies (3 profiles, 3 rooms, 4 participants, 3 stories, 5 votes)

-- Count policies per table
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
-- Expected:
-- participants: 4 policies
-- profiles: 3 policies
-- rooms: 3 policies
-- stories: 3 policies
-- votes: 5 policies
