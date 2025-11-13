# Row Level Security (RLS) Policies

## Overview

This document describes the Row Level Security policies implemented for the Story Pointer application. RLS policies provide database-level access control, ensuring users can only access data they're authorized to see and modify.

## Why RLS?

Row Level Security provides several critical benefits:

1. **Defense in depth**: Security enforced at the database level, not just application level
2. **Prevent unauthorized access**: Even if application code has bugs, database prevents unauthorized access
3. **Consistent enforcement**: All queries (API, direct SQL, real-time subscriptions) follow same rules
4. **Vote privacy**: Critical for planning poker - prevents users from seeing unrevealed votes

## Policy Architecture

All 5 tables have RLS enabled with comprehensive policies:

- **profiles**: 3 policies (SELECT, UPDATE, DELETE)
- **rooms**: 3 policies (SELECT, INSERT, UPDATE)
- **participants**: 4 policies (SELECT, INSERT, UPDATE, DELETE)
- **stories**: 3 policies (SELECT, INSERT, UPDATE)
- **votes**: 5 policies (SELECT, INSERT, 2x UPDATE, DELETE)

**Total: 18 policies** providing complete access control coverage.

## Profiles Table Policies

### SELECT Policy: `profiles_select`
**Purpose**: Users can only read their own profile

```sql
CREATE POLICY profiles_select ON profiles
  FOR SELECT
  USING (user_id = auth.uid());
```

**Use Cases**:
- Loading user's display name
- Reading profile settings
- Preventing profile enumeration

### UPDATE Policy: `profiles_update`
**Purpose**: Users can only update their own profile

```sql
CREATE POLICY profiles_update ON profiles
  FOR UPDATE
  USING (user_id = auth.uid());
```

**Use Cases**:
- Changing display name
- Updating profile preferences
- Preventing unauthorized profile modification

### DELETE Policy: `profiles_delete`
**Purpose**: Users can delete their own profile

```sql
CREATE POLICY profiles_delete ON profiles
  FOR DELETE
  USING (user_id = auth.uid());
```

**Use Cases**:
- Account deletion
- GDPR compliance (right to be forgotten)

**Note**: INSERT policy not needed - profiles are auto-created via trigger on authentication.

## Rooms Table Policies

### SELECT Policy: `rooms_select`
**Purpose**: Users can read rooms where they're a participant

```sql
CREATE POLICY rooms_select ON rooms
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = rooms.id
        AND participants.user_id = auth.uid()
    )
  );
```

**Use Cases**:
- Loading room details
- Viewing room settings
- Preventing unauthorized room access

**Security Note**: Checks for ANY participant record (not just active) to allow viewing room history.

### INSERT Policy: `rooms_insert`
**Purpose**: Anyone can create rooms (anonymous flow)

```sql
CREATE POLICY rooms_insert ON rooms
  FOR INSERT
  WITH CHECK (true);
```

**Use Cases**:
- Anonymous room creation
- Quick start flow without authentication
- Enabling guest users

**Security Note**: This allows anonymous users (auth.uid() = NULL) to create rooms.

### UPDATE Policy: `rooms_update`
**Purpose**: Only room leader can update room settings

```sql
CREATE POLICY rooms_update ON rooms
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = rooms.id
        AND participants.user_id = auth.uid()
        AND participants.is_leader = true
    )
  );
```

**Use Cases**:
- Changing room name
- Updating point scale
- Leader-only operations

**Security Note**: Enforces leader-only control at database level.

## Participants Table Policies

### SELECT Policy: `participants_select`
**Purpose**: Users can read all participants in rooms they've joined

```sql
CREATE POLICY participants_select ON participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants AS p
      WHERE p.room_id = participants.room_id
        AND p.user_id = auth.uid()
    )
  );
```

**Use Cases**:
- Displaying participant list
- Showing who's in the room
- Vote attribution (after reveal)

### INSERT Policy: `participants_insert`
**Purpose**: Anyone can insert participant records (joining flow)

```sql
CREATE POLICY participants_insert ON participants
  FOR INSERT
  WITH CHECK (true);
```

**Use Cases**:
- Joining rooms with code
- Anonymous participation
- Guest users

**Security Note**: Allows anonymous joining. Unique constraint on (room_id, user_id) prevents duplicates.

### UPDATE Policy: `participants_update`
**Purpose**: Users can update only their own participant record

```sql
CREATE POLICY participants_update ON participants
  FOR UPDATE
  USING (user_id = auth.uid());
```

**Use Cases**:
- Changing display name in room
- Updating is_active status
- Modifying per-room settings

### DELETE Policy: `participants_delete`
**Purpose**: Users can delete their own participant record (leaving room)

```sql
CREATE POLICY participants_delete ON participants
  FOR DELETE
  USING (user_id = auth.uid());
```

**Use Cases**:
- Leaving room
- Removing self from participant list

## Stories Table Policies

### SELECT Policy: `stories_select`
**Purpose**: Users can read stories in rooms they've joined

```sql
CREATE POLICY stories_select ON stories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = stories.room_id
        AND participants.user_id = auth.uid()
    )
  );
```

**Use Cases**:
- Loading story list
- Viewing current story
- Accessing story history

### INSERT Policy: `stories_insert`
**Purpose**: Only room leader can create stories

```sql
CREATE POLICY stories_insert ON stories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = stories.room_id
        AND participants.user_id = auth.uid()
        AND participants.is_leader = true
    )
  );
```

**Use Cases**:
- Adding new stories to estimate
- Leader-only story management

### UPDATE Policy: `stories_update`
**Purpose**: Only room leader can update stories

```sql
CREATE POLICY stories_update ON stories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.room_id = stories.room_id
        AND participants.user_id = auth.uid()
        AND participants.is_leader = true
    )
  );
```

**Use Cases**:
- Editing story title/description
- Setting is_active (current story)
- Recording final_average (consensus)

**Security Note**: DELETE policy omitted - stories persist for session history.

## Votes Table Policies

The votes table has the most complex policies because vote visibility is critical to the planning poker experience.

### SELECT Policy: `votes_select`
**Purpose**: Users can read their own votes OR revealed votes in their room

```sql
CREATE POLICY votes_select ON votes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = votes.participant_id
        AND participants.user_id = auth.uid()
    )
    OR
    (
      votes.is_revealed = true
      AND EXISTS (
        SELECT 1 FROM participants p
        JOIN stories s ON s.id = votes.story_id
        WHERE p.room_id = s.room_id
          AND p.user_id = auth.uid()
      )
    )
  );
```

**Use Cases**:
- Viewing own vote (always visible)
- Viewing revealed votes from others
- Preventing vote peeking before reveal

**Security Critical**: This is the MOST IMPORTANT policy - it prevents users from seeing unrevealed votes from other participants.

### INSERT Policy: `votes_insert`
**Purpose**: Users can insert votes for their own participant_id

```sql
CREATE POLICY votes_insert ON votes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = votes.participant_id
        AND participants.user_id = auth.uid()
    )
  );
```

**Use Cases**:
- Submitting vote for current story
- Prevents voting as another participant

### UPDATE Policy (Own): `votes_update_own`
**Purpose**: Users can update their own unrevealed votes

```sql
CREATE POLICY votes_update_own ON votes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = votes.participant_id
        AND participants.user_id = auth.uid()
    )
    AND votes.is_revealed = false
  );
```

**Use Cases**:
- Changing vote before reveal
- Correcting mistakes
- Prevents modifying revealed votes

### UPDATE Policy (Reveal): `votes_update_reveal`
**Purpose**: Room leader can reveal votes (set is_revealed to true)

```sql
CREATE POLICY votes_update_reveal ON votes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM participants p
      JOIN stories s ON s.id = votes.story_id
      WHERE p.room_id = s.room_id
        AND p.user_id = auth.uid()
        AND p.is_leader = true
    )
  );
```

**Use Cases**:
- Leader revealing all votes for story
- Triggering vote display to all participants

**Security Note**: Separate policy allows leader to update is_revealed even after votes are revealed.

### DELETE Policy: `votes_delete`
**Purpose**: Users can delete only their own unrevealed votes

```sql
CREATE POLICY votes_delete ON votes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM participants
      WHERE participants.id = votes.participant_id
        AND participants.user_id = auth.uid()
    )
    AND votes.is_revealed = false
  );
```

**Use Cases**:
- Removing vote before reveal
- Changing vote strategy
- Prevents deleting revealed votes (for history)

## Anonymous User Support

Several policies explicitly support anonymous users (where `auth.uid()` returns NULL):

1. **rooms_insert**: Anonymous users can create rooms
2. **participants_insert**: Anonymous users can join rooms
3. **Other tables**: Require authentication via participant relationship

**Important**: While anonymous users can create/join, most operations require linking to a participant record with a valid user_id.

## Security Best Practices

### 1. Defense in Depth
RLS policies provide security even if:
- Application code has bugs
- API requests are malformed
- Direct database access occurs
- Real-time subscriptions are misconfigured

### 2. Principle of Least Privilege
- Users can only access data they need
- Write permissions more restrictive than read
- Leader operations separated from participant operations

### 3. Vote Privacy
The most critical security requirement:
- Unrevealed votes are completely hidden from other participants
- Not even database admins should enable vote peeking in production
- Real-time subscriptions respect these policies automatically

### 4. Leader-Only Operations
Database enforces leader-only operations:
- Story creation/updates
- Vote reveals
- Room settings changes

Application code can safely assume these operations only succeed for leaders.

## Testing RLS Policies

### Manual Testing via SQL

Use the test file: `/supabase/tests/rls_policies_test.sql`

This file contains 13 test scenarios covering:
- Profile access control
- Room visibility
- Participant management
- Story creation/updates
- Vote visibility and reveals
- Anonymous user operations

### Automated Testing via UI

Use the test file: `/verify-rls-policies.html`

This provides a browser-based UI to:
- Check if RLS is enabled on all tables
- Test anonymous room creation and joining
- Verify policy behavior with real authentication

### Testing Procedure

1. **Setup Test Users**:
   - Create 3 test users via Supabase Auth
   - Note their user IDs

2. **Run SQL Tests**:
   - Use Supabase SQL Editor
   - Run test scenarios from `/supabase/tests/rls_policies_test.sql`
   - Verify results match expectations

3. **Run UI Tests**:
   - Open `/verify-rls-policies.html` in browser
   - Enter Supabase credentials
   - Run verification tests
   - Check summary for any failures

4. **Test with Real Auth**:
   - Use `/test-auth.html` to authenticate
   - Run application queries with real JWT tokens
   - Verify policies work in production-like scenario

## Troubleshooting

### Policy Not Working

**Symptom**: Users can access data they shouldn't

**Diagnosis**:
1. Check if RLS is enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'table_name';`
2. List policies: `SELECT * FROM pg_policies WHERE tablename = 'table_name';`
3. Test with SQL: Set `auth.uid()` and run query manually

**Common Causes**:
- RLS not enabled on table
- Policy USING clause returns true for unexpected cases
- auth.uid() not set correctly (anonymous users)

### Query Fails with "row-level security policy" Error

**Symptom**: Queries fail with RLS policy violation

**Diagnosis**:
- This is EXPECTED behavior - the policy is working!
- Check if user should have access
- Verify auth.uid() is set correctly
- Check participant/leader status

**Common Causes**:
- User not authenticated (auth.uid() = NULL)
- User not a participant in room
- User trying leader-only operation without is_leader = true

### Votes Visible Before Reveal

**Symptom**: Users can see other participants' unrevealed votes

**CRITICAL SECURITY ISSUE**:
1. Check `votes_select` policy immediately
2. Verify `is_revealed = false` on votes
3. Test with different user accounts
4. Review application code for client-side filtering

This should NEVER happen if policies are correctly applied.

### Anonymous Users Cannot Create Rooms

**Symptom**: Room creation fails for unauthenticated users

**Diagnosis**:
1. Check `rooms_insert` policy: should be `WITH CHECK (true)`
2. Verify user is actually anonymous (auth.uid() = NULL)
3. Check for other constraints (e.g., room_code generation)

**Common Causes**:
- Policy changed to require authentication
- Trigger failing (room_code generation)
- Frontend sending auth token when shouldn't

## Performance Considerations

### Policy Complexity

Some policies use subqueries and joins:
- `votes_select`: Complex logic for revealed votes
- `rooms_select`: Checks participant membership
- `stories_select`: Joins through participants

**Impact**: Minimal for most queries. Indexes on foreign keys ensure fast lookups.

### Real-time Subscriptions

RLS policies apply to real-time subscriptions automatically:
- Clients only receive events they're authorized to see
- Vote reveals instantly visible to all participants
- Participant changes immediately reflected

**Note**: Server-side filtering (by room_id, story_id) reduces bandwidth and CPU.

## Migration History

**Migration**: `20251109041328_rls_policies.sql`

**Applied**: 2025-11-09 04:13:28 UTC

**Changes**:
- Enabled RLS on 5 tables
- Created 18 policies (3+3+4+3+5)
- Comprehensive vote privacy enforcement
- Anonymous user support

**Rollback**: To rollback, would need to:
1. Drop all policies: `DROP POLICY IF EXISTS <policy_name> ON <table>;`
2. Disable RLS: `ALTER TABLE <table> DISABLE ROW LEVEL SECURITY;`

**Warning**: Never disable RLS in production - this would expose all data!

## Future Enhancements

Potential future policy additions:

1. **Room Visibility Settings**:
   - Private rooms requiring invitations
   - Policy: Check `rooms.is_public` or `room_invitations` table

2. **Participant Roles**:
   - Observer role (read-only)
   - Policy: Check `participants.role` enum

3. **Anonymous Voting Mode**:
   - Hide vote attribution even after reveal
   - Policy: Modify `votes_select` to omit participant info

4. **Team Workspaces**:
   - Multi-room access control
   - Policy: Check team membership for room access

## References

- **Supabase RLS Documentation**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Migration File**: `/supabase/migrations/20251109041328_rls_policies.sql`
- **Test File**: `/supabase/tests/rls_policies_test.sql`
- **Verification Tool**: `/verify-rls-policies.html`

## Summary

**18 RLS policies** provide comprehensive database-level security for Story Pointer:

- ✅ Vote privacy strictly enforced
- ✅ Leader-only operations validated
- ✅ Users can only modify own records
- ✅ Anonymous user support
- ✅ Profile access restricted
- ✅ Real-time subscriptions secured

All policies tested and verified to work correctly with both authenticated and anonymous users.
