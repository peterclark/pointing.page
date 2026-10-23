-- Admin-only metrics.
--
-- Covers migration 20261023150000_admin_metrics.sql. Runs in one transaction
-- and rolls back; run it the same way as leadership_test.sql. Success prints
-- "admin metrics tests passed".

BEGIN;

-- A signed-in admin, two guests, and a signed-in user who is not an admin.
INSERT INTO auth.users (id, is_anonymous) VALUES
  ('00000000-0000-0000-0000-0000000000ad', false),
  ('00000000-0000-0000-0000-00000000000a', true),
  ('00000000-0000-0000-0000-00000000000b', true),
  ('00000000-0000-0000-0000-00000000000c', false);
INSERT INTO admins (user_id) VALUES ('00000000-0000-0000-0000-0000000000ad');

CREATE TEMP TABLE metrics_ctx (room_id UUID, story_id UUID, a_id UUID, b_id UUID);
GRANT ALL ON metrics_ctx TO authenticated;

SET LOCAL ROLE authenticated;

-- Guest A leads a two-person Fibonacci room and points one story; guest B also
-- opens a solo T-shirt room, so B has joined two rooms.
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
INSERT INTO metrics_ctx (room_id) SELECT id FROM create_room('Sprint', 'fibonacci', 'Ada');
UPDATE metrics_ctx SET a_id = (SELECT id FROM participants WHERE user_id = auth.uid());

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
UPDATE metrics_ctx SET b_id = (join_room((SELECT room_id FROM metrics_ctx), 'Bob')).id;
DO $$ BEGIN PERFORM create_room('Solo', 't-shirt', 'Bob'); END $$;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
DO $$
DECLARE c metrics_ctx; story UUID;
BEGIN
  SELECT * INTO c FROM metrics_ctx;
  INSERT INTO stories (room_id, title) VALUES (c.room_id, 'Login') RETURNING id INTO story;
  PERFORM set_active_story(story);
  INSERT INTO votes (story_id, participant_id, point_value) VALUES (story, c.a_id, '3');
  UPDATE metrics_ctx SET story_id = story;
END $$;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
INSERT INTO votes (story_id, participant_id, point_value)
SELECT story_id, b_id, '5' FROM metrics_ctx;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
DO $$ BEGIN PERFORM reveal_votes((SELECT story_id FROM metrics_ctx)); END $$;

-- Nobody but an admin gets in.
DO $$
BEGIN
  ASSERT NOT is_admin(), 'a guest is not an admin';
  BEGIN
    PERFORM admin_metrics();
    RAISE EXCEPTION 'FAIL: a guest read the metrics';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
DO $$
BEGIN
  ASSERT NOT is_admin(), 'a signed-in user is not an admin by default';
  BEGIN
    PERFORM admin_metrics();
    RAISE EXCEPTION 'FAIL: a signed-in non-admin read the metrics';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM admins;
    RAISE EXCEPTION 'FAIL: a client read the admins table';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000ad';
DO $$
DECLARE m JSONB;
BEGIN
  ASSERT is_admin(), 'the admin is an admin';
  m := admin_metrics(7);

  ASSERT (m #>> '{users,anonymous}')::int = 2, 'two guests';
  ASSERT (m #>> '{users,registered}')::int = 2, 'two signed-in users';
  ASSERT (m #>> '{users,returning}')::int = 1, 'one person joined two rooms';

  ASSERT (m #>> '{rooms,total}')::int = 2, 'two rooms';
  ASSERT (m #>> '{rooms,avg_people}')::numeric = 1.5, 'three seats over two rooms';
  ASSERT (m #>> '{rooms,solo}')::int = 1, 'one solo room';
  ASSERT (m #>> '{rooms,pointed}')::int = 1, 'one room revealed a story';
  ASSERT (m #>> '{rooms,active_24h}')::int = 2, 'both rooms active today';
  ASSERT (m #>> '{rooms,t_shirt}')::int = 1, 'one T-shirt room';

  ASSERT (m #>> '{stories,revealed}')::int = 1, 'one revealed story';
  ASSERT (m #>> '{stories,votes}')::int = 2, 'two votes';
  ASSERT (m #>> '{stories,avg_votes}')::numeric = 2, 'two votes per revealed story';

  ASSERT jsonb_array_length(m -> 'daily') = 7, 'one entry per day in the window';
  ASSERT (m -> 'daily' -> 6 ->> 'rooms')::int = 2, 'today has both rooms';
  ASSERT jsonb_array_length(m -> 'hours') = 24, 'one entry per hour';
  ASSERT (SELECT sum((h ->> 'events')::int) FROM jsonb_array_elements(m -> 'hours') h) = 6,
    'three joins, one story and two votes';
END $$;

\echo 'admin metrics tests passed'

ROLLBACK;
