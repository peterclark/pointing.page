-- Make leadership something the database assigns, never something a client
-- writes.
--
-- THE HOLE THIS CLOSES
--
-- Every leader check (is_room_leader(), rooms_update, reveal_votes(),
-- guard_vote_reveal, stories_insert/update) trusts participants.is_leader. Yet
-- clients could write that column directly:
--
--   participants_insert   WITH CHECK (user_id = auth.uid())
--                         -> join any room with is_leader = true
--   participants_update   USING (user_id = auth.uid()), no column limit
--                         -> flip your own row to is_leader = true, or move it
--                            into another room by rewriting room_id
--   rooms_insert          WITH CHECK (true)
--                         -> create a room pointing leader_id anywhere
--
-- Any visitor could therefore lead any room: reveal votes early, rewrite
-- stories, rename the room. RLS cannot help here, because it grants per row and
-- never per column; a policy that admits "my own row" admits every column of it.
--
-- THE FIX
--
-- 1. Column privileges. Clients keep UPDATE on the participant columns they
--    legitimately change (name, is_active, joined_at) and on the room settings
--    a leader edits (name, point_scale). They lose INSERT on both tables and
--    UPDATE on everything else, including is_leader, room_id, user_id and
--    leader_id. Unlike a policy, a column privilege is enforced per column.
--
-- 2. Rooms and memberships are created only through SECURITY DEFINER
--    functions, which decide leadership themselves:
--      create_room()  inserts the room and its creator as leader in one
--                     transaction, so there is no window where a room exists
--                     without a leader for somebody else to claim.
--      join_room()    inserts or reactivates the caller's own row. It promotes
--                     the caller only if the room has no usable leader, under a
--                     row lock on the room so two simultaneous joiners cannot
--                     both win. This replaces the client-side "count === 0"
--                     check, which raced.
--
-- 3. Leader hand-off runs as definer. promote_new_leader() updates another
--    participant's row, which participants_update (user_id = auth.uid())
--    silently refused when it ran as the departing leader, leaving the room
--    leaderless.

-- ============================================================================
-- 1. Column privileges
-- ============================================================================

REVOKE INSERT, UPDATE ON public.participants FROM anon, authenticated;
GRANT UPDATE (name, is_active, joined_at) ON public.participants
  TO anon, authenticated;

REVOKE INSERT, UPDATE ON public.rooms FROM anon, authenticated;
GRANT UPDATE (name, point_scale) ON public.rooms TO anon, authenticated;

-- Without INSERT privilege these policies can never admit anything. Dropping
-- them keeps the catalog honest about how rows actually get created.
DROP POLICY IF EXISTS participants_insert ON public.participants;
DROP POLICY IF EXISTS rooms_insert ON public.rooms;

-- ============================================================================
-- 2a. create_room()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_room(
  room_name TEXT,
  scale point_scale_enum,
  display_name TEXT
)
RETURNS rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller UUID := auth.uid();
  clean_room_name TEXT := btrim(room_name);
  clean_display_name TEXT := btrim(display_name);
  new_room rooms;
  leader participants;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'A session is required to create a room'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Mirrors roomNameSchema and participantNameSchema in src/lib/schemas.ts.
  IF clean_room_name IS NULL OR length(clean_room_name) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Room name must be 1 to 100 characters'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  IF clean_display_name IS NULL OR length(clean_display_name) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Name must be 1 to 50 characters'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- room_code is filled in by the on_room_insert trigger.
  INSERT INTO rooms (name, point_scale)
  VALUES (clean_room_name, COALESCE(scale, 'fibonacci'))
  RETURNING * INTO new_room;

  INSERT INTO participants (room_id, user_id, name, is_leader, is_active)
  VALUES (new_room.id, caller, clean_display_name, true, true)
  RETURNING * INTO leader;

  UPDATE rooms SET leader_id = leader.id
  WHERE id = new_room.id
  RETURNING * INTO new_room;

  RETURN new_room;
END;
$$;

COMMENT ON FUNCTION public.create_room(TEXT, point_scale_enum, TEXT) IS
  'Creates a room with the caller as its leader, atomically. The only way to '
  'create a room: clients hold no INSERT privilege on rooms or participants.';

-- ============================================================================
-- 2b. join_room()
-- ============================================================================

CREATE OR REPLACE FUNCTION public.join_room(
  target_room_id UUID,
  display_name TEXT
)
RETURNS participants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller UUID := auth.uid();
  clean_display_name TEXT := btrim(display_name);
  needs_leader BOOLEAN;
  joined participants;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'A session is required to join a room'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF clean_display_name IS NULL OR length(clean_display_name) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'Name must be 1 to 50 characters'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Serialises joins per room, so the leader check below cannot race.
  PERFORM 1 FROM rooms WHERE id = target_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- A usable leader is an active participant tied to a real user. Rows from
  -- before anonymous auth have a NULL user_id and can never act, so a room led
  -- by one is treated as leaderless and the next person in takes over.
  needs_leader := NOT EXISTS (
    SELECT 1 FROM participants
    WHERE room_id = target_room_id
      AND is_leader
      AND is_active
      AND user_id IS NOT NULL
      AND user_id <> caller
  );

  INSERT INTO participants (room_id, user_id, name, is_leader, is_active)
  VALUES (target_room_id, caller, clean_display_name, needs_leader, true)
  ON CONFLICT ON CONSTRAINT participants_room_user_unique DO UPDATE
    SET is_active = true,
        joined_at = now(),
        name = EXCLUDED.name,
        -- Rejoining never demotes you, and promotes you only if nobody else
        -- is leading.
        is_leader = participants.is_leader OR EXCLUDED.is_leader
  RETURNING * INTO joined;

  IF needs_leader THEN
    -- Retire any stale leader rows so the room has exactly one.
    UPDATE participants SET is_leader = false
    WHERE room_id = target_room_id
      AND is_leader
      AND id <> joined.id;

    UPDATE rooms SET leader_id = joined.id WHERE id = target_room_id;
  END IF;

  RETURN joined;
END;
$$;

COMMENT ON FUNCTION public.join_room(UUID, TEXT) IS
  'Adds the caller to a room, or reactivates their existing row. Promotes them '
  'to leader only when the room has no usable leader. The only way to create '
  'a participant row.';

-- Anonymous visitors sign in anonymously and carry the authenticated role, so
-- the bare anon key (no session) has no reason to call either function.
REVOKE EXECUTE ON FUNCTION public.create_room(TEXT, point_scale_enum, TEXT)
  FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.join_room(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_room(TEXT, point_scale_enum, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_room(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 3. Leader hand-off
-- ============================================================================

CREATE OR REPLACE FUNCTION public.promote_new_leader(room_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_leader_id UUID;
BEGIN
  SELECT id INTO new_leader_id
  FROM participants
  WHERE room_id = room_id_param
    AND is_active = true
    AND is_leader = false
    AND user_id IS NOT NULL
  ORDER BY joined_at
  LIMIT 1;

  IF new_leader_id IS NOT NULL THEN
    UPDATE participants SET is_leader = true WHERE id = new_leader_id;
    UPDATE rooms SET leader_id = new_leader_id WHERE id = room_id_param;
  ELSE
    UPDATE rooms SET leader_id = NULL WHERE id = room_id_param;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.promote_new_leader(UUID) IS
  'Promotes the longest-present active participant when the leader leaves. '
  'Internal: runs as definer so it can update another participant''s row, and '
  'is not callable by clients.';

CREATE OR REPLACE FUNCTION public.handle_leader_disconnection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.is_leader = true
     AND OLD.is_active = true
     AND NEW.is_active = false THEN
    NEW.is_leader := false;
    PERFORM promote_new_leader(NEW.room_id);
  END IF;

  RETURN NEW;
END;
$$;

-- A client calling promote_new_leader() directly could mint a second leader in
-- any room. Triggers fire without an EXECUTE check, so revoking it costs the
-- hand-off nothing.
REVOKE EXECUTE ON FUNCTION public.promote_new_leader(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_leader_disconnection()
  FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.participants IS
  'Room participants. RLS: SELECT open; UPDATE and DELETE restricted to your '
  'own row. Column privileges limit UPDATE to name, is_active and joined_at. '
  'Rows are created only by create_room() and join_room(), which also own '
  'is_leader.';

COMMENT ON TABLE public.rooms IS
  'Planning poker rooms. RLS: SELECT open; UPDATE leader-only. Column '
  'privileges limit UPDATE to name and point_scale. Rows are created only by '
  'create_room().';
