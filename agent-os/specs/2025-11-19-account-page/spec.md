# Specification: Account Page with Magic Link Authentication

## Goal
Enable users to create authenticated accounts using Supabase magic link email verification, automatically linking their anonymous participation history to their new authenticated identity while providing a profile page for managing their name and viewing their email.

## User Stories
- As an anonymous user, I want to create an account with my name and email so that my participation history is preserved and linked to my authenticated identity
- As an authenticated user, I want to update my display name on my profile page so that future rooms reflect my current preferred name

## Specific Requirements

**Persistent Navigation Header**
- **IMPORTANT:** Header component (src/components/Header.tsx) contains ONLY the logo/branding ("Pointing.page")
- Navigation buttons (profile button in top right, home button in top left) are implemented in RootLayout component
- Profile button shows log-in icon (LogIn from lucide-react) when user is not authenticated
- Profile button shows user icon (User from lucide-react) when user is authenticated
- Use Avatar component from shadcn/ui for button styling and icon display
- Position buttons using absolute positioning in RootLayout
- **DO NOT modify Header component unless explicitly requested by user**

**Profile Page Route**
- Add /profile route to router.tsx
- Profile page accessible via clicking account button in header
- Direct URL access to /profile works for both authenticated and unauthenticated users
- Unauthenticated users see account creation form
- Authenticated users see profile display and name editing form

**Account Creation Form (Unauthenticated State)**
- Two required fields: Name and Email
- Pre-fill name field with localStorage participant name using getParticipantName()
- Zod schema validation for name (required, 1-50 chars) and email (required, valid email format)
- React Hook Form with zodResolver pattern matching existing StoryForm implementation
- Submit button triggers Supabase magic link flow via supabase.auth.signInWithOtp
- Disable form fields and show loading state during magic link sending
- After successful send, display "Check your email" message and keep form disabled
- Toast notification on error during magic link send

**Magic Link Flow**
- Configure Supabase redirect URL to /profile in auth settings
- User receives email with magic link
- Clicking magic link verifies email and creates authenticated session
- Cross-device support: user logged in on device where link is clicked
- On successful verification, redirect to /profile page
- Display success toast: "Email verified successfully!"
- Trigger account linking process in background upon verification

**Profile Page (Authenticated State)**
- Display current user's name from profiles.display_name
- Display current user's email (read-only, from Supabase auth.user.email)
- Name field editable with save button
- Zod validation for name updates (1-50 chars, required)
- Save button updates profiles.display_name via updateProfile query
- Success toast on name update: "Profile updated"
- Error toast on failure: "Failed to update profile"
- Email field cannot be changed (locked after verification)

**Account Linking Logic**
- On magic link verification, check for localStorage participant_id using getParticipantId()
- Query participants table for records matching localStorage participant_id
- Update all matching participant records to set user_id to new auth user ID
- Create profiles table record with user_id and display_name from form
- Linking happens silently without user confirmation prompt
- Past room participation automatically associated with authenticated account

**Name Update Behavior**
- When authenticated user updates profile name, only affects profiles.display_name
- New participants table records use updated name from profiles table
- Existing participants table records preserve original name (no retroactive update)
- Each participant record maintains the name used at time of joining

**Authentication State Management**
- Create useAuth custom hook to manage Supabase auth state
- Use supabase.auth.onAuthStateChange listener for reactive state updates
- Hook returns: user, isAuthenticated, isLoading
- Check auth state on app initialization
- Pass auth state to header component for icon rendering
- Store session in localStorage via Supabase (already configured in client.ts)

**Database Query Functions**
- Add createProfile(userId, displayName) to queries.ts
- Add updateProfile(userId, displayName) to queries.ts
- Add getProfile(userId) to queries.ts
- Add linkParticipantsToUser(localStorageId, userId) to queries.ts
- Follow existing query pattern with DatabaseError handling and TypeScript types

## Visual Design

No visual mockups provided. Follow existing shadcn/ui patterns from landing page and room pages.

**Profile Page Layout**
- Card component with padding matching StoryForm pattern
- Centered on desktop, full width on mobile with margins
- Header with title "Account" or "Profile" and description text
- Form fields with Label, Input components from shadcn/ui
- Button with loading state matching existing patterns
- Consistent spacing using Tailwind space-y utilities

**Navigation Header**
- Header component spans full width
- Flexbox layout with branding on left, account button on right
- Avatar button size: default (h-10 w-10) on desktop, smaller on mobile
- Icon size: 20px within avatar
- Hover state with background color transition
- Clickable area appropriate for touch targets (min 44x44px)

**Responsive Breakpoints**
- Mobile: Full-width form, smaller avatar button
- Tablet (sm): Centered form with max-width
- Desktop (md+): Centered form with max-width-lg, default avatar size

## Existing Code to Leverage

**Form Validation Pattern - src/lib/schemas.ts**
- Copy pattern from participantNameSchema for profile name validation
- Use z.string().email() for email validation
- Export accountCreationSchema and profileUpdateSchema

**Form Handling Pattern - src/components/StoryForm.tsx**
- Use same React Hook Form setup with zodResolver
- Copy loading state management pattern (isSubmitting)
- Copy disabled form pattern during submission
- Use same error display pattern with errors object

**localStorage Utilities - src/lib/utils.ts**
- Use getParticipantId() to retrieve UUID for account linking
- Use getParticipantName() to pre-fill name field
- Follow pattern for localStorage key naming

**Database Queries - src/lib/supabase/queries.ts**
- Copy query function pattern with try-catch and DatabaseError
- Use same TypeScript typing with Tables and TablesInsert types
- Follow error handling pattern with toast notifications

**Toast Notifications - Existing Pattern**
- Import toast from "sonner"
- Use toast.success() for success messages
- Use toast.error() for error messages
- Keep messages concise and user-friendly

## Out of Scope
- Password-based authentication (magic link only)
- Email change functionality after verification
- Account deletion
- Participation history display on profile page
- Account creation date or metadata display
- OAuth providers (Google, GitHub)
- Two-factor authentication
- Profile pictures or custom avatars beyond icons
- Email preferences or notification settings
- Room management from profile page
- Logout functionality (can be added in future)
