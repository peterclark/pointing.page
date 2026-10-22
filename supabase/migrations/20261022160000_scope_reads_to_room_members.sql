-- Scope room data to the people in the room.
--
-- THE PROBLEM
--
-- rooms_select, participants_select, stories_select and vote_receipts_select
-- were all `USING (true)`, and votes_select admitted every revealed vote. The
-- policy comments said "readable by anyone holding the room code", but nothing
-- checked a code: `GET /rest/v1/rooms?select=*` with the public anon key listed
-- every room and its join code, and the other tables listed every participant
-- name, user id, story title and revealed estimate in the system.
--
-- THE FIX
--
-- Reads require membership: a participant row for the caller in that room.
-- Knowing the code is what gets you in, through get_room_by_code(), which
-- returns exactly one room and only when given its code.
--
-- The client loads the board right after resolving the room, which for a
-- newcomer is before they have joined, so the first load now comes back empty
-- for them. That is fine: the page shows the join form whenever it finds no
-- participant for the current user, and the client reloads the board once the
-- join succeeds. Realtime evaluates these same policies per event, so a
-- subscriber starts receiving the room's changes the moment they join.

-- ============================================================================
-- Membership predicates
-- ============================================================================
--
-- SECURITY DEFINER for the same reason as owns_participant(): a policy on
-- participants that queried participants under the caller's RLS would recurse.

CREATE OR REPLACE FUNCTION public.is_room_member(target_room_id UUID)
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
  );
$$;

COMMENT ON FUNCTION public.is_room_member(UUID) IS
  'True when the calling user has a participant row in the room, active or not.';

CREATE OR REPLACE FUNCTION public.is_story_member(target_story_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM stories s
    JOIN participants p ON p.room_id = s.room_id
    WHERE s.id = target_story_id
      AND p.user_id IS NOT NULL
      AND p.user_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_story_member(UUID) IS
  'True when the calling user has a participant row in the story''s room.';

GRANT EXECUTE ON FUNCTION public.is_room_member(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_story_member(UUID) TO anon, authenticated;

-- ============================================================================
-- Finding a room by its code
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_room_by_code(code TEXT)
RETURNS SETOF rooms
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM rooms WHERE room_code = upper(btrim(code)) LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_room_by_code(TEXT) IS
  'Returns the room with this code, or nothing. The only way to read a room '
  'you have not joined: the code is the capability, so rooms cannot be listed.';

GRANT EXECUTE ON FUNCTION public.get_room_by_code(TEXT) TO anon, authenticated;

-- ============================================================================
-- Policies
-- ============================================================================

DROP POLICY IF EXISTS rooms_select ON rooms;
CREATE POLICY rooms_select ON rooms
  FOR SELECT
  USING (is_room_member(id));

DROP POLICY IF EXISTS participants_select ON participants;
CREATE POLICY participants_select ON participants
  FOR SELECT
  USING (is_room_member(room_id));

DROP POLICY IF EXISTS stories_select ON stories;
CREATE POLICY stories_select ON stories
  FOR SELECT
  USING (is_room_member(room_id));

DROP POLICY IF EXISTS vote_receipts_select ON vote_receipts;
CREATE POLICY vote_receipts_select ON vote_receipts
  FOR SELECT
  USING (is_story_member(story_id));

-- Your own vote stays visible to you; everyone else's needs the reveal AND
-- membership of the room.
DROP POLICY IF EXISTS votes_select ON votes;
CREATE POLICY votes_select ON votes
  FOR SELECT
  USING (
    owns_participant(participant_id)
    OR (is_revealed AND is_story_member(story_id))
  );

COMMENT ON POLICY rooms_select ON rooms IS
  'Members only. Non-members find a room by code through get_room_by_code().';
COMMENT ON POLICY participants_select ON participants IS
  'Members of the room only.';
COMMENT ON POLICY stories_select ON stories IS
  'Members of the room only.';
COMMENT ON POLICY vote_receipts_select ON vote_receipts IS
  'Members of the story''s room only.';
COMMENT ON POLICY votes_select ON votes IS
  'Your own vote always; other votes once revealed, and only to room members.';
