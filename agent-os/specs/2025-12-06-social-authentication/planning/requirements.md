# Spec Requirements: Social Authentication (Google & Github)

## Initial Description
Replace the current magic link email registration with social authentication using Google and Github providers. Use Supabase UI library components for implementation.

The feature modernizes the authentication flow by replacing email-based magic links with social authentication providers (Google and Github). The Supabase UI library provides pre-built components that handle the OAuth flow, reducing implementation complexity.

Key design decisions:
- Anonymous users can still use the app (voting doesn't require authentication)
- Social auth is optional but recommended for improved UX
- Avatar display replaces hamburger menu when authenticated
- Supabase UI components provide consistent styling and behavior

## Requirements Discussion

### First Round Questions

**Q1:** I assume you want to use the Supabase UI library components (from https://supabase.com/ui) rather than the deprecated @supabase/auth-ui library. Is that correct?
**Answer:** Yes, use https://supabase.com/ui for the shadcn ui components (NOT the deprecated Auth UI library). Follow the instructions from that site.

**Q2:** Should the implementation include documentation for the required Supabase configuration steps (enabling OAuth providers in the dashboard, setting redirect URLs, etc.)?
**Answer:** Yes, provide documentation for the required Supabase configuration steps.

**Q3:** I understand you want to use the "Current User Avatar" UI component from Supabase. Should this component be used as-is, or would you like any customization?
**Answer:** Use the Supabase current user avatar component that the user has installed.

**Q4:** For the hamburger menu behavior, should it work like this: (a) Unauthenticated users see the MenuIcon (three bars), (b) Authenticated users see their Avatar, (c) Clicking either opens the same dropdown menu with different content based on auth state?
**Answer:**
- Unauthenticated: Shows MenuIcon (three bars)
- Authenticated: Shows Avatar with user's profile picture/initials
- Clicking either opens the same dropdown menu

**Q5:** In the profile menu dropdown for unauthenticated users, should we display the social auth buttons directly in the dropdown, or should we show a "Sign In" menu item that navigates to /profile?
**Answer:** Show 'Sign In' menu item in the dropdown.

**Q6:** Should we completely remove the magic link authentication flow, or keep it as a fallback option alongside social auth?
**Answer:** Completely remove the magic link authentication flow.

**Q7:** For the authenticated profile page view, should we: (a) Display the email from the OAuth account (read-only), (b) Display the user's profile picture from the OAuth provider?
**Answer:** Yes, show email from OAuth account. Yes, display profile picture from OAuth provider.

**Q8:** Regarding anonymous users: (a) Should anonymous users continue using the localStorage-based participant ID system? (b) Is it correct that room participation doesn't require authentication? (c) Social auth is optional and only needed for features like viewing room history, saved preferences, etc.?
**Answer:**
- Yes, anonymous users continue using localStorage-based participant IDs
- Correct, room participation doesn't require authentication
- Yes, social auth is optional and needed for features like viewing room history, saved preferences, etc.

**Q9:** For account linking, should we preserve the existing behavior where anonymous room participations get linked to the user's account when they authenticate?
**Answer:** Yes, preserve the existing behavior where anonymous room participations get linked to the user's account when they authenticate.

**Q10:** For the OAuth redirect flow, should we redirect users back to the landing page (/) after successful authentication, or to the /profile page?
**Answer:** Redirect back to the landing page (not /profile) after successful authentication. User avatar should show in the hamburger menu at that point.

**Q11:** Besides Github and Google, are there any other social providers you'd like to support initially (e.g., Apple, Microsoft, Twitter)?
**Answer:** Only support Github and Google for now. No other providers like Apple.

### Existing Code to Reference

No similar existing features identified for reference. This is a replacement of the current magic link authentication system.

The current implementation to be replaced:
- `/Users/peterclark/Projects/shadcn-mcp/src/pages/ProfilePage.tsx` - Contains magic link authentication flow
- `/Users/peterclark/Projects/shadcn-mcp/src/components/AppMenu.tsx` - Hamburger menu with MenuIcon, needs to show Avatar when authenticated
- `/Users/peterclark/Projects/shadcn-mcp/src/lib/supabase/auth.ts` - Authentication utilities (likely)

### Follow-up Questions

No follow-up questions needed at this time.

## Visual Assets

### Files Provided:
No visual files found.

### Visual Insights:
No visual assets provided.

## Requirements Summary

### Functional Requirements

**Authentication Flow:**
- Replace magic link email authentication with social OAuth (Google and Github only)
- Use Supabase UI library components from https://supabase.com/ui
- Specifically use: Social Auth component and Current User Avatar component
- Support only Google and Github providers initially
- Anonymous participation remains fully functional without authentication
- Authentication is optional and provides access to enhanced features

**Hamburger Menu Behavior:**
- Unauthenticated state: Display MenuIcon (three bars)
- Authenticated state: Display user's Avatar with profile picture/initials from OAuth provider
- Both states open the same dropdown menu with different content
- Unauthenticated dropdown: Show "Sign In" menu item that navigates to /profile
- Authenticated dropdown: Show existing menu items with user info

**Profile Page:**
- Unauthenticated view: Display social auth component with Google and Github options
- Authenticated view:
  - Display user's profile picture from OAuth provider
  - Show email from OAuth account (read-only)
  - Allow editing of display name
  - Keep existing profile management functionality

**OAuth Redirect Flow:**
- After successful authentication, redirect to landing page (/)
- User avatar should immediately appear in hamburger menu
- Automatically link anonymous room participations to authenticated account

**Account Linking:**
- Preserve existing account linking behavior
- Anonymous participants (localStorage-based IDs) get linked to user account on authentication
- Room participation history transfers to authenticated user

**Authentication State:**
- Anonymous users continue using localStorage-based participant ID system
- Room participation and voting do not require authentication
- Authentication unlocks: room history, saved preferences, and future premium features

### Reusability Opportunities

**Existing Patterns to Preserve:**
- localStorage participant ID system (anonymous users)
- Account linking logic when user authenticates
- Profile management and display name editing
- useAuth hook pattern for authentication state

**Components to Update:**
- AppMenu.tsx: Update to show Avatar when authenticated
- ProfilePage.tsx: Replace magic link form with social auth component
- Header component: Keep unchanged per CLAUDE.md instructions

**Supabase Integration:**
- Use existing Supabase client configuration
- Leverage existing auth state management patterns
- Maintain existing RLS policies and authentication flow structure

### Scope Boundaries

**In Scope:**
- Remove magic link authentication completely
- Implement Google OAuth authentication
- Implement Github OAuth authentication
- Add Supabase UI Social Auth component
- Add Supabase UI Current User Avatar component
- Update hamburger menu to show avatar when authenticated
- Update profile page with social auth options
- Display OAuth profile picture on profile page
- Display OAuth email on profile page (read-only)
- Redirect to landing page after OAuth success
- Documentation for Supabase OAuth configuration steps
- Preserve anonymous user flow and account linking

**Out of Scope:**
- Additional social providers (Apple, Microsoft, Twitter, etc.)
- Email/password authentication as fallback
- Profile picture upload/editing (use OAuth provider image)
- Email changing functionality (OAuth email is read-only)
- Enhanced premium features that require authentication (future)
- Multi-factor authentication
- Session management customization
- OAuth token refresh logic (handled by Supabase)

### Technical Considerations

**Supabase UI Library:**
- Install components from https://supabase.com/ui following their documentation
- Framework: React + TypeScript + Vite application
- Already has shadcn/ui installed (required foundation for Supabase UI)
- Components install via Supabase UI CLI or manual integration

**Configuration Requirements:**
- Enable Google OAuth provider in Supabase dashboard
- Enable Github OAuth provider in Supabase dashboard
- Configure OAuth redirect URLs in Supabase
- Set up OAuth client IDs and secrets for both providers
- Update site URL configuration in Supabase
- Document all configuration steps for deployment

**Integration Points:**
- Existing useAuth hook for authentication state
- Existing Supabase client configuration
- Existing profile management queries (getProfile, updateProfile, etc.)
- Existing account linking logic (linkParticipantsToUser)
- Existing localStorage utilities (getParticipantId, getParticipantName)

**Authentication Flow:**
- User clicks social provider button → OAuth redirect → Provider login → Callback to app → Create/update profile → Link anonymous participants → Redirect to landing page
- Preserve existing profile creation and account linking logic
- Maintain existing RLS policies for authenticated users

**Component Updates:**
- AppMenu: Conditionally render MenuIcon or Avatar based on auth state
- ProfilePage: Replace UnauthenticatedView with Social Auth component
- ProfilePage: Update AuthenticatedView to show OAuth profile picture and email

**Technology Stack Alignment:**
- React 19.1.1 with TypeScript
- Supabase for backend and authentication
- shadcn/ui component library (already installed)
- Supabase UI components (to be installed)
- React Router for navigation
- Existing form validation patterns with Zod
