-- Fix the voting state machine and validate input in the database.
--
-- 1. Reveal state lives on the story.
--    The client derived "revealed" from `votes.some(v => v.is_revealed)`. A
--    story nobody had voted on could therefore never be revealed: reveal_votes()
--    updated zero rows and the room stayed on the voting screen with no way
--    forward. stories.revealed_at is set by reveal_votes() regardless of how
--    many votes exist, and once set, votes on that story are frozen.
--
-- 2. reveal_votes() records the result.
--    stories.final_average existed but nothing wrote it. It is now the mean of
--    the numeric votes at reveal time (NULL for T-shirt sizes and all-"?").
--
-- 3. Switching stories is atomic.
--    setActiveStory() deactivated every story and then activated one in two
--    requests, ignoring the first one's error. set_active_story() does both in
--    one statement.
--
-- 4. Voting again keeps history.
--    revote_story() starts a fresh copy of a story instead of deleting votes.
--    Realtime cannot deliver filtered DELETE events, so deleted votes would
--    linger on other screens; a new story arrives as an ordinary INSERT, and the
--    first round's result stays on record.
--
-- 5. Input limits are enforced by the database, mirroring src/lib/schemas.ts,
--    so the REST API no longer accepts any string of any length. Constraints
--    are NOT VALID: they bind every new write without failing the migration on
--    a historical row.

-- ============================================================================
-- 1. Reveal state on the story
-- ============================================================================

ALTER TABLE stories ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMPTZ;

COMMENT ON COLUMN stories.revealed_at IS
  'When the leader revealed this story''s votes. NULL while voting is open.';

UPDATE stories s SET revealed_at = now()
WHERE revealed_at IS NULL
  AND EXISTS (SELECT 1 FROM votes v WHERE v.story_id = s.id AND v.is_revealed);

-- ============================================================================
-- 2. reveal_votes() sets revealed_at and final_average
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

  -- Votes first: once revealed_at is set, guard_vote_freeze rejects changes.
  UPDATE votes SET is_revealed = true WHERE story_id = target_story_id;

  UPDATE stories
  SET revealed_at = COALESCE(revealed_at, now()),
      final_average = (
        SELECT round(avg(point_value::numeric), 1)
        FROM votes
        WHERE story_id = target_story_id
          AND point_value ~ '^[0-9]+(\.[0-9]+)?$'
      )
  WHERE id = target_story_id;
END;
$$;

COMMENT ON FUNCTION public.reveal_votes(UUID) IS
  'Reveals every vote on a story, marks the story revealed and records the '
  'mean of its numeric votes. Leader-only. Works on a story with no votes.';

-- Votes on a revealed story are final. Without this, someone could change
-- their estimate after seeing everyone else's.
CREATE OR REPLACE FUNCTION public.guard_vote_freeze()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR NEW.point_value IS DISTINCT FROM OLD.point_value)
     AND EXISTS (
       SELECT 1 FROM stories
       WHERE id = NEW.story_id AND revealed_at IS NOT NULL
     ) THEN
    RAISE EXCEPTION 'Voting on this story has closed'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS votes_guard_freeze ON votes;
CREATE TRIGGER votes_guard_freeze
  BEFORE INSERT OR UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_vote_freeze();

-- ============================================================================
-- 3. set_active_story()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_active_story(target_story_id UUID)
RETURNS SETOF stories
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
    RAISE EXCEPTION 'Only the room leader can activate stories'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- One statement, so there is never a moment with zero or two active stories.
  UPDATE stories
  SET is_active = (id = target_story_id)
  WHERE room_id = target_room_id
    AND (is_active OR id = target_story_id);

  RETURN QUERY SELECT * FROM stories WHERE id = target_story_id;
END;
$$;

COMMENT ON FUNCTION public.set_active_story(UUID) IS
  'Makes one story the room''s only active story, atomically. Leader-only.';

-- ============================================================================
-- 4. revote_story()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.revote_story(target_story_id UUID)
RETURNS SETOF stories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  original stories;
  fresh stories;
BEGIN
  SELECT * INTO original FROM stories WHERE id = target_story_id;

  IF original.id IS NULL THEN
    RAISE EXCEPTION 'Story not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT is_room_leader(original.room_id) THEN
    RAISE EXCEPTION 'Only the room leader can start a new round'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  INSERT INTO stories (room_id, title, description, is_active)
  VALUES (original.room_id, original.title, original.description, false)
  RETURNING * INTO fresh;

  RETURN QUERY SELECT * FROM set_active_story(fresh.id);
END;
$$;

COMMENT ON FUNCTION public.revote_story(UUID) IS
  'Starts a new voting round on a copy of the story and makes it active, '
  'keeping the previous round''s result. Leader-only.';

GRANT EXECUTE ON FUNCTION public.set_active_story(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revote_story(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_active_story(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.revote_story(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.guard_vote_freeze()
  FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 5. Input limits
-- ============================================================================

ALTER TABLE rooms
  ADD CONSTRAINT rooms_name_length
  CHECK (char_length(btrim(name)) BETWEEN 1 AND 100) NOT VALID;

ALTER TABLE participants
  ADD CONSTRAINT participants_name_length
  CHECK (char_length(btrim(name)) BETWEEN 1 AND 50) NOT VALID;

ALTER TABLE stories
  ADD CONSTRAINT stories_title_length
  CHECK (char_length(btrim(title)) BETWEEN 1 AND 100) NOT VALID;

ALTER TABLE stories
  ADD CONSTRAINT stories_description_length
  CHECK (description IS NULL OR char_length(description) <= 500) NOT VALID;

-- A vote must be a value on its room's scale. A CHECK cannot look at another
-- table, so this is a trigger.
CREATE OR REPLACE FUNCTION public.check_vote_value()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  scale point_scale_enum;
BEGIN
  SELECT r.point_scale INTO scale
  FROM stories s JOIN rooms r ON r.id = s.room_id
  WHERE s.id = NEW.story_id;

  IF NOT (
    (scale = 'fibonacci' AND NEW.point_value IN ('1', '2', '3', '5', '8', '13', '21', '?'))
    OR (scale = 't-shirt' AND NEW.point_value IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '?'))
  ) THEN
    RAISE EXCEPTION 'Not a valid estimate for this room: %', NEW.point_value
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS votes_check_value ON votes;
CREATE TRIGGER votes_check_value
  BEFORE INSERT OR UPDATE OF point_value ON votes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_vote_value();

REVOKE EXECUTE ON FUNCTION public.check_vote_value()
  FROM PUBLIC, anon, authenticated;
