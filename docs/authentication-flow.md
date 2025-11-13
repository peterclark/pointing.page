# Authentication Flow Documentation

## Overview

This document describes the authentication flow for Story Pointer, including how it integrates with the room joining process and how profiles are managed for persistent user identity across sessions and rooms.

## Authentication Strategy

Story Pointer uses a **progressive authentication** approach:

1. **Immediate Access**: Users can join rooms without authentication
2. **Optional Authentication**: Users can authenticate for persistent identity
3. **Seamless Integration**: Authentication doesn't interrupt the collaboration flow
4. **Privacy-First**: Users control when and if they authenticate

## Authentication Method

**Magic Link (Passwordless Email)**

Why magic link authentication?
- **No password management**: Users don't need to remember passwords
- **Better security**: No passwords to leak, reuse, or forget
- **Faster onboarding**: Quick access with just email
- **Mobile-friendly**: Easy to authenticate on any device
- **Suitable for teams**: Professional yet simple for all users

## Flow Diagrams

### Flow 1: Anonymous User Joining a Room

```
┌─────────────────────────────────────────────────────────┐
│ 1. User enters room code                                 │
│    Input: "ABC12345"                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. System validates room exists                          │
│    Query: SELECT * FROM rooms WHERE room_code = ?        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. User prompted for display name                        │
│    Input: "John Smith"                                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Create anonymous participant                          │
│    INSERT INTO participants (                            │
│      room_id,                                            │
│      user_id = NULL,  ← No authentication                │
│      name = "John Smith",                                │
│      is_active = true                                    │
│    )                                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. User joins room and can participate immediately       │
│    - Can vote on stories                                 │
│    - Can see other participants                          │
│    - No persistent identity across sessions              │
└─────────────────────────────────────────────────────────┘
```

### Flow 2: Authenticated User Joining a Room (First Time)

```
┌─────────────────────────────────────────────────────────┐
│ 1. User clicks "Sign in" or prompted to authenticate     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. User enters email address                             │
│    Input: "john@example.com"                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Supabase sends magic link email                       │
│    To: john@example.com                                  │
│    Subject: "Sign in to Story Pointer"                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. User clicks magic link in email                       │
│    URL: https://project.supabase.co/auth/v1/verify?...   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Supabase creates auth user                            │
│    INSERT INTO auth.users (email, ...)                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Database trigger auto-creates profile                 │
│    Trigger: on_auth_user_created                         │
│    INSERT INTO profiles (                                │
│      user_id = auth.users.id,                            │
│      display_name = "john"  ← from email                 │
│    )                                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 7. User redirected to app with tokens                    │
│    URL: http://localhost:5173/#access_token=...          │
│    Tokens stored in localStorage                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 8. User enters room code                                 │
│    Input: "ABC12345"                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 9. Create authenticated participant                      │
│    INSERT INTO participants (                            │
│      room_id,                                            │
│      user_id = auth.uid(),  ← Authenticated              │
│      name = profile.display_name                         │
│    )                                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 10. User joins room with persistent identity             │
│     - Identity persists across sessions                  │
│     - Can rejoin same room later                         │
│     - Display name consistent across rooms               │
└─────────────────────────────────────────────────────────┘
```

### Flow 3: Authenticated User Rejoining a Room

```
┌─────────────────────────────────────────────────────────┐
│ 1. User already authenticated (has session)              │
│    - Access token in localStorage                        │
│    - Profile exists in database                          │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. User enters room code they previously joined          │
│    Input: "ABC12345"                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Check if participant record exists                    │
│    Query: SELECT * FROM participants                     │
│           WHERE room_id = ? AND user_id = auth.uid()     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ├─ Participant exists
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4a. Reactivate existing participant                      │
│     UPDATE participants                                  │
│     SET is_active = true,                                │
│         joined_at = now()                                │
│     WHERE room_id = ? AND user_id = auth.uid()           │
└────────────────┬────────────────────────────────────────┘
                 │
                 │  (Alternative: Participant doesn't exist)
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4b. Create new participant                               │
│     INSERT INTO participants (                           │
│       room_id,                                           │
│       user_id = auth.uid(),                              │
│       name = profile.display_name                        │
│     )                                                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. User joins room                                       │
│    - Same identity as before                             │
│    - Previous participation history preserved            │
│    - Votes from previous session still there             │
└─────────────────────────────────────────────────────────┘
```

### Flow 4: Anonymous User Authenticating Mid-Session

```
┌─────────────────────────────────────────────────────────┐
│ 1. User already in room as anonymous participant         │
│    - participant.user_id = NULL                          │
│    - participant.name = "John"                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. User decides to authenticate                          │
│    - Sees "Sign in to save progress" prompt              │
│    - Clicks "Sign in" button                             │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Magic link authentication flow (as in Flow 2)         │
│    - User enters email                                   │
│    - Magic link sent                                     │
│    - User clicks link                                    │
│    - Profile created                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Link existing participant to authenticated user       │
│    UPDATE participants                                   │
│    SET user_id = auth.uid()                              │
│    WHERE id = <current-participant-id>                   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. User continues in room with persistent identity       │
│    - All votes and actions preserved                     │
│    - Identity now persists across sessions               │
│    - Can rejoin room later                               │
└─────────────────────────────────────────────────────────┘
```

## Data Relationships

### Tables Involved

**auth.users** (Supabase built-in)
```sql
id              uuid PRIMARY KEY
email           text UNIQUE
confirmed_at    timestamptz
created_at      timestamptz
```

**profiles** (Custom)
```sql
id              uuid PRIMARY KEY
user_id         uuid REFERENCES auth.users UNIQUE
display_name    text NOT NULL
created_at      timestamptz
```

**participants** (Custom)
```sql
id              uuid PRIMARY KEY
room_id         uuid REFERENCES rooms
user_id         uuid REFERENCES auth.users (NULLABLE)
name            text NOT NULL
is_active       boolean
joined_at       timestamptz

UNIQUE (room_id, user_id)
```

### Relationship Diagram

```
┌─────────────────┐
│   auth.users    │
│  (Supabase)     │
│                 │
│ - id            │
│ - email         │
└────────┬────────┘
         │
         │ 1:1
         │
         ▼
┌─────────────────┐
│    profiles     │
│   (Custom)      │
│                 │
│ - user_id ◄─────┼───── FK to auth.users
│ - display_name  │
└────────┬────────┘
         │
         │ 1:N
         │
         ▼
┌─────────────────┐
│  participants   │
│   (Custom)      │
│                 │
│ - user_id ◄─────┼───── FK to auth.users (NULLABLE)
│ - room_id       │
│ - name          │
│ - is_active     │
└─────────────────┘
```

**Key Points:**
- One auth.users → One profiles (1:1)
- One auth.users → Many participants (1:N) (one per room)
- Participants can exist without auth.users (anonymous)
- Unique constraint: One participant per user per room

## Session Management

### Token Types

**Access Token (JWT)**
- **Expiry**: 3600 seconds (1 hour)
- **Purpose**: Authenticate API requests
- **Storage**: localStorage
- **Format**: JSON Web Token (JWT)
- **Claims**: user_id, email, role, permissions

**Refresh Token**
- **Expiry**: 604800 seconds (7 days)
- **Purpose**: Obtain new access tokens
- **Storage**: localStorage
- **Security**: Can only be used once (rotation enabled)

### Token Refresh Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Access token nearing expiry (50-55 minutes)           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Supabase client detects expiry                        │
│    - Automatic check before API calls                    │
│    - Or periodic check every 30 seconds                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Client sends refresh request                          │
│    POST /auth/v1/token?grant_type=refresh_token          │
│    Body: { refresh_token: "..." }                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Supabase validates refresh token                      │
│    - Check if not expired (< 7 days)                     │
│    - Check if not revoked                                │
│    - Check if not already used (rotation)                │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Supabase issues new tokens                            │
│    Response: {                                           │
│      access_token: "new-jwt-token",                      │
│      refresh_token: "new-refresh-token",                 │
│      expires_in: 3600                                    │
│    }                                                     │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Client updates localStorage                           │
│    - Store new access token                              │
│    - Store new refresh token                             │
│    - Old tokens invalidated                              │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Session continues seamlessly                          │
│    - No user interruption                                │
│    - No re-login required                                │
│    - User unaware refresh happened                       │
└─────────────────────────────────────────────────────────┘
```

**Refresh Token Rotation:**
- Each refresh generates a new refresh token
- Old refresh token is invalidated immediately
- Prevents token reuse attacks
- If rotation disabled, same refresh token can be reused

### Session Persistence

**Cross-Tab/Window:**
- Session shared via localStorage
- All tabs see same session
- Login in one tab → Logged in all tabs
- Logout in one tab → Logged out all tabs

**Browser Restart:**
- Session persists if refresh token valid
- User remains logged in after browser restart
- No re-authentication needed within 7 days

**Device Management:**
- User can be logged in on multiple devices
- Each device has independent session
- Logging out on one device doesn't affect others

## Security Considerations

### Access Control

**Row Level Security (RLS):**
- All database access controlled by RLS policies
- Users can only access data they have permission to
- Enforced at database level (not application level)

**Profile Access:**
```sql
-- Users can only read their own profile
CREATE POLICY profiles_select ON profiles
FOR SELECT USING (user_id = auth.uid());
```

**Participant Access:**
```sql
-- Users can only update their own participant record
CREATE POLICY participants_update ON participants
FOR UPDATE USING (user_id = auth.uid());
```

### Token Security

**Best Practices:**
- Access tokens short-lived (1 hour)
- Refresh tokens rotated on each use
- Tokens stored in localStorage (XSS vulnerable, but acceptable trade-off)
- Never send tokens in URL (except magic link callback)
- HTTPS required for production (encryption in transit)

**XSS Protection:**
- Sanitize all user input
- Use Content Security Policy (CSP)
- Escape output in HTML templates
- Avoid inline scripts
- Regular security audits

### Magic Link Security

**Link Expiration:**
- Magic links expire after 1 hour
- Prevents stale links from being used
- User must request new link if expired

**One-Time Use:**
- Each magic link can only be used once
- Clicking again after use won't work
- Prevents link forwarding attacks

**Rate Limiting:**
- Limit magic link requests per email
- Prevent spam and abuse
- Protect against email bombing

## Display Name Management

### Profile Display Name

**Default Value:**
- Extracted from email address
- Example: `john.doe@example.com` → `john.doe`
- Or full email if no clear name part

**User Customization:**
- User can update display_name in profile
- Change persists across all rooms
- Used as default for new rooms

### Participant Display Name

**Per-Room Override:**
- Participant can use different name per room
- Doesn't change profile display_name
- Useful for role-specific names (e.g., "John - Product Owner")

**Default Behavior:**
- New participant inherits profile.display_name
- User can override when joining room
- Override only applies to that room

**Example:**

```
Profile:
  display_name: "John Smith"

Room A Participant:
  name: "John Smith"  (default from profile)

Room B Participant:
  name: "John - PO"   (overridden for this room)
```

## Anonymous vs Authenticated

### Anonymous Users

**Pros:**
- Instant access, no friction
- No email required
- Good for quick, one-time use
- Privacy-friendly

**Cons:**
- No persistent identity
- Can't rejoin room after leaving
- Display name not saved
- No history across sessions

### Authenticated Users

**Pros:**
- Persistent identity across sessions
- Can rejoin rooms anytime
- Consistent display name
- Future features (team workspaces, history, analytics)

**Cons:**
- Requires email address
- Extra step (wait for magic link)
- Email delivery dependency

### When to Authenticate?

**Prompt for authentication when:**
- User wants to create a room (optional, but recommended)
- User joins multiple rooms
- User wants to save their participation
- Team workspace features enabled
- User explicitly requests it

**Don't require authentication for:**
- Single room participation
- Quick estimates
- External participants (non-team members)
- Testing/demo scenarios

## Multi-Device Handling

### Unique Constraint

```sql
UNIQUE (room_id, user_id)
```

**Prevents:**
- Same user from having multiple participant records in one room
- Duplicate votes or participation
- Confusion about which participant is "real"

### Multi-Device Prevention (Application Level)

**Check on Join:**
```sql
SELECT * FROM participants
WHERE room_id = ? AND user_id = auth.uid() AND is_active = true;
```

If participant found and is_active:
- Show error: "You're already in this room from another device"
- Options:
  1. Force join (set other session inactive)
  2. Open read-only view
  3. Wait for other session to end

### Rejoin Logic

**When user rejoins same room:**

```sql
-- Check if participant exists
SELECT * FROM participants
WHERE room_id = ? AND user_id = auth.uid();

-- If exists
UPDATE participants
SET is_active = true, joined_at = now()
WHERE room_id = ? AND user_id = auth.uid();

-- If doesn't exist
INSERT INTO participants (room_id, user_id, name)
VALUES (?, auth.uid(), <profile.display_name>);
```

**Benefits:**
- Reuses existing participant ID
- Preserves vote history
- Maintains room relationships
- Avoids unique constraint violations

## Implementation Examples

### React Component: Authentication Hook

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
```

### React Component: Magic Link Sign In

```typescript
// src/components/SignInForm.tsx
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      alert(error.message);
    } else {
      setSent(true);
    }

    setLoading(false);
  };

  if (sent) {
    return (
      <div>
        <p>Check your email for the magic link!</p>
        <p>Email sent to: {email}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSignIn}>
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send magic link'}
      </button>
    </form>
  );
}
```

### React Component: Auth Callback Handler

```typescript
// src/pages/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Extract token from URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const access_token = hashParams.get('access_token');
    const refresh_token = hashParams.get('refresh_token');

    if (access_token && refresh_token) {
      // Set session
      supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      // Redirect to app (or back to room)
      const returnTo = sessionStorage.getItem('returnTo') || '/';
      sessionStorage.removeItem('returnTo');
      navigate(returnTo);
    } else {
      // Error handling
      navigate('/signin?error=invalid_token');
    }
  }, [navigate]);

  return <div>Signing you in...</div>;
}
```

## Future Enhancements

### Planned Features

1. **OAuth Providers**
   - Google Sign-In for teams
   - GitHub for developers
   - Microsoft for enterprises

2. **Team Workspaces**
   - Multiple users under one organization
   - Team-level authentication
   - Shared rooms and history

3. **Session Recording**
   - Track authentication events
   - Audit log for security
   - User activity history

4. **Advanced Security**
   - Two-factor authentication (2FA)
   - IP whitelisting for teams
   - Custom session timeout per team

## Conclusion

The authentication system is designed to be flexible, secure, and user-friendly. It supports both anonymous and authenticated users, with seamless transitions between the two. The magic link approach provides a modern, password-less experience suitable for both individual and team use cases.

## Related Documentation

- [Authentication Setup Guide](./authentication-setup.md) - Configuration steps
- [Authentication Testing Guide](./authentication-testing.md) - Testing procedures
- [Database Schema](./database-schema.md) - Database structure
- [Environment Setup](./environment-setup.md) - Environment configuration
