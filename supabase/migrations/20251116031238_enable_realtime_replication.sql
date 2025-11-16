-- ============================================================================
-- Enable Realtime Replication for Voting Tables
-- ============================================================================
--
-- This migration enables Supabase Realtime subscriptions for the core
-- voting workflow tables. This allows real-time UI updates across multiple
-- participants without manual page refreshes.
--
-- Tables enabled:
-- - participants: Real-time participant join/leave updates
-- - stories: Real-time story creation and activation
-- - votes: Real-time vote submissions and reveals
--
-- Run this in: Supabase Dashboard > SQL Editor
-- Or via CLI: npx supabase db push
-- ============================================================================

-- Add tables to the supabase_realtime publication
-- This enables WebSocket subscriptions for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE participants;
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
ALTER PUBLICATION supabase_realtime ADD TABLE votes;

-- Verify the tables were added (optional check)
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';
