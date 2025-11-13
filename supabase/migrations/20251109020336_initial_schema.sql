-- Initial Schema Migration for Story Pointer MVP
-- This migration creates all core tables with their relationships, constraints, and indexes
-- Tables: profiles, rooms, participants, stories, votes

-- ============================================================================
-- Create custom enum types
-- ============================================================================

-- Point scale enum for room estimation types (only Fibonacci and T-shirt for MVP)
CREATE TYPE point_scale_enum AS ENUM ('fibonacci', 't-shirt');

-- ============================================================================
-- Create profiles table
-- Links authenticated users to their display name for consistent identity
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for efficient lookups by user_id (authentication flow)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

-- Add comment for documentation
COMMENT ON TABLE profiles IS 'User profiles with display names for authenticated users';
COMMENT ON COLUMN profiles.user_id IS 'Foreign key to auth.users - unique per user';
COMMENT ON COLUMN profiles.display_name IS 'User''s display name shown in rooms';

-- ============================================================================
-- Create rooms table
-- Core table for planning poker sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  leader_id UUID, -- Will be set after first participant joins, FK added after participants table
  point_scale point_scale_enum NOT NULL DEFAULT 'fibonacci',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint: room_code must be exactly 8 uppercase alphanumeric characters
  CONSTRAINT room_code_format CHECK (room_code ~ '^[A-Z0-9]{8}$')
);

-- Unique index for room code lookups (join flow)
CREATE UNIQUE INDEX IF NOT EXISTS rooms_room_code_idx ON rooms(room_code);

-- Add comments
COMMENT ON TABLE rooms IS 'Planning poker rooms/sessions';
COMMENT ON COLUMN rooms.room_code IS '8-character alphanumeric code for joining (case-insensitive, stored uppercase)';
COMMENT ON COLUMN rooms.leader_id IS 'Current room leader (FK to participants, set after participants table created)';
COMMENT ON COLUMN rooms.point_scale IS 'Estimation scale type: fibonacci or t-shirt';

-- ============================================================================
-- Create participants table
-- Tracks users participating in rooms with presence and leader status
-- ============================================================================

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_leader BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one auth user can only have one participant record per room
  CONSTRAINT participants_room_user_unique UNIQUE (room_id, user_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS participants_room_id_idx ON participants(room_id);
CREATE INDEX IF NOT EXISTS participants_user_id_idx ON participants(user_id);
CREATE INDEX IF NOT EXISTS participants_room_active_idx ON participants(room_id, is_active);

-- Add comments
COMMENT ON TABLE participants IS 'Users participating in planning poker rooms';
COMMENT ON COLUMN participants.user_id IS 'Optional FK to auth.users - null for anonymous participants';
COMMENT ON COLUMN participants.name IS 'Display name for this participant (can override profile default)';
COMMENT ON COLUMN participants.is_leader IS 'True if this participant is the room leader';
COMMENT ON COLUMN participants.is_active IS 'True if participant is currently connected/present';

-- ============================================================================
-- Add foreign key constraint from rooms.leader_id to participants
-- Must come after participants table creation
-- ============================================================================

ALTER TABLE rooms
  ADD CONSTRAINT rooms_leader_id_fkey
  FOREIGN KEY (leader_id)
  REFERENCES participants(id)
  ON DELETE SET NULL;

-- Index for leader lookups
CREATE INDEX IF NOT EXISTS rooms_leader_id_idx ON rooms(leader_id);

-- ============================================================================
-- Create stories table
-- User stories being estimated in planning poker sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  final_average NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS stories_room_id_idx ON stories(room_id);
CREATE INDEX IF NOT EXISTS stories_room_active_idx ON stories(room_id, is_active);

-- Add comments
COMMENT ON TABLE stories IS 'User stories being estimated in planning poker';
COMMENT ON COLUMN stories.is_active IS 'True if this is the current story being estimated';
COMMENT ON COLUMN stories.final_average IS 'Consensus estimate after vote reveal';

-- ============================================================================
-- Create votes table
-- Individual estimates submitted by participants for stories
-- ============================================================================

CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  point_value TEXT NOT NULL,
  sentiment TEXT,
  is_revealed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint: one vote per participant per story
  CONSTRAINT votes_story_participant_unique UNIQUE (story_id, participant_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS votes_story_id_idx ON votes(story_id);
CREATE INDEX IF NOT EXISTS votes_participant_id_idx ON votes(participant_id);
CREATE INDEX IF NOT EXISTS votes_story_revealed_idx ON votes(story_id, is_revealed);

-- Add comments
COMMENT ON TABLE votes IS 'Participant votes/estimates for stories';
COMMENT ON COLUMN votes.point_value IS 'Selected estimate (stored as text to support different scales)';
COMMENT ON COLUMN votes.sentiment IS 'Optional emoji indicator (e.g., confident, concerned)';
COMMENT ON COLUMN votes.is_revealed IS 'True if vote should be visible to all participants';
