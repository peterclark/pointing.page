-- Tighten RLS where it costs nothing, and unblock anonymous authentication.
--
-- BACKGROUND
--
-- Every policy on stories and votes is currently `USING (true)`, because
-- anonymous visitors have no `auth.uid()` and the policies had nothing to key
-- on. Verified behaviour of an unauthenticated caller against the current
-- policy set:
--
--   read an unrevealed vote value ......... ALLOWED  (vote privacy is nil)
--   overwrite another person's vote ....... ALLOWED
--   set is_revealed early ................. ALLOWED
--   rewrite / deactivate any story ........ ALLOWED
--   delete any vote ....................... ALLOWED
--   delete a room / story / participant ... denied (no policy exists)
--   update a room ......................... denied
--   read another user's profile ........... denied
--
-- The root cause is the missing identity, not the policy syntax. Supabase's
-- anonymous sign-in solves it: every visitor gets a real JWT, so `auth.uid()`
-- becomes non-null and ownership predicates start working. That was attempted
-- previously and abandoned after "500: Database error saving new user" (see
-- docs/vote-privacy-limitation.md). This migration fixes the cause of that 500.
--
-- SCOPE
--
-- Migrations deploy to production automatically on merge to main, so this
-- migration only makes changes that are safe against the CURRENT client. The
-- ownership predicates that actually deliver vote privacy require every visitor
-- to be signed in, and therefore ship alongside the client change that calls
-- `supabase.auth.signInAnonymously()`. Applying them here would lock out every
-- existing anonymous user mid-session.

-- ============================================================================
-- 1. Unblock anonymous authentication
-- ============================================================================
--
-- `handle_new_user` derives display_name as:
--   COALESCE(raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email,'@',1))
--
-- An anonymous sign-in supplies neither, so both branches are NULL, the INSERT
-- violates profiles.display_name NOT NULL, the trigger aborts, and the
-- enclosing INSERT into auth.users rolls back. GoTrue surfaces that rollback as
-- "500: Database error saving new user" — the exact error that stopped the
-- previous attempt.
--
-- Adding a final fallback makes the trigger total, so every sign-up path
-- (OAuth, magic link, anonymous) produces a valid profile row.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1), ''),
      -- Anonymous sign-ins have no email and no metadata. Fall back to a
      -- stable, non-identifying name so the NOT NULL constraint holds.
      'Guest ' || SUBSTRING(NEW.id::text FROM 1 FOR 8)
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   -- SECURITY DEFINER without a pinned search_path lets a caller shadow
   -- `profiles` via a schema earlier on their search_path.
   SET search_path = public, pg_temp;

COMMENT ON FUNCTION handle_new_user() IS
  'Auto-creates a profile for every new auth user. Total over all sign-up '
  'paths including anonymous sign-in, which supplies neither email nor metadata.';

-- ============================================================================
-- 2. Remove unused write surface on votes
-- ============================================================================
--
-- `votes_delete USING (true)` lets any caller delete any vote in any room.
-- Nothing in the application deletes votes: submitVote() upserts, revealVotes()
-- updates, and the client has no delete path at all. Dropping the policy
-- removes the capability with no functional change — votes still disappear with
-- their story or participant via ON DELETE CASCADE, which is not subject to RLS.

DROP POLICY IF EXISTS votes_delete ON votes;

-- ============================================================================
-- 3. Collapse the duplicate vote UPDATE policies
-- ============================================================================
--
-- `votes_update_own` and `votes_update_reveal` are both `USING (true)`.
-- PostgreSQL ORs permissive policies together, so two copies of `true` grant
-- exactly what one does. Keeping both implies a distinction the database does
-- not make and obscures which policy needs tightening later.

DROP POLICY IF EXISTS votes_update_own ON votes;
DROP POLICY IF EXISTS votes_update_reveal ON votes;

CREATE POLICY votes_update ON votes
  FOR UPDATE
  USING (true);

COMMENT ON POLICY votes_update ON votes IS
  'Permissive pending anonymous auth. Target: a caller may change point_value '
  'only on their own vote, and is_revealed only as the room leader.';

-- ============================================================================
-- 4. Record the deny-by-default surface explicitly
-- ============================================================================
--
-- rooms, stories and participants have no DELETE policy, and rooms has no
-- policy admitting anonymous UPDATE. With RLS enabled, absent policy means
-- denied — those operations are already blocked. That is currently an accident
-- of which policies were written rather than a decision, and the summary in
-- RLS_POLICIES_FINAL_STATUS.md claims all four verbs are open on every table,
-- which is not what the catalog contains. Comments here so the next reader
-- checks the catalog rather than the summary.

COMMENT ON TABLE rooms IS
  'Planning poker rooms/sessions. RLS: SELECT and INSERT open; UPDATE is '
  'leader-only via auth.uid(); DELETE has no policy and is therefore denied.';

COMMENT ON TABLE stories IS
  'User stories being estimated. RLS: SELECT, INSERT and UPDATE are open '
  'pending anonymous auth; DELETE has no policy and is therefore denied.';

COMMENT ON TABLE votes IS
  'Participant votes/estimates. RLS: SELECT and INSERT open pending anonymous '
  'auth, UPDATE via votes_update; DELETE has no policy and is therefore denied. '
  'Unrevealed point_value is NOT protected server-side until anonymous auth '
  'lands — see docs/vote-privacy-limitation.md.';

COMMENT ON TABLE participants IS
  'Room participants. RLS: SELECT and INSERT open; UPDATE and DELETE require '
  'user_id = auth.uid(), so they currently no-op for anonymous participants '
  '(this is why leaveRoom() does not mark anyone inactive).';
