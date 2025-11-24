# Spec Requirements: Account Page

## Initial Description

Create an account page for the user. An account link will be a user avatar circle absolutely positioned in the top right corner of the app. Clicking the account link/button will take the user to their account page where they can enter name (can be first or full name) and email. Once email is entered, use Supabase magic link to confirm the email and user account.

## Requirements Discussion

### First Round Questions

**Q1:** Should the account page be accessible from all pages in the app, or only from specific pages (like the active room page)?
**Answer:** Show on all pages

**Q2:** For the user avatar button positioning - should it be absolutely positioned relative to the app's main container, or should it be part of a persistent header/navigation component?
**Answer:** Part of a persistent header/navigation component

**Q3:** When a user who previously joined anonymously (with just a name stored in localStorage) creates an account - should we automatically link their past room participation to their new authenticated account? Or should authenticated and anonymous sessions remain separate?
**Answer:** Automatically link their past room participation to their new authenticated account

**Q4:** For the account page form - should we pre-fill the name field with the user's current localStorage name (if they have one from anonymous participation)? Should we require both name and email, or can name be optional?
**Answer:** Pre-fill the name field with the user's current localStorage name, both name and email should be required

**Q5:** After the user enters their email and receives the magic link - where should the magic link redirect them after successful verification? Back to the account page? Back to their current room? Or to a specific confirmation page?
**Answer:** (Will be clarified in follow-ups)

**Q6:** Should the account page show any additional information beyond name/email editing? For example: account creation date, list of rooms they've participated in, or participation history?
**Answer:** No additional information beyond name/email for now

**Q7:** When a user updates their profile name after authentication - should this retroactively update their display name in past room participation records, or only affect future rooms they join?
**Answer:** (Will be clarified in follow-ups)

**Q8:** For the avatar button in the top right - should it display different states (e.g., different icon or color) to indicate whether the user is authenticated vs anonymous? Or should it look the same for all users?
**Answer:** Show log-in icon when not logged in, show user icon when logged in

**Q9:** When an anonymous user (already in a room) clicks the account button and creates an account - should they be kept in their current room throughout the process, or is it okay to navigate them away temporarily?
**Answer:** Keep them in the room, link authentication silently in background

**Q10:** Are there any existing features or pages in your codebase with similar patterns we should reference? For example: navigation headers with positioned buttons, profile/settings pages, or Supabase authentication flows?
**Answer:** No similar features identified

### Follow-up Questions

**Follow-up 1:** You mentioned linking past participation automatically. When the user submits their email and starts the magic link flow - should we show them a confirmation message like "We'll link your previous rooms to this account" before sending the link? Or should this happen silently in the background?
**Answer:** Link in background (silently, no confirmation prompt)

**Follow-up 2:** For the magic link redirect - should we:
a) Redirect to the profile page with a success toast message
b) Redirect back to the room they were in (if applicable)
c) Redirect to a dedicated confirmation page
Which approach would work best for your users?
**Answer:** Link back to profile page with a toast message

**Follow-up 3:** During the magic link flow (after user enters email but before they click the link in their email) - should we:
a) Show a "Check your email" message on the account page
b) Disable the form and show a loading state
c) Allow them to navigate away and complete verification later
Which behavior would you prefer?
**Answer:** Disable the form while processing

**Follow-up 4:** Regarding the magic link click - if the user clicks the link from a different device/browser than where they initiated it, should we:
a) Log them in on the new device and leave the original device logged out
b) Show an error saying they must verify on the same device
c) Log them in on both devices
**Answer:** If they click from a different device, log them in on the new device

**Follow-up 5:** When a user updates their profile name after authentication - you mentioned this question. Should we:
a) Update their name in all past room participation records (retroactive)
b) Keep their old name on past sessions and only use the new name for future rooms
c) Show both names somehow (old vs current)
**Answer:** Preserve name on past sessions (don't retroactively update)

**Follow-up 6:** If an unauthenticated user tries to access /profile directly (via URL) - should we:
a) Redirect them to the landing page
b) Show the account creation form immediately
c) Show a "Please log in" message with a login option
**Answer:** Don't do any of these - just show basic form fields for creating an account

### Existing Code to Reference

No similar existing features identified for reference.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
No visual assets provided.

## Requirements Summary

### Functional Requirements

**Navigation & Access:**
- Account link/button visible on all pages in the app
- Account button positioned in persistent header/navigation component (top right)
- Different icon states: log-in icon when not logged in, user icon when logged in
- Clicking account button navigates to /profile page
- Direct URL access to /profile shows account creation form (no redirect required)

**Account Page - Unauthenticated State:**
- Form with two required fields: Name and Email
- Pre-fill name field with localStorage participant name (if exists)
- Submit button to initiate magic link flow
- Basic form validation (email format, required fields)

**Magic Link Flow:**
- On form submit: send Supabase magic link to provided email
- Disable form and show processing state while sending
- After sending: show "Check your email" message
- User clicks magic link in email to verify
- Magic link redirect: back to /profile page
- Show success toast message after verification
- Support cross-device verification (log in on device where link is clicked)

**Account Page - Authenticated State:**
- Display current user name and email
- Allow editing of name field
- Email field display-only (cannot be changed after verification)
- Save button to update name

**Account Linking (Anonymous to Authenticated):**
- When anonymous user creates account, silently link their localStorage participant ID to new auth account
- No confirmation prompt shown to user
- Past room participation automatically associated with new account
- Process happens in background during magic link verification

**Profile Name Updates:**
- When authenticated user updates their name, only apply to future participation
- Do not retroactively update name in past room participation records
- Past sessions preserve the name used at the time

**User Session Management:**
- Anonymous users: tracked via localStorage participant_id (existing pattern)
- Authenticated users: tracked via Supabase auth user_id
- Participants table links both: user_id (nullable) and localStorage-based identification

### Reusability Opportunities

**Existing Patterns to Follow:**
- localStorage participant tracking (getParticipantId, getParticipantName from src/lib/utils.ts)
- Form validation with Zod schemas (src/lib/schemas.ts)
- React Hook Form with zodResolver (existing pattern in StoryForm)
- Toast notifications with Sonner (existing pattern throughout app)
- Supabase queries centralized in src/lib/supabase/queries.ts
- Navigation patterns using React Router v7

**Components to Potentially Reuse:**
- shadcn/ui form components (Input, Button, Label)
- shadcn/ui Avatar component for user icon
- Toast component (already in use via Sonner)
- Existing utility function patterns (cn(), form helpers)

**Backend Patterns:**
- Supabase magic link authentication (built-in feature)
- Database query functions in queries.ts
- Database types in database.types.ts
- Row-Level Security policies pattern

### Scope Boundaries

**In Scope:**
- Persistent header/navigation component with account button
- Account button icon states (logged in vs logged out)
- /profile route and page
- Account creation form (name + email)
- Supabase magic link authentication flow
- Email verification via magic link
- Profile name editing for authenticated users
- Automatic linking of anonymous participation to authenticated account
- Cross-device magic link verification support
- Success/error toast notifications
- Form validation and error handling
- Processing/loading states during magic link flow

**Out of Scope:**
- Password-based authentication (magic link only)
- Email change functionality (email locked after verification)
- Account deletion
- Participation history display on account page
- Account creation date display
- OAuth providers (Google, GitHub, etc.)
- Two-factor authentication
- Profile pictures/avatars (using icons only)
- Account settings beyond name/email
- Email preferences or notifications settings
- Room management from account page

**Future Enhancements Mentioned:**
- Could add participation history view
- Could add account metadata (creation date, etc.)
- Could add OAuth provider options

### Technical Considerations

**Database Schema Changes Required:**
- participants table already has nullable user_id field
- May need migration to add index on user_id for efficient lookups
- May need to update RLS policies to support authenticated users viewing their linked participation
- profiles table may need display_name field (or use existing schema)

**Authentication Flow:**
- Use Supabase Auth magic link feature (supabase.auth.signInWithOtp)
- Redirect URL configuration in Supabase dashboard
- Handle auth state changes with Supabase auth listener
- Store auth session client-side (Supabase handles this)

**Account Linking Logic:**
- On successful magic link verification, query participants table for localStorage participant_id
- Update matching participant records to set user_id field
- Maintain localStorage participant_id for backward compatibility

**State Management:**
- Check auth state on app load (Supabase auth listener)
- Pass auth state to header component for icon rendering
- Use React context or props for auth state distribution
- Handle auth state changes (login/logout) reactively

**Navigation Component:**
- Create new persistent header/nav component if doesn't exist
- Position account button using CSS (flexbox or grid)
- Make header responsive (mobile and desktop)
- Ensure header appears on all route pages

**Form Handling:**
- Zod schema for account creation form (name: required string, email: required email format)
- React Hook Form for form state management
- Pre-fill name from localStorage using getParticipantName()
- Disable form during async operations (sending magic link)
- Clear validation on successful submission

**Error Handling:**
- Network errors during magic link send
- Invalid email format
- Email already in use (if applicable)
- Magic link expiration
- Verification failures
- Toast notifications for all error states

**Responsive Design:**
- Header scales on mobile (smaller avatar button)
- Account page form responsive (full width on mobile, centered on desktop)
- Touch-friendly button sizes
- Form inputs follow mobile-first design

**Integration Points:**
- Supabase Auth API (signInWithOtp, auth listeners)
- Supabase Database (participants table updates)
- localStorage (getParticipantId, getParticipantName)
- React Router (navigate to /profile, handle redirects)
- Toast system (success/error notifications)
- Existing query functions in queries.ts

**Technology Stack:**
- Supabase Auth for magic link
- React Router v7 for navigation
- Zod for validation
- React Hook Form for form management
- Sonner for toasts
- shadcn/ui components (Avatar, Input, Button, Label, Form)
- Tailwind CSS for styling
- localStorage for anonymous tracking
