-- Move vote privacy and leader-only operations into the database.
--
-- Pairs with the client change that calls `supabase.auth.signInAnonymously()`
-- before any query runs. Until every caller holds a JWT, `auth.uid()` is NULL
-- and none of these predicates can match, which is why the preceding migration
-- only unblocked anonymous sign-in and left the policies permissive.
--
-- DEPLOYMENT NOTE
--
-- Migrations apply on merge and Netlify deploys the client on the same merge,
-- so there is a brief window where a cached client without anonymous sign-in
-- talks to the tightened schema. These policies fail closed: such a client
-- cannot vote or create stories, but it also cannot read anyone's unrevealed
-- votes. Degrading to read-only is the intended failure mode.
--
-- Existing participant rows have `user_id IS NULL` (created before anonymous
-- sign-in existed). Those participants can no longer vote and must rejoin,
-- which the client handles by showing the join form when it finds no
-- participant matching the current user. Rooms are ephemeral, so this is a
-- one-time disruption rather than data loss.

-- ============================================================================
-- Helper predicates
-- ============================================================================
--
-- These are SECURITY DEFINER on purpose. A policy that inlines
-- `EXISTS (SELECT 1 FROM participants ...)` runs that subquery under the
-- caller's own RLS, so tightening `participants_select` later would silently
-- narrow every policy built on it. Routing through a definer function pins the
-- meaning of "am I this participant" independently of how participants are
-- exposed for reading.

CREATE OR REPLACE FUNCTION public.owns_participant(target_participant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM participants
    WHERE id = target_participant_id
      AND user_id IS NOT NULL
      AND user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.owns_participant(UUID) IS
  'True when the given participant row belongs to the calling user. Explicitly '
  'false for legacy rows with a NULL user_id, so pre-anonymous-auth '
  'participants are never treated as owned by an unauthenticated caller.';

CREATE OR REPLACE FUNCTION public.is_room_leader(target_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM participants
    WHERE room_id = target_room_id
      AND user_id IS NOT NULL
      AND user_id = auth.uid()
      AND is_leader
  );
$$;

COMMENT ON FUNCTION public.is_room_leader(UUID) IS
  'True when the calling user holds the leader participant row for the room.';

GRANT EXECUTE ON FUNCTION public.owns_participant(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_room_leader(UUID) TO anon, authenticated;

-- ============================================================================
-- Votes: privacy and ownership
-- ============================================================================

DROP POLICY IF EXISTS votes_select ON votes;
DROP POLICY IF EXISTS votes_insert ON votes;
DROP POLICY IF EXISTS votes_update ON votes;

-- SELECT: a revealed vote is public to anyone holding the room code; an
-- unrevealed vote is visible only to the participant who cast it. This is the
-- change that makes `filterVisibleVotes()` a presentation detail rather than
-- the only thing standing between a spectator and everyone's estimate.
CREATE POLICY votes_select ON votes
  FOR SELECT
  USING (is_revealed OR owns_participant(participant_id));

-- INSERT: you may only cast a vote as yourself.
CREATE POLICY votes_insert ON votes
  FOR INSERT
  WITH CHECK (owns_participant(participant_id));

-- UPDATE: you may only change your own vote, and WITH CHECK stops you handing
-- it to somebody else. Note this deliberately does NOT let the leader flip
-- is_revealed — RLS cannot restrict which columns an UPDATE touches, so a
-- leader-shaped UPDATE policy here would also let the leader rewrite other
-- people's estimates. Revealing goes through reveal_votes() below instead.
CREATE POLICY votes_update ON votes
  FOR UPDATE
  USING (owns_participant(participant_id))
  WITH CHECK (owns_participant(participant_id));

COMMENT ON POLICY votes_select ON votes IS
  'Unrevealed votes are visible only to their author. Revealed votes are public.';

-- ============================================================================
-- Revealing votes: leader-only, column-scoped
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reveal_votes(target_story_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_room_id UUID;
BEGIN
  SELECT room_id INTO target_room_id FROM stories WHERE id = target_story_id;

  IF target_room_id IS NULL THEN
    RAISE EXCEPTION 'Story not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT is_room_leader(target_room_id) THEN
    RAISE EXCEPTION 'Only the room leader can reveal votes'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  UPDATE votes SET is_revealed = true WHERE story_id = target_story_id;
END;
$$;

-- A participant may edit their own vote, and RLS cannot stop that UPDATE from
-- also touching is_revealed. Left alone, anyone could reveal their own vote and
-- flip the whole room to the results view, because the client derives "revealed"
-- from `votes.some(v => v.is_revealed)`. A trigger gives the column-level
-- control the policy cannot, and still permits reveal_votes(), which runs as the
-- leader and therefore passes the same check.

CREATE OR REPLACE FUNCTION public.guard_vote_reveal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target_room_id UUID;
BEGIN
  IF NEW.is_revealed IS DISTINCT FROM OLD.is_revealed THEN
    SELECT room_id INTO target_room_id FROM stories WHERE id = NEW.story_id;

    IF NOT is_room_leader(target_room_id) THEN
      RAISE EXCEPTION 'Only the room leader can reveal votes'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_vote_reveal() IS
  'Rejects any change to votes.is_revealed by a caller who is not the room '
  'leader. Enforces at column granularity what RLS can only do per row.';

DROP TRIGGER IF EXISTS votes_guard_reveal ON votes;
CREATE TRIGGER votes_guard_reveal
  BEFORE UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_vote_reveal();

COMMENT ON FUNCTION public.reveal_votes(UUID) IS
  'Reveals every vote on a story. Leader-only. Exists because RLS cannot scope '
  'an UPDATE to a single column: a leader-shaped votes_update policy would also '
  'permit rewriting other participants estimates.';

GRANT EXECUTE ON FUNCTION public.reveal_votes(UUID) TO anon, authenticated;

-- ============================================================================
-- Stories: leader-only writes
-- ============================================================================

DROP POLICY IF EXISTS stories_insert ON stories;
DROP POLICY IF EXISTS stories_update ON stories;

CREATE POLICY stories_insert ON stories
  FOR INSERT
  WITH CHECK (is_room_leader(room_id));

CREATE POLICY stories_update ON stories
  FOR UPDATE
  USING (is_room_leader(room_id))
  WITH CHECK (is_room_leader(room_id));

-- stories_select stays permissive, deliberately. The client subscribes to room
-- data as soon as the room resolves, which is before the visitor has joined and
-- therefore before they have a participant row. Requiring membership to read
-- stories would leave the board blank until a resubscribe, and a story title is
-- not the secret here — the vote values are.
COMMENT ON POLICY stories_select ON stories IS
  'Permissive by design: readable by anyone holding the room code, so the board '
  'renders before the visitor joins. Writes are leader-only.';

-- ============================================================================
-- Participants: you may only insert yourself
-- ============================================================================
--
-- participants_update and participants_delete already require
-- `user_id = auth.uid()`. Those have been dead code for anonymous visitors,
-- which is why leaveRoom() never marked anyone inactive; with every visitor
-- signed in they start working as written.

DROP POLICY IF EXISTS participants_insert ON participants;

CREATE POLICY participants_insert ON participants
  FOR INSERT
  WITH CHECK (user_id IS NOT NULL AND user_id = auth.uid());

COMMENT ON TABLE participants IS
  'Room participants. RLS: SELECT open to anyone with the room code; INSERT, '
  'UPDATE and DELETE are restricted to your own row via auth.uid().';

COMMENT ON TABLE votes IS
  'Participant votes/estimates. RLS: an unrevealed point_value is readable only '
  'by its author; INSERT and UPDATE are restricted to your own vote. Revealing '
  'is leader-only via reveal_votes().';

COMMENT ON TABLE stories IS
  'User stories being estimated. RLS: SELECT open to anyone with the room code; '
  'INSERT and UPDATE are leader-only.';
