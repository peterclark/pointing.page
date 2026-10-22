-- Leadership is assigned by the database, never written by a client.
--
-- Covers migration 20261022150000_server_assigned_leadership.sql. Runs in one
-- transaction and rolls back, so it is safe against a local stack:
--
--   psql "$(npx supabase status -o env | grep DB_URL | cut -d= -f2- | tr -d '"')" \
--     -v ON_ERROR_STOP=1 -f supabase/tests/leadership_test.sql
--
-- Any failed assertion aborts with an error naming the case. Success prints
-- "leadership tests passed".

BEGIN;

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b'),
  ('00000000-0000-0000-0000-00000000000c');

-- Room state shared between steps, readable after SET ROLE.
CREATE TEMP TABLE leadership_ctx (room_id UUID);
GRANT ALL ON leadership_ctx TO authenticated;

-- Runs `stmt` and fails the test unless it raises.
CREATE FUNCTION pg_temp.expect_denied(label TEXT, stmt TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RAISE EXCEPTION 'FAIL: % was allowed', label;
EXCEPTION
  WHEN insufficient_privilege OR invalid_parameter_value OR no_data_found THEN
    NULL;
END;
$$;
GRANT EXECUTE ON FUNCTION pg_temp.expect_denied(TEXT, TEXT) TO authenticated, anon;

SET LOCAL ROLE authenticated;

-- A creates a room and leads it ---------------------------------------------
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

INSERT INTO leadership_ctx
SELECT id FROM create_room('  Sprint 42 ', 't-shirt', ' Ada ');

DO $$
DECLARE r rooms; p participants;
BEGIN
  SELECT * INTO r FROM rooms WHERE id = (SELECT room_id FROM leadership_ctx);
  SELECT * INTO p FROM participants WHERE room_id = r.id;
  ASSERT r.name = 'Sprint 42', 'create_room trims the room name';
  ASSERT r.point_scale = 't-shirt', 'create_room keeps the scale';
  ASSERT p.name = 'Ada' AND p.is_leader, 'creator is leader';
  ASSERT r.leader_id = p.id, 'rooms.leader_id points at the creator';
END $$;

-- B joins and cannot make themselves leader ---------------------------------
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

DO $$
DECLARE p participants;
BEGIN
  p := join_room((SELECT room_id FROM leadership_ctx), 'Bob');
  ASSERT NOT p.is_leader, 'second joiner is not leader';

  PERFORM pg_temp.expect_denied('direct participant insert',
    format('INSERT INTO participants (room_id, user_id, name, is_leader)
            VALUES (%L, auth.uid(), %L, true)', p.room_id, 'x'));
  PERFORM pg_temp.expect_denied('self-promotion',
    'UPDATE participants SET is_leader = true WHERE user_id = auth.uid()');
  PERFORM pg_temp.expect_denied('moving a row to another room',
    'UPDATE participants SET room_id = room_id WHERE user_id = auth.uid()');
  PERFORM pg_temp.expect_denied('direct room insert',
    $q$INSERT INTO rooms (name, point_scale) VALUES ('x', 'fibonacci')$q$);
  PERFORM pg_temp.expect_denied('calling promote_new_leader',
    format('SELECT promote_new_leader(%L)', p.room_id));
  ASSERT NOT is_room_leader(p.room_id), 'B is still not leader';

  UPDATE participants SET name = 'Bobby' WHERE id = p.id;
  ASSERT (SELECT name FROM participants WHERE id = p.id) = 'Bobby',
    'a participant can still rename themselves';

  p := join_room(p.room_id, 'Bob');
  ASSERT NOT p.is_leader, 'rejoining does not promote while a leader exists';

  PERFORM pg_temp.expect_denied('blank name',
    format('SELECT join_room(%L, %L)', p.room_id, '   '));
  PERFORM pg_temp.expect_denied('51-character name',
    format('SELECT join_room(%L, %L)', p.room_id, repeat('x', 51)));
  PERFORM pg_temp.expect_denied('unknown room',
    format('SELECT join_room(%L, %L)', gen_random_uuid(), 'x'));
END $$;

-- The leader keeps settings rights but cannot repoint leader_id ------------
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';

DO $$
DECLARE room UUID := (SELECT room_id FROM leadership_ctx);
BEGIN
  UPDATE rooms SET name = 'Renamed' WHERE id = room;
  ASSERT (SELECT name FROM rooms WHERE id = room) = 'Renamed',
    'leader can rename the room';
  PERFORM pg_temp.expect_denied('writing rooms.leader_id',
    format('UPDATE rooms SET leader_id = NULL WHERE id = %L', room));
  ASSERT (join_room(room, 'Ada')).is_leader, 'leader stays leader on rejoin';

  -- Leaving hands leadership to B, which used to fail silently under RLS.
  UPDATE participants SET is_active = false
  WHERE room_id = room AND user_id = auth.uid();
  ASSERT NOT is_room_leader(room), 'departing leader is demoted';
  ASSERT NOT (join_room(room, 'Ada')).is_leader,
    'returning ex-leader does not displace the new leader';
END $$;

SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';

DO $$
BEGIN
  ASSERT is_room_leader((SELECT room_id FROM leadership_ctx)),
    'B was promoted when A left';
END $$;

-- A room led only by a pre-auth (NULL user) row is taken over on join -------
RESET ROLE;
INSERT INTO rooms (id, name, room_code)
VALUES ('11111111-1111-1111-1111-111111111111', 'Legacy', 'LEGACY01');
INSERT INTO participants (room_id, user_id, name, is_leader)
VALUES ('11111111-1111-1111-1111-111111111111', NULL, 'Old', true);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';

DO $$
DECLARE room UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  ASSERT (join_room(room, 'Cy')).is_leader, 'joiner takes over a legacy room';
  ASSERT (SELECT count(*) FROM participants WHERE room_id = room AND is_leader) = 1,
    'the stale legacy leader is retired';
END $$;

-- No session, no rooms -------------------------------------------------------
RESET request.jwt.claim.sub;

DO $$
BEGIN
  PERFORM pg_temp.expect_denied('create_room without a session',
    $q$SELECT create_room('r', 'fibonacci', 'n')$q$);
END $$;

SET LOCAL ROLE anon;

DO $$
BEGIN
  PERFORM pg_temp.expect_denied('create_room as anon',
    $q$SELECT create_room('r', 'fibonacci', 'n')$q$);
  PERFORM pg_temp.expect_denied('join_room as anon',
    $q$SELECT join_room('11111111-1111-1111-1111-111111111111', 'n')$q$);
END $$;

RESET ROLE;
\echo 'leadership tests passed'
ROLLBACK;
