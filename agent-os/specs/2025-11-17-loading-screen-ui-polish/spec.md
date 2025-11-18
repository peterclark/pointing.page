# Specification: Loading Screen UI Polish

## Goal
Create a polished full-page loading experience during room creation and joining that provides visual feedback with a timer-based progress bar, reduces perceived wait time, and ensures smooth transitions to the room interface.

## User Stories
- As a user creating a room, I want to see a smooth loading animation so that I understand the system is working and feel confident my room is being created
- As a user joining a room, I want to see visual feedback during the loading process so that I know the system is processing my request

## Specific Requirements

**Full-Page Loading Screen Component**
- Create new `LoadingScreen.tsx` component that renders as a full-page overlay
- Accept `isCreating` boolean prop to determine message text ("Creating your room..." vs "Joining your room...")
- Accept `onComplete` callback that fires when both timer reaches 100% AND database operation succeeds
- Component should be mounted when CreateRoomDialog form submits or JoinRoomHandler validates room
- Use consistent slate color palette and shadcn/ui "new-york" variant styling
- Full-page layout should center content vertically and horizontally with appropriate background
- Unmount component only after pulse animation completes and navigation occurs

**Timer-Based Progress Animation**
- Progress bar animates from 0% to 100% over exactly 5 seconds (5000ms total)
- Use 50ms interval updates (1% increment per interval = 100 steps)
- Implement with `setInterval` for predictable timing behavior
- Store progress state in React state variable (0-100 number)
- Clean up interval on component unmount to prevent memory leaks
- Progress continues regardless of database operation timing (timer-based, not API-based)
- If database fails before 100%, stop progress animation and show error

**Progress Bar Layout and Visual Design**
- Use shadcn/ui Progress component (needs to be installed if not present)
- Progress bar should be horizontally centered on page with fixed width (e.g., 400px-600px max width)
- Message text ("Creating your room..." / "Joining your room...") positioned just above the LEFT edge of progress bar
- Percentage indicator (e.g., "0%", "50%", "100%") positioned just above the RIGHT edge of progress bar
- Typography should match existing app styles (consistent font sizes and weights)
- Use Tailwind CSS for spacing, alignment, and responsive behavior

**Completion Pulse Animation**
- Trigger pulse animation when BOTH conditions are met: progress reaches 100% AND database operation confirms success
- Pulse duration is exactly 1 second (1000ms)
- Visual effect should be noticeable but not jarring (scale or glow effect using Tailwind classes)
- After pulse completes, execute onComplete callback which triggers navigation
- Use CSS animations or Tailwind animate utilities for pulse effect

**CreateRoomDialog Integration**
- Modify `CreateRoomDialog.tsx` to close dialog immediately on form submission
- Lift loading state up to parent component (LandingPage) or use URL-based routing state
- Show LoadingScreen as full-page component after dialog closes
- Pass room creation database operation (createRoom + joinRoom) execution to loading screen logic
- Preserve room name in form state if error occurs and user returns to form
- Reset point scale selection to undefined if user returns to form after error

**Join Room Flow Integration**
- Modify `JoinRoomHandler.tsx` to show LoadingScreen during room validation and joining
- Display "Joining your room..." message variant
- Follow same 5-second timer progression pattern
- Handle room validation errors during loading (stop animation, show error, navigate to landing)
- Use same progress bar layout and styling as create flow

**Database Operation Synchronization**
- CreateRoomDialog: Execute `createRoom()` and `joinRoom()` queries in parallel with timer
- JoinRoomHandler: Execute `getRoomByCode()` validation in parallel with timer
- Track database operation completion state separately from timer progress
- Only trigger pulse when both timer=100% AND database operation succeeds
- If database fails during timer, immediately stop animation and handle error
- Show error toast using sonner and optionally return user to previous screen

**Error Handling and State Preservation**
- If createRoom fails: stop animation, show error toast, return to CreateRoomDialog
- If joinRoom fails: stop animation, show error toast, navigate to landing page with error state
- When returning to CreateRoomDialog after error, preserve only roomName field
- Reset pointScale to undefined when returning after error
- Display clear error messages via toast notifications
- Ensure LoadingScreen unmounts cleanly on error

**Navigation Flow**
- CreateRoomDialog submission: Close dialog → Show LoadingScreen → Pulse → Navigate to `/room/:roomCode`
- JoinRoomHandler flow: Show LoadingScreen → Pulse → Navigate to `/room/:roomCode`
- Use React Router `useNavigate` hook for navigation
- Pass room code to URL parameter after successful creation/joining
- Navigation only occurs after pulse animation completes

**Performance and Cleanup**
- Ensure setInterval is cleaned up on component unmount
- Prevent memory leaks by clearing timers in useEffect cleanup functions
- LoadingScreen should not interfere with existing real-time subscriptions
- Maintain 60fps animation performance for smooth visual experience

## Visual Design
No visual mockups provided. Implementation should follow existing application design patterns.

**Existing Design Patterns to Follow**
- Use slate color palette consistent with rest of application
- shadcn/ui "new-york" variant styling for Progress component
- Tailwind CSS v4 utility classes for layout and spacing
- Dark mode support via theme provider (component should work in both light and dark themes)
- Typography matches existing components (consistent with LandingPage and ActiveRoomPage)
- Centered layout pattern similar to LandingPage
- Full-page background should match app theme background color

## Existing Code to Leverage

**CreateRoomDialog Component (`src/components/CreateRoomDialog.tsx`)**
- Current `isSubmitting` state pattern shows how to disable form during submission
- `onSubmit` function already handles room creation and navigation logic
- Form state management with react-hook-form provides foundation for preserving room name on error
- Dialog closing pattern (`onOpenChange(false)`) can be reused before showing LoadingScreen
- Error handling with toast notifications establishes consistent error UX pattern

**JoinRoomHandler Component (`src/pages/JoinRoomHandler.tsx`)**
- Room validation logic in `handleJoinRoom` function can be wrapped with LoadingScreen
- Error navigation pattern with state (`navigate("/", { state: { error: "..." } })`) should be maintained
- Room code normalization and validation logic remains unchanged
- Current "return null" pattern for no-UI component can be replaced with LoadingScreen

**Timer Patterns in Codebase**
- VotingButtons uses `setTimeout(() => setOptimisticVote(null), 500)` for temporary state changes
- Test utilities use `setTimeout` for async test delays
- wavy-background component uses `requestAnimationFrame` for smooth canvas animations
- Use `setInterval` for LoadingScreen timer as it needs predictable 50ms intervals

**Loading State Patterns**
- Multiple components use `isSubmitting` state with boolean toggle pattern
- StoryForm shows "Creating..." text during submission as loading indicator
- VotingButtons disables buttons during submission using `isSubmitting || isDisabled` pattern
- useRoomSubscription hook provides `isLoading` state for async data fetching

**Navigation Patterns**
- All pages use `useNavigate` from react-router-dom for programmatic navigation
- Error navigation passes state object: `navigate("/", { state: { error: "message" } })`
- Success navigation uses URL parameters: `navigate(\`/room/${roomCode}\`)`
- LandingPage displays error toasts from navigation state on mount

## Out of Scope
- Progress bar tied to actual API operation stages (progress remains purely timer-based)
- Cancellation or back button during loading (users must wait for completion or error)
- Skeleton loaders for the room page content itself (only covers transition period before room loads)
- Custom animations beyond pulse effect (no confetti, particle effects, or complex transitions)
- Sound effects, haptic feedback, or audio cues
- Multiple loading messages or rotating tips during the 5-second wait
- Loading screens for other parts of the application (focused only on room creation/joining flows)
- Installing Progress component if it doesn't exist (should be handled separately or during implementation)
