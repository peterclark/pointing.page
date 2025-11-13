# Authentication Testing Guide

## Overview

This guide provides detailed testing procedures to verify that the Supabase authentication configuration is working correctly. Follow these tests in order to ensure a complete and functional authentication system.

## Prerequisites

Before running these tests:
- Authentication configuration is complete (magic link enabled, JWT settings configured)
- Database schema is deployed (Phase 2 complete)
- Profile auto-creation trigger is in place
- Supabase project is accessible via dashboard
- You have access to test email accounts

## Test Environment Setup

### Development Environment

```bash
# Ensure you're linked to dev project
cd /Users/peterclark/Projects/shadcn-mcp
npx supabase status

# Verify environment variables
cat .env.local | grep VITE_SUPABASE
```

Expected output:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Test Email Accounts

Recommended test email services:
- **Mailinator**: mailinator.com (public, no signup)
- **TempMail**: temp-mail.org (temporary addresses)
- **Gmail Plus Addressing**: youremail+test1@gmail.com (if you have Gmail)

## Test Suite

### Test 1: Magic Link Request

**Objective:** Verify magic link can be requested and email is sent.

**Steps:**

1. Open Supabase dashboard
2. Navigate to **Authentication** > **Users**
3. Click **Invite user** button (simulates magic link request)
4. Enter test email address: `test-user-1@mailinator.com`
5. Click **Send magic link**

**Expected Results:**
- Success message appears in dashboard
- No error messages
- User appears in auth.users table (pending status)

**Verification:**

```sql
-- Run in Supabase SQL Editor
SELECT
  id,
  email,
  confirmed_at,
  created_at
FROM auth.users
WHERE email = 'test-user-1@mailinator.com';
```

Expected: One row with `confirmed_at = NULL` (not yet confirmed)

**Pass Criteria:**
- [ ] Success message displayed
- [ ] User created in auth.users table
- [ ] confirmed_at is NULL (pending confirmation)

---

### Test 2: Email Delivery

**Objective:** Verify magic link email is received and formatted correctly.

**Steps:**

1. Open mailinator.com
2. Enter inbox name: `test-user-1` (matches email from Test 1)
3. Check inbox for new email from Supabase
4. Open the email

**Expected Results:**
- Email received within 1 minute
- Subject line matches configured template
- Email body is properly formatted
- Magic link button/URL is present
- Link format: `https://your-project.supabase.co/auth/v1/verify?token=...&type=magiclink&redirect_to=...`

**Pass Criteria:**
- [ ] Email received within 1 minute
- [ ] Subject line correct
- [ ] Email template properly rendered
- [ ] Magic link URL present and properly formatted
- [ ] No broken images or formatting issues

**Troubleshooting:**
- If no email received, check spam folder
- Verify SMTP settings in Supabase dashboard
- Check Supabase logs for email sending errors
- Try a different email service

---

### Test 3: Magic Link Click and Redirect

**Objective:** Verify magic link redirects correctly and token is included.

**Steps:**

1. In the test email, click the magic link
2. Observe browser redirect
3. Check final URL in browser address bar
4. Open browser DevTools Console

**Expected Results:**
- Redirect to configured Site URL or Redirect URL
- Token present in URL (either fragment `#access_token=...` or query param)
- No error page or 404
- If callback route exists, it should load

**URL Format Examples:**

```
# Fragment-based (default)
http://localhost:5173/#access_token=eyJ...&refresh_token=...&type=magiclink

# Or redirect to callback
http://localhost:5173/auth/callback#access_token=eyJ...&refresh_token=...
```

**Pass Criteria:**
- [ ] Redirect occurs (no error page)
- [ ] Access token present in URL
- [ ] Refresh token present in URL
- [ ] Type parameter is `magiclink`
- [ ] Redirect URL matches configured URL

**Troubleshooting:**
- If 404 error, verify redirect URLs configured correctly
- If no token in URL, check browser console for errors
- Try copying URL and pasting in new incognito tab

---

### Test 4: Profile Auto-Creation

**Objective:** Verify profile record is automatically created on authentication.

**Steps:**

1. After clicking magic link (Test 3), wait 5 seconds
2. Open Supabase dashboard
3. Navigate to **Database** > **Table Editor**
4. Select **profiles** table
5. Look for profile with matching email

**Expected Results:**
- Profile record exists
- `user_id` matches the auth.users.id
- `display_name` is populated (from email or default)
- `created_at` timestamp is recent

**Verification Query:**

```sql
-- Run in Supabase SQL Editor
SELECT
  p.id,
  p.user_id,
  p.display_name,
  p.created_at,
  u.email
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'test-user-1@mailinator.com';
```

Expected output:
```
id                  | user_id             | display_name          | created_at          | email
uuid                | uuid                | test-user-1           | 2025-11-08 20:00:00 | test-user-1@mailinator.com
```

**Pass Criteria:**
- [ ] Profile record exists
- [ ] user_id matches auth user
- [ ] display_name is populated (not NULL)
- [ ] created_at is within last 5 minutes
- [ ] Only one profile per user (no duplicates)

**Troubleshooting:**
- If no profile created, check trigger exists:
  ```sql
  SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
  ```
- Verify trigger is enabled
- Check Supabase logs for trigger execution errors
- Try manually creating a test user to see if trigger fires

---

### Test 5: Session Persistence

**Objective:** Verify user session persists across page reloads.

**Steps:**

1. After successful authentication (Test 3), note that you're logged in
2. Perform some action (navigate to different page, if app allows)
3. Refresh the browser page (F5 or Cmd+R)
4. Check if still logged in

**Expected Results:**
- User remains logged in after page refresh
- No re-authentication required
- Session data persists in browser storage

**Verification (Browser DevTools):**

1. Open DevTools (F12)
2. Go to **Application** tab
3. Expand **Local Storage** > `https://your-project.supabase.co`
4. Look for session data stored

**Session Data Keys:**
```
supabase.auth.token
```

**Pass Criteria:**
- [ ] User remains logged in after refresh
- [ ] Session data in localStorage
- [ ] No authentication errors in console
- [ ] User can perform authenticated actions

---

### Test 6: Multi-Tab Session Sharing

**Objective:** Verify session is shared across multiple browser tabs.

**Steps:**

1. With user logged in (from previous tests), open a new tab
2. Navigate to same app URL in new tab
3. Check if user is logged in new tab without re-authenticating

**Expected Results:**
- User is automatically logged in new tab
- No magic link click needed
- Session synchronized across tabs

**Pass Criteria:**
- [ ] User logged in new tab automatically
- [ ] No re-authentication needed
- [ ] Session data consistent across tabs

**Note:** This behavior is managed by Supabase client library reading from localStorage.

---

### Test 7: JWT Token Inspection

**Objective:** Verify JWT token contains correct claims and expiration.

**Steps:**

1. After authentication, copy the access token from URL or localStorage
2. Go to https://jwt.io
3. Paste token into debugger
4. Inspect decoded payload

**Expected JWT Claims:**

```json
{
  "aud": "authenticated",
  "exp": 1699488000,  // Expiry timestamp (1 hour from iat)
  "iat": 1699484400,  // Issued at timestamp
  "iss": "https://your-project.supabase.co/auth/v1",
  "sub": "user-uuid-here",  // User ID
  "email": "test-user-1@mailinator.com",
  "phone": "",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {},
  "role": "authenticated",
  "aal": "aal1",
  "amr": [
    {
      "method": "magiclink",
      "timestamp": 1699484400
    }
  ],
  "session_id": "session-uuid-here"
}
```

**Key Claims to Verify:**
- `exp` - Should be 3600 seconds (1 hour) after `iat`
- `sub` - User ID (matches auth.users.id)
- `email` - User's email address
- `role` - Should be "authenticated"
- `amr.method` - Should be "magiclink"

**Pass Criteria:**
- [ ] Token is valid JWT (not corrupted)
- [ ] Expiry is 3600 seconds from issued time
- [ ] User ID (sub) is correct
- [ ] Email claim is correct
- [ ] Role is "authenticated"
- [ ] Method is "magiclink"

---

### Test 8: JWT Token Refresh

**Objective:** Verify JWT token automatically refreshes before expiration.

**Steps:**

1. With user logged in, note the current time
2. Open browser DevTools > Network tab
3. Filter for: `token` or `refresh`
4. Wait approximately 50-55 minutes (near token expiry)
5. Perform an action (navigate, API call, etc.)
6. Observe network requests

**Expected Results:**
- Before token expires (at ~50 minutes), refresh request is sent
- New access token received
- New refresh token received
- Session continues without interruption

**Network Request Details:**

**Request URL:**
```
POST https://your-project.supabase.co/auth/v1/token?grant_type=refresh_token
```

**Request Body:**
```json
{
  "refresh_token": "current-refresh-token"
}
```

**Response (Success):**
```json
{
  "access_token": "new-access-token",
  "refresh_token": "new-refresh-token",
  "token_type": "bearer",
  "expires_in": 3600
}
```

**Pass Criteria:**
- [ ] Refresh request sent before expiry
- [ ] New tokens received successfully
- [ ] Session continues without interruption
- [ ] No user-facing error or re-login prompt

**Note:** This test requires patience (50+ minutes). You can alternatively:
- Manually trigger refresh using Supabase client API
- Set shorter JWT expiry for testing (30 seconds)
- Use browser DevTools to simulate time passing

---

### Test 9: Refresh Token Expiration

**Objective:** Verify user is logged out when refresh token expires.

**Steps:**

1. Note: This test requires 7 days of waiting (not practical for initial testing)
2. Alternative: Manually set short refresh token expiry (e.g., 60 seconds) in Supabase settings
3. Authenticate a user
4. Wait for refresh token to expire (60 seconds)
5. Try to refresh the session

**Expected Results:**
- After refresh token expires, refresh attempt fails
- User is logged out (session cleared)
- User must re-authenticate to continue

**Pass Criteria:**
- [ ] Refresh token expires at configured time
- [ ] Refresh attempt fails after expiry
- [ ] User session is cleared
- [ ] User redirected to login/authentication flow

**Note:** For production, keep 7-day expiry. For testing, you can temporarily shorten it.

---

### Test 10: Multiple User Authentication

**Objective:** Verify multiple users can authenticate independently.

**Steps:**

1. Authenticate first user: `test-user-1@mailinator.com` (already done)
2. Open new incognito browser window
3. Request magic link for second user: `test-user-2@mailinator.com`
4. Click magic link and authenticate second user
5. Verify both users have separate sessions

**Expected Results:**
- Both users authenticated successfully
- Each user has own profile record
- Sessions are independent (different tokens)
- No session conflicts

**Verification Query:**

```sql
-- Check both users exist
SELECT
  u.id,
  u.email,
  u.confirmed_at,
  p.display_name
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email IN ('test-user-1@mailinator.com', 'test-user-2@mailinator.com')
ORDER BY u.created_at;
```

Expected: Two rows, one for each user

**Pass Criteria:**
- [ ] Both users authenticated successfully
- [ ] Two profile records created
- [ ] Sessions independent (different tokens)
- [ ] No data leakage between users

---

### Test 11: Invalid/Expired Magic Link

**Objective:** Verify expired or invalid magic links are rejected.

**Steps:**

1. Request a new magic link for `test-user-3@mailinator.com`
2. DO NOT click the link immediately
3. Wait 65 minutes (links expire after 1 hour)
4. Click the expired magic link

**Expected Results:**
- Error message displayed
- User not authenticated
- Helpful error message suggesting to request new link

**Alternative Test (Invalid Token):**

1. Click a valid magic link
2. Copy the URL
3. Modify the token parameter slightly (change one character)
4. Navigate to modified URL

**Expected Results:**
- Error message: "Invalid or expired token"
- User not authenticated
- Redirect to error page or login page

**Pass Criteria:**
- [ ] Expired links are rejected
- [ ] Invalid tokens are rejected
- [ ] User-friendly error messages shown
- [ ] User can request new magic link

---

### Test 12: User Logout

**Objective:** Verify user can log out and session is cleared.

**Steps:**

1. With user logged in, trigger logout action (via app UI or Supabase client)
2. If using Supabase client directly:
   ```javascript
   const { error } = await supabase.auth.signOut();
   ```
3. Check session after logout

**Expected Results:**
- Session cleared from localStorage
- User logged out
- Access token invalid
- Refresh token invalid

**Verification:**

1. Open DevTools > Application > Local Storage
2. Verify `supabase.auth.token` is removed or empty
3. Try to make authenticated API call
4. Should receive 401 Unauthorized

**Pass Criteria:**
- [ ] Session data cleared from storage
- [ ] User logged out successfully
- [ ] Subsequent API calls fail with 401
- [ ] User must re-authenticate to continue

---

### Test 13: Authentication State Persistence (Browser Restart)

**Objective:** Verify session persists after browser restart.

**Steps:**

1. Authenticate a user
2. Note that user is logged in
3. Close ALL browser windows (completely exit browser)
4. Reopen browser
5. Navigate to app URL

**Expected Results:**
- User still logged in (no re-authentication)
- Session restored from localStorage
- User can continue where they left off

**Pass Criteria:**
- [ ] User remains logged in after browser restart
- [ ] Session data persists
- [ ] No re-authentication needed
- [ ] User can perform authenticated actions

**Note:** Session persists until refresh token expires (7 days).

---

### Test 14: Concurrent Authentication Requests

**Objective:** Verify handling of multiple magic link requests for same user.

**Steps:**

1. Request magic link for `test-user-4@mailinator.com`
2. Immediately request another magic link for same email
3. Wait for both emails to arrive
4. Try clicking both magic links

**Expected Results:**
- Both emails received
- Both magic links work (or only latest works, depending on configuration)
- No errors or conflicts
- User authenticated successfully

**Pass Criteria:**
- [ ] Multiple requests handled gracefully
- [ ] No errors or crashes
- [ ] At least one magic link works
- [ ] User authenticated successfully

---

### Test 15: Profile Display Name Handling

**Objective:** Verify profile display name is correctly extracted and stored.

**Steps:**

1. Authenticate with email: `john.doe@example.com`
2. Check created profile in database

**Expected Results:**
- Profile display name defaults to email prefix: `john.doe`
- Or full email: `john.doe@example.com`
- Depends on trigger implementation

**Verification Query:**

```sql
SELECT
  p.display_name,
  u.email
FROM profiles p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'john.doe@example.com';
```

**Pass Criteria:**
- [ ] Display name extracted from email
- [ ] Display name is human-readable
- [ ] Display name stored correctly
- [ ] No special character issues

---

## Integration Tests

### Integration Test 1: Room Joining with Authentication

**Objective:** Verify authenticated user can join a room with persistent identity.

**Prerequisites:**
- User authenticated
- Profile created
- Room exists in database

**Steps:**

1. Authenticate user (if not already)
2. Navigate to room join page
3. Enter valid room code
4. Create participant record with user_id
5. Verify participant links to profile

**Verification Query:**

```sql
-- Check participant-profile relationship
SELECT
  r.room_code,
  r.name AS room_name,
  part.name AS participant_name,
  prof.display_name,
  u.email
FROM participants part
JOIN rooms r ON r.id = part.room_id
LEFT JOIN profiles prof ON prof.user_id = part.user_id
LEFT JOIN auth.users u ON u.id = part.user_id
WHERE u.email = 'test-user-1@mailinator.com';
```

**Pass Criteria:**
- [ ] Participant created with user_id
- [ ] Participant name matches profile display_name
- [ ] Room-participant-profile relationship correct
- [ ] User can participate in room

---

### Integration Test 2: Anonymous to Authenticated Transition

**Objective:** Verify user can join anonymously, then authenticate later.

**Steps:**

1. Join room anonymously (no authentication)
   - participant.user_id = NULL
2. User decides to authenticate
3. Request magic link and authenticate
4. Update participant record with user_id

**Verification:**

```sql
-- Before authentication
SELECT id, user_id, name FROM participants WHERE id = '<participant-id>';
-- user_id should be NULL

-- After authentication (manual update)
UPDATE participants
SET user_id = '<auth-user-id>'
WHERE id = '<participant-id>';

-- Verify update
SELECT id, user_id, name FROM participants WHERE id = '<participant-id>';
-- user_id should be populated
```

**Pass Criteria:**
- [ ] Anonymous participant created (user_id NULL)
- [ ] Authentication successful
- [ ] Participant updated with user_id
- [ ] Identity persists across sessions

---

## Test Results Summary

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Magic Link Request | ⬜ | |
| 2 | Email Delivery | ⬜ | |
| 3 | Magic Link Redirect | ⬜ | |
| 4 | Profile Auto-Creation | ⬜ | |
| 5 | Session Persistence | ⬜ | |
| 6 | Multi-Tab Session | ⬜ | |
| 7 | JWT Token Inspection | ⬜ | |
| 8 | JWT Token Refresh | ⬜ | |
| 9 | Refresh Token Expiry | ⬜ | |
| 10 | Multiple Users | ⬜ | |
| 11 | Invalid/Expired Link | ⬜ | |
| 12 | User Logout | ⬜ | |
| 13 | Browser Restart | ⬜ | |
| 14 | Concurrent Requests | ⬜ | |
| 15 | Display Name Handling | ⬜ | |
| I1 | Room Join (Authenticated) | ⬜ | |
| I2 | Anonymous → Auth | ⬜ | |

## Automated Testing (Future)

For production, consider implementing automated tests:

```typescript
// Example: Jest test for authentication flow
describe('Authentication Flow', () => {
  it('should request magic link', async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email: 'test@example.com',
    });
    expect(error).toBeNull();
  });

  it('should create profile on authentication', async () => {
    // Simulate authentication
    // Query profiles table
    // Verify profile exists
  });
});
```

## Troubleshooting Guide

### Common Issues and Solutions

**Issue: Magic link not working**
- Solution: Check redirect URLs are configured
- Solution: Verify link hasn't expired (1 hour limit)
- Solution: Try incognito mode to rule out cache issues

**Issue: Profile not created**
- Solution: Verify trigger exists and is enabled
- Solution: Check Supabase logs for errors
- Solution: Manually test trigger function

**Issue: Session not persisting**
- Solution: Check localStorage is enabled
- Solution: Verify Supabase client configuration
- Solution: Check for CORS issues

**Issue: Token refresh failing**
- Solution: Verify JWT and refresh token expiry settings
- Solution: Check network connectivity
- Solution: Verify Supabase project is active

## Conclusion

Complete all tests in this guide to ensure authentication is properly configured and functioning correctly. Address any failures before proceeding to the next phase (Row Level Security).

## Next Steps

After completing all authentication tests:

1. Document any issues encountered and resolutions
2. Update environment-specific configurations if needed
3. Proceed to Phase 4: Row Level Security Policies
4. Integrate authentication into React application
5. Implement authentication UI components
