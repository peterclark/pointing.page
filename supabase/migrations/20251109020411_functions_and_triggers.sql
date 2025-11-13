-- Functions and Triggers Migration for Story Pointer MVP
-- This migration creates database functions and triggers for automation
-- Functions: handle_new_user, generate_room_code, promote_new_leader
-- Triggers: auto-create profile, leader disconnection handling

-- ============================================================================
-- Function: handle_new_user()
-- Automatically creates a profile record when a new user signs up
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract username from email (part before @) as default display name
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      SPLIT_PART(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION handle_new_user() IS 'Auto-creates profile record when new user signs up';

-- ============================================================================
-- Trigger: on_auth_user_created
-- Fires after INSERT on auth.users to create profile
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- Function: generate_room_code()
-- Generates a unique 8-character alphanumeric room code
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  attempt INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  -- Try up to 10 times to generate a unique code
  WHILE attempt < max_attempts LOOP
    result := '';

    -- Generate 8 random characters
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;

    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM rooms WHERE room_code = result) THEN
      RETURN result;
    END IF;

    attempt := attempt + 1;
  END LOOP;

  -- If we couldn't generate a unique code after 10 attempts, raise error
  RAISE EXCEPTION 'Failed to generate unique room code after % attempts', max_attempts;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Add comment
COMMENT ON FUNCTION generate_room_code() IS 'Generates unique 8-character alphanumeric room code (uppercase)';

-- ============================================================================
-- Function: promote_new_leader(room_id UUID)
-- Promotes a random active participant to leader when current leader disconnects
-- ============================================================================

CREATE OR REPLACE FUNCTION promote_new_leader(room_id_param UUID)
RETURNS VOID AS $$
DECLARE
  new_leader_id UUID;
BEGIN
  -- Find a random active participant who is not already a leader
  SELECT id INTO new_leader_id
  FROM participants
  WHERE room_id = room_id_param
    AND is_active = true
    AND is_leader = false
  ORDER BY RANDOM()
  LIMIT 1;

  -- If we found a participant, promote them
  IF new_leader_id IS NOT NULL THEN
    -- Update participant to be leader
    UPDATE participants
    SET is_leader = true
    WHERE id = new_leader_id;

    -- Update room's leader_id reference
    UPDATE rooms
    SET leader_id = new_leader_id
    WHERE id = room_id_param;
  ELSE
    -- No active participants left - set room leader_id to null
    UPDATE rooms
    SET leader_id = NULL
    WHERE id = room_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION promote_new_leader(UUID) IS 'Promotes random active participant to leader when current leader disconnects';

-- ============================================================================
-- Function: handle_leader_disconnection()
-- Trigger function that promotes new leader when current leader disconnects
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_leader_disconnection()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act if a leader became inactive
  IF OLD.is_leader = true
     AND OLD.is_active = true
     AND NEW.is_active = false THEN

    -- First, mark this participant as no longer leader
    NEW.is_leader := false;

    -- Promote a new leader for this room
    PERFORM promote_new_leader(NEW.room_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION handle_leader_disconnection() IS 'Automatically promotes new leader when current leader disconnects';

-- ============================================================================
-- Trigger: on_leader_disconnect
-- Fires when a leader's is_active changes from true to false
-- ============================================================================

DROP TRIGGER IF EXISTS on_leader_disconnect ON participants;
CREATE TRIGGER on_leader_disconnect
  BEFORE UPDATE ON participants
  FOR EACH ROW
  EXECUTE FUNCTION handle_leader_disconnection();

-- ============================================================================
-- Function: set_room_code_on_insert()
-- Automatically generates and sets room_code if not provided on INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION set_room_code_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- If room_code is not provided or is empty, generate one
  IF NEW.room_code IS NULL OR NEW.room_code = '' THEN
    NEW.room_code := generate_room_code();
  ELSE
    -- Ensure provided room_code is uppercase
    NEW.room_code := UPPER(NEW.room_code);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION set_room_code_on_insert() IS 'Auto-generates room_code on INSERT if not provided, ensures uppercase';

-- ============================================================================
-- Trigger: on_room_insert
-- Fires before INSERT on rooms to set room_code
-- ============================================================================

DROP TRIGGER IF EXISTS on_room_insert ON rooms;
CREATE TRIGGER on_room_insert
  BEFORE INSERT ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION set_room_code_on_insert();
