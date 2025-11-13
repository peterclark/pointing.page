# Database Operations Guide

Developer guide for working with the Story Pointer database including query utility functions, real-time subscription patterns, common operations, and error handling.

## Table of Contents

1. [Overview](#overview)
2. [Setup](#setup)
3. [Query Utility Functions](#query-utility-functions)
4. [Real-time Subscription Patterns](#real-time-subscription-patterns)
5. [Common Operations](#common-operations)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Testing](#testing)

## Overview

The Story Pointer application provides a comprehensive set of TypeScript utilities for database operations. These utilities are:

- **Type-Safe**: Fully typed using generated database types
- **Error-Handled**: Consistent error handling with descriptive messages
- **RLS-Aware**: Respects Row Level Security policies
- **Real-time Ready**: Integrates with Supabase Realtime subscriptions

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  React Components / Business Logic                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│              Query Utilities & Hooks Layer                   │
│  /src/lib/supabase/queries.ts (database operations)         │
│  /src/hooks/useRealtimeSubscription.ts (live updates)       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Client Layer                      │
│  /src/lib/supabase/client.ts (typed client)                 │
│  /src/lib/supabase/database.types.ts (generated types)      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Database (PostgreSQL)              │
│  Tables, RLS Policies, Functions, Triggers                  │
└─────────────────────────────────────────────────────────────┘
```

## Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Configure Environment Variables

Create `.env.local`:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

See [Environment Setup Guide](/docs/environment-setup.md) for details.

### 3. Import Utilities

```typescript
// Query functions
import {
  getRoomByCode,
  createRoom,
  joinRoom,
  submitVote,
  revealVotes
} from '@/lib/supabase/queries';

// Real-time hooks
import {
  useRoomParticipants,
  useRoomStories,
  useStoryVotes
} from '@/hooks/useRealtimeSubscription';

// Database types
import type { Tables } from '@/lib/supabase/client';
```

## Query Utility Functions

All query functions are located in `/src/lib/supabase/queries.ts` and follow consistent patterns.

### Room Operations

#### Create Room

```typescript
import { createRoom } from '@/lib/supabase/queries';

// Create room with Fibonacci scale (default)
const room = await createRoom('Sprint Planning');

// Create room with T-shirt sizing
const room = await createRoom('Feature Estimation', 't-shirt');

// Result
console.log(room);
// {
//   id: 'uuid',
//   room_code: 'A7B9C2D5',
//   name: 'Sprint Planning',
//   point_scale: 'fibonacci',
//   leader_id: null,  // Set when first participant joins
//   created_at: '2025-11-09T...'
// }
```

**Notes**:
- Room code is auto-generated (8-character alphanumeric)
- Anyone can create a room (supports anonymous users)
- First participant to join becomes the leader

#### Get Room by Code

```typescript
import { getRoomByCode } from '@/lib/supabase/queries';

const room = await getRoomByCode('A7B9C2D5');

if (!room) {
  console.error('Room not found');
  return;
}

console.log(room.name);  // 'Sprint Planning'
console.log(room.point_scale);  // 'fibonacci'
```

**Notes**:
- Returns `null` if room not found
- Case-insensitive (converts to uppercase)
- RLS policy checks if user is a participant

#### Update Room Settings

```typescript
import { updateRoom } from '@/lib/supabase/queries';

// Update room name
await updateRoom(roomId, { name: 'Updated Sprint Planning' });

// Update point scale
await updateRoom(roomId, { point_scale: 't-shirt' });

// Update both
await updateRoom(roomId, {
  name: 'New Name',
  point_scale: 'fibonacci'
});
```

**Notes**:
- Only room leader can update
- RLS policy enforces leader-only access
- Throws `DatabaseError` if not leader

---

### Participant Operations

#### Join Room

```typescript
import { joinRoom } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';

// Get current user
const { data: { user } } = await supabase.auth.getUser();

// Join room (authenticated)
const participant = await joinRoom(
  roomId,
  user?.id || null,
  'Alice'
);

console.log(participant);
// {
//   id: 'uuid',
//   room_id: 'uuid',
//   user_id: 'uuid',
//   name: 'Alice',
//   is_leader: true,  // If first participant
//   is_active: true,
//   joined_at: '2025-11-09T...'
// }
```

**Behavior**:
- If first participant: becomes leader
- If existing participant: reactivates and updates name
- If duplicate user: returns existing participant (no duplicate error)

**Anonymous Users**:
```typescript
// Join without authentication
const participant = await joinRoom(roomId, null, 'Anonymous User');
```

#### Get Active Participants

```typescript
import { getActiveParticipants } from '@/lib/supabase/queries';

const participants = await getActiveParticipants(roomId);

console.log(participants);
// [
//   { id: 'uuid1', name: 'Alice', is_leader: true, is_active: true, ... },
//   { id: 'uuid2', name: 'Bob', is_leader: false, is_active: true, ... },
//   { id: 'uuid3', name: 'Charlie', is_leader: false, is_active: true, ... }
// ]
```

**Notes**:
- Only returns participants where `is_active = true`
- Ordered by `joined_at` (oldest first)
- RLS policy filters to rooms user has joined

#### Leave Room

```typescript
import { leaveRoom } from '@/lib/supabase/queries';

// Set participant as inactive
await leaveRoom(participantId);

// If participant was leader, trigger auto-promotes another participant
```

**Notes**:
- Sets `is_active = false` (doesn't delete record)
- If leader leaves, `handle_leader_disconnection()` trigger promotes new leader
- Participant can rejoin later (reactivates existing record)

---

### Story Operations

#### Create Story

```typescript
import { createStory } from '@/lib/supabase/queries';

// Create story with description
const story = await createStory(
  roomId,
  'Implement user authentication',
  'Add JWT-based auth with magic link login'
);

// Create story without description
const story = await createStory(roomId, 'Fix bug #123');

console.log(story);
// {
//   id: 'uuid',
//   room_id: 'uuid',
//   title: 'Implement user authentication',
//   description: 'Add JWT-based auth...',
//   is_active: false,  // Not active by default
//   final_average: null,
//   created_at: '2025-11-09T...'
// }
```

**Notes**:
- Only room leader can create stories
- Story created as `is_active = false` (leader activates when ready)
- RLS policy enforces leader-only access

#### Activate Story

```typescript
import { setActiveStory } from '@/lib/supabase/queries';

// Activate story for voting
await setActiveStory(storyId);

// Only one story can be active at a time
// (automatically deactivates other stories in the room)
```

**Notes**:
- Only room leader can activate stories
- Deactivates all other stories in the same room
- Voting typically happens on the active story

#### Get Active Story

```typescript
import { getActiveStory } from '@/lib/supabase/queries';

const activeStory = await getActiveStory(roomId);

if (activeStory) {
  console.log('Voting on:', activeStory.title);
} else {
  console.log('No active story');
}
```

**Notes**:
- Returns `null` if no story is active
- Only one story should be active per room
- Use this to display the current voting item

---

### Vote Operations

#### Submit Vote

```typescript
import { submitVote } from '@/lib/supabase/queries';

// Submit vote with sentiment
await submitVote(
  storyId,
  participantId,
  '5',
  'confident'
);

// Submit vote without sentiment
await submitVote(storyId, participantId, '8');

// Change vote (upserts existing vote)
await submitVote(storyId, participantId, '3', 'concerned');
```

**Point Values**:
- Fibonacci: '1', '2', '3', '5', '8', '13', '21', ...
- T-shirt: 'XS', 'S', 'M', 'L', 'XL', 'XXL'

**Sentiment** (optional):
- 'confident' - High confidence in estimate
- 'concerned' - Low confidence, needs discussion
- 'uncertain' - Not sure, need more info

**Notes**:
- Uses `upsert` to insert or update existing vote
- Participants can change their vote before reveal
- RLS policy prevents voting for other participants

#### Reveal Votes

```typescript
import { revealVotes } from '@/lib/supabase/queries';

// Leader reveals all votes for a story
await revealVotes(storyId);

// All votes now have is_revealed = true
// Participants can now see each other's votes
```

**Notes**:
- Only room leader can reveal votes
- Sets `is_revealed = true` on all votes for the story
- RLS policy enforces leader-only access

#### Get Story Votes

```typescript
import { getStoryVotes } from '@/lib/supabase/queries';

const votes = await getStoryVotes(storyId);

console.log(votes);
// [
//   { id: 'uuid1', participant_id: 'uuid1', point_value: '5', is_revealed: true, ... },
//   { id: 'uuid2', participant_id: 'uuid2', point_value: '8', is_revealed: true, ... },
//   { id: 'uuid3', participant_id: 'uuid3', point_value: '5', is_revealed: true, ... }
// ]
```

**Notes**:
- Returns all votes user has permission to see
- RLS policy filters:
  - User's own votes (regardless of `is_revealed`)
  - Other users' votes where `is_revealed = true`
- Before reveal: user only sees their own vote
- After reveal: user sees all votes

#### Update Story Average

```typescript
import { updateStoryAverage } from '@/lib/supabase/queries';

// Calculate average from votes
const votes = await getStoryVotes(storyId);
const average = votes.reduce((sum, v) => sum + parseInt(v.point_value), 0) / votes.length;

// Save consensus estimate
await updateStoryAverage(storyId, average);
```

**Notes**:
- Only room leader can update
- Typically done after reveal to record consensus
- Stored as `final_average` on stories table

## Real-time Subscription Patterns

Real-time subscriptions enable live collaborative features. See [Real-time Subscriptions Documentation](/docs/realtime-subscriptions.md) for complete details.

### Setup

Real-time must be enabled in Supabase Dashboard:
1. Navigate to: Database > Replication
2. Enable replication for: rooms, participants, stories, votes, profiles
3. Select event types: INSERT, UPDATE, DELETE

### Subscribe to Room Participants

```typescript
import { useRoomParticipants } from '@/hooks/useRealtimeSubscription';

function RoomParticipantList({ roomId }: { roomId: string }) {
  const participants = useRoomParticipants(roomId);

  return (
    <ul>
      {participants.map(p => (
        <li key={p.id}>
          {p.name} {p.is_leader && '(Leader)'}
        </li>
      ))}
    </ul>
  );
}
```

**Events**:
- INSERT: New participant joins
- UPDATE: Participant name changes, leader promoted, status toggled
- DELETE: Participant removed (rare, usually just set is_active=false)

### Subscribe to Room Stories

```typescript
import { useRoomStories } from '@/hooks/useRealtimeSubscription';

function StoryList({ roomId }: { roomId: string }) {
  const stories = useRoomStories(roomId);
  const activeStory = stories.find(s => s.is_active);

  return (
    <div>
      <h3>Current Story: {activeStory?.title || 'None'}</h3>
      <ul>
        {stories.map(s => (
          <li key={s.id}>{s.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

**Events**:
- INSERT: New story created
- UPDATE: Story activated, description changed, final_average saved
- DELETE: Rare (stories persist for history)

### Subscribe to Story Votes

```typescript
import { useStoryVotes } from '@/hooks/useRealtimeSubscription';

function VoteDisplay({ storyId }: { storyId: string }) {
  const votes = useStoryVotes(storyId);
  const allRevealed = votes.length > 0 && votes.every(v => v.is_revealed);

  return (
    <div>
      <p>Votes submitted: {votes.length}</p>
      {allRevealed && (
        <ul>
          {votes.map(v => (
            <li key={v.id}>
              Participant {v.participant_id}: {v.point_value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

**Events**:
- INSERT: New vote submitted
- UPDATE: Vote changed (before reveal) or revealed (is_revealed=true)
- DELETE: Vote deleted (rare, can happen before reveal)

**RLS Filtering**:
- Before reveal: User only receives events for their own votes
- After reveal: User receives events for all votes in the story

### Manual Subscription Example

If you need more control than the provided hooks:

```typescript
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

function useCustomSubscription(roomId: string) {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Initial data fetch
    const fetchData = async () => {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_active', true);
      setData(data || []);
    };
    fetchData();

    // Subscribe to changes
    const channel = supabase
      .channel(`room:${roomId}:participants`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Change received:', payload);
          // Update state based on event type
          if (payload.eventType === 'INSERT') {
            setData(prev => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setData(prev => prev.map(p =>
              p.id === payload.new.id ? payload.new : p
            ));
          } else if (payload.eventType === 'DELETE') {
            setData(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return data;
}
```

## Common Operations

### Complete Room Creation Flow

```typescript
import { createRoom, joinRoom } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';

async function createAndJoinRoom(roomName: string, userName: string) {
  try {
    // 1. Create room
    const room = await createRoom(roomName, 'fibonacci');
    console.log('Room created:', room.room_code);

    // 2. Get current user (or use null for anonymous)
    const { data: { user } } = await supabase.auth.getUser();

    // 3. Join room as first participant (becomes leader)
    const participant = await joinRoom(room.id, user?.id || null, userName);
    console.log('Joined as leader:', participant.is_leader);

    return { room, participant };
  } catch (error) {
    console.error('Failed to create room:', error);
    throw error;
  }
}

// Usage
const { room, participant } = await createAndJoinRoom('Sprint Planning', 'Alice');
console.log('Share this code:', room.room_code);
```

### Complete Join Room Flow

```typescript
import { getRoomByCode, joinRoom } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';

async function joinExistingRoom(roomCode: string, userName: string) {
  try {
    // 1. Validate room exists
    const room = await getRoomByCode(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    // 2. Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // 3. Join room
    const participant = await joinRoom(room.id, user?.id || null, userName);
    console.log('Joined room:', room.name);
    console.log('Is leader:', participant.is_leader);

    return { room, participant };
  } catch (error) {
    console.error('Failed to join room:', error);
    throw error;
  }
}

// Usage
const { room, participant } = await joinExistingRoom('A7B9C2D5', 'Bob');
```

### Complete Voting Flow

```typescript
import {
  getActiveStory,
  submitVote,
  getStoryVotes,
  revealVotes,
  updateStoryAverage
} from '@/lib/supabase/queries';

// Participant submits vote
async function vote(roomId: string, participantId: string, pointValue: string) {
  // 1. Get active story
  const story = await getActiveStory(roomId);
  if (!story) {
    throw new Error('No active story');
  }

  // 2. Submit vote
  await submitVote(story.id, participantId, pointValue, 'confident');
  console.log('Vote submitted');
}

// Leader reveals votes and saves consensus
async function revealAndCalculate(roomId: string) {
  // 1. Get active story
  const story = await getActiveStory(roomId);
  if (!story) {
    throw new Error('No active story');
  }

  // 2. Reveal votes
  await revealVotes(story.id);
  console.log('Votes revealed');

  // 3. Get all votes
  const votes = await getStoryVotes(story.id);

  // 4. Calculate average (Fibonacci values only)
  const numericVotes = votes
    .map(v => parseInt(v.point_value))
    .filter(v => !isNaN(v));

  const average = numericVotes.reduce((sum, v) => sum + v, 0) / numericVotes.length;

  // 5. Save consensus
  await updateStoryAverage(story.id, average);
  console.log('Consensus saved:', average);

  return { votes, average };
}

// Usage
await vote(roomId, participantId, '5');
const { votes, average } = await revealAndCalculate(roomId);
```

### Complete Story Management Flow

```typescript
import {
  createStory,
  setActiveStory,
  getActiveStory
} from '@/lib/supabase/queries';

async function manageStories(roomId: string) {
  // 1. Create multiple stories
  const story1 = await createStory(roomId, 'User Authentication');
  const story2 = await createStory(roomId, 'Dashboard UI');
  const story3 = await createStory(roomId, 'API Integration');
  console.log('Created 3 stories');

  // 2. Activate first story
  await setActiveStory(story1.id);
  console.log('Story 1 active');

  // 3. Verify active story
  const active = await getActiveStory(roomId);
  console.log('Current story:', active?.title);

  // 4. After voting completes, move to next story
  await setActiveStory(story2.id);
  console.log('Story 2 active');

  return [story1, story2, story3];
}
```

## Error Handling

All query functions use a custom `DatabaseError` class for consistent error handling.

### DatabaseError Structure

```typescript
class DatabaseError extends Error {
  name: 'DatabaseError';
  code?: string;        // PostgreSQL error code
  details?: unknown;    // Original error object
}
```

### Catching Errors

```typescript
import { DatabaseError } from '@/lib/supabase/queries';

try {
  await updateRoom(roomId, { name: 'New Name' });
} catch (error) {
  if (error instanceof DatabaseError) {
    console.error('Database error:', error.message);
    console.error('Error code:', error.code);

    // Handle specific errors
    if (error.code === 'PGRST116') {
      // RLS policy blocked the operation
      alert('Permission denied. Only the room leader can update settings.');
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Common Error Codes

| Code | Meaning | Common Cause |
|------|---------|--------------|
| PGRST116 | Row not found or RLS blocked | User lacks permission (not leader, not in room) |
| 23505 | Unique constraint violation | Duplicate room code, duplicate vote |
| 23503 | Foreign key violation | Referenced record doesn't exist (room, participant) |
| 42P01 | Table doesn't exist | Migration not applied, wrong database |

### RLS Permission Errors

RLS policies can block operations silently. Always handle permission errors:

```typescript
try {
  await revealVotes(storyId);
} catch (error) {
  if (error instanceof DatabaseError && error.code === 'PGRST116') {
    // User is not the room leader
    alert('Only the room leader can reveal votes');
  }
}
```

### Validation Before Database Calls

Validate input before making database calls to provide better UX:

```typescript
async function submitVoteWithValidation(
  storyId: string,
  participantId: string,
  pointValue: string,
  roomScale: 'fibonacci' | 't-shirt'
) {
  // Validate point value matches room scale
  const fibonacciValues = ['1', '2', '3', '5', '8', '13', '21', '34', '55', '89'];
  const tShirtValues = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const validValues = roomScale === 'fibonacci' ? fibonacciValues : tShirtValues;

  if (!validValues.includes(pointValue)) {
    throw new Error(`Invalid point value for ${roomScale} scale: ${pointValue}`);
  }

  // Submit vote
  return await submitVote(storyId, participantId, pointValue);
}
```

## Best Practices

### 1. Always Use Query Utilities

Don't write raw Supabase queries in components. Use the provided utilities:

**Good**:
```typescript
import { getRoomByCode } from '@/lib/supabase/queries';
const room = await getRoomByCode('A7B9C2D5');
```

**Bad**:
```typescript
const { data } = await supabase.from('rooms').select('*').eq('room_code', 'A7B9C2D5').single();
```

### 2. Handle Errors Gracefully

Always catch and handle errors:

```typescript
try {
  const room = await getRoomByCode(roomCode);
  if (!room) {
    // User-friendly message
    setError('Room not found. Please check the code and try again.');
    return;
  }
} catch (error) {
  // Log for debugging
  console.error('Failed to get room:', error);
  // User-friendly message
  setError('Unable to connect to room. Please try again.');
}
```

### 3. Use Real-time Hooks in Components

For live data, use real-time hooks instead of polling:

**Good**:
```typescript
const participants = useRoomParticipants(roomId);
```

**Bad**:
```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const data = await getActiveParticipants(roomId);
    setParticipants(data);
  }, 1000);
  return () => clearInterval(interval);
}, [roomId]);
```

### 4. Optimize Real-time Subscriptions

Only subscribe to data you need:

```typescript
// Subscribe to specific room
const participants = useRoomParticipants(roomId);

// Don't subscribe to all participants globally
// const allParticipants = useAllParticipants(); // BAD
```

### 5. Clean Up Subscriptions

Real-time hooks automatically clean up, but if using manual subscriptions:

```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel').subscribe();

  return () => {
    // Always unsubscribe on unmount
    supabase.removeChannel(channel);
  };
}, []);
```

### 6. Validate User Permissions

Check permissions before attempting operations:

```typescript
const { data: { user } } = await supabase.auth.getUser();
const participants = await getActiveParticipants(roomId);
const currentParticipant = participants.find(p => p.user_id === user?.id);

if (currentParticipant?.is_leader) {
  // Show leader controls
  await revealVotes(storyId);
} else {
  // Disable leader controls
  alert('Only the leader can reveal votes');
}
```

### 7. Use TypeScript Types

Import and use generated database types:

```typescript
import type { Tables } from '@/lib/supabase/client';

function RoomCard({ room }: { room: Tables<'rooms'> }) {
  // TypeScript knows all room properties
  return <div>{room.name} - {room.room_code}</div>;
}
```

## Testing

### Unit Testing Query Functions

Use mocks for unit tests:

```typescript
import { vi } from 'vitest';
import { createRoom } from '@/lib/supabase/queries';

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'uuid', name: 'Test Room' },
            error: null
          }))
        }))
      }))
    }))
  }
}));

test('createRoom creates a room', async () => {
  const room = await createRoom('Test Room');
  expect(room.name).toBe('Test Room');
});
```

### Integration Testing

For integration tests, use a test database:

```typescript
import { createRoom, joinRoom, getActiveParticipants } from '@/lib/supabase/queries';

test('full room flow', async () => {
  // Create room
  const room = await createRoom('Test Room');
  expect(room.room_code).toMatch(/^[A-Z0-9]{8}$/);

  // Join as first participant (becomes leader)
  const participant1 = await joinRoom(room.id, null, 'Alice');
  expect(participant1.is_leader).toBe(true);

  // Join as second participant
  const participant2 = await joinRoom(room.id, null, 'Bob');
  expect(participant2.is_leader).toBe(false);

  // Verify participants
  const participants = await getActiveParticipants(room.id);
  expect(participants).toHaveLength(2);
});
```

### Testing Real-time Subscriptions

Use test utilities or manual verification:

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useRoomParticipants } from '@/hooks/useRealtimeSubscription';

test('subscription receives updates', async () => {
  const { result } = renderHook(() => useRoomParticipants(roomId));

  // Initial state
  expect(result.current).toEqual([]);

  // Add participant in another context
  await joinRoom(roomId, null, 'Alice');

  // Wait for subscription to update
  await waitFor(() => {
    expect(result.current).toHaveLength(1);
    expect(result.current[0].name).toBe('Alice');
  });
});
```

## Related Documentation

- [Database Schema Documentation](/docs/database-schema.md) - Complete schema reference
- [Database Migrations Guide](/docs/database-migrations.md) - Modifying the schema
- [Real-time Subscriptions](/docs/realtime-subscriptions.md) - Live updates guide
- [RLS Policies Documentation](/docs/rls-policies.md) - Security and access control
- [Environment Setup Guide](/docs/environment-setup.md) - Setting up your environment
