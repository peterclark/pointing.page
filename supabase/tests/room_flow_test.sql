-- Voting state machine and input limits.
--
-- Covers migration 20261022170000_room_flow_state.sql. Runs in one transaction
-- and rolls back; run it the same way as leadership_test.sql. Success prints
-- "room flow tests passed".

BEGIN;

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');

CREATE TEMP TABLE flow_ctx (room_id UUID, story_id UUID, a_id UUID, b_id UUID);
GRANT ALL ON flow_ctx TO authenticated;

CREATE FUNCTION pg_temp.expect_error(label TEXT, stmt TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RAISE EXCEPTION 'FAIL: % was allowed', label;
EXCEPTION
  WHEN insufficient_privilege OR check_violation THEN
    NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION pg_temp.expect_error(TEXT, TEXT) TO authenticated;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

INSERT INTO flow_ctx (room_id)
SELECT id FROM create_room('Sprint', 'fibonacci', 'Ada');
UPDATE flow_ctx SET a_id = (SELECT id FROM participants WHERE user_id = auth.uid());

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
UPDATE flow_ctx SET b_id = (join_room((SELECT room_id FROM flow_ctx), 'Bob')).id;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

DO $$
DECLARE c flow_ctx; first_story UUID; second_story UUID; s stories;
BEGIN
  SELECT * INTO c FROM flow_ctx;

  -- An empty story can be revealed.
  INSERT INTO stories (room_id, title) VALUES (c.room_id, 'Empty') RETURNING id INTO first_story;
  PERFORM set_active_story(first_story);
  PERFORM reveal_votes(first_story);
  SELECT * INTO s FROM stories WHERE id = first_story;
  ASSERT s.revealed_at IS NOT NULL, 'a story with no votes can be revealed';
  ASSERT s.final_average IS NULL, 'no numeric votes means no average';

  -- Switching stories leaves exactly one active.
  INSERT INTO stories (room_id, title) VALUES (c.room_id, 'Login') RETURNING id INTO second_story;
  PERFORM set_active_story(second_story);
  ASSERT (SELECT count(*) FROM stories WHERE room_id = c.room_id AND is_active) = 1,
    'one active story after switching';
  ASSERT (SELECT is_active FROM stories WHERE id = second_story), 'target is active';
  UPDATE flow_ctx SET story_id = second_story;

  INSERT INTO votes (story_id, participant_id, point_value) VALUES (second_story, c.a_id, '3');
  PERFORM pg_temp.expect_error('a T-shirt size in a Fibonacci room',
    format('UPDATE votes SET point_value = %L WHERE participant_id = %L', 'XL', c.a_id));
END $$;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

DO $$
DECLARE c flow_ctx;
BEGIN
  SELECT * INTO c FROM flow_ctx;
  INSERT INTO votes (story_id, participant_id, point_value) VALUES (c.story_id, c.b_id, '8');
  INSERT INTO votes (story_id, participant_id, point_value) VALUES (c.story_id, c.b_id, '?')
    ON CONFLICT (story_id, participant_id) DO UPDATE SET point_value = EXCLUDED.point_value;
  UPDATE votes SET point_value = '8' WHERE participant_id = c.b_id;

  PERFORM pg_temp.expect_error('set_active_story by a non-leader',
    format('SELECT set_active_story(%L)', c.story_id));
  PERFORM pg_temp.expect_error('revote_story by a non-leader',
    format('SELECT revote_story(%L)', c.story_id));
  PERFORM pg_temp.expect_error('a 51-character name',
    format('UPDATE participants SET name = %L WHERE id = %L', repeat('x', 51), c.b_id));
END $$;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

DO $$
DECLARE c flow_ctx; s stories; fresh stories;
BEGIN
  SELECT * INTO c FROM flow_ctx;
  PERFORM reveal_votes(c.story_id);
  SELECT * INTO s FROM stories WHERE id = c.story_id;
  ASSERT s.final_average = 5.5, format('average of 3 and 8 is 5.5, got %s', s.final_average);

  PERFORM pg_temp.expect_error('changing a vote after reveal',
    format('UPDATE votes SET point_value = %L WHERE participant_id = %L', '13', c.a_id));

  PERFORM pg_temp.expect_error('a 101-character title',
    format('INSERT INTO stories (room_id, title) VALUES (%L, %L)', c.room_id, repeat('x', 101)));

  fresh := revote_story(c.story_id);
  ASSERT fresh.id <> c.story_id AND fresh.title = 'Login', 'revote copies the story';
  ASSERT fresh.is_active AND fresh.revealed_at IS NULL, 'the new round is open and active';
  ASSERT NOT (SELECT is_active FROM stories WHERE id = c.story_id), 'the old round is inactive';
  ASSERT (SELECT final_average FROM stories WHERE id = c.story_id) = 5.5,
    'the old round keeps its result';
  INSERT INTO votes (story_id, participant_id, point_value) VALUES (fresh.id, c.a_id, '5');
END $$;

RESET ROLE;
\echo 'room flow tests passed'
ROLLBACK;
