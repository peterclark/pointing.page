-- Room data is readable only by members of the room.
--
-- Covers migration 20261022160000_scope_reads_to_room_members.sql. Runs in one
-- transaction and rolls back; run it the same way as leadership_test.sql.
-- Success prints "member read tests passed".

BEGIN;

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');

CREATE TEMP TABLE member_ctx (room_id UUID, room_code TEXT, story_id UUID);
GRANT ALL ON member_ctx TO authenticated, anon;

SET LOCAL ROLE authenticated;

-- A creates a room, a story, votes, and reveals ------------------------------
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

INSERT INTO member_ctx (room_id, room_code)
SELECT id, room_code FROM create_room('Sprint', 'fibonacci', 'Ada');

WITH s AS (
  INSERT INTO stories (room_id, title)
  SELECT room_id, 'Login' FROM member_ctx
  RETURNING id
)
UPDATE member_ctx SET story_id = (SELECT id FROM s);

INSERT INTO votes (story_id, participant_id, point_value)
SELECT c.story_id, p.id, '5'
FROM member_ctx c JOIN participants p ON p.room_id = c.room_id;

DO $$ BEGIN PERFORM reveal_votes(story_id) FROM member_ctx; END $$;

-- B, not a member, sees nothing but can find the room by code ----------------
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

DO $$
DECLARE c member_ctx;
BEGIN
  SELECT * INTO c FROM member_ctx;
  ASSERT (SELECT count(*) FROM rooms) = 0, 'non-member cannot list rooms';
  ASSERT (SELECT count(*) FROM participants) = 0, 'non-member cannot list participants';
  ASSERT (SELECT count(*) FROM stories) = 0, 'non-member cannot list stories';
  ASSERT (SELECT count(*) FROM votes) = 0, 'non-member cannot read revealed votes';
  ASSERT (SELECT count(*) FROM vote_receipts) = 0, 'non-member cannot read receipts';

  ASSERT (SELECT id FROM get_room_by_code(lower(c.room_code))) = c.room_id,
    'get_room_by_code finds the room, case-insensitively';
  ASSERT (SELECT count(*) FROM get_room_by_code('ZZZZZZZZ')) = 0,
    'get_room_by_code returns nothing for an unknown code';

  PERFORM join_room(c.room_id, 'Bob');

  ASSERT (SELECT count(*) FROM rooms) = 1, 'member reads the room';
  ASSERT (SELECT count(*) FROM participants) = 2, 'member reads participants';
  ASSERT (SELECT count(*) FROM stories) = 1, 'member reads stories';
  ASSERT (SELECT count(*) FROM votes) = 1, 'member reads revealed votes';
  ASSERT (SELECT count(*) FROM vote_receipts) = 1, 'member reads receipts';
END $$;

-- The bare anon key reads nothing ------------------------------------------
SET LOCAL ROLE anon;
RESET request.jwt.claim.sub;

DO $$
BEGIN
  ASSERT (SELECT count(*) FROM rooms) = 0, 'anon key cannot list rooms';
  ASSERT (SELECT count(*) FROM participants) = 0, 'anon key cannot list participants';
END $$;

RESET ROLE;
\echo 'member read tests passed'
ROLLBACK;
