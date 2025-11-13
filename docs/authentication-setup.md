# Authentication Setup Guide

## Overview

This guide provides step-by-step instructions for configuring Supabase Authentication for the Story Pointer application. The authentication system uses magic link (passwordless email) authentication to provide a simple, secure method for users to sign in without managing passwords.

## Prerequisites

Before starting this guide, ensure:
- Phase 1 and Phase 2 are complete (database schema deployed)
- You have admin access to your Supabase projects (dev, staging, prod)
- You're logged into the Supabase dashboard at https://app.supabase.com

## Authentication Flow Overview

Story Pointer uses a specific authentication flow designed for the room joining experience:

1. **Room Code First**: User enters room code on join page
2. **Name Prompt**: If room exists, user is prompted for display name
3. **Optional Authentication**: User can join immediately or authenticate for persistent identity
4. **Profile Auto-Creation**: When user authenticates, profile record is automatically created via database trigger
5. **Persistent Identity**: Authenticated users maintain consistent display name across rooms

## Configuration Steps

### Step 1: Enable Magic Link Authentication Provider

For each Supabase project (dev, staging, production):

1. Open the Supabase dashboard and select your project
2. Navigate to **Authentication** > **Providers** in the left sidebar
3. Find the **Email** provider in the list
4. Click to expand the Email provider settings
5. Configure the following settings:

   **Email Provider Settings:**
   - **Enable Email provider**: Toggle ON
   - **Confirm email**: Toggle OFF
     - Reason: Allow immediate participation without email confirmation
     - Users can join rooms right away while waiting for magic link
   - **Secure email change**: Toggle OFF for MVP (can enable later)
   - **Enable password authentication**: Toggle OFF
     - Reason: Magic link only, no password management needed

6. Click **Save** at the bottom of the settings panel

**Why Magic Link Only?**
- No password management complexity
- More secure (no password to leak or forget)
- Better UX for planning poker (quick join flow)
- Suitable for both individual and team use

### Step 2: Configure JWT Settings

JWT (JSON Web Token) settings control session duration and token refresh behavior.

1. Navigate to **Authentication** > **Settings** in the left sidebar
2. Scroll to the **JWT Settings** section
3. Configure the following:

   **JWT Expiry:**
   - **JWT expiry**: 3600 seconds (1 hour)
   - Reason: Short-lived tokens for better security
   - Automatic refresh happens transparently

   **Refresh Token Settings:**
   - **Refresh token expiry**: 604800 seconds (7 days)
   - Reason: Users stay logged in for a week without re-authenticating
   - Balance between convenience and security

4. Click **Save** to apply JWT settings

**Important Notes:**
- JWT tokens are automatically refreshed by the Supabase client library
- Refresh happens before expiration (no user interruption)
- If refresh token expires, user must authenticate again
- Token refresh is handled in the React app (no manual configuration needed)

### Step 3: Configure Email Templates for Magic Links

Customize the magic link email template to provide better context for users.

1. Navigate to **Authentication** > **Email Templates** in the left sidebar
2. Select the **Magic Link** template from the dropdown
3. Customize the email template:

   **Subject Line:**
   ```
   Sign in to Story Pointer
   ```

   **Email Body Template (Example):**
   ```html
   <h2>Sign in to Story Pointer</h2>

   <p>Hi there!</p>

   <p>Click the link below to sign in to your Story Pointer account:</p>

   <p><a href="{{ .ConfirmationURL }}">Sign in to Story Pointer</a></p>

   <p>Or copy and paste this URL into your browser:</p>
   <p>{{ .ConfirmationURL }}</p>

   <p>This link will expire in 1 hour.</p>

   <p>If you didn't request this email, you can safely ignore it.</p>

   <hr>
   <p style="font-size: 12px; color: #666;">
   Story Pointer - Collaborative Planning Poker for Agile Teams
   </p>
   ```

4. Click **Save** to update the template

**Template Variables Available:**
- `{{ .ConfirmationURL }}` - The magic link URL user clicks
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - The authentication token (included in ConfirmationURL)
- `{{ .TokenHash }}` - Hashed version of token

**Future Enhancement:**
- Add room context variables when joining via room code
- Include room name/code in email if available
- Custom templates per use case (join vs. create)

**SMTP Configuration:**
- For MVP: Use default Supabase SMTP (no configuration needed)
- For Production: Consider configuring custom SMTP for better deliverability
  - Navigate to **Authentication** > **Settings** > **SMTP Settings**
  - Configure your own email service (SendGrid, Mailgun, AWS SES, etc.)

### Step 4: Configure Authentication Redirect URLs

Redirect URLs determine where users land after clicking the magic link.

1. Navigate to **Authentication** > **URL Configuration** in the left sidebar
2. Configure the following settings:

   **Site URL:**
   - **Development**: `http://localhost:5173`
   - **Staging**: Your staging domain (e.g., `https://staging.story-pointer.com`)
   - **Production**: Your production domain (e.g., `https://story-pointer.com`)

   The Site URL is the default redirect if no specific redirect is provided.

   **Redirect URLs (Additional Allowed URLs):**

   Add the following URLs to the **Redirect URLs** list:

   For **Development** project:
   ```
   http://localhost:5173/auth/callback
   http://localhost:5173/*
   ```

   For **Staging** project:
   ```
   https://staging.story-pointer.com/auth/callback
   https://staging.story-pointer.com/*
   ```

   For **Production** project:
   ```
   https://story-pointer.com/auth/callback
   https://story-pointer.com/*
   ```

3. Click **Save** to apply URL configuration

**URL Configuration Notes:**
- Wildcard pattern (`/*`) allows redirects to any path in your app
- The `/auth/callback` route will handle the authentication response
- This route will be implemented in the React app to process the auth token
- Users can be redirected back to the room they were joining

**Security Considerations:**
- Only add trusted domains to redirect URLs
- Never add external domains you don't control
- Use HTTPS for staging and production (required by Supabase)
- Localhost is only for development environment

### Step 5: Configure Session Settings

Session settings control how user sessions are managed across devices and tabs.

1. Navigate to **Authentication** > **Settings** in the left sidebar
2. Scroll to the **Session Management** section
3. Configure the following:

   **Session Settings:**
   - **Session timeout**: Use default (managed by JWT expiry)
   - **Refresh token rotation**: ENABLED (recommended)
     - Reason: Improved security, old tokens invalidated on refresh
   - **Refresh token reuse interval**: 10 seconds (default)
   - **Single session per user**: DISABLED for MVP
     - Reason: Allow users on multiple devices if needed
     - Note: Multi-device room participation is prevented at application level

   **Additional Security Settings:**
   - **Enable anonymous sign-ins**: DISABLED
     - Reason: Not needed for Story Pointer's flow
   - **Enable manual linking**: DISABLED for MVP
   - **Require email verification**: DISABLED
     - Reason: Immediate participation allowed

4. Click **Save** to apply session settings

**Multi-Tab Behavior:**
- Session is shared across multiple tabs in same browser
- Supabase client library handles session synchronization
- User only needs to authenticate once per browser
- Session persists until refresh token expires (7 days)

**Device Management:**
- Users can be logged in on multiple devices simultaneously
- Each device has its own session and tokens
- Logging out on one device doesn't affect others
- Room participation from multiple devices is prevented in the application logic (not auth level)

### Step 6: Test Authentication Flow

After configuration, test the authentication flow end-to-end.

#### Testing Checklist

1. **Request Magic Link**
   - Open your app at `http://localhost:5173` (dev)
   - Navigate to authentication/signup flow
   - Enter a test email address
   - Submit the form

2. **Verify Email Delivery**
   - Check inbox for magic link email
   - Verify email arrives within 1 minute
   - Check spam folder if not received
   - Verify email template is correctly formatted

3. **Click Magic Link**
   - Click the "Sign in" link in email
   - Verify redirect to your app
   - Check that you land on `/auth/callback` route
   - Verify token is present in URL (fragment or query param)

4. **Verify Profile Auto-Creation**
   - After successful authentication, open Supabase dashboard
   - Navigate to **Database** > **Table Editor**
   - Select the **profiles** table
   - Verify a new profile record was created for your test user
   - Check that `user_id` matches the auth user ID
   - Check that `display_name` was populated (from email or default)

5. **Test Token Refresh**
   - Stay logged in and idle for 50-55 minutes
   - Perform an action (navigate to different page)
   - Check browser DevTools Network tab
   - Verify a token refresh request was made to Supabase
   - Verify new token received and session continues

6. **Test Session Persistence**
   - Close all browser tabs
   - Reopen browser and navigate to your app
   - Verify you're still logged in (no re-authentication needed)
   - Session should persist until refresh token expires (7 days)

#### Testing with Multiple Environments

Repeat the above tests for each environment:
- Development (localhost:5173)
- Staging (staging domain)
- Production (production domain)

#### Testing Commands (Supabase CLI)

You can also test authentication via Supabase CLI:

```bash
# Check auth configuration
npx supabase functions list

# Monitor auth events in real-time
npx supabase db logs --tail

# Inspect auth users table
npx supabase db shell
SELECT * FROM auth.users;
\q
```

#### Troubleshooting Common Issues

**Issue: Magic link email not received**
- Check spam/junk folder
- Verify SMTP settings (if using custom SMTP)
- Check Supabase logs for email sending errors
- Verify email provider is enabled in dashboard
- Try a different email address

**Issue: Magic link redirect fails**
- Verify redirect URL is in allowed list
- Check that site URL matches your app domain
- Ensure HTTPS for staging/production
- Check browser console for errors

**Issue: Profile not auto-created**
- Verify the `handle_new_user()` trigger exists in database
- Check that trigger is ENABLED (not disabled)
- Run query: `SELECT * FROM auth.users;` to verify user created
- Check Supabase logs for trigger execution errors
- Manually test trigger:
  ```sql
  SELECT handle_new_user();
  ```

**Issue: Token refresh not working**
- Verify JWT expiry is set to 3600 seconds
- Check that refresh token expiry is 604800 seconds
- Ensure Supabase client is configured to auto-refresh
- Check browser console for refresh errors
- Verify user session is valid in Supabase dashboard

**Issue: Session not persisting across tabs**
- Verify localStorage is enabled in browser
- Check that session storage is not disabled
- Ensure Supabase client is using correct storage adapter
- Test in incognito mode to rule out extension interference

## Integration with Room Joining Flow

The authentication system integrates with Story Pointer's room joining flow:

### Unauthenticated User Flow

1. User enters room code
2. System validates room exists
3. User prompted for display name
4. User joins room as participant (creates participant record)
5. User can participate immediately without authentication
6. **Optional**: User can authenticate later for persistent identity

### Authenticated User Flow

1. User enters room code
2. System validates room exists
3. If user already authenticated:
   - Use display name from profile
   - Allow override if desired
4. Create/update participant record with user_id link
5. User joins room with persistent identity

### Profile and Participant Relationship

**Profile Record:**
- Created automatically on first authentication
- Linked to `auth.users` via `user_id`
- Contains default `display_name` (from email)
- Persists across all rooms

**Participant Record:**
- Created when user joins a room
- Can reference a profile via `user_id` (if authenticated)
- Can override profile's display name per room
- Unique constraint: One participant per user per room

**Example Scenarios:**

Scenario 1: Anonymous User
```
1. User joins room → Participant created (user_id = NULL, name = "John")
2. User participates anonymously
3. User leaves room → No persistent identity
```

Scenario 2: Authenticated User (First Time)
```
1. User authenticates → Profile created (user_id = <uuid>, display_name = "john@example.com")
2. User joins room → Participant created (user_id = <uuid>, name = "john@example.com")
3. User leaves room → Profile persists
4. User joins another room → Same profile, new participant record
```

Scenario 3: Authenticated User (Returning)
```
1. User already has profile
2. User joins room → Participant created (user_id = <uuid>, name = <from profile>)
3. User can override name for this room if desired
```

## Email Template Customization Examples

### Example 1: Simple Magic Link

```html
<h2>Your sign-in link for Story Pointer</h2>

<p>Click here to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in now</a></p>

<p>This link expires in 1 hour.</p>
```

### Example 2: With Branding

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Welcome to Story Pointer!</h2>

    <p>Hi there,</p>

    <p>Click the button below to sign in to your Story Pointer account:</p>

    <p>
      <a href="{{ .ConfirmationURL }}" class="button">Sign in to Story Pointer</a>
    </p>

    <p>This magic link will expire in 1 hour for security reasons.</p>

    <p>If you didn't request this email, you can safely ignore it.</p>

    <div class="footer">
      <p>Story Pointer - Collaborative Planning Poker for Agile Teams</p>
    </div>
  </div>
</body>
</html>
```

### Example 3: With Room Context (Future)

```html
<h2>Join planning session in Story Pointer</h2>

<p>Hi {{ .Email }},</p>

<p>You've been invited to join a planning poker session:</p>

<p><strong>Room:</strong> {{ .RoomName }}</p>
<p><strong>Code:</strong> {{ .RoomCode }}</p>

<p>Click here to sign in and join:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in and join room</a></p>

<p>This link expires in 1 hour.</p>
```

Note: Room context variables require custom implementation in the auth flow.

## Security Best Practices

### For Development Environment

- Use localhost only (never expose dev database)
- Test with disposable email addresses
- Don't use production-like data in dev
- Regularly reset test data

### For Staging Environment

- Use staging-specific domains
- Configure custom SMTP if possible
- Test with team members before production
- Monitor authentication logs

### For Production Environment

- **Always use HTTPS** (required)
- Configure custom SMTP for better deliverability
- Monitor authentication logs regularly
- Set up alerts for failed authentication attempts
- Consider rate limiting for auth endpoints
- Implement CAPTCHA if abuse detected
- Regularly review redirect URLs list

### General Security Notes

- Never commit API keys to version control
- Rotate service role keys periodically
- Use anon key in frontend (it's safe to expose)
- Never expose service role key to frontend
- Implement rate limiting for sensitive operations
- Log authentication events for audit trail

## Production Checklist

Before deploying authentication to production:

- [ ] Magic link authentication tested and working in dev
- [ ] Email delivery verified in dev environment
- [ ] Profile auto-creation trigger tested
- [ ] JWT token refresh tested (wait for expiry)
- [ ] Session persistence tested across browser restarts
- [ ] Multi-tab session sharing tested
- [ ] Custom email template configured and tested
- [ ] All redirect URLs configured correctly
- [ ] Site URL matches production domain
- [ ] HTTPS enabled for production domain
- [ ] Custom SMTP configured (recommended for production)
- [ ] Authentication logs monitored
- [ ] Error handling tested (invalid tokens, expired links)
- [ ] Documentation updated with production settings

## Next Steps

After completing authentication configuration:

1. **Phase 4: Row Level Security Policies**
   - Implement RLS policies for all tables
   - Test access control with authenticated users
   - Verify users can only access their own data

2. **Phase 5: Real-time Subscriptions**
   - Enable real-time for all tables
   - Configure room-specific subscriptions
   - Test live updates across multiple clients

3. **Phase 6: TypeScript Integration**
   - Generate types from database schema
   - Create Supabase client wrapper
   - Implement authentication hooks in React

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Magic Link Authentication Guide](https://supabase.com/docs/guides/auth/auth-magic-link)
- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Session Management](https://supabase.com/docs/guides/auth/sessions)
- [JWT Configuration](https://supabase.com/docs/guides/auth/jwts)

## Support

If you encounter issues during authentication setup:

1. Check the troubleshooting section above
2. Review Supabase authentication logs
3. Consult Supabase documentation
4. Check browser console for client-side errors
5. Verify environment variables are set correctly

For Supabase-specific issues, visit:
- [Supabase Discord](https://discord.supabase.com)
- [Supabase GitHub Discussions](https://github.com/supabase/supabase/discussions)
- [Supabase Support](https://supabase.com/support)
