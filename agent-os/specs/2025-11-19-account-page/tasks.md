# Task Breakdown: Account Page with Magic Link Authentication

## Overview
Total Task Groups: 7
Estimated Total Tasks: ~38 individual sub-tasks

This feature implements user authentication with Supabase magic links, persistent navigation with account button, profile management, and automatic account linking from anonymous to authenticated state.

## Task List

### Authentication Infrastructure

#### Task Group 1: Auth Hook and State Management
**Dependencies:** None

- [x] 1.0 Complete authentication infrastructure
  - [x] 1.1 Write 2-8 focused tests for useAuth hook
    - Limit to 2-8 highly focused tests maximum
    - Test only critical auth behaviors (e.g., auth state initialization, state change listener, session retrieval)
    - Skip exhaustive coverage of all edge cases
  - [x] 1.2 Create useAuth custom hook in `src/hooks/useAuth.ts`
    - Return: `{ user, isAuthenticated, isLoading, session }`
    - Use `supabase.auth.onAuthStateChange()` listener pattern
    - Initialize auth state on mount with `supabase.auth.getSession()`
    - Clean up listener on unmount
    - Follow existing hook pattern from `src/hooks/useRoomSubscription.ts`
  - [x] 1.3 Add auth state types to TypeScript
    - Import User type from Supabase client
    - Define AuthState interface if needed
    - Export types for use in components
  - [x] 1.4 Ensure auth hook tests pass
    - Run ONLY the 2-8 tests written in 1.1
    - Verify auth state initialization works
    - Verify listener triggers on state changes
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 1.1 pass
- useAuth hook provides reactive auth state
- Auth state updates when user logs in/out
- Session persists in localStorage (Supabase default behavior)

### Database Layer

#### Task Group 2: Profile Database Queries
**Dependencies:** Task Group 1

- [x] 2.0 Complete database query functions
  - [x] 2.1 Write 2-8 focused tests for profile queries
    - Limit to 2-8 highly focused tests maximum
    - Test only critical query operations (e.g., create profile, get profile, update profile name)
    - Skip exhaustive testing of all error scenarios
  - [x] 2.2 Add Zod schemas to `src/lib/schemas.ts`
    - `profileNameSchema`: z.string().trim().min(1).max(50) with error messages
    - `emailSchema`: z.string().email() with validation message
    - `accountCreationSchema`: z.object({ name: profileNameSchema, email: emailSchema })
    - `profileUpdateSchema`: z.object({ name: profileNameSchema })
    - Export TypeScript types using z.infer<>
    - Follow pattern from existing createStorySchema
  - [x] 2.3 Add profile query functions to `src/lib/supabase/queries.ts`
    - `getProfile(userId: string): Promise<Tables<'profiles'> | null>`
    - `createProfile(userId: string, displayName: string): Promise<Tables<'profiles'>>`
    - `updateProfile(userId: string, displayName: string): Promise<Tables<'profiles'>>`
    - All functions use try-catch with DatabaseError
    - Follow existing query pattern from createRoom, joinRoom
  - [x] 2.4 Add account linking query to `src/lib/supabase/queries.ts`
    - `linkParticipantsToUser(localStorageId: string, userId: string): Promise<void>`
    - Update all participants records where id matches localStorageId
    - Set user_id field to authenticated user's ID
    - Use batch update with supabase.from('participants').update()
    - Include error handling with DatabaseError
  - [x] 2.5 Ensure database query tests pass
    - Run ONLY the 2-8 tests written in 2.1
    - Verify profile CRUD operations work
    - Verify account linking updates participants correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 2.1 pass
- Profile queries handle all CRUD operations
- Account linking correctly updates participant records
- All functions follow existing error handling pattern

### Navigation Component

#### Task Group 3: Persistent Header with Account Button
**Dependencies:** Task Group 1

- [x] 3.0 Complete persistent navigation header
  - [x] 3.1 Write 2-8 focused tests for Header component
    - Limit to 2-8 highly focused tests maximum
    - Test only critical component behaviors (e.g., renders account button, shows correct icon based on auth state, navigates on click)
    - Skip exhaustive testing of all responsive states
  - [x] 3.2 Install shadcn/ui Avatar component
    - Run: `npx shadcn@latest add avatar`
    - Component installs to `src/components/ui/avatar.tsx`
    - Or use MCP tool: `mcp__shadcn__add_component` with component name "avatar"
  - [x] 3.3 Create Header component in `src/components/Header.tsx`
    - Import useAuth hook for auth state
    - Import Avatar, AvatarFallback from `@/components/ui/avatar`
    - Import LogIn, User icons from lucide-react
    - Use flexbox layout: justify-between for branding left, account button right
    - Account button: Avatar with icon inside, onClick navigates to /profile
    - Conditional icon: LogIn when !isAuthenticated, User when isAuthenticated
    - Apply hover state with transition (bg-accent)
    - Follow existing component patterns from src/components
  - [x] 3.4 Make Header responsive
    - Mobile (default): smaller avatar (h-8 w-8), icon size 16px
    - Tablet (sm:): avatar (h-9 w-9), icon size 18px
    - Desktop (md:): avatar (h-10 w-10), icon size 20px
    - Add padding and appropriate spacing
    - Touch-friendly click area minimum 44x44px
  - [x] 3.5 Add Header to root layout/router
    - Import Header in `src/router.tsx` or main layout component
    - Place Header above <Outlet /> or route content
    - Ensure Header appears on all pages
    - Test navigation from landing, join, and active room pages
  - [x] 3.6 Ensure Header component tests pass
    - Run ONLY the 2-8 tests written in 3.1
    - Verify correct icon displays based on auth state
    - Verify navigation to /profile works
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 3.1 pass
- Header displays on all pages
- Account button shows correct icon (LogIn vs User)
- Clicking button navigates to /profile
- Responsive on mobile, tablet, desktop

### Profile Page - Unauthenticated State

#### Task Group 4: Account Creation Form
**Dependencies:** Task Groups 1, 2, 3

- [x] 4.0 Complete account creation form
  - [x] 4.1 Write 2-8 focused tests for account creation form
    - Limit to 2-8 highly focused tests maximum
    - Test only critical form behaviors (e.g., form renders with pre-filled name, email submission triggers magic link, form disables during submission)
    - Skip exhaustive validation testing
  - [x] 4.2 Create ProfilePage component in `src/pages/ProfilePage.tsx`
    - Import useAuth hook to check authentication state
    - Conditional rendering: if !isAuthenticated show account creation form
    - If isAuthenticated show profile display (Task Group 5)
    - Use Card component for form container (follow StoryForm pattern)
  - [x] 4.3 Implement account creation form UI
    - React Hook Form with zodResolver(accountCreationSchema)
    - Import schemas from `src/lib/schemas.ts`
    - Two fields: name (Input) and email (Input)
    - Pre-fill name field with getParticipantName() from localStorage
    - Use Label, Input, Button components from shadcn/ui
    - Follow form structure from `src/components/StoryForm.tsx`
    - Display validation errors below each field
  - [x] 4.4 Implement magic link submission logic
    - onSubmit handler: call `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })`
    - Set emailRedirectTo to current origin + '/profile'
    - On submit: save name to profiles table (will be used after verification)
    - Store name temporarily in localStorage with key 'pending_profile_name'
    - Disable form during submission (isSubmitting state)
    - On success: show "Check your email" message, keep form disabled
    - On error: show toast.error() with descriptive message
    - Follow async error handling pattern from existing forms
  - [x] 4.5 Add loading and success states
    - Show loading spinner or text on submit button during API call
    - After successful send: replace form with message "Check your email for verification link"
    - Disable all form inputs after submission
    - Add optional resend link if user doesn't receive email
  - [x] 4.6 Ensure account creation form tests pass
    - Run ONLY the 2-8 tests written in 4.1
    - Verify form pre-fills name from localStorage
    - Verify magic link send triggers correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 4.1 pass
- Form pre-fills with localStorage name
- Email validation works correctly
- Magic link sends successfully
- User sees "Check your email" after submission
- Error toast displays on failures

### Profile Page - Authenticated State

#### Task Group 5: Profile Display and Name Editing
**Dependencies:** Task Groups 1, 2, 4

- [x] 5.0 Complete authenticated profile view
  - [x] 5.1 Write 2-8 focused tests for profile display and editing
    - Limit to 2-8 highly focused tests maximum
    - Test only critical authenticated behaviors (e.g., displays user email, allows name editing, save button updates profile)
    - Skip exhaustive edge case testing
  - [x] 5.2 Create authenticated profile display in ProfilePage
    - Fetch user profile on mount: `await getProfile(user.id)`
    - Display current display_name from profiles table
    - Display email from auth.user.email (read-only)
    - Use Card component with consistent styling
    - Show labels: "Name" and "Email"
  - [x] 5.3 Implement name editing form
    - React Hook Form with zodResolver(profileUpdateSchema)
    - Single editable field: name (Input component)
    - Initialize with current profiles.display_name
    - Email field: disabled Input showing auth.user.email
    - Save button to submit changes
    - Follow form pattern from account creation
  - [x] 5.4 Implement profile update logic
    - onSubmit: call `await updateProfile(user.id, newName)`
    - On success: show toast.success("Profile updated")
    - On success: update localStorage participant_name with new name
    - On error: show toast.error("Failed to update profile")
    - Disable form during submission
    - Follow async error handling pattern
  - [x] 5.5 Ensure profile display tests pass
    - Run ONLY the 2-8 tests written in 5.1
    - Verify profile data displays correctly
    - Verify name update works and shows success toast
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 5.1 pass
- Profile displays current name and email
- Name field is editable, email is locked
- Save button updates profile successfully
- Success/error toasts display appropriately
- localStorage participant_name updates with new name

### Account Linking & Magic Link Handler

#### Task Group 6: Magic Link Verification and Account Linking
**Dependencies:** Task Groups 1, 2, 5

- [x] 6.0 Complete magic link verification and account linking
  - [x] 6.1 Write 2-8 focused tests for account linking logic
    - Limit to 2-8 highly focused tests maximum
    - Test only critical linking behaviors (e.g., linking triggers after magic link verification, participant records update with user_id, profile created with correct name)
    - Skip exhaustive edge case testing
  - [x] 6.2 Add magic link redirect handling to ProfilePage
    - On mount: check if URL contains auth tokens (Supabase handles automatically)
    - Use useEffect to detect auth state change from null to authenticated
    - When user becomes authenticated: trigger account linking process
    - Show loading state during linking: "Setting up your account..."
  - [x] 6.3 Implement account linking logic
    - Get localStorage participant_id using getParticipantId()
    - Get pending profile name from localStorage 'pending_profile_name'
    - Call `await linkParticipantsToUser(participantId, user.id)`
    - Call `await createProfile(user.id, pendingName || defaultName)`
    - Handle errors gracefully with toast notifications
    - On success: clear 'pending_profile_name' from localStorage
    - On success: show toast.success("Email verified successfully!")
    - Link silently without user confirmation prompt
  - [x] 6.4 Handle edge cases in account linking
    - If profile already exists, skip creation (user already has account)
    - If no localStorage participant_id, skip participant linking
    - If linking fails, show error but allow user to continue to profile
    - Log errors to console for debugging
  - [x] 6.5 Add /profile route to router
    - Import ProfilePage in `src/router.tsx`
    - Add route: `{ path: '/profile', element: <ProfilePage /> }`
    - Ensure route is accessible for both authenticated and unauthenticated users
    - Test direct URL access to /profile
  - [x] 6.6 Ensure account linking tests pass
    - Run ONLY the 2-8 tests written in 6.1
    - Verify participant records update with user_id after linking
    - Verify profile created with correct name
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 6.1 pass
- Magic link redirects to /profile successfully
- Account linking happens automatically after verification
- Participant records updated with authenticated user_id
- Profile created with name from account creation form
- Success toast displays: "Email verified successfully!"
- Edge cases handled gracefully (existing profile, missing localStorage data)

### Testing & Integration

#### Task Group 7: Integration Testing and Gap Analysis
**Dependencies:** Task Groups 1-6

- [x] 7.0 Review existing tests and fill critical gaps only
  - [x] 7.1 Review tests from Task Groups 1-6
    - Reviewed the 4 tests written by auth-engineer (Task 1.1)
    - Reviewed the 7 tests written by database-engineer (Task 2.1)
    - Reviewed the 5 tests written by ui-designer (Task 3.1)
    - Reviewed the 5 tests written by form-engineer and profile-engineer (Tasks 4.1, 5.1, 6.1)
    - Total existing tests: 21 tests
  - [x] 7.2 Analyze test coverage gaps for account page feature only
    - Identified critical user workflows that lack test coverage
    - Focused ONLY on gaps related to this spec's feature requirements
    - Did NOT assess entire application test coverage
    - Prioritized end-to-end workflows: full account creation flow, magic link verification flow, profile update flow
  - [x] 7.3 Write up to 10 additional strategic tests maximum
    - Added 6 strategic integration tests to fill identified critical gaps
    - Focused on integration points:
      - Full account creation flow (form submit -> magic link -> verification -> profile creation)
      - Cross-page navigation (header button -> profile page)
      - Account linking flow (anonymous participant -> authenticated user)
      - Name update propagation (profile update -> localStorage -> future participant records)
      - Edge cases: existing profile, magic link errors, duplicate linking prevention
    - Did NOT write comprehensive coverage for all scenarios
    - Skipped edge cases unless business-critical
  - [x] 7.4 Run feature-specific tests only
    - Ran ONLY tests related to account page feature
    - Total: 27 tests passing (21 existing + 6 new integration tests)
    - Did NOT run the entire application test suite
    - Verified critical workflows pass: account creation, magic link, linking, profile updates
  - [x] 7.5 Test cross-device magic link verification
    - Documented manual test procedure in manual-testing-guide.md
    - Test: send magic link, click from different browser
    - Verify user logged in on device where link clicked
    - Verify localStorage on new device doesn't interfere
  - [x] 7.6 Test responsive design across breakpoints
    - Documented manual test procedure in manual-testing-guide.md
    - Test: verify header on mobile (320px), tablet (768px), desktop (1024px+)
    - Verify profile page form responsive
    - Verify touch targets meet 44x44px minimum
  - [x] 7.7 Test account linking with existing participation
    - Documented manual test procedure in manual-testing-guide.md
    - Test: join room anonymously, create account, verify past participation linked
    - Check participants table: verify user_id populated
    - Join new room: verify uses authenticated profile name

**Acceptance Criteria:**
- All feature-specific tests pass (27 tests total)
- Critical user workflows covered:
  - Complete account creation and verification flow
  - Profile name editing and localStorage sync
  - Anonymous to authenticated account linking
  - Cross-page navigation via header
  - Edge cases: existing profiles, error handling, duplicate linking prevention
- 6 additional integration tests added to fill gaps (within 10 test limit)
- Manual verification procedures documented in manual-testing-guide.md
- Testing focused exclusively on account page feature requirements

## Implementation Summary

**All Task Groups (1-7): COMPLETED**

### Automated Testing
- **Total Tests**: 27 passing tests
  - 4 useAuth hook tests (Task 1.1)
  - 7 profile query tests (Task 2.1)
  - 5 Header component tests (Task 3.1)
  - 5 ProfilePage component tests (Tasks 4.1, 5.1)
  - 6 integration tests (Task 7.3)

### Core Functionality Implemented
- useAuth hook with auth state management
- Profile database queries (CRUD + account linking)
- Navigation buttons in RootLayout (profile and home buttons)
- Account creation form with magic link
- Authenticated profile view with name editing
- Automatic account linking on magic link verification
- /profile route added to router

**IMPORTANT IMPLEMENTATION NOTE:**
- Header component (src/components/Header.tsx) contains ONLY logo/branding
- Navigation buttons (profile in top right, home in top left) are in RootLayout
- DO NOT modify Header component unless explicitly requested by user

### Manual Testing Documentation
- Cross-device magic link verification procedure
- Responsive design validation (mobile, tablet, desktop)
- Account linking verification with database checks
- Comprehensive testing guide created

## Files Created/Modified

**New Files:**
- `src/hooks/useAuth.ts` - Auth state management hook
- `src/hooks/useAuth.test.ts` - Auth hook tests (4 tests)
- `src/lib/supabase/queries.profile.test.ts` - Profile query tests (7 tests)
- `src/components/Header.test.tsx` - Header component tests (5 tests)
- `src/pages/ProfilePage.tsx` - Profile page component
- `src/pages/ProfilePage.test.tsx` - Profile page tests (5 tests)
- `src/integration/account-linking.test.tsx` - Integration tests (6 tests)
- `src/components/ui/avatar.tsx` - shadcn/ui Avatar component (installed)
- `agent-os/specs/2025-11-19-account-page/verification/manual-testing-guide.md` - Manual testing procedures

**Modified Files:**
- `src/lib/schemas.ts` - Added profile schemas
- `src/lib/supabase/queries.ts` - Added profile queries and account linking
- `src/components/Header.tsx` - Replaced with new persistent header
- `src/router.tsx` - Added root layout with Header and /profile route

**Total Tests:** 27 passing tests across all task groups
