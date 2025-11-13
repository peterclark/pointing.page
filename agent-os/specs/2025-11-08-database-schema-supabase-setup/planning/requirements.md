# Spec Requirements: Database Schema & Supabase Setup

## Initial Description
This is the foundational feature for the Story Pointer application that establishes the backend infrastructure and data layer required for all subsequent features. It creates the Supabase project, designs and implements the database schema, configures real-time subscriptions for live collaborative updates, sets up authentication for future team workspaces, and implements Row Level Security (RLS) policies for data access control.

The feature includes:
1. Supabase Project Setup (dev, staging, production environments)
2. Database Schema Design & Implementation (rooms, participants, stories, votes tables)
3. Real-time Subscriptions Configuration
4. Authentication Setup (preparing for future team workspaces)
5. Row Level Security (RLS) Policies

This foundation enables all subsequent MVP features including room creation, joining flow, point selection, vote reveals, and participant tracking.

## Requirements Discussion

### First Round Questions

**Q1:** For the room_code in the rooms table, what format should it use? I assume we want short, shareable codes like "ABC123" (6-8 alphanumeric characters, case-insensitive) that are easy to share verbally or via chat. Should we use a specific format or length?

**Answer:** 8 character alphanumeric, case-insensitive codes

**Q2:** For point_scale in the rooms table, should we store this as an enum or string? I'm thinking we should have a defined set of values like 'fibonacci', 't-shirt', 'custom' to validate against. Given roadmap item 24 mentions custom scales as a future feature, should we include that option now or add it later?

**Answer:** Exclude custom point scales for now. Use enum with 'fibonacci' and 't-shirt' values only. Custom scales will be added in Phase 3 (roadmap item 24).

**Q3:** For the participants table, how should we handle presence tracking? I assume is_active will be updated via a heartbeat mechanism or manual presence tracking. Should we also store a last_seen_at timestamp, or is the boolean flag sufficient?

**Answer:** Boolean flag is sufficient. Manual presence tracking will be implemented (heartbeat mechanism will be handled by the frontend).

**Q4:** For the votes table, should we prevent duplicate votes per participant per story? I assume each participant should only have one vote per story (enforced by unique constraint on story_id + participant_id), and if they want to change their vote before reveal, we update the existing record rather than inserting a new one?

**Answer:** Yes, enforce unique constraint on (story_id, participant_id). Updates to existing vote records are allowed before reveal.

**Q5:** For data retention, how long should we keep historical data? Should completed stories and old votes be archived or deleted after a certain period (e.g., 30 days), or should we keep everything indefinitely? This affects storage costs and query performance.

**Answer:** Keep all data indefinitely. No automatic deletion or archiving. This supports the Session History View feature (roadmap item 10) and future analytics (item 18).

**Q6:** For timestamps, I'm assuming we want created_at on all tables for audit purposes. Should we also have updated_at on tables that can be modified (rooms, stories)? Or is created_at sufficient for the MVP?

**Answer:** created_at only for MVP. updated_at can be added later if needed.

**Q7:** For database indexes, what are the most common query patterns we expect? I assume we'll frequently query:
- Rooms by room_code (for joining)
- Participants by room_id + is_active (for participant lists)
- Stories by room_id + is_active (for current story)
- Votes by story_id (for reveal calculations)

Should I create indexes for these access patterns?

**Answer:** Yes, create indexes for all mentioned patterns. These are the primary query patterns for the application.

**Q8:** For real-time subscriptions, should we use table-level subscriptions with client-side filtering, or configure server-side filters in Supabase? I'm thinking table-level subscriptions for votes, participants, and stories, with room-specific filtering to reduce bandwidth.

**Answer:** Use table-level subscriptions with room-specific filtering on the server side (Supabase filters). This reduces bandwidth and improves performance.

**Q9:** For authentication, should we set it up now even though team workspaces (item 21) is a Phase 3 feature? I assume yes since it's mentioned in the spec, but should we implement full email/OAuth flows, or just create the auth structure without login UI?

**Answer:** Yes, set up Supabase Auth now to prepare for future features. No login UI needed yet, just the backend structure.

**Q10:** For authentication providers, which should we enable initially? I'm thinking at minimum email/password, and potentially Google OAuth for common enterprise use. Should we enable other providers (GitHub, Microsoft) or keep it minimal for MVP?

**Answer:** Use magic link authentication (passwordless email) only. This provides a simple, secure authentication method without requiring OAuth setup or password management.

**Q11:** For the participants table relationship to auth.users, how should we link these? Should participant.user_id reference auth.users.id for future authenticated sessions, or should we keep participants completely separate from auth for the MVP (anonymous joining)?

**Answer:** Link participants to auth.users now via user_id foreign key. This prepares for authenticated sessions while still allowing the current anonymous joining flow.

**Q12:** For RLS policies, what level of granularity do we need? I assume:
- Room data: Users can read rooms they've joined (via participant record)
- Participant data: Read access for anyone in the room, write access for own record
- Story data: Read for room participants, write for room leader
- Vote data: Write own votes, read all votes only when is_revealed = true

Are there any other access control requirements?

**Answer:** This covers the main requirements. Additionally:
- Only room leader can update story details (title, description, is_active)
- Only room leader can trigger reveals (update is_revealed on votes)
- Participants cannot see others' votes until is_revealed = true

**Q13:** For deployment, should we create separate Supabase projects for development, staging, and production? Or use a single project with different tables/schemas? I assume separate projects for proper isolation.

**Answer:** Separate Supabase projects for dev, staging, and production. This provides proper environment isolation and prevents accidental data mixing.

**Q14:** For migration management, should we use Supabase CLI with version-controlled migration files, or manage schema through the Supabase dashboard? I recommend CLI with migrations in the codebase for reproducibility.

**Answer:** Use Supabase CLI with version-controlled migration files. This ensures schema changes are tracked and reproducible across environments.

**Q15:** Are there any features from the initialization description that should be explicitly excluded from this initial implementation? For example, should we defer certain RLS policies, skip specific indexes, or simplify the real-time configuration?

**Answer:** Exclude:
- Custom point scales (will be added in Phase 3, item 24)
- Complex audit logging (not needed for MVP)
- Advanced presence tracking (basic is_active flag is sufficient)

### Follow-up Questions

**Follow-up 1:** I want to clarify the room joining flow and authentication. When a user joins a room via room code, should they:
A) Enter room code, then authenticate (sign up or log in), then join as participant
B) Enter room code, enter display name (no auth required), then optionally authenticate later
C) Enter room code, authenticate first (if not logged in), display name comes from their profile

Which flow aligns with your MVP vision?

**Answer:** Option B - Users enter room code first, THEN sign up/login. This allows immediate joining with just a display name, with authentication added later for persistent identity.

**Follow-up 2:** For the magic link authentication, should we require users to verify their email before they can join rooms, or allow unverified users to participate? This affects the authentication flow and user experience.

**Answer:** Allow unverified users to participate immediately. Magic link confirmation provides the verification, but users shouldn't be blocked from joining while waiting for email delivery.

**Follow-up 3:** For the participant-to-auth.users relationship, how should we handle uniqueness? Should one auth.user_id be able to have multiple participant records (one per room), or should it be one participant record total that can join multiple rooms? Also, if a user joins the same room from multiple devices, should we create multiple participant records or reuse the existing one?

**Answer:**
- One auth.user_id can have MULTIPLE participant records (one per room they join)
- Unique constraint on (room_id, user_id) - same user cannot have multiple participant records in the same room
- If user rejoins same room, reuse existing participant record (update is_active to true)
- Same user cannot join from multiple devices/tabs simultaneously (enforce single active session per room)

**Follow-up 4:** For leader assignment and transitions, how should we handle the following scenarios:
- When a room is created, is the creator automatically the leader?
- If the leader disconnects (is_active = false), should we automatically promote another participant to leader?
- Can leader role be manually transferred to another participant?

**Answer:**
- Yes, room creator is automatically the leader (first participant with is_leader = true)
- If leader disconnects, automatically assign a random participant as the new leader (to prevent orphaned rooms)
- Manual leader transfer is NOT needed for MVP (can be added later if requested)

**Follow-up 5:** For user profiles and display names, should we store the display name:
A) Only in the participants table (separate per room)
B) In a profiles table linked to auth.users (consistent across rooms)
C) In both - profiles table as default, but can be overridden per room in participants

Which approach fits your vision?

**Answer:** Option C - Create a profiles table (id, user_id, display_name, created_at) linked to auth.users. Participants table references this, but users can optionally customize their display name per room. This provides consistency while allowing flexibility.

**Follow-up 6:** For room access control, should we implement any restrictions on who can join a room? For example:
- Should rooms be "public" (anyone with code can join) vs. "private" (must be invited/approved)?
- Should there be a maximum participant limit per room?
- Should room creators be able to remove/ban participants?

Or should we keep it simple for MVP: anyone with the code can join, no limits, no removal?

**Answer:** Keep it simple for MVP:
- Public rooms only (anyone with code can join)
- No participant limits
- No removal/ban functionality
- These features can be added in Phase 2/3 if needed

## Existing Code to Reference

No similar existing features identified for reference. This is a greenfield implementation establishing the foundational data layer.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
No visual assets were available for analysis. The database schema and authentication flows are purely backend infrastructure without visual UI components at this stage.

## Requirements Summary

### Functional Requirements

#### Database Schema Design
**rooms table:**
- id (uuid, primary key, default: gen_random_uuid())
- room_code (text, unique, not null) - 8 character alphanumeric, case-insensitive
- name (text, not null) - room display name
- leader_id (uuid, foreign key to participants, nullable) - current room leader
- point_scale (enum: 'fibonacci' | 't-shirt', not null) - estimation scale type
- created_at (timestamptz, default: now())
- Indexes: room_code (unique), leader_id

**profiles table (NEW - for auth integration):**
- id (uuid, primary key, default: gen_random_uuid())
- user_id (uuid, foreign key to auth.users, unique, not null)
- display_name (text, not null)
- created_at (timestamptz, default: now())
- Indexes: user_id (unique)

**participants table:**
- id (uuid, primary key, default: gen_random_uuid())
- room_id (uuid, foreign key to rooms, not null, on delete cascade)
- user_id (uuid, foreign key to auth.users, nullable) - links to authenticated user
- name (text, not null) - display name (can override profile default)
- is_leader (boolean, default: false)
- is_active (boolean, default: true) - presence tracking
- joined_at (timestamptz, default: now())
- Unique constraint: (room_id, user_id) - prevent duplicate participants per room
- Indexes: room_id, user_id, (room_id, is_active)

**stories table:**
- id (uuid, primary key, default: gen_random_uuid())
- room_id (uuid, foreign key to rooms, not null, on delete cascade)
- title (text, not null)
- description (text, nullable)
- is_active (boolean, default: true) - current story being estimated
- final_average (numeric, nullable) - consensus estimate after reveal
- created_at (timestamptz, default: now())
- Indexes: room_id, (room_id, is_active)

**votes table:**
- id (uuid, primary key, default: gen_random_uuid())
- story_id (uuid, foreign key to stories, not null, on delete cascade)
- participant_id (uuid, foreign key to participants, not null, on delete cascade)
- point_value (text, not null) - selected estimate (stored as text to support different scales)
- sentiment (text, nullable) - emoji indicator (e.g., 'confident', 'concerned')
- is_revealed (boolean, default: false) - vote visibility control
- created_at (timestamptz, default: now())
- Unique constraint: (story_id, participant_id) - one vote per participant per story
- Indexes: story_id, participant_id, (story_id, is_revealed)

#### Authentication Setup
- Enable Supabase Auth with magic link (passwordless email) provider
- Create profiles table linked to auth.users for display names
- Configure email templates for magic link authentication
- Set up SMTP or use Supabase's built-in email service
- Session management: JWT tokens with automatic refresh
- No login UI required for this spec (infrastructure only)

#### Real-time Subscriptions
- Configure table-level subscriptions with server-side filtering:
  - **votes table**: Filter by story_id (only votes for current story)
  - **participants table**: Filter by room_id (only participants in current room)
  - **stories table**: Filter by room_id (only stories in current room)
- Enable Supabase Realtime for all four tables
- Configure reconnection handling for network interruptions
- Subscription channels should use room-specific topics for isolation

#### Room Joining & Authentication Flow
1. User enters room code on join page
2. System validates room exists (query rooms by room_code)
3. If room exists, prompt for display name
4. User provides display name (no auth required at this point)
5. Create/update participant record with is_active = true
6. User joins room and can participate immediately
7. Optional: User can authenticate later for persistent identity across sessions
8. If authenticated user rejoins same room, reuse existing participant record

#### Leader Management
- Room creator (first participant) is automatically assigned as leader (is_leader = true)
- Store leader_id in rooms table as foreign key to current leader participant
- If leader disconnects (is_active = false), automatically promote another participant:
  - Select random active participant from room
  - Update their is_leader = true
  - Update room.leader_id to new leader's participant.id
- Manual leader transfer not required for MVP

#### Participant Uniqueness & Multi-device Handling
- Unique constraint on (room_id, user_id) prevents duplicate participants per room
- If authenticated user rejoins same room:
  - Reuse existing participant record (don't create new one)
  - Update is_active = true to mark them as present
  - Update joined_at to current timestamp
- Same user cannot join from multiple devices/tabs simultaneously:
  - When user joins, check for existing active participant in that room
  - If found, display error: "You are already in this room from another device"
  - User must disconnect from other session before joining again

#### Row Level Security (RLS) Policies

**rooms table:**
- SELECT: Users can read rooms where they have a participant record (join via participants)
- INSERT: Anyone can create rooms (for anonymous room creation)
- UPDATE: Only room leader can update room settings (check is_leader via participants)
- DELETE: Only room leader can delete rooms (or no delete for MVP - rooms persist)

**profiles table:**
- SELECT: Users can read their own profile (user_id = auth.uid())
- INSERT: Automatically created on first authentication via trigger
- UPDATE: Users can only update their own profile
- DELETE: Users can delete their own profile

**participants table:**
- SELECT: Users can read all participants in rooms they've joined
- INSERT: Anyone can insert (for joining rooms)
- UPDATE: Users can only update their own participant record (id = their participant.id)
- DELETE: Users can only delete their own participant record (for leaving room)

**stories table:**
- SELECT: Users can read stories in rooms they've joined (join via participants)
- INSERT: Only room leader can create stories (check is_leader via participants)
- UPDATE: Only room leader can update stories (title, description, is_active, final_average)
- DELETE: Only room leader can delete stories (or no delete for MVP)

**votes table:**
- SELECT: Users can read votes where:
  - Vote belongs to current user (participant_id = their participant.id), OR
  - Vote is revealed (is_revealed = true) AND user is in the room
- INSERT: Users can insert votes for their own participant_id
- UPDATE: Users can update votes where:
  - Vote belongs to them (participant_id = their participant.id) AND
  - Vote is not yet revealed (is_revealed = false)
- DELETE: Users can delete their own unrevealed votes (for vote changes)

**Special policy for vote reveals:**
- Only room leader can update is_revealed field on votes table
- Implement via separate UPDATE policy checking is_leader status

#### Migration Strategy
- Use Supabase CLI for all schema management
- Store migration files in repository: `/supabase/migrations/`
- Migration naming: `<timestamp>_<description>.sql` (e.g., `20241108000001_initial_schema.sql`)
- Each migration should be idempotent (can be run multiple times safely)
- Version control all migrations in git
- Apply migrations to dev → staging → production in sequence
- Document rollback procedures for each migration

#### Environment Setup
**Separate Supabase Projects:**
- Development: For local/feature branch development
- Staging: For pre-production testing
- Production: For live application

**Environment Variables (per environment):**
```
VITE_SUPABASE_URL=<project-url>
VITE_SUPABASE_ANON_KEY=<anon-public-key>
```

**Configuration:**
- CORS: Allow origins for dev (localhost:5173), staging, and production domains
- API keys: Use anon/public key for frontend client
- Service role key: Store securely for backend operations (if needed)
- Database connection pooling: Use Supabase's default connection pool
- Real-time: Enable for all tables (votes, participants, stories, rooms)

### Reusability Opportunities

No existing components or patterns identified for reuse, as this is the foundational implementation. However, future features will leverage:
- Database schema patterns established here
- RLS policy structures as templates for additional tables
- Real-time subscription patterns for other collaborative features
- Authentication flow as basis for team workspaces (Phase 3, item 21)

### Scope Boundaries

**In Scope:**
- Complete database schema for rooms, participants, stories, votes, profiles
- Supabase Auth setup with magic link provider
- Real-time subscriptions for all tables with room-specific filtering
- Comprehensive RLS policies for all access control requirements
- Migration files for reproducible schema deployment
- Environment configuration for dev, staging, production
- Leader assignment and automatic promotion logic
- Participant uniqueness constraints and multi-device prevention
- Profile management for authenticated users

**Out of Scope:**
- Custom point scales (Phase 3, item 24) - only Fibonacci and T-shirt for MVP
- Audit logging and change history tracking
- Advanced presence tracking (heartbeat intervals, typing indicators)
- Room visibility settings (private rooms, invitations, approval flows)
- Participant limits or removal/ban functionality
- Manual leader transfer UI
- Login/signup UI components (auth infrastructure only)
- Password-based authentication (magic link only)
- OAuth providers (Google, GitHub, Microsoft) - can be added later
- Email template customization (use Supabase defaults)
- Session timeout configuration (use Supabase defaults)
- Database backup and recovery procedures (rely on Supabase)
- Performance monitoring and query optimization (initial implementation only)

**Future Enhancements Mentioned:**
- Custom point scales with team-specific values (item 24)
- Anonymous voting mode (item 12) - may require schema adjustments
- Participant roles beyond leader/voter (item 16) - may require role enum
- Team workspaces (item 21) - will use auth infrastructure established here
- Session recording & playback (item 20) - may require additional audit tables
- Estimation analytics (item 18) - will query existing schema

### Technical Considerations

**Integration Points:**
- Supabase JavaScript client (@supabase/supabase-js) in React frontend
- Supabase CLI for local development and migration management
- TypeScript type generation from database schema
- React Context API for managing Supabase client instance
- React hooks for real-time subscriptions (custom hooks in src/hooks/)

**Existing System Constraints:**
- Must work within Supabase free tier limits:
  - 500 MB database storage
  - 2 GB bandwidth per month
  - 50 MB file storage
  - 2 concurrent connections (realtime)
  - 50,000 monthly active users
- React 19.1.1 with TypeScript (existing frontend stack)
- Vite with Rolldown build system (existing tooling)
- Path aliases: @/ → ./src/ (for Supabase client initialization)

**Technology Preferences Stated:**
- PostgreSQL for structured, relational data
- UUID primary keys for distributed ID generation
- Timestamptz for timezone-aware timestamps
- Enum types for constrained string values (point_scale)
- Foreign key constraints with ON DELETE CASCADE for data integrity
- Indexes on foreign keys and common query patterns
- Server-side filtering for real-time subscriptions (performance)

**Similar Code Patterns to Follow:**
None identified - this is the foundational implementation. However, the patterns established here will inform:
- Database access patterns for future features
- RLS policy structures for additional tables
- Real-time subscription handling in React components
- Authentication flow integration for team workspaces

**Code Quality Standards:**
Based on global standards:
- TypeScript strict mode for type safety
- ESLint v9 with flat config for code quality
- Comprehensive inline comments for RLS policies and complex queries
- Error handling for database operations and real-time subscription failures
- Validation at both application and database levels
- Consistent naming conventions (snake_case for database, camelCase for TypeScript)

**Performance Considerations:**
- Indexes on all foreign keys for efficient joins
- Composite indexes for common multi-column queries
- Server-side filtering for real-time to reduce bandwidth
- Connection pooling via Supabase's pgBouncer
- Query optimization for participant/vote aggregations
- Consider materialized views for session history (future optimization)

**Security Considerations:**
- RLS policies enforce all access control at database level
- Anon key used in frontend (safe to expose publicly)
- Service role key never exposed to frontend
- SQL injection prevention via parameterized queries
- Vote visibility strictly enforced via is_revealed flag
- Leader-only operations enforced via is_leader checks
- User can only modify their own participant/vote records
- Room code collisions handled via unique constraints

**Migration Best Practices:**
- Each migration file represents a single logical change
- Include both UP and DOWN operations (if possible)
- Test migrations on dev environment first
- Create database backups before production migrations
- Document breaking changes in migration comments
- Use IF NOT EXISTS for idempotent operations
- Version migration files in git with descriptive names
