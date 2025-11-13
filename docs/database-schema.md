# Database Schema Documentation

Complete reference for the Story Pointer database schema including tables, relationships, constraints, indexes, and Row Level Security policies.

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Tables](#tables)
4. [Foreign Key Relationships](#foreign-key-relationships)
5. [Indexes](#indexes)
6. [Enums and Custom Types](#enums-and-custom-types)
7. [Functions and Triggers](#functions-and-triggers)
8. [Row Level Security Policies](#row-level-security-policies)
9. [Schema Evolution](#schema-evolution)

## Overview

The Story Pointer database is designed to support real-time collaborative planning poker sessions. The schema includes:

- **5 Core Tables**: rooms, profiles, participants, stories, votes
- **1 Custom Enum**: point_scale_enum
- **3 Functions**: generate_room_code(), handle_new_user(), promote_new_leader()
- **4 Triggers**: Auto room codes, profile creation, leader promotion
- **18 RLS Policies**: Comprehensive access control

### Design Principles

- **UUID Primary Keys**: For distributed ID generation and scalability
- **Cascade Deletes**: Clean up dependent records automatically
- **Foreign Key Constraints**: Maintain referential integrity
- **Indexes on Join Columns**: Optimize query performance
- **RLS at Database Level**: Security enforced regardless of application code
- **Real-time Subscriptions**: All tables support Supabase Realtime

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ENTITY RELATIONSHIP DIAGRAM                      │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────────┐
│   auth.users      │  (Supabase managed)
│ ─────────────────│
│ id (uuid) PK      │
│ email             │
└─────────┬─────────┘
          │
          │ 1:1 (auto-created)
          │
          ↓
┌───────────────────┐
│   profiles        │  User identity across rooms
│ ─────────────────│
│ id (uuid) PK      │
│ user_id (uuid) FK │──> auth.users.id
│ display_name      │
│ created_at        │
└───────────────────┘

┌───────────────────┐
│   rooms           │  Planning poker sessions
│ ─────────────────│
│ id (uuid) PK      │←────┐
│ room_code (text)  │     │
│ name (text)       │     │ 1:N
│ leader_id (uuid)  │─────┼──> participants.id (current leader)
│ point_scale (enum)│     │
│ created_at        │     │
└─────────┬─────────┘     │
          │               │
          │ 1:N           │
          │               │
          ↓               │
┌───────────────────┐     │
│  participants     │     │
│ ─────────────────│     │
│ id (uuid) PK      │─────┘
│ room_id (uuid) FK │──> rooms.id
│ user_id (uuid) FK │──> auth.users.id (nullable for anonymous)
│ name (text)       │
│ is_leader (bool)  │
│ is_active (bool)  │
│ joined_at         │
│ UNIQUE(room,user) │
└─────────┬─────────┘
          │
          │ 1:N
          │
          ↓
┌───────────────────┐
│     votes         │  Participant estimates
│ ─────────────────│
│ id (uuid) PK      │
│ story_id (uuid)FK │──> stories.id
│ participant_id FK │──> participants.id
│ point_value (text)│
│ sentiment (text)  │
│ is_revealed (bool)│
│ created_at        │
│ UNIQUE(story,part)│
└───────────────────┘
          ↑
          │ N:1
          │
┌───────────────────┐
│     stories       │  Items being estimated
│ ─────────────────│
│ id (uuid) PK      │
│ room_id (uuid) FK │──> rooms.id
│ title (text)      │
│ description (text)│
│ is_active (bool)  │
│ final_average     │
│ created_at        │
└───────────────────┘
          ↑
          │ N:1
          │
          └─────────────┘
```

### Relationship Summary

- **auth.users → profiles**: 1:1 (auto-created on signup)
- **rooms → participants**: 1:N (room has many participants)
- **participants → rooms.leader_id**: N:1 (current leader reference)
- **participants → votes**: 1:N (participant submits many votes)
- **rooms → stories**: 1:N (room has many stories)
- **stories → votes**: 1:N (story has many votes)

## Tables

### profiles

Stores user identity information for authenticated users.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| user_id | uuid | FOREIGN KEY → auth.users(id), UNIQUE, NOT NULL | Links to auth user |
| display_name | text | NOT NULL | User's display name |
| created_at | timestamptz | DEFAULT NOW(), NOT NULL | Account creation time |

**Indexes**:
- `profiles_pkey` (PRIMARY KEY on id)
- `profiles_user_id_key` (UNIQUE on user_id)

**Purpose**: Provides consistent identity across multiple rooms. Auto-created on first authentication via trigger.

**Usage Pattern**:
```typescript
// Profile is auto-created on signup
const { data: { user } } = await supabase.auth.signUp({ email });

// Profile is available immediately
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();
```

---

### rooms

Represents a planning poker session.

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL CHECK (room_code ~ '^[A-Z0-9]{8}$'),
  name TEXT NOT NULL,
  leader_id UUID REFERENCES participants(id) ON DELETE SET NULL,
  point_scale point_scale_enum NOT NULL DEFAULT 'fibonacci',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| room_code | text | UNIQUE, NOT NULL, CHECK pattern | 8-char alphanumeric code |
| name | text | NOT NULL | Room display name |
| leader_id | uuid | FOREIGN KEY → participants(id), NULLABLE | Current leader |
| point_scale | point_scale_enum | NOT NULL, DEFAULT 'fibonacci' | Estimation scale |
| created_at | timestamptz | DEFAULT NOW(), NOT NULL | Room creation time |

**Indexes**:
- `rooms_pkey` (PRIMARY KEY on id)
- `rooms_room_code_key` (UNIQUE on room_code)
- Index on leader_id (foreign key)

**Purpose**: Central entity representing a planning poker session. Each room has a unique shareable code for joining.

**Room Code Generation**: Automatically generated by `set_room_code_on_insert()` trigger using `generate_room_code()` function.

**Usage Pattern**:
```typescript
// Create room
const room = await createRoom('Sprint Planning', 'fibonacci');
// room_code is auto-generated: "A7B9C2D5"

// Join room by code
const room = await getRoomByCode('A7B9C2D5');
```

---

### participants

Represents a user's participation in a specific room.

```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_leader BOOLEAN DEFAULT false NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (room_id, user_id)
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| room_id | uuid | FOREIGN KEY → rooms(id) CASCADE, NOT NULL | Room reference |
| user_id | uuid | FOREIGN KEY → auth.users(id) CASCADE, NULLABLE | User reference (null = anonymous) |
| name | text | NOT NULL | Display name in this room |
| is_leader | boolean | DEFAULT false, NOT NULL | Leader status flag |
| is_active | boolean | DEFAULT true, NOT NULL | Presence status |
| joined_at | timestamptz | DEFAULT NOW(), NOT NULL | Join timestamp |

**Constraints**:
- `UNIQUE (room_id, user_id)`: Prevents duplicate participants per room

**Indexes**:
- `participants_pkey` (PRIMARY KEY on id)
- Index on room_id
- Index on user_id
- `idx_participants_room_active` (room_id, is_active) - Optimizes active participant queries

**Purpose**: Links users to rooms, tracks presence, and identifies the current leader.

**Leader Promotion**: When a leader disconnects (is_active → false), the `handle_leader_disconnection()` trigger automatically promotes another active participant.

**Usage Pattern**:
```typescript
// Join room as first participant (becomes leader)
const participant = await joinRoom(roomId, userId, 'Alice');
// participant.is_leader === true

// Join room as subsequent participant
const participant2 = await joinRoom(roomId, userId2, 'Bob');
// participant2.is_leader === false

// Rejoin room (reactivates existing participant)
const rejoin = await joinRoom(roomId, userId, 'Alice Updated');
// Reuses existing participant record
```

---

### stories

Represents a user story or task being estimated.

```sql
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  final_average NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| room_id | uuid | FOREIGN KEY → rooms(id) CASCADE, NOT NULL | Room reference |
| title | text | NOT NULL | Story title |
| description | text | NULLABLE | Story details |
| is_active | boolean | DEFAULT true, NOT NULL | Currently being estimated |
| final_average | numeric | NULLABLE | Consensus estimate |
| created_at | timestamptz | DEFAULT NOW(), NOT NULL | Story creation time |

**Indexes**:
- `stories_pkey` (PRIMARY KEY on id)
- Index on room_id
- `idx_stories_room_active` (room_id, is_active) - Optimizes current story queries

**Purpose**: Represents items being estimated in a planning poker session. Only one story is typically active at a time.

**Usage Pattern**:
```typescript
// Leader creates story
const story = await createStory(roomId, 'Implement login', 'Add JWT auth');

// Leader activates story for voting
await setActiveStory(story.id);

// Get current story
const activeStory = await getActiveStory(roomId);

// After reveal, save consensus
await updateStoryAverage(story.id, 5);
```

---

### votes

Represents a participant's estimate for a story.

```sql
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE NOT NULL,
  point_value TEXT NOT NULL,
  sentiment TEXT,
  is_revealed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (story_id, participant_id)
);
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier |
| story_id | uuid | FOREIGN KEY → stories(id) CASCADE, NOT NULL | Story reference |
| participant_id | uuid | FOREIGN KEY → participants(id) CASCADE, NOT NULL | Voter reference |
| point_value | text | NOT NULL | Estimate value (supports different scales) |
| sentiment | text | NULLABLE | Emoji indicator (e.g., 'confident', 'concerned') |
| is_revealed | boolean | DEFAULT false, NOT NULL | Vote visibility status |
| created_at | timestamptz | DEFAULT NOW(), NOT NULL | Vote submission time |

**Constraints**:
- `UNIQUE (story_id, participant_id)`: One vote per participant per story

**Indexes**:
- `votes_pkey` (PRIMARY KEY on id)
- Index on story_id
- Index on participant_id
- `idx_votes_story_revealed` (story_id, is_revealed) - Optimizes reveal operations

**Purpose**: Stores participants' estimates. Votes are hidden until leader reveals them.

**Usage Pattern**:
```typescript
// Submit vote (or update existing)
await submitVote(storyId, participantId, '5', 'confident');

// Leader reveals all votes
await revealVotes(storyId);

// Get revealed votes
const votes = await getStoryVotes(storyId);
// RLS automatically filters unrevealed votes for non-leaders
```

## Foreign Key Relationships

### Cascade Behavior

All foreign keys use `ON DELETE CASCADE` except `rooms.leader_id` which uses `ON DELETE SET NULL`.

| From Table | Column | To Table | On Delete | Purpose |
|------------|--------|----------|-----------|---------|
| profiles | user_id | auth.users | CASCADE | Delete profile when user deleted |
| participants | room_id | rooms | CASCADE | Delete participants when room deleted |
| participants | user_id | auth.users | CASCADE | Delete participant when user deleted |
| stories | room_id | rooms | CASCADE | Delete stories when room deleted |
| votes | story_id | stories | CASCADE | Delete votes when story deleted |
| votes | participant_id | participants | CASCADE | Delete votes when participant deleted |
| rooms | leader_id | participants | SET NULL | Clear leader when participant deleted |

### Circular Reference Handling

The `rooms.leader_id → participants.id` relationship creates a circular reference:
- Room references participant as leader
- Participant references room as member

**Resolution**: `leader_id` uses `ON DELETE SET NULL` to break the cycle. When a participant is deleted, the room's leader_id is nulled, then the trigger promotes a new leader.

## Indexes

All indexes are created in the initial schema migration (`20251109020336_initial_schema.sql`).

### Primary Key Indexes

- `profiles_pkey` ON profiles(id)
- `rooms_pkey` ON rooms(id)
- `participants_pkey` ON participants(id)
- `stories_pkey` ON stories(id)
- `votes_pkey` ON votes(id)

### Unique Constraint Indexes

- `profiles_user_id_key` ON profiles(user_id) - Ensures 1:1 with auth.users
- `rooms_room_code_key` ON rooms(room_code) - Ensures unique room codes
- `participants_room_id_user_id_key` ON participants(room_id, user_id) - Prevents duplicate joins
- `votes_story_id_participant_id_key` ON votes(story_id, participant_id) - One vote per participant per story

### Foreign Key Indexes

Automatically created for foreign key columns:
- Index on participants(room_id)
- Index on participants(user_id)
- Index on stories(room_id)
- Index on votes(story_id)
- Index on votes(participant_id)

### Composite Performance Indexes

- `idx_participants_room_active` ON participants(room_id, is_active)
  - **Purpose**: Optimize queries for active participants in a room
  - **Query**: `SELECT * FROM participants WHERE room_id = ? AND is_active = true`

- `idx_stories_room_active` ON stories(room_id, is_active)
  - **Purpose**: Optimize queries for the active story in a room
  - **Query**: `SELECT * FROM stories WHERE room_id = ? AND is_active = true`

- `idx_votes_story_revealed` ON votes(story_id, is_revealed)
  - **Purpose**: Optimize queries for revealed votes
  - **Query**: `SELECT * FROM votes WHERE story_id = ? AND is_revealed = true`

## Enums and Custom Types

### point_scale_enum

```sql
CREATE TYPE point_scale_enum AS ENUM ('fibonacci', 't-shirt');
```

**Values**:
- `'fibonacci'`: Fibonacci sequence (1, 2, 3, 5, 8, 13, 21, ...)
- `'t-shirt'`: T-shirt sizes (XS, S, M, L, XL, XXL)

**Usage**: Stored in `rooms.point_scale` to determine the estimation scale for the room.

**Future Enhancement**: Custom point scales will be added in Phase 3 (roadmap item 24).

## Functions and Triggers

### generate_room_code()

**Purpose**: Generates unique 8-character alphanumeric room codes.

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  code_exists BOOLEAN;
  max_attempts INTEGER := 10;
  attempt INTEGER := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    SELECT EXISTS(SELECT 1 FROM rooms WHERE room_code = result) INTO code_exists;

    IF NOT code_exists THEN
      RETURN result;
    END IF;

    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique room code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql VOLATILE;
```

**Features**:
- Generates codes from A-Z and 0-9
- Checks for uniqueness before returning
- Maximum 10 retry attempts to prevent infinite loops
- Raises exception if unique code cannot be generated

**Usage**: Called by `set_room_code_on_insert()` trigger when creating rooms.

---

### handle_new_user()

**Purpose**: Auto-creates profile when a new user signs up.

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();
```

**Features**:
- Automatically runs on user signup
- Uses display_name from metadata if provided, otherwise derives from email
- Uses `ON CONFLICT DO NOTHING` for idempotency
- `SECURITY DEFINER` grants permission to insert into profiles

**Usage**: Transparent to application code. Profile exists immediately after signup.

---

### promote_new_leader()

**Purpose**: Automatically promotes a new leader when current leader disconnects.

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION promote_new_leader(room_id_param UUID)
RETURNS VOID AS $$
DECLARE
  new_leader_id UUID;
BEGIN
  SELECT id INTO new_leader_id
  FROM participants
  WHERE room_id = room_id_param
    AND is_active = true
    AND is_leader = false
  ORDER BY RANDOM()
  LIMIT 1;

  IF new_leader_id IS NOT NULL THEN
    UPDATE participants
    SET is_leader = true
    WHERE id = new_leader_id;

    UPDATE rooms
    SET leader_id = new_leader_id
    WHERE id = room_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_leader_disconnection()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_leader = true AND OLD.is_active = true AND NEW.is_active = false THEN
    PERFORM promote_new_leader(NEW.room_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_leader_disconnect
AFTER UPDATE ON participants
FOR EACH ROW
EXECUTE FUNCTION handle_leader_disconnection();
```

**Features**:
- Triggers when leader's `is_active` changes from true to false
- Randomly selects an active non-leader participant
- Updates both participants and rooms tables
- Prevents orphaned rooms without leaders

**Usage**: Transparent to application code. Leader promotion happens automatically.

---

### set_room_code_on_insert()

**Purpose**: Auto-generates room_code when creating a room.

**Implementation**:
```sql
CREATE OR REPLACE FUNCTION set_room_code_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.room_code IS NULL OR NEW.room_code = '' THEN
    NEW.room_code := generate_room_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_room_code_before_insert
BEFORE INSERT ON rooms
FOR EACH ROW
EXECUTE FUNCTION set_room_code_on_insert();
```

**Features**:
- Runs before INSERT on rooms table
- Generates code only if not provided
- Uses `generate_room_code()` function

**Usage**: Application can omit room_code when creating rooms:
```typescript
const { data } = await supabase.from('rooms').insert({ name, point_scale });
// room_code is auto-generated
```

## Row Level Security Policies

All tables have RLS enabled. See [RLS Policies Documentation](/docs/rls-policies.md) for complete details.

### Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| **profiles** | Own profile only | Auto (trigger) | Own profile only | Own profile only |
| **rooms** | Joined rooms | Anyone (anonymous) | Leader only | No policy (persist) |
| **participants** | Same room | Anyone (anonymous) | Own record only | Own record only |
| **stories** | Joined rooms | Leader only | Leader only | No policy (persist) |
| **votes** | Own + revealed | Own participant | Own unrevealed + leader reveal | Own unrevealed |

### Key Security Features

1. **Vote Privacy**: Participants cannot see others' votes until `is_revealed = true`
2. **Leader-Only Operations**: Only leader can create/update stories and reveal votes
3. **Anonymous Support**: Anyone can create rooms and join as participant
4. **Record Ownership**: Users can only modify their own participant/profile records

## Schema Evolution

### Migration History

| Migration | Description | Date |
|-----------|-------------|------|
| 20251109020336_initial_schema.sql | Core tables, constraints, indexes | 2025-11-09 |
| 20251109020411_functions_and_triggers.sql | Automation (room codes, profiles, leaders) | 2025-11-09 |
| 20251109041328_rls_policies.sql | 18 RLS policies for all tables | 2025-11-09 |
| 20251109042817_fix_participants_rls.sql | Fix participants SELECT policy | 2025-11-09 |
| 20251109043114_fix_rooms_select_anonymous.sql | Fix anonymous room access | 2025-11-09 |

### Future Schema Changes

Potential future enhancements (not yet implemented):

1. **Custom Point Scales** (Phase 3, item 24)
   - Add `point_scales` table for team-specific scales
   - Add `custom_scale_id` to rooms table

2. **Anonymous Voting Mode** (roadmap item 12)
   - May require `anonymous_voting` flag on rooms or stories

3. **Participant Roles** (roadmap item 16)
   - Add `role` enum: observer, voter, leader
   - Replace `is_leader` boolean with role-based approach

4. **Session Recording** (roadmap item 20)
   - Add audit tables for vote history
   - Track story state changes

5. **Updated Timestamps**
   - Add `updated_at` columns to rooms, stories
   - Add update triggers

## Related Documentation

- [Database Migrations Guide](/docs/database-migrations.md) - How to modify schema
- [Database Operations Guide](/docs/database-operations.md) - Using schema in application
- [RLS Policies Documentation](/docs/rls-policies.md) - Access control details
- [Environment Setup Guide](/docs/environment-setup.md) - Setting up database locally
