# OAuth Setup Guide

This guide provides step-by-step instructions for configuring Google and Github OAuth authentication providers in Supabase.


## Required: Anonymous sign-ins and Manual Linking

Two settings under **Authentication → Sign In / Providers** need to be on.

**Allow anonymous sign-ins.** Every visitor is signed in anonymously before the
app makes its first query. This is what gives Row Level Security an `auth.uid()`
to key on, and therefore what makes vote privacy enforceable in the database
rather than only in the browser. With it off, `SessionGate` logs a failure and
the app degrades to read-only: policies fail closed, so a visitor sees revealed
votes and cannot vote.

**Manual Linking.** When a guest signs in with Google or GitHub, the app calls
`linkIdentity()` rather than `signInWithOAuth()`. That attaches the provider to
the anonymous identity the visitor already holds, so their `auth.uid()` — and
every room they joined as a guest — survives the upgrade. Without this setting
`linkIdentity()` fails and the sign-in surfaces an error rather than silently
stranding their rooms.


## Prerequisites

- A Supabase project (create one at [supabase.com](https://supabase.com))
- Google Cloud Platform account (for Google OAuth)
- Github account (for Github OAuth)

## Supabase Base Configuration

Before setting up individual providers, configure your Supabase project's base URLs:

1. Navigate to your Supabase project dashboard
2. Go to **Authentication** → **URL Configuration**
3. Set the following URLs:

### Site URL
- **Development**: `http://localhost:5173`
- **Production**: `https://your-production-domain.com`

### Redirect URLs
Add both development and production URLs to the allowed list:
- `http://localhost:5173/**` (development)
- `https://your-production-domain.com/**` (production)

## Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - Choose **External** user type (or Internal if using Google Workspace)
   - Fill in required fields (app name, support email, developer contact)
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if using External type during development
   - Click **Save and Continue**

### Step 2: Configure OAuth Client

1. Select **Web application** as the application type
2. Set a name for your OAuth client (e.g., "Pointing.page")
3. Add **Authorized JavaScript origins**:
   - Development: `http://localhost:5173`
   - Production: `https://your-production-domain.com`
4. Add **Authorized redirect URIs**:
   - Get your Supabase project's callback URL from the Supabase dashboard:
     - Go to **Authentication** → **Providers** → **Google**
     - Copy the **Callback URL (for OAuth)** (format: `https://[project-ref].supabase.co/auth/v1/callback`)
   - Add this URL to Authorized redirect URIs
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

### Step 3: Enable Google Provider in Supabase

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** and toggle it to **Enabled**
3. Paste the **Client ID** from Google Cloud Console
4. Paste the **Client Secret** from Google Cloud Console
5. Click **Save**

## Github OAuth Setup

### Step 1: Create Github OAuth App

1. Go to [Github Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** in the left sidebar
3. Click **New OAuth App**
4. Fill in the application details:
   - **Application name**: `Pointing.page` (or your app name)
   - **Homepage URL**:
     - Development: `http://localhost:5173`
     - Production: `https://your-production-domain.com`
   - **Application description**: (optional) Brief description of your app
   - **Authorization callback URL**: Get from Supabase dashboard:
     - Go to **Authentication** → **Providers** → **Github**
     - Copy the **Callback URL (for OAuth)** (format: `https://[project-ref].supabase.co/auth/v1/callback`)
     - Paste this URL into Github
5. Click **Register application**
6. Copy the **Client ID**
7. Click **Generate a new client secret**
8. Copy the **Client Secret** (you won't be able to see it again)

### Step 2: Enable Github Provider in Supabase

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Github** and toggle it to **Enabled**
3. Paste the **Client ID** from Github
4. Paste the **Client Secret** from Github
5. Click **Save**

## Testing OAuth Flows

### Development Testing

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:5173/profile`
3. Click "Continue with Google" or "Continue with GitHub"
4. Authorize the application
5. You should be redirected back to the landing page (`/`)
6. Your avatar should appear in the hamburger menu (top left)

### Common Test Scenarios

- **New user signup**: First-time authentication should create a profile and link any anonymous participants
- **Existing user login**: Should load existing profile and display user information
- **Avatar display**: Profile picture from OAuth provider should appear in the menu
- **Email display**: OAuth email should be read-only on the profile page
- **Display name editing**: Should be able to update display name while authenticated

## Troubleshooting

### Redirect URI Mismatch

**Error**: `redirect_uri_mismatch` or similar OAuth error

**Solution**:
- Verify the callback URL in Supabase matches exactly what you configured in Google/Github
- Ensure no trailing slashes or extra characters
- Check that the Supabase project URL is correct
- Verify both development and production URLs are added

### Invalid Client ID or Secret

**Error**: Authentication fails with invalid credentials

**Solution**:
- Double-check the Client ID and Client Secret in Supabase dashboard
- Ensure you copied the complete strings (no extra spaces)
- Regenerate credentials if necessary
- Verify the OAuth app is not suspended or deleted

### OAuth Consent Screen Not Configured (Google)

**Error**: Cannot access OAuth consent screen or app not verified

**Solution**:
- Complete the OAuth consent screen configuration in Google Cloud Console
- Add required scopes: `email`, `profile`, `openid`
- Add test users during development (if using External user type)
- For production, submit app for verification or use Internal user type (Workspace only)

### PKCE Flow Issues

**Error**: PKCE verification failed

**Solution**:
- Supabase handles PKCE automatically; no client-side configuration needed
- Ensure you're using the latest Supabase client library
- Clear browser cache and cookies
- Try a different browser or incognito mode

### Callback URL Not in Allowed List

**Error**: Redirect URL not in allowed list

**Solution**:
- Verify the redirect URL is added to the allowed list in Supabase (**Authentication** → **URL Configuration**)
- Ensure the URL matches exactly (including protocol and trailing wildcards)
- Add both `http://localhost:5173/**` and `https://your-production-domain.com/**`

### Profile Picture Not Loading

**Issue**: Avatar shows initials instead of profile picture

**Solution**:
- Check that `user.user_metadata.avatar_url` or `user.user_metadata.picture` contains a valid URL
- Verify CORS headers allow loading images from OAuth provider domains
- Check browser console for CORS errors
- Ensure the image URL is publicly accessible

### Account Linking Issues

**Issue**: Anonymous participants not linked to authenticated user

**Solution**:
- Verify `linkParticipantsToUser` function is called in ProfilePage useEffect
- Check that `getParticipantId()` returns a valid localStorage ID
- Inspect console logs for linking errors
- Verify database RLS policies allow participant updates

## Environment Variables

No additional environment variables are required for OAuth. Supabase handles provider configuration through the dashboard.

Your existing `.env.local` should contain:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Production Deployment Checklist

Before deploying to production:

- [ ] Update Site URL in Supabase to production domain
- [ ] Add production domain to Redirect URLs in Supabase
- [ ] Update Authorized JavaScript origins in Google Cloud Console
- [ ] Update Authorized redirect URIs in Google Cloud Console
- [ ] Update Authorization callback URL in Github OAuth App
- [ ] Test OAuth flows on production domain
- [ ] Verify profile creation and account linking work correctly
- [ ] Check that avatar and email display properly
- [ ] Test both Google and Github authentication
- [ ] Ensure anonymous users can still use the app without authentication

## Support

For additional help:
- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Github OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
