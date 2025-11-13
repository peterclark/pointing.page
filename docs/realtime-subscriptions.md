# Real-time Subscriptions Guide

## Overview

This guide covers the configuration and usage of Supabase Real-time subscriptions for Story Pointer. Real-time subscriptions enable live collaborative features by broadcasting database changes to all connected clients.

## Table of Contents

1. [Enabling Real-time in Supabase](#enabling-realtime-in-supabase)
2. [Subscription Patterns](#subscription-patterns)
3. [Server-Side Filtering](#server-side-filtering)
4. [Connection Management](#connection-management)
5. [Security Considerations](#security-considerations)
6. [Testing Real-time](#testing-realtime)
7. [Troubleshooting](#troubleshooting)

---

## Enabling Real-time in Supabase

### Step 1: Enable Replication for Tables

Real-time in Supabase works through PostgreSQL replication. You must enable replication for each table you want to subscribe to.

**Navigate to**: Supabase Dashboard > Database > Replication

**Enable replication for these tables**:
- `rooms`
- `profiles`
- `participants`
- `stories`
- `votes`

**For each table, select all events**:
- ✅ INSERT (when new records are created)
- ✅ UPDATE (when existing records are modified)
- ✅ DELETE (when records are removed)

**Instructions**:

1. Log into your Supabase project dashboard
2. Navigate to **Database** in the left sidebar
3. Click on **Replication**
4. Find each table in the list
5. Toggle the switch to **enable** replication
6. Expand the table row and check **all event types** (INSERT, UPDATE, DELETE)
7. Click **Save** or **Publish** to apply changes

### Step 2: Verify Publication

After enabling replication, Supabase creates a PostgreSQL publication. You can verify it exists:

```sql
-- Run in SQL Editor
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
```

You should see the publication with all your tables included.

### Step 3: Check Replication Slot

Verify the replication slot is active:

```sql
-- Run in SQL Editor
SELECT * FROM pg_replication_slots WHERE slot_name = 'supabase_realtime_rls';
```

The slot should show as `active = true`.

---

## Subscription Patterns

### Overview

Real-time subscriptions use channels to organize and filter events. Each channel can subscribe to one or more database tables with optional filters.

### Pattern 1: Room-Specific Participants

Subscribe to participants in a specific room to show who's currently present.

**Use Case**: Display participant list, update presence indicators

**Filter**: `room_id=eq.<room_id>`

**Events to Listen**: INSERT, UPDATE, DELETE

**Example**:
```typescript
const participantsChannel = supabase
  .channel(`room:${roomId}:participants`)
  .on(
    'postgres_changes',
    {
      event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
      schema: 'public',
      table: 'participants',
      filter: `room_id=eq.${roomId}`
    },
    (payload) => {
      console.log('Participant change:', payload);
      // Update UI with new participant data
    }
  )
  .subscribe();
```

### Pattern 2: Room-Specific Stories

Subscribe to stories in a specific room to track what's being estimated.

**Use Case**: Display story list, highlight active story

**Filter**: `room_id=eq.<room_id>`

**Events to Listen**: INSERT, UPDATE, DELETE

**Example**:
```typescript
const storiesChannel = supabase
  .channel(`room:${roomId}:stories`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'stories',
      filter: `room_id=eq.${roomId}`
    },
    (payload) => {
      console.log('Story change:', payload);
      // Update story list in UI
    }
  )
  .subscribe();
```

### Pattern 3: Story-Specific Votes

Subscribe to votes for the current story to track when votes are submitted and revealed.

**Use Case**: Display vote count, show revealed votes

**Filter**: `story_id=eq.<story_id>`

**Events to Listen**: INSERT, UPDATE

**Example**:
```typescript
const votesChannel = supabase
  .channel(`story:${storyId}:votes`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'votes',
      filter: `story_id=eq.${storyId}`
    },
    (payload) => {
      console.log('Vote change:', payload);
      // Update vote count or revealed votes in UI
    }
  )
  .subscribe();
```

**Note**: RLS policies automatically filter votes based on `is_revealed` status. Users will only receive vote updates they have permission to see.

### Pattern 4: Specific Room Updates

Subscribe to a specific room to detect when room settings change (name, point scale, leader).

**Use Case**: Update room header, detect leader changes

**Filter**: `id=eq.<room_id>`

**Events to Listen**: UPDATE

**Example**:
```typescript
const roomChannel = supabase
  .channel(`room:${roomId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'rooms',
      filter: `id=eq.${roomId}`
    },
    (payload) => {
      console.log('Room updated:', payload);
      // Update room name, leader, or settings in UI
    }
  )
  .subscribe();
```

### Pattern 5: Combined Channel (Multiple Tables)

You can subscribe to multiple tables on a single channel for efficiency.

**Use Case**: Subscribe to all room-related changes at once

**Example**:
```typescript
const roomDataChannel = supabase
  .channel(`room:${roomId}:all`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'participants',
      filter: `room_id=eq.${roomId}`
    },
    handleParticipantChange
  )
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'stories',
      filter: `room_id=eq.${roomId}`
    },
    handleStoryChange
  )
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'rooms',
      filter: `id=eq.${roomId}`
    },
    handleRoomChange
  )
  .subscribe();
```

---

## Server-Side Filtering

### Why Server-Side Filtering?

Server-side filtering (using the `filter` parameter) reduces bandwidth and improves performance by only sending relevant events to each client.

**Without filtering**:
- Client receives ALL database changes for a table
- Client must filter locally to find relevant events
- Wastes bandwidth and processing power

**With filtering**:
- Supabase filters events at the database level
- Only relevant events are sent to the client
- Reduces bandwidth usage by 90%+ in multi-room scenarios

### Filter Syntax

Filters use PostgREST syntax with operators:

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equal to | `room_id=eq.123e4567-e89b-12d3-a456-426614174000` |
| `neq` | Not equal to | `is_active=neq.false` |
| `gt` | Greater than | `created_at=gt.2024-01-01` |
| `gte` | Greater than or equal | `final_average=gte.5` |
| `lt` | Less than | `point_value=lt.100` |
| `lte` | Less than or equal | `point_value=lte.21` |
| `in` | In array | `point_value=in.(1,2,3,5,8)` |

### Multiple Filters

You can combine multiple filters with `.and.` or `.or.`:

```typescript
// AND: room_id matches AND is_active is true
filter: `room_id=eq.${roomId}.and.is_active=eq.true`

// OR: is_revealed is true OR participant_id matches user
filter: `is_revealed=eq.true.or.participant_id=eq.${participantId}`
```

### Important: RLS Policies Apply

Even with server-side filtering, Row Level Security (RLS) policies still apply. This means:

- Users only receive events for records they have permission to see
- Vote updates are filtered by `is_revealed` status automatically
- Leader-only operations are enforced even in real-time

**Example**: If a user subscribes to votes with `story_id=eq.123`, they will only receive:
- Their own votes (regardless of `is_revealed`)
- Other users' votes where `is_revealed=true`

This is enforced by the `votes_select` RLS policy.

---

## Connection Management

### Subscribing

To start receiving events, call `.subscribe()` on a channel:

```typescript
const channel = supabase
  .channel('my-channel')
  .on('postgres_changes', { /* config */ }, handler)
  .subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Successfully subscribed!');
    }
  });
```

### Unsubscribing

Always unsubscribe when you no longer need events (e.g., when component unmounts):

```typescript
// Unsubscribe from a specific channel
await supabase.removeChannel(channel);

// Or unsubscribe all channels
await supabase.removeAllChannels();
```

**React Example**:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { /* config */ }, handler)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [roomId]);
```

### Connection Status

Monitor connection status to handle disconnections:

```typescript
const channel = supabase
  .channel('my-channel')
  .on('postgres_changes', { /* config */ }, handler)
  .subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      console.log('Connected');
    }
    if (status === 'CHANNEL_ERROR') {
      console.error('Connection error:', err);
    }
    if (status === 'TIMED_OUT') {
      console.warn('Connection timed out');
    }
    if (status === 'CLOSED') {
      console.log('Connection closed');
    }
  });
```

### Reconnection Handling

Supabase automatically attempts to reconnect on network interruptions. You can implement exponential backoff for retries:

```typescript
let retryCount = 0;
const maxRetries = 5;
const baseDelay = 1000; // 1 second

function subscribeWithRetry() {
  const channel = supabase
    .channel('my-channel')
    .on('postgres_changes', { /* config */ }, handler)
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR' && retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1})`);

        setTimeout(() => {
          retryCount++;
          subscribeWithRetry();
        }, delay);
      }

      if (status === 'SUBSCRIBED') {
        retryCount = 0; // Reset on successful connection
      }
    });

  return channel;
}
```

### Heartbeat and Keep-Alive

Supabase handles heartbeat automatically. The connection will:
- Send periodic heartbeat messages to keep the connection alive
- Detect disconnections and attempt reconnection
- Close idle connections after a timeout

You don't need to manually implement heartbeat logic.

---

## Security Considerations

### RLS Policies Secure Real-time

Row Level Security (RLS) policies are automatically applied to real-time events. This means:

**Vote Privacy**: Users cannot see other participants' votes until they are revealed, even through real-time subscriptions.

**Leader-Only Operations**: Only the room leader receives events for leader-only actions.

**Room Isolation**: Users only receive events for rooms they have joined.

### Anon Key is Safe

The anonymous (anon) key used in the frontend is safe to expose publicly. It's designed for client-side use and enforces RLS policies.

**Never use the service role key in the frontend** - it bypasses RLS policies.

### Filter Validation

Always validate filter parameters (like `roomId`, `storyId`) before using them in subscriptions:

```typescript
function subscribeToRoom(roomId: string) {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(roomId)) {
    throw new Error('Invalid room ID format');
  }

  // Safe to use in subscription
  return supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'participants',
      filter: `room_id=eq.${roomId}`
    }, handler)
    .subscribe();
}
```

### Avoid Over-Subscribing

Don't create unnecessary subscriptions:

```typescript
// BAD: Creates a new subscription on every render
function ParticipantList({ roomId }) {
  const channel = supabase.channel(`room:${roomId}`).subscribe();
  // ...
}

// GOOD: Creates subscription once, cleans up on unmount
function ParticipantList({ roomId }) {
  useEffect(() => {
    const channel = supabase.channel(`room:${roomId}`).subscribe();
    return () => supabase.removeChannel(channel);
  }, [roomId]);
}
```

---

## Testing Real-time

### Manual Testing (Two Browser Tabs)

The simplest way to test real-time is with two browser tabs:

1. Open your application in two separate browser tabs
2. Join the same room in both tabs (as different participants)
3. Perform an action in one tab (e.g., submit a vote)
4. Verify the update appears in the second tab in real-time

### Testing Checklist

Test each subscription pattern:

**Participants Subscription**:
- [ ] Open two tabs, join same room as different participants
- [ ] Verify both participants appear in the participant list in both tabs
- [ ] Update participant name in one tab, verify it updates in the other
- [ ] Leave room in one tab (set is_active=false), verify participant removed from other tab

**Stories Subscription**:
- [ ] Create a story in one tab (as leader)
- [ ] Verify story appears in both tabs
- [ ] Update story title/description in one tab
- [ ] Verify changes appear in the other tab

**Votes Subscription**:
- [ ] Submit a vote in one tab
- [ ] Verify vote count updates in the other tab
- [ ] Reveal votes in one tab (as leader)
- [ ] Verify all votes become visible in both tabs

**Room Subscription**:
- [ ] Update room name in one tab (as leader)
- [ ] Verify room name updates in the other tab
- [ ] Promote a new leader, verify leader badge updates

### Testing Reconnection

Test that subscriptions reconnect after network interruptions:

1. Open DevTools > Network tab
2. Subscribe to a channel
3. Toggle "Offline" mode in DevTools
4. Wait a few seconds
5. Toggle "Online" mode
6. Verify subscription reconnects automatically
7. Verify new events are received

### Automated Testing

Use the provided test page at `/test-realtime.html` to run automated tests:

```bash
# Open the test page
open test-realtime.html
```

The test page will:
- Connect to Supabase
- Subscribe to all channels
- Simulate database changes
- Verify events are received
- Display test results

---

## Troubleshooting

### Events Not Received

**Problem**: Subscribed to a channel but not receiving events.

**Solutions**:

1. **Verify replication is enabled**:
   - Check Supabase Dashboard > Database > Replication
   - Ensure the table has replication enabled
   - Ensure all event types (INSERT, UPDATE, DELETE) are checked

2. **Check RLS policies**:
   - Events are filtered by RLS policies
   - Run a SELECT query to verify you have permission to read the data
   - Check that your user has the necessary participant record

3. **Verify subscription status**:
   ```typescript
   channel.subscribe((status) => {
     console.log('Status:', status);
     // Should show 'SUBSCRIBED'
   });
   ```

4. **Check filter syntax**:
   - Ensure filter uses correct PostgREST syntax
   - Verify IDs are valid UUIDs
   - Test without filter to see if events are received

### Connection Errors

**Problem**: `CHANNEL_ERROR` or `TIMED_OUT` status.

**Solutions**:

1. **Check network connection**:
   - Verify you have internet access
   - Check browser console for CORS errors

2. **Verify environment variables**:
   - Check `VITE_SUPABASE_URL` is correct
   - Check `VITE_SUPABASE_ANON_KEY` is valid
   - Try regenerating the anon key in Supabase dashboard

3. **Check real-time connection limits**:
   - Free tier: 2 concurrent connections
   - Pro tier: 500 concurrent connections
   - Close unused channels

### Duplicate Events

**Problem**: Receiving the same event multiple times.

**Solutions**:

1. **Avoid multiple subscriptions**:
   - Check that you're not creating duplicate channels
   - Use `useEffect` cleanup to unsubscribe

2. **Use unique channel names**:
   ```typescript
   // BAD: Same channel name used multiple times
   supabase.channel('room').subscribe();
   supabase.channel('room').subscribe(); // Duplicate!

   // GOOD: Unique channel names
   supabase.channel(`room:${roomId}:participants`).subscribe();
   supabase.channel(`room:${roomId}:stories`).subscribe();
   ```

### High Latency

**Problem**: Events take several seconds to arrive.

**Solutions**:

1. **Use server-side filtering**:
   - Always filter by `room_id` or `story_id`
   - Reduces bandwidth and improves performance

2. **Optimize event handlers**:
   - Avoid heavy computations in event handlers
   - Use debouncing for rapid updates

3. **Check network conditions**:
   - Test with DevTools Network throttling disabled
   - Verify low latency to Supabase servers

### Memory Leaks

**Problem**: Application slows down over time with multiple subscriptions.

**Solutions**:

1. **Always unsubscribe**:
   ```typescript
   useEffect(() => {
     const channel = supabase.channel('my-channel').subscribe();

     // CRITICAL: Clean up on unmount
     return () => {
       supabase.removeChannel(channel);
     };
   }, []);
   ```

2. **Remove all channels on logout**:
   ```typescript
   async function logout() {
     await supabase.removeAllChannels();
     await supabase.auth.signOut();
   }
   ```

### RLS Policy Issues

**Problem**: Some users receive events, others don't.

**Solutions**:

1. **Verify user has participant record**:
   ```sql
   SELECT * FROM participants
   WHERE room_id = '<room_id>' AND user_id = auth.uid();
   ```

2. **Test RLS policies**:
   ```sql
   -- Test as specific user
   SET LOCAL ROLE authenticated;
   SET LOCAL request.jwt.claim.sub = '<user_id>';
   SELECT * FROM participants WHERE room_id = '<room_id>';
   ```

3. **Check vote visibility**:
   - Unrevealed votes are only visible to the voter
   - Ensure `is_revealed=true` before expecting events

---

## Performance Best Practices

### 1. Use Room-Specific Channels

Always filter by room to avoid receiving events from other rooms:

```typescript
// GOOD
supabase.channel(`room:${roomId}`).on(
  'postgres_changes',
  { table: 'participants', filter: `room_id=eq.${roomId}` },
  handler
);

// BAD - receives events from all rooms
supabase.channel('all-participants').on(
  'postgres_changes',
  { table: 'participants' },
  handler
);
```

### 2. Combine Related Subscriptions

Use a single channel for multiple related subscriptions:

```typescript
// GOOD - Single channel, multiple tables
const channel = supabase
  .channel(`room:${roomId}:all`)
  .on('postgres_changes', { table: 'participants', filter: `room_id=eq.${roomId}` }, handleParticipants)
  .on('postgres_changes', { table: 'stories', filter: `room_id=eq.${roomId}` }, handleStories)
  .subscribe();

// LESS EFFICIENT - Multiple channels
const ch1 = supabase.channel(`room:${roomId}:p`).on(/* participants */).subscribe();
const ch2 = supabase.channel(`room:${roomId}:s`).on(/* stories */).subscribe();
```

### 3. Unsubscribe When Not Needed

Don't keep subscriptions active when the user is not viewing the data:

```typescript
// Example: Only subscribe when room page is active
function RoomPage({ roomId }) {
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive) return;

    const channel = supabase.channel(`room:${roomId}`).subscribe();
    return () => supabase.removeChannel(channel);
  }, [roomId, isActive]);
}
```

### 4. Throttle High-Frequency Updates

If you expect many rapid updates, throttle your UI updates:

```typescript
import { throttle } from 'lodash';

const handleVoteUpdate = throttle((payload) => {
  updateVoteCount(payload);
}, 500); // Update UI at most every 500ms

supabase.channel('votes').on(
  'postgres_changes',
  { table: 'votes', filter: `story_id=eq.${storyId}` },
  handleVoteUpdate
);
```

---

## Next Steps

1. **Enable replication** for all tables in Supabase Dashboard
2. **Review the example code** in `/src/lib/supabase/subscriptions.example.ts`
3. **Test subscriptions** using the test page at `/test-realtime.html`
4. **Integrate subscriptions** into your React components using custom hooks

For TypeScript examples and React hooks, see:
- Example subscription patterns: `/src/lib/supabase/subscriptions.example.ts`
- React hooks: `/src/hooks/useRealtimeSubscription.ts` (Phase 6)
- Test page: `/test-realtime.html`

For more information on Supabase Real-time:
- [Supabase Real-time Documentation](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Replication](https://supabase.com/docs/guides/realtime/postgres-changes)
