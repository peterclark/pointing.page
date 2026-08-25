-- Publish the fact that someone voted, without publishing what they voted.
--
-- REGRESSION THIS FIXES
--
-- `votes_select` is `is_revealed OR owns_participant(participant_id)`, which is
-- correct for privacy but hides the row entirely, not just its value. The
-- participant pills derive "has voted" from the presence of a vote row, so once
-- privacy landed nobody could see anyone else's status until the reveal — the
-- board looked frozen while people were actually voting.
--
-- RLS grants per row and never per column, so there is no policy that shows the
-- row while masking `point_value`. Column-level GRANTs are not per-row either
-- (revoking `point_value` would hide it from its own author too), and Realtime
-- replays rows from the WAL, where a column privilege would not be applied at
-- all. The fact therefore needs to be its own row.

CREATE TABLE IF NOT EXISTS vote_receipts (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, participant_id)
);

COMMENT ON TABLE vote_receipts IS
  'One row per participant who has voted on a story. Deliberately carries no '
  'estimate: it exists so the UI can show who has voted while votes_select '
  'keeps the values private. Written only by the trigger on votes.';

CREATE INDEX IF NOT EXISTS vote_receipts_story_idx ON vote_receipts(story_id);

ALTER TABLE vote_receipts ENABLE ROW LEVEL SECURITY;

-- Readable by anyone holding the room code, the same posture as participants
-- and stories. "Ada has voted" is exactly what the room is meant to display.
CREATE POLICY vote_receipts_select ON vote_receipts
  FOR SELECT
  USING (true);

-- No write policies: with RLS enabled, absent policy means denied. The only
-- writer is the SECURITY DEFINER trigger below, so a client cannot forge a
-- receipt for somebody who has not voted, or clear one that exists.

-- ============================================================================
-- Keep receipts in step with votes
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_vote_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM vote_receipts
    WHERE story_id = OLD.story_id AND participant_id = OLD.participant_id;
    RETURN OLD;
  END IF;

  -- Re-voting keeps the original timestamp: the pill reflects "has voted",
  -- and churning voted_at would emit pointless realtime traffic on every
  -- change of mind.
  INSERT INTO vote_receipts (story_id, participant_id)
  VALUES (NEW.story_id, NEW.participant_id)
  ON CONFLICT (story_id, participant_id) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_vote_receipt() IS
  'Maintains vote_receipts from votes. SECURITY DEFINER so it can write a table '
  'that grants no write policy to clients.';

DROP TRIGGER IF EXISTS votes_sync_receipt ON votes;
CREATE TRIGGER votes_sync_receipt
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_vote_receipt();

-- Backfill for stories already in flight, so an open round does not stay blank.
INSERT INTO vote_receipts (story_id, participant_id, voted_at)
SELECT story_id, participant_id, created_at FROM votes
ON CONFLICT (story_id, participant_id) DO NOTHING;

-- ============================================================================
-- Realtime
-- ============================================================================
--
-- Receipts are only useful live; without replication the pills would not light
-- up until something else forced a refetch.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'vote_receipts'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE vote_receipts;
    END IF;
  END IF;
END
$$;

-- REPLICA IDENTITY FULL so DELETE events carry the key columns; the default
-- would send only the primary key, which here happens to be enough, but being
-- explicit keeps the payload stable if the key ever changes.
ALTER TABLE vote_receipts REPLICA IDENTITY FULL;
