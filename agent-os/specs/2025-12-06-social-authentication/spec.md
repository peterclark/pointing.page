# Specification: Social Authentication (Google & Github)

## Goal
Replace magic link email authentication with OAuth social authentication using Google and Github providers, implementing Supabase UI library components for a modern, seamless authentication experience while preserving anonymous user participation.

## User Stories
- As a user, I want to sign in with Google or Github so that I can quickly authenticate without email verification delays
- As an anonymous participant, I want to continue using the app without authentication so that I can join rooms and vote immediately
- As an authenticated user, I want my profile picture and email displayed so that I can see my account information at a glance

## Specific Requirements

**Remove Magic Link Authentication**
- Delete all magic link email authentication code from ProfilePage UnauthenticatedView
- Remove accountCreationSchema and AccountCreationFormData from schemas.ts
- Remove signInWithOtp calls and email verification logic
- Remove "Check your email" success state from ProfilePage
- Clean up pending_profile_name localStorage usage (no longer needed for magic link flow)

**Install Supabase UI Components**
- Install Supabase UI library from https://supabase.com/ui following their React installation guide
- Add Social Auth component for OAuth provider buttons
- Add Current User Avatar component for authenticated user display
- Ensure components are compatible with existing shadcn/ui setup (both use shadcn foundation)
- Configure components to match existing Tailwind CSS v4 theme variables

**Social Authentication on Profile Page**
- Display Social Auth component in ProfilePage UnauthenticatedView with Google and Github options
- Style social auth buttons to match existing Card component design language
- Position buttons centrally within Card with clear spacing
- Maintain existing "Create Account" heading but update description to mention social auth
- Ensure OAuth redirect URL is set to landing page (/) after successful authentication
- Pass user metadata (display_name from localStorage) during OAuth flow for profile creation

**Avatar in Hamburger Menu**
- Update AppMenu component to conditionally render MenuIcon (unauthenticated) or Current User Avatar (authenticated)
- Use useAuth hook to detect authentication state
- Display Avatar with user's OAuth profile picture and initials fallback
- Maintain existing button styling and dropdown menu positioning
- Keep keyboard shortcut (⌘/) functionality for menu toggle
- Ensure Avatar is same size as MenuIcon button for visual consistency

**Profile Page Authenticated View**
- Display user's OAuth profile picture at top of Card using Avatar component
- Show OAuth email as read-only Input field with disabled state and muted background
- Maintain existing editable display name Input field
- Keep existing "Email cannot be changed after verification" help text
- Preserve existing profile update functionality and form validation
- Load and display profile picture from user.user_metadata.avatar_url or user.user_metadata.picture

**Unauthenticated Dropdown Menu**
- Show "Sign In" menu item in AppMenu dropdown for unauthenticated users
- Position "Sign In" menu item prominently (before Home menu item)
- Use existing DropdownMenuItem component styling
- Navigate to /profile page when clicked
- Remove "Log out" menu item when not authenticated
- Keep all other menu items (Home, Billing, Settings, Theme, Support, Keyboard shortcuts)

**OAuth Redirect Flow**
- Configure Supabase OAuth providers to redirect to landing page (/) after successful authentication
- Trigger automatic account linking when user authenticates (existing ProfilePage useEffect logic)
- Create profile record with OAuth display_name or fallback to "User"
- Link anonymous localStorage participant_id to authenticated user_id via linkParticipantsToUser
- Show success toast "Email verified successfully!" after account creation
- Clear any pending localStorage data after successful linking
- Handle OAuth callback errors gracefully with user-friendly error messages

**Account Linking Preservation**
- Maintain existing linkParticipantsToUser query function unchanged
- Keep existing ProfilePage useEffect logic for account linking on authentication
- Preserve localStorage participant ID system for anonymous users
- Ensure room participation history transfers to authenticated user seamlessly
- Use linkingAttemptedRef to prevent duplicate linking attempts for same user
- Display "Setting up your account..." loading state during linking process

**Supabase Configuration Documentation**
- Create OAUTH_SETUP.md file in project root with step-by-step Supabase dashboard configuration
- Document Google OAuth provider setup (client ID, client secret, redirect URLs)
- Document Github OAuth provider setup (client ID, client secret, redirect URLs)
- Document site URL configuration in Supabase dashboard
- Document allowed redirect URLs (development and production)
- Include troubleshooting section for common OAuth configuration issues
- Provide example .env.local variables if needed for OAuth (should not be needed with Supabase)

**Anonymous User Flow Preservation**
- Keep localStorage-based participant ID system completely unchanged
- Ensure room joining, voting, and participation work without authentication
- Maintain getParticipantId, getParticipantName, saveParticipantName utilities unchanged
- Keep existing RLS policies that allow anonymous participant records
- Do not require authentication for any existing features (only for future premium features)

## Visual Design

No visual mockups provided. Follow existing UI patterns:

**ProfilePage UnauthenticatedView**
- Use existing Card component with p-6 padding
- Center content on page with container mx-auto px-4 py-8 max-w-md
- Display Header component above Card
- Social Auth component should use full width within Card
- Maintain consistent spacing (space-y-6) between sections

**AppMenu Button**
- Replace MenuIcon with Current User Avatar when authenticated
- Use existing Button component with variant="outline"
- Maintain fixed positioning (top-0 left-0 p-4 z-10)
- Keep same button size and styling for consistency

**ProfilePage AuthenticatedView**
- Add Avatar component at top of Card (large size, centered)
- Display email field with disabled state and bg-muted class
- Keep existing form layout with space-y-6 and space-y-2 for field groups
- Use existing Label and Input components with consistent styling

## Existing Code to Leverage

**useAuth Hook (src/hooks/useAuth.ts)**
- Already provides reactive authentication state with user, session, isAuthenticated, isLoading
- Use this hook in AppMenu to conditionally render MenuIcon vs Avatar
- Use this hook in ProfilePage to determine authenticated vs unauthenticated views
- Hook already listens to Supabase auth state changes via onAuthStateChange
- No modifications needed to this hook

**Account Linking Logic (src/pages/ProfilePage.tsx)**
- Preserve existing useEffect with linkingAttemptedRef pattern
- Keep handleAccountLinking async function structure
- Maintain getProfile check to determine if profile exists
- Keep createProfile call with display_name from localStorage or OAuth metadata
- Preserve linkParticipantsToUser call with error handling
- Keep localStorage cleanup (removeItem "pending_profile_name")
- Update to work with OAuth user metadata instead of magic link metadata

**Supabase Query Functions (src/lib/supabase/queries.ts)**
- Reuse getProfile(userId) to check for existing profile
- Reuse createProfile(userId, displayName) to create new profile
- Reuse updateProfile(userId, displayName) for name editing
- Reuse linkParticipantsToUser(localStorageId, userId) for account linking
- No modifications needed to these query functions

**AppMenu Dropdown Structure (src/components/AppMenu.tsx)**
- Keep existing DropdownMenu component hierarchy and styling
- Preserve keyboard shortcut registration logic (⌘K combinations)
- Maintain existing menu items and navigation handlers
- Keep theme switching logic and menu organization
- Only modify trigger button and add conditional "Sign In" menu item

**Form Validation Patterns (src/lib/schemas.ts)**
- Keep profileNameSchema for display name validation
- Keep profileUpdateSchema for AuthenticatedView form
- Remove accountCreationSchema and emailSchema (no longer needed)
- Reuse existing Zod resolver pattern with react-hook-form

## Out of Scope
- Additional social providers beyond Google and Github (Apple, Microsoft, Twitter, etc.)
- Email/password authentication as fallback option
- Profile picture upload or editing functionality (OAuth provider image is source of truth)
- Email changing functionality (OAuth email is read-only)
- Multi-factor authentication or 2FA
- Session management customization or token refresh logic (handled by Supabase)
- OAuth token storage or manual token handling (handled by Supabase)
- Custom OAuth callback page or intermediate redirect screens
- Password reset or account recovery flows (not applicable with OAuth-only)
- Account deletion or data export features
