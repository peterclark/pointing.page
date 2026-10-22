-- Advisor cleanup and anonymous-user purge.
--
-- Covers migration 20261022180000_advisor_cleanup.sql. Runs in one transaction
-- and rolls back; run it the same way as leadership_test.sql. Success prints
-- "advisor cleanup tests passed".

BEGIN;

-- Three anonymous users: old and idle, old but active last week, and new.
INSERT INTO auth.users (id, created_at) VALUES
  ('00000000-0000-0000-0000-0000000000a1', now() - INTERVAL '200 days'),
  ('00000000-0000-0000-0000-0000000000a2', now() - INTERVAL '200 days'),
  ('00000000-0000-0000-0000-0000000000a3', now() - INTERVAL '1 day');
INSERT INTO auth.sessions (user_id, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-0000000000a1', now() - INTERVAL '200 days', now() - INTERVAL '150 days'),
  ('00000000-0000-0000-0000-0000000000a2', now() - INTERVAL '200 days', now() - INTERVAL '7 days');
-- And a signed-in user, also old and idle, who must never be purged.
INSERT INTO auth.users (id, created_at, is_anonymous) VALUES
  ('00000000-0000-0000-0000-0000000000b1', now() - INTERVAL '400 days', false);

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
DO $$ BEGIN PERFORM create_room('Old room', 'fibonacci', 'Idle'); END $$;

DO $$
BEGIN
  BEGIN
    PERFORM purge_stale_anonymous_users();
    RAISE EXCEPTION 'FAIL: a client could call purge_stale_anonymous_users';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM sync_vote_receipt();
    RAISE EXCEPTION 'FAIL: a client could call a trigger function';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE rooms SET name = 'Still leader' WHERE name = 'Old room';
  ASSERT (SELECT name FROM rooms) = 'Still leader', 'leader can still rename the room';
END $$;

RESET ROLE;

DO $$
BEGIN
  ASSERT purge_stale_anonymous_users() = 1, 'only the idle anonymous user is purged';
  ASSERT NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-0000000000a1'),
    'idle anonymous user is gone';
  ASSERT (SELECT count(*) FROM auth.users) = 3, 'active, new and signed-in users remain';
  ASSERT NOT EXISTS (SELECT 1 FROM participants WHERE name = 'Idle'),
    'their participant rows go with them';
END $$;

\echo 'advisor cleanup tests passed'
ROLLBACK;
