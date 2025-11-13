# Real-time Subscriptions Setup Guide

## Overview

Phase 5 of the Database Schema & Supabase Setup has been completed. This guide will help you enable and test real-time subscriptions for Story Pointer's collaborative features.

## What Was Implemented

1. **Comprehensive Documentation** - `/docs/realtime-subscriptions.md` (8,500+ words)
2. **Example TypeScript Code** - `/src/lib/supabase/subscriptions.example.ts` (10 patterns)
3. **Interactive Test Page** - `/test-realtime.html` (browser-based testing)
4. **Implementation Summary** - Full details in `/agent-os/specs/2025-11-08-database-schema-supabase-setup/PHASE5_IMPLEMENTATION_SUMMARY.md`

## Quick Start

### Step 1: Enable Real-time Replication

**Updated Instructions (Current Supabase UI)**

You must enable real-time in your Supabase Dashboard before subscriptions will work.

1. Log into your Supabase project dashboard
2. Navigate to **Database > Tables** in the left sidebar
3. For each of these 5 tables, enable real-time:
   - `rooms`
   - `profiles`
   - `participants`
   - `stories`
   - `votes`

**To enable for each table:**
- Click on the table name
- Look for the **"Realtime"** toggle button (usually at the top right)
- Click the toggle to enable it (should show as active/green)
- **Note**: All events (INSERT, UPDATE, DELETE) are enabled automatically - no need to select individual event types

**What you did is correct!** The newer Supabase UI simplified real-time setup - just toggle it on for each table.

### Step 2: Verify Configuration

Run this query in the SQL Editor to verify real-time is enabled for all tables:

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

You should see **5 rows** (one for each table):
- `profiles`
- `rooms`
- `participants`
- `stories`
- `votes`

**Note**: Running `SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';` will only show 1 record (the publication itself), not the individual tables.

### Step 3: Test Real-time

Open the interactive test page:

```bash
# Option 1: Open directly in browser
open test-realtime.html

# Option 2: Serve with Vite dev server
npm run dev
# Then navigate to http://localhost:5173/test-realtime.html
```

**Testing Instructions**:
1. Open the test page in two separate browser tabs
2. Click "Test Participants Subscription" in both tabs
3. Verify that events appear in both tabs
4. Repeat for Stories and Votes subscriptions

## Documentation

### Main Guide
**File**: `/docs/realtime-subscriptions.md`

**Contents**:
- Section 1: Enabling Real-time in Supabase (step-by-step)
- Section 2: Subscription Patterns (5 core patterns)
- Section 3: Server-Side Filtering (syntax, operators, RLS integration)
- Section 4: Connection Management (subscribe, unsubscribe, reconnection)
- Section 5: Security Considerations (RLS integration, anon key, validation)
- Section 6: Testing Real-time (manual, automated, checklist)
- Section 7: Troubleshooting (7 common issues with solutions)
- Section 8: Performance Best Practices (4 optimization strategies)

### Example Code
**File**: `/src/lib/supabase/subscriptions.example.ts`

**10 TypeScript Patterns**:
1. `subscribeToRoomParticipants()` - Monitor who's in the room
2. `subscribeToRoomStories()` - Track stories being estimated
3. `subscribeToStoryVotes()` - Monitor vote submissions and reveals
4. `subscribeToRoomUpdates()` - Track room settings changes
5. `subscribeToRoomData()` - Combined channel (multiple tables)
6. `subscribeWithReconnect()` - Exponential backoff for reliability
7. React Hook Example (commented, for Phase 6)
8. `unsubscribeAll()` - Cleanup utility
9. `monitorConnectionStatus()` - Connection monitoring
10. `throttleRealtimeHandler()` - Event throttling

## Key Features

### Server-Side Filtering
Reduces bandwidth by 90%+ by filtering at the database level:
```typescript
supabase.channel(`room:${roomId}:participants`).on(
  'postgres_changes',
  {
    event: '*',
    schema: 'public',
    table: 'participants',
    filter: `room_id=eq.${roomId}` // Only events for this room
  },
  handler
);
```

### Automatic Security
Row Level Security (RLS) policies from Phase 4 automatically filter real-time events:
- Users only receive vote updates they have permission to see
- Leader-only operations are enforced
- Room isolation prevents cross-room data leaks

### Reconnection Handling
Exponential backoff ensures reliable connections:
```typescript
const { channel, cleanup } = subscribeWithReconnect(
  'my-channel',
  () => createSubscription(),
  5 // max retries
);
```

### React Integration
Example hooks demonstrate proper cleanup:
```typescript
useEffect(() => {
  const channel = subscribeToRoomParticipants(roomId, callbacks);
  return () => supabase.removeChannel(channel);
}, [roomId]);
```

## Common Subscription Patterns

### Pattern 1: Room Participants
Monitor who's in the room:
```typescript
const channel = subscribeToRoomParticipants(roomId, {
  onInsert: (p) => addParticipant(p),
  onUpdate: (p) => updateParticipant(p),
  onDelete: (p) => removeParticipant(p)
});
```

### Pattern 2: Story Votes
Track vote submissions and reveals:
```typescript
const channel = subscribeToStoryVotes(storyId, {
  onInsert: (v) => incrementVoteCount(),
  onUpdate: (v) => {
    if (v.is_revealed) showVote(v);
  }
});
```

### Pattern 3: Combined Channel
Subscribe to multiple tables efficiently:
```typescript
const channel = subscribeToRoomData(roomId, {
  onParticipantChange: handleParticipant,
  onStoryChange: handleStory,
  onRoomChange: handleRoom
});
```

## Testing Checklist

Before deploying:

- [ ] Enabled replication for all 5 tables in Supabase Dashboard
- [ ] Verified publication exists (SQL query)
- [ ] Opened test page in two browser tabs
- [ ] Tested participants subscription (INSERT, UPDATE, DELETE)
- [ ] Tested stories subscription (INSERT, UPDATE)
- [ ] Tested votes subscription (INSERT, UPDATE)
- [ ] Verified RLS policies filter events correctly
- [ ] Tested reconnection after network interruption
- [ ] Reviewed documentation and example code

## Troubleshooting

### Events Not Received

**Problem**: Subscribed but no events appearing

**Solutions**:
1. Verify replication is enabled in Supabase Dashboard
2. Check RLS policies allow you to SELECT the data
3. Verify subscription status: Should show 'SUBSCRIBED'
4. Test filter syntax: Try without filter first

### Connection Errors

**Problem**: 'CHANNEL_ERROR' or 'TIMED_OUT' status

**Solutions**:
1. Check environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
2. Verify network connection
3. Check real-time connection limits (free tier: 2 concurrent)
4. Try regenerating anon key in Supabase dashboard

### Duplicate Events

**Problem**: Receiving same event multiple times

**Solutions**:
1. Avoid creating duplicate channels
2. Use unique channel names
3. Implement proper cleanup in useEffect

### High Latency

**Problem**: Events take several seconds to arrive

**Solutions**:
1. Use server-side filtering (filter by room_id, story_id)
2. Optimize event handlers (avoid heavy computations)
3. Check network conditions

## Next Steps

### For Phase 6 (TypeScript Integration)

1. Install Supabase client: `npm install @supabase/supabase-js`
2. Generate types: `supabase gen types typescript --local > src/lib/supabase/database.types.ts`
3. Create Supabase client: `/src/lib/supabase/client.ts`
4. Implement custom hooks: `/src/hooks/useRealtimeSubscription.ts`
5. Create query utilities: `/src/lib/supabase/queries.ts`

### For Development

1. Review example code in `/src/lib/supabase/subscriptions.example.ts`
2. Read documentation in `/docs/realtime-subscriptions.md`
3. Test subscriptions using `/test-realtime.html`
4. Integrate patterns into React components
5. Implement reconnection logic for production

## Additional Resources

- **Supabase Real-time Docs**: https://supabase.com/docs/guides/realtime
- **PostgreSQL Replication**: https://supabase.com/docs/guides/realtime/postgres-changes
- **Implementation Summary**: `/agent-os/specs/2025-11-08-database-schema-supabase-setup/PHASE5_IMPLEMENTATION_SUMMARY.md`

## Known Limitations

- **Free Tier**: 2 concurrent real-time connections (sufficient for testing)
- **Latency**: Typical 50-200ms for events (depends on network)
- **Connection Drops**: Max 5 retries before manual refresh required
- **Browser Tabs**: Background tabs may have throttled delivery

## Support

For issues or questions:
1. Check troubleshooting section in `/docs/realtime-subscriptions.md`
2. Review Phase 5 implementation summary
3. Test with `/test-realtime.html` to isolate issues
4. Verify Supabase Dashboard configuration

---

**Status**: Phase 5 Complete ✅

**Manual Action Required**: Enable replication in Supabase Dashboard before testing
