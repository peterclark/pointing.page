# Vote Privacy

> **Resolved.** This document described a client-only privacy model. Vote
> privacy is now enforced by the database. The history below is kept because it
> explains why the original attempt failed and what the fix turned out to be.

## Current Implementation

**Status:** Enforced server-side by RLS
**Migrations:** `20260825140000_tighten_rls_and_unblock_anonymous_auth.sql`,
`20260825150000_enforce_vote_privacy_and_leader_only.sql`

Every visitor is signed in anonymously by `SessionGate` before the first query,
so `auth.uid()` is always available. `votes_select` is then
`USING (is_revealed OR owns_participant(participant_id))`: an unrevealed
`point_value` is returned only to the participant who cast it, whether the
request comes from the app, the REST API, or a Realtime subscription.

Revealing is a leader-only `reveal_votes()` function rather than an UPDATE
policy, because RLS grants permission per row and never per column — a
leader-shaped UPDATE policy on votes would also let the leader rewrite other
people's estimates. A `votes_guard_reveal` trigger blocks any other route to
`is_revealed`.

`filterVisibleVotes()` remains in the client as defence in depth.

## Historical: the client-only model

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

### What wasn't protected
- ⚠️ **Advanced users**: Can inspect network traffic or React DevTools to see unrevealed votes
- ⚠️ **Browser inspection**: Vote data exists in client memory

Both are now closed: the database does not send another participant's
unrevealed vote to the client at all, so there is nothing in memory or on the
wire to inspect.

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

### Both halves have now shipped

1. Client: `SessionGate` signs in anonymously on boot; `joinRoom()` records the
   resulting user id on the participant row; components resolve their
   participant via `user_id` rather than a localStorage key.
2. Migration: `votes_select` is scoped to revealed-or-mine, `stories`
   INSERT/UPDATE are leader-only, and `is_revealed` moves behind
   `reveal_votes()` plus a guard trigger.

### Verified

Against a local Postgres with all migrations applied, probed as four callers:

| Caller | Sees unrevealed votes |
| --- | --- |
| The participant who cast it | their own only |
| Another participant in the room | none |
| A signed-in user in a different room | none |
| No session at all | none |

Writes: a non-leader cannot create a story, reveal votes, overwrite another
participant's vote, vote as someone else, or deactivate another participant.

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
