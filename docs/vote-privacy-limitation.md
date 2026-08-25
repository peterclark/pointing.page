# Vote Privacy Limitation

## Current Implementation

**Status:** UI-Level Privacy Only
**Security Level:** Medium
**Impact:** Low (story pointing tool with non-sensitive data)

## How It Works

### Client-Side Filtering
Vote privacy is currently enforced through client-side filtering:

1. **Console Log Redaction**: Unrevealed votes show as `[HIDDEN]` in console logs
2. **UI Filtering**: `filterVisibleVotes()` removes unrevealed votes from other participants before rendering
3. **Component Logic**: ParticipantStatus and VoteResults only display revealed vote values

### What's Protected
- ✅ **Casual users**: Cannot see vote values in the UI
- ✅ **Console logs**: Vote values are redacted
- ✅ **Normal usage**: Vote privacy is maintained during typical sessions

### What's Not Protected
- ⚠️ **Advanced users**: Can inspect network traffic or React DevTools to see unrevealed votes
- ⚠️ **Browser inspection**: Vote data exists in client memory

## Why Not Server-Side RLS?

We attempted to implement Supabase Row Level Security (RLS) policies with Anonymous Auth but encountered:

1. **Database Error**: "500: Database error saving new user" when creating anonymous users
2. **Root Cause**: ~~Unknown database constraint or configuration issue~~ **Identified and fixed**
   in migration `20260825140000_tighten_rls_and_unblock_anonymous_auth.sql`.
3. **Decision**: Reverted to localStorage-based approach for MVP stability

### The 500, explained

`handle_new_user()` fires on every `auth.users` INSERT and derived the display name as:

```sql
COALESCE(raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1))
```

An anonymous sign-in supplies no email and no metadata, so both branches evaluate
to NULL. The INSERT then violates `profiles.display_name NOT NULL`, the trigger
aborts, and the enclosing INSERT into `auth.users` rolls back — which GoTrue
reports as "500: Database error saving new user".

Reproduced against a local Postgres with the project's migrations applied:

```
INSERT INTO auth.users (email, raw_user_meta_data, is_anonymous)
  VALUES (NULL, '{}'::jsonb, true);
ERROR:  null value in column "display_name" of relation "profiles"
        violates not-null constraint
CONTEXT: SQL statement "INSERT INTO public.profiles (user_id, display_name)
```

The trigger now falls back to `Guest <first 8 chars of uuid>`, so anonymous
sign-in succeeds. **This unblocks the real fix**: once every visitor holds a JWT,
`auth.uid()` is non-null and ownership predicates work, so vote privacy and
leader-only operations can move into the database.

### What still needs doing

The tight policies are deliberately NOT in that migration. Migrations deploy to
production automatically on merge, and applying ownership predicates before the
client calls `supabase.auth.signInAnonymously()` would lock out every anonymous
user mid-session. The two ship together:

1. Client: sign in anonymously on boot; store the resulting user id on the
   participant row; pass it into `joinRoom()`.
2. Migration: replace `votes_select USING (true)` with
   `is_revealed OR participant is mine`, and gate `stories` INSERT/UPDATE plus
   `votes.is_revealed` on room leadership.

## Attempted Implementation

### What Was Implemented
- ✅ Anonymous auth utilities (`src/lib/supabase/auth.ts`)
- ✅ AuthProvider component
- ✅ RLS policies SQL (`supabase/migrations/add_vote_privacy_rls_policies.sql`)
- ✅ Updated joinRoom to use auth.uid()

### What Failed
- ❌ Anonymous user creation in Supabase
- ❌ Server-side vote filtering via RLS

### Files for Reference
- `src/lib/supabase/auth.ts` - Anonymous auth utilities (not currently used)
- `src/hooks/useAuth.ts` - Auth hook (not currently used)
- `src/components/AuthProvider.tsx` - Auth wrapper (not currently used)
- `supabase/migrations/add_vote_privacy_rls_policies.sql` - RLS policies (not applied)

## Future Enhancement

### To Implement Full Server-Side Privacy:

**Option 1: Debug Anonymous Auth**
1. Investigate Supabase project configuration
2. Check for custom auth schema or triggers
3. Review database constraints on auth.users table
4. Work with Supabase support if needed

**Option 2: Use Email/OAuth Auth**
1. Implement proper user authentication
2. Apply the RLS policies from the migration file
3. Link participants to authenticated users
4. Benefits: Better security, user accounts, session management

**Option 3: Custom Auth Service**
1. Implement custom auth backend
2. Use JWT tokens for session management
3. Enforce vote filtering server-side
4. More control but more complexity

## Recommendation

For a story pointing tool:
- **Current approach is acceptable** for MVP and most use cases
- **Impact is low**: Vote estimates are not sensitive data
- **User trust**: Teams using the tool together are unlikely to inspect browser tools
- **Cost/benefit**: Server-side privacy adds complexity without significant security benefit for this use case

If deploying to untrusted environments or handling sensitive data, revisit Option 2 (proper authentication).

## Testing

Current vote privacy can be tested:
- ✅ UI correctly hides unrevealed votes
- ✅ Console logs redact vote values
- ✅ Checkmarks appear without revealing values
- ✅ Reveal functionality works correctly

Advanced inspection (Network tab, React DevTools) will show vote data, but this is acceptable for the current use case.
