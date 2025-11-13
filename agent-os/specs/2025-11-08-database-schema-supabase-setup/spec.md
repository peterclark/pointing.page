# Specification: Database Schema & Supabase Setup

## Goal
Establish the foundational backend infrastructure for Story Pointer by creating the database schema, configuring real-time subscriptions for collaborative features, and implementing authentication and access control policies that support the MVP planning poker experience.

## User Stories
- As a development team, I want a reliable data layer so that room state, votes, and participant information persist and synchronize across all connected users
- As a system administrator, I want proper access control policies so that users can only view and modify data they have permission to access

## Specific Requirements

**Database Schema - Core Tables**
- Create rooms table with uuid primary key, 8-character alphanumeric room_code (unique), name, leader_id foreign key to participants, point_scale enum (fibonacci or t-shirt only), and created_at timestamp
- Create profiles table linked to auth.users with user_id foreign key, display_name for consistent identity across rooms, and created_at timestamp
- Create participants table with room_id and user_id foreign keys, name field for per-room display override, is_leader and is_active boolean flags, unique constraint on (room_id, user_id), and joined_at timestamp
- Create stories table with room_id foreign key, title and description text fields, is_active boolean for current story tracking, nullable final_average numeric field for consensus results, and created_at timestamp
- Create votes table with story_id and participant_id foreign keys, point_value text field (supports different scales), sentiment text field for emoji indicators, is_revealed boolean for vote visibility control, unique constraint on (story_id, participant_id), and created_at timestamp
- All tables use uuid primary keys with gen_random_uuid() defaults and cascade delete behavior for dependent records

**Database Indexes for Performance**
- Index rooms.room_code (unique) for join flow lookups
- Index participants on room_id, user_id, and composite (room_id, is_active) for participant list queries
- Index stories on room_id and composite (room_id, is_active) for current story identification
- Index votes on story_id, participant_id, and composite (story_id, is_revealed) for reveal operations
- Index profiles.user_id (unique) for authentication lookups

**Supabase Authentication Configuration**
- Enable Supabase Auth with magic link (passwordless email) provider only
- Configure profiles table with trigger to auto-create profile record on first authentication
- Use JWT tokens with automatic refresh for session management
- Store VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in environment variables per environment (dev, staging, production)
- No login UI required in this spec - infrastructure setup only

**Room Joining and Leader Management Logic**
- Room creator (first participant) automatically becomes leader with is_leader=true and rooms.leader_id set to their participant.id
- When authenticated user joins existing room, reuse participant record if exists (update is_active=true, joined_at=now())
- Prevent same user from joining same room from multiple devices by checking for existing active participant and returning error message
- When leader disconnects (is_active=false), automatically promote random active participant by updating their is_leader=true and updating rooms.leader_id
- Room code validation happens before name prompt in join flow

**Real-time Subscriptions with Server-Side Filtering**
- Enable Supabase Realtime on rooms, profiles, participants, stories, and votes tables
- Configure votes subscription filtered by story_id to only send votes for current story
- Configure participants subscription filtered by room_id to only send participants in current room
- Configure stories subscription filtered by room_id to only send stories in current room
- Use room-specific subscription channels for isolation between concurrent sessions

**Row Level Security Policies - Rooms**
- SELECT: Users can read rooms where they have an active participant record (join via participants table)
- INSERT: Anyone can create rooms for anonymous room creation flow
- UPDATE: Only room leader can update room settings (verify is_leader via participants join)
- DELETE: Rooms persist indefinitely (no delete policy for MVP)

**Row Level Security Policies - Profiles**
- SELECT: Users can read their own profile only (user_id = auth.uid())
- INSERT: Auto-created via trigger on first auth (no manual insert policy needed)
- UPDATE: Users can update only their own profile (user_id = auth.uid())
- DELETE: Users can delete only their own profile (user_id = auth.uid())

**Row Level Security Policies - Participants**
- SELECT: Users can read all participants in rooms they have joined (via their own participant record)
- INSERT: Anyone can insert participant records for joining rooms
- UPDATE: Users can update only their own participant record (filter by auth.uid() matching user_id)
- DELETE: Users can delete only their own participant record for leaving rooms

**Row Level Security Policies - Stories**
- SELECT: Users can read stories in rooms they have joined (join via participants table)
- INSERT: Only room leader can create stories (verify is_leader=true via participants)
- UPDATE: Only room leader can update story fields including title, description, is_active, and final_average
- DELETE: Stories persist for session history (no delete policy for MVP)

**Row Level Security Policies - Votes**
- SELECT: Users can read votes if (vote.participant_id matches their participant record) OR (vote.is_revealed=true AND user is in room via participants)
- INSERT: Users can insert votes only for their own participant_id
- UPDATE: Users can update votes only if (vote.participant_id matches theirs AND is_revealed=false) OR (user is room leader for reveal operation)
- DELETE: Users can delete only their own unrevealed votes
- Special policy for reveals: Only room leader can update is_revealed field from false to true

**Migration Management Strategy**
- Use Supabase CLI for all schema changes with migrations stored in /supabase/migrations/ directory
- Name migrations with timestamp_description.sql format (e.g., 20241108000001_initial_schema.sql)
- Create separate migration files for schema creation, RLS policies, indexes, and triggers
- Make migrations idempotent using IF NOT EXISTS and other defensive SQL patterns
- Version control all migration files in git and apply to dev, staging, then production sequentially

**Environment Configuration**
- Create separate Supabase projects for development, staging, and production environments
- Configure CORS to allow origins for localhost:5173 (dev), staging domain, and production domain
- Store environment-specific VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local files
- Use Supabase's built-in connection pooling and default email service for magic links
- Keep service role key secure and never expose to frontend client

## Visual Design
No visual assets provided - this is backend infrastructure only.

## Existing Code to Leverage

**No existing Supabase or database code found**
- This is a greenfield implementation establishing the foundational data layer
- Current codebase has React 19.1.1, TypeScript, Vite with Rolldown, shadcn/ui components, and Tailwind CSS
- Path aliases configured (@/ -> ./src/) should be used for Supabase client initialization
- Future features will leverage the database schema patterns, RLS structures, and real-time subscription patterns established here

## Out of Scope
- Custom point scales beyond Fibonacci and T-shirt sizes (deferred to Phase 3, roadmap item 24)
- Complex audit logging and change history tracking for votes and stories
- Advanced presence tracking features like heartbeat intervals or typing indicators
- Room visibility settings including private rooms, invitations, or approval flows
- Participant limits per room or removal/ban functionality
- Manual leader transfer UI and controls
- Login/signup UI components (only authentication infrastructure setup)
- Password-based authentication or OAuth providers (Google, GitHub, Microsoft)
- Email template customization beyond Supabase defaults
- Custom session timeout configuration beyond Supabase defaults
- Database backup, recovery procedures, and performance monitoring tools
- Anonymous voting mode (roadmap item 12) which may require schema changes
- Participant roles beyond leader/voter (roadmap item 16) which may need role enum
- updated_at timestamps on tables (created_at only for MVP)
