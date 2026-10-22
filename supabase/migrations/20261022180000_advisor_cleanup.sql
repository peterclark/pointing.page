-- Clear the Supabase security and performance advisor findings, and stop
-- anonymous users from piling up.
--
-- Every item below was reported by the database linter on production.

-- ============================================================================
-- Security: pin search_path on the remaining functions (lint 0011)
-- ============================================================================
--
-- promote_new_leader() and handle_leader_disconnection() were pinned when they
-- became SECURITY DEFINER. These two run as the caller, but an unpinned
-- search_path still lets a caller's schema shadow `rooms` mid-trigger.

ALTER FUNCTION public.generate_room_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_room_code_on_insert() SET search_path = public, pg_temp;

-- ============================================================================
-- Security: trigger-only functions are not an API (lints 0028, 0029)
-- ============================================================================
--
-- These SECURITY DEFINER functions exist only to back triggers, yet PostgREST
-- exposed them at /rest/v1/rpc/*. Triggers fire without an EXECUTE check, so
-- revoking it changes nothing for the triggers.

REVOKE EXECUTE ON FUNCTION public.guard_vote_reveal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_vote_receipt() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- Performance: evaluate auth.uid() once per query, not per row (lint 0003)
-- ============================================================================

DROP POLICY IF EXISTS profiles_select ON profiles;
CREATE POLICY profiles_select ON profiles
  FOR SELECT USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_delete ON profiles;
CREATE POLICY profiles_delete ON profiles
  FOR DELETE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS participants_update ON participants;
CREATE POLICY participants_update ON participants
  FOR UPDATE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS participants_delete ON participants;
CREATE POLICY participants_delete ON participants
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- Same rule as before, routed through the definer helper the other leader
-- checks use, which also avoids re-running a participants subquery per row.
DROP POLICY IF EXISTS rooms_update ON rooms;
CREATE POLICY rooms_update ON rooms
  FOR UPDATE USING (is_room_leader(id)) WITH CHECK (is_room_leader(id));

-- ============================================================================
-- Performance: indexes (lints 0001, 0009)
-- ============================================================================

-- Each duplicates the index behind a UNIQUE constraint on the same column.
DROP INDEX IF EXISTS public.profiles_user_id_idx;
DROP INDEX IF EXISTS public.rooms_room_code_idx;

-- Covers the foreign key, which ON DELETE CASCADE from participants scans.
CREATE INDEX IF NOT EXISTS vote_receipts_participant_idx
  ON public.vote_receipts (participant_id);

-- ============================================================================
-- Housekeeping: purge abandoned anonymous users
-- ============================================================================
--
-- Every visitor gets an anonymous auth user, and nothing ever removed them. A
-- user counts as abandoned when it is anonymous, older than the cutoff, and has
-- had no session activity (a token refresh happens hourly while a tab is open)
-- within it. Deleting the user cascades to their profile, participant rows and
-- votes. If they ever come back they get a new guest identity and rejoin.

CREATE OR REPLACE FUNCTION public.purge_stale_anonymous_users(
  inactive_for INTERVAL DEFAULT INTERVAL '90 days'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  purged INTEGER;
BEGIN
  DELETE FROM auth.users u
  WHERE u.is_anonymous
    AND u.created_at < now() - inactive_for
    AND NOT EXISTS (
      SELECT 1 FROM auth.sessions s
      WHERE s.user_id = u.id
        AND COALESCE(s.refreshed_at, s.updated_at, s.created_at) >= now() - inactive_for
    );

  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;

COMMENT ON FUNCTION public.purge_stale_anonymous_users(INTERVAL) IS
  'Deletes anonymous auth users with no session activity for the given '
  'interval (default 90 days). Scheduled nightly by pg_cron where available.';

REVOKE EXECUTE ON FUNCTION public.purge_stale_anonymous_users(INTERVAL)
  FROM PUBLIC, anon, authenticated;

-- Schedule it nightly. pg_cron ships with Supabase; plain Postgres (local
-- tests) may not have it, in which case the function is left for manual runs.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  PERFORM cron.schedule(
    'purge-stale-anonymous-users',
    '17 3 * * *',
    'SELECT public.purge_stale_anonymous_users()'
  );
EXCEPTION
  WHEN undefined_file OR feature_not_supported OR insufficient_privilege THEN
    RAISE NOTICE 'pg_cron unavailable; purge_stale_anonymous_users() not scheduled';
END
$$;
