# Spec Initialization: Database Schema & Supabase Setup

## Feature Name
Database Schema & Supabase Setup

## Feature Purpose
This is the foundational feature for the Story Pointer application that establishes the backend infrastructure and data layer required for all subsequent features. It creates the Supabase project, designs and implements the database schema, configures real-time subscriptions for live collaborative updates, sets up authentication for future team workspaces, and implements Row Level Security (RLS) policies for data access control.

## Key Components

### 1. Supabase Project Setup
- Create new Supabase project (development, staging, production environments)
- Configure project settings and billing
- Set up environment variables for frontend connection
- Configure CORS and allowed origins
- Set up API keys and security settings

### 2. Database Schema Design & Implementation
Create PostgreSQL tables with proper relationships, constraints, and indexes:

**rooms** table:
- Stores planning session information
- Fields: id, room_code, name, leader_id, point_scale, created_at, updated_at
- Unique room codes for joining
- Reference to leader participant

**participants** table:
- Tracks users in each room
- Fields: id, room_id, name, is_leader, is_active, joined_at
- Presence tracking for active users
- Leader role identification

**stories** table:
- Stores stories being estimated within rooms
- Fields: id, room_id, title, description, is_active, final_average, created_at
- Tracks current active story
- Stores final consensus estimate

**votes** table:
- Records individual participant votes
- Fields: id, story_id, participant_id, point_value, sentiment, is_revealed, created_at
- Hidden votes until reveal
- Sentiment emoji indicators

### 3. Real-time Subscriptions Configuration
- Configure Supabase real-time for instant data synchronization
- Set up subscription channels for:
  - Vote changes (filtered by active story)
  - Participant list updates (filtered by room)
  - Story updates (for current room)
- Handle connection/reconnection logic
- Configure message broadcasting and filtering

### 4. Authentication Setup
- Set up Supabase Auth for future team workspaces feature
- Configure authentication providers (email, OAuth options)
- Set up user sessions and token management
- Configure password policies and security settings
- Prepare user table structure for future use

### 5. Row Level Security (RLS) Policies
- Implement database-level access control policies
- Room data: Users can only access rooms they've joined
- Participant data: Read access for room members, write for self
- Story data: Read for room participants, write for room leader
- Vote data: Write own votes, read all votes only after reveal
- Prevent unauthorized data access and manipulation

## Why This Is Important

This feature is the foundation that enables all other features in the Story Pointer application:

1. **Data Persistence**: Without the database schema, the application cannot store room, participant, story, or vote data

2. **Real-time Collaboration**: Real-time subscriptions are essential for the core value proposition - instant synchronization of votes, reveals, and participant status across all users

3. **Security & Access Control**: RLS policies ensure data privacy and prevent unauthorized access, critical for team trust and data integrity

4. **Scalability Foundation**: Proper schema design, indexing, and relationships enable efficient queries as data grows

5. **Future-Proofing**: Authentication setup prepares for Phase 3 team workspaces feature without requiring schema refactoring

6. **Development Unblocking**: All subsequent features (room creation, voting, reveals, etc.) depend on this infrastructure being in place

## Success Criteria

- Supabase project created and accessible
- All four tables created with correct schema, relationships, and constraints
- Real-time subscriptions functional for all required tables
- RLS policies tested and enforcing correct access control
- Frontend can connect to Supabase and perform CRUD operations
- Database schema supports MVP features (items 1-6 on roadmap)
- Documentation of schema design decisions and access patterns

## Dependencies

- Supabase account and project creation access
- Frontend environment variables configuration
- TypeScript type definitions for database schema
- Supabase client library integration in React app

## Constraints

- Must support the point scales defined in roadmap (Fibonacci, T-shirt sizes, future custom)
- Schema must be designed for efficient real-time queries
- RLS policies must balance security with performance
- Must work within Supabase free tier limits for MVP phase
