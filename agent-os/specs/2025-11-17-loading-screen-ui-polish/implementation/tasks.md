# Task Breakdown: Loading Screen UI Polish

## Overview
Total Tasks: 22 across 4 task groups

This feature creates a polished full-page loading experience during room creation and joining, with a 5-second timer-based progress bar, completion pulse animation, and smooth transitions to the room interface.

## Task List

### Component Development

#### Task Group 1: LoadingScreen Component
**Dependencies:** None

- [x] 1.0 Complete LoadingScreen component
  - [x] 1.1 Install shadcn/ui Progress component
    - Run: `npx shadcn@latest add progress`
    - Verify installation in `src/components/ui/progress.tsx`
  - [x] 1.2 Write 2-8 focused tests for LoadingScreen component
    - Limit to 2-8 highly focused tests maximum
    - Test only critical behaviors:
      - Component renders with correct message text based on `isCreating` prop
      - Progress bar animates from 0% to 100%
      - Percentage display updates correctly
      - `onComplete` callback fires after pulse animation completes
    - Skip exhaustive testing of timer intervals, animation frames, and edge cases
    - Test file: `src/components/LoadingScreen.test.tsx`
  - [x] 1.3 Create LoadingScreen component structure
    - Location: `src/components/LoadingScreen.tsx`
    - Props interface:
      - `isCreating: boolean` - determines message text
      - `onComplete: () => void` - callback when animation finishes
      - `isLoading: boolean` - controls whether component is active
      - `error?: string | null` - error message to display
    - Full-page layout with centered content
    - Use Tailwind CSS for layout (flex, justify-center, items-center)
    - Follow existing app background styling
  - [x] 1.4 Implement timer-based progress animation
    - Use `setInterval` with 50ms intervals (1% increment per interval)
    - Progress state: React state variable (0-100)
    - Total duration: exactly 5 seconds (5000ms)
    - Clean up interval in useEffect cleanup function
    - Stop animation if error occurs
  - [x] 1.5 Build progress bar layout
    - Use shadcn/ui Progress component
    - Horizontal center alignment with max-width (400px-600px)
    - Message text positioned above LEFT edge of progress bar
      - "Creating your room..." when `isCreating={true}`
      - "Joining your room..." when `isCreating={false}`
    - Percentage indicator positioned above RIGHT edge of progress bar
      - Format: "0%", "50%", "100%"
    - Typography consistent with existing app styles
    - Responsive behavior with Tailwind classes
  - [x] 1.6 Implement completion pulse animation
    - Trigger when progress reaches 100%
    - Duration: exactly 1 second (1000ms)
    - Use Tailwind animate utilities or CSS animations
    - Visual effect: scale or glow (noticeable but not jarring)
    - After pulse completes, call `onComplete()` callback
  - [x] 1.7 Add error handling UI
    - Display error message if `error` prop is provided
    - Stop progress animation on error
    - Use consistent error styling with rest of app
  - [x] 1.8 Ensure LoadingScreen component tests pass
    - Run ONLY the 2-8 tests written in 1.2
    - Verify component renders correctly
    - Verify timer and callback behaviors work
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 1.2 pass
- Progress component installed and functional
- LoadingScreen renders as full-page overlay
- Progress animates smoothly from 0% to 100% over 5 seconds
- Message and percentage positioned correctly (left and right of bar)
- Pulse animation triggers at 100%
- onComplete callback fires after pulse
- Component cleans up timers on unmount

### Room Creation Integration

#### Task Group 2: CreateRoomDialog Integration
**Dependencies:** Task Group 1

- [ ] 2.0 Complete CreateRoomDialog integration
  - [ ] 2.1 Write 2-8 focused tests for CreateRoomDialog loading flow
    - Limit to 2-8 highly focused tests maximum
    - Test only critical integration behaviors:
      - Dialog closes when form submits
      - LoadingScreen displays after dialog closes
      - Room creation succeeds and navigates to room
      - Error handling preserves room name but resets point scale
    - Skip exhaustive testing of all form validation and submission scenarios
    - Test file: `src/components/CreateRoomDialog.test.tsx`
  - [ ] 2.2 Modify CreateRoomDialog to use LoadingScreen
    - Import LoadingScreen component
    - Add loading state management
    - Add database operation completion state
    - Add error state for handling failures
  - [ ] 2.3 Implement dialog close on submission
    - Call `onOpenChange(false)` when form submits
    - Close dialog immediately before showing LoadingScreen
    - Preserve form state in case of error return
  - [ ] 2.4 Lift loading state to LandingPage
    - Add `isLoading` state in LandingPage component
    - Pass loading state to CreateRoomDialog
    - Render LoadingScreen in LandingPage when loading
    - LoadingScreen overlays entire page (not inside dialog)
  - [ ] 2.5 Synchronize database operations with timer
    - Execute `createRoom()` and `joinRoom()` in parallel with timer
    - Track database completion state separately from timer progress
    - Only trigger pulse when BOTH timer=100% AND database succeeds
    - If database fails during timer, stop animation and show error
  - [ ] 2.6 Implement form data preservation on error
    - When returning to CreateRoomDialog after error:
      - Preserve `roomName` field value
      - Reset `pointScale` to undefined
    - Store form state before showing LoadingScreen
    - Restore preserved state when dialog reopens after error
  - [ ] 2.7 Handle navigation after completion
    - Use `useNavigate` hook from react-router-dom
    - Navigate to `/room/${roomCode}` after pulse completes
    - Pass room code from successful creation
    - Ensure navigation only occurs after onComplete callback
  - [ ] 2.8 Ensure CreateRoomDialog integration tests pass
    - Run ONLY the 2-8 tests written in 2.1
    - Verify dialog closes and LoadingScreen appears
    - Verify successful room creation flow
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 2.1 pass
- Dialog closes immediately on form submission
- LoadingScreen renders as full-page component after dialog closes
- Database operations execute in parallel with timer
- Navigation occurs only after pulse animation completes
- Room name preserved but point scale reset on error return
- Error toast displays using sonner for database failures

### Room Joining Integration

#### Task Group 3: JoinRoomHandler Integration
**Dependencies:** Task Group 1

- [ ] 3.0 Complete JoinRoomHandler integration
  - [ ] 3.1 Write 2-8 focused tests for JoinRoomHandler loading flow
    - Limit to 2-8 highly focused tests maximum
    - Test only critical integration behaviors:
      - LoadingScreen displays during room validation
      - Shows "Joining your room..." message
      - Successful validation navigates to room
      - Failed validation shows error and navigates to landing
    - Skip exhaustive testing of all validation edge cases
    - Test file: `src/pages/JoinRoomHandler.test.tsx`
  - [ ] 3.2 Modify JoinRoomHandler to use LoadingScreen
    - Import LoadingScreen component
    - Replace `return null` with LoadingScreen rendering
    - Add loading state management
    - Add database validation completion state
  - [ ] 3.3 Implement "Joining your room..." message variant
    - Pass `isCreating={false}` to LoadingScreen
    - Component displays "Joining your room..." message
    - Same progress bar layout and styling as create flow
    - Same 5-second timer progression pattern
  - [ ] 3.4 Synchronize room validation with timer
    - Execute `getRoomByCode()` validation in parallel with timer
    - Track validation completion state separately from timer
    - Only trigger pulse when BOTH timer=100% AND validation succeeds
    - If validation fails during timer, stop animation and show error
  - [ ] 3.5 Handle validation errors during loading
    - Stop progress animation immediately on error
    - Display error toast using sonner
    - Navigate to landing page with error state
    - Use existing error navigation pattern: `navigate("/", { state: { error: "..." } })`
  - [ ] 3.6 Handle navigation after completion
    - Navigate to `/room/${normalizedCode}` after pulse completes
    - Maintain existing room code normalization logic
    - Ensure navigation only occurs after onComplete callback
  - [ ] 3.7 Ensure JoinRoomHandler integration tests pass
    - Run ONLY the 2-8 tests written in 3.1
    - Verify LoadingScreen renders with correct message
    - Verify successful join flow
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**
- The 2-8 tests written in 3.1 pass
- LoadingScreen renders instead of null return
- "Joining your room..." message displays correctly
- Room validation executes in parallel with timer
- Navigation occurs only after pulse animation completes
- Error handling navigates to landing with error toast
- Maintains existing room code normalization and validation

### Testing & Polish

#### Task Group 4: Cross-Flow Testing & Final Polish
**Dependencies:** Task Groups 1-3

- [ ] 4.0 Review and polish loading screen implementation
  - [ ] 4.1 Review existing tests from Task Groups 1-3
    - Review the 2-8 tests from LoadingScreen component (Task 1.2)
    - Review the 2-8 tests from CreateRoomDialog integration (Task 2.1)
    - Review the 2-8 tests from JoinRoomHandler integration (Task 3.1)
    - Total existing tests: approximately 6-24 tests
  - [ ] 4.2 Analyze test coverage gaps for loading screen feature only
    - Identify critical workflows that lack test coverage
    - Focus ONLY on gaps related to this loading screen feature
    - Do NOT assess entire application test coverage
    - Prioritize end-to-end loading flow workflows
    - Key areas to assess:
      - Timer synchronization with database operations
      - Error state transitions and recovery
      - Component lifecycle and cleanup
  - [ ] 4.3 Write up to 10 additional strategic tests maximum
    - Add maximum of 10 new tests to fill identified critical gaps
    - Focus on integration points between timer and database operations
    - Test error recovery and state preservation workflows
    - Do NOT write comprehensive coverage for all scenarios
    - Skip performance tests and animation frame testing unless business-critical
    - Test file locations:
      - `src/integration/loading-screen-flows.test.tsx` (if new integration tests needed)
      - Add to existing test files if extending coverage
  - [ ] 4.4 Manual testing: Create room flow
    - Open landing page and click "Enter" button
    - Fill in room name and participant name
    - Click point scale button (Fibonacci or T-shirt)
    - Verify dialog closes immediately
    - Verify LoadingScreen appears as full-page overlay
    - Verify "Creating your room..." message displays
    - Verify progress bar animates smoothly from 0% to 100%
    - Verify percentage indicator updates (left to right progression)
    - Verify pulse animation triggers at 100%
    - Verify navigation to room page after pulse
    - Test error scenario: disconnect network and retry
      - Verify animation stops on error
      - Verify error toast displays
      - Verify return to dialog preserves room name
      - Verify return to dialog resets point scale
  - [ ] 4.5 Manual testing: Join room flow
    - Navigate to `/join/:roomCode` with valid room code
    - Verify LoadingScreen appears immediately
    - Verify "Joining your room..." message displays
    - Verify progress bar animates smoothly from 0% to 100%
    - Verify pulse animation triggers at 100%
    - Verify navigation to room page after pulse
    - Test error scenario: use invalid room code
      - Verify animation stops on error
      - Verify error toast displays
      - Verify navigation back to landing page
  - [ ] 4.6 Verify timer cleanup and memory leaks
    - Use React DevTools to monitor component lifecycle
    - Verify setInterval is cleared when LoadingScreen unmounts
    - Verify no memory leaks when navigating away during loading
    - Test rapid dialog open/close cycles (no timer accumulation)
  - [ ] 4.7 Verify responsive design
    - Test loading screen on mobile viewport (320px-768px)
    - Test loading screen on tablet viewport (768px-1024px)
    - Test loading screen on desktop viewport (1024px+)
    - Verify progress bar scales appropriately
    - Verify message and percentage text are readable
    - Verify centered layout maintains on all screen sizes
  - [ ] 4.8 Verify dark mode support
    - Toggle between light and dark themes
    - Verify LoadingScreen background matches theme
    - Verify progress bar styling works in both themes
    - Verify text contrast is readable in both themes
  - [ ] 4.9 Run feature-specific tests only
    - Run ONLY tests related to loading screen feature
    - Expected total: approximately 16-34 tests maximum
    - Tests from 1.2 (LoadingScreen component)
    - Tests from 2.1 (CreateRoomDialog integration)
    - Tests from 3.1 (JoinRoomHandler integration)
    - Tests from 4.3 (additional strategic tests, if added)
    - Do NOT run the entire application test suite
    - Verify all loading screen workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (approximately 16-34 tests total)
- No more than 10 additional tests added when filling gaps
- Create room flow works smoothly end-to-end
- Join room flow works smoothly end-to-end
- Error handling works correctly with proper state recovery
- Timer cleanup verified (no memory leaks)
- Responsive design works across all viewports
- Dark mode support confirmed
- Animation performance is smooth (60fps)

## Execution Order

Recommended implementation sequence:
1. Component Development (Task Group 1) - Build LoadingScreen component with timer and animations
2. Room Creation Integration (Task Group 2) - Integrate LoadingScreen with CreateRoomDialog flow
3. Room Joining Integration (Task Group 3) - Integrate LoadingScreen with JoinRoomHandler flow
4. Testing & Polish (Task Group 4) - Review coverage, manual testing, and final polish

## Implementation Notes

### Key Design Decisions

**Timer-Based Progress (Not API-Based):**
- Progress bar fills over exactly 5 seconds regardless of database operation timing
- This creates predictable, smooth animation for better UX
- Database operations execute in parallel and gate the pulse animation

**Full-Page Overlay Pattern:**
- LoadingScreen renders as full-page component, not within dialog
- Dialog closes immediately on submission before LoadingScreen appears
- This creates clean transition and matches modern web app patterns

**Dual Synchronization Pattern:**
- Timer state tracked separately from database operation state
- Pulse animation only triggers when BOTH conditions are met:
  - Timer reaches 100%
  - Database operation confirms success
- This ensures users see completion animation only after actual success

**Form State Preservation Strategy:**
- On error, preserve `roomName` only (user's custom input)
- Reset `pointScale` to undefined (selection-based input, easy to re-select)
- Reduces user frustration while maintaining simple state management

### Reusable Patterns

**LoadingScreen Component:**
- Designed for reusability beyond room creation/joining
- Props interface allows customization for future loading scenarios
- Timer and pulse logic encapsulated within component

**Error Handling Pattern:**
- Consistent toast notifications using sonner
- Navigation with error state for landing page display
- Graceful animation stops and state cleanup

### Technical Considerations

**Performance:**
- setInterval cleanup prevents memory leaks
- Component unmount handling ensures no orphaned timers
- Maintain 60fps animation performance target

**Accessibility:**
- Progress bar uses semantic HTML via shadcn/ui Progress component
- Loading messages provide clear feedback
- Error messages displayed via toast for screen reader support

**Browser Compatibility:**
- setInterval widely supported across all browsers
- Tailwind animations use standard CSS transitions
- No experimental CSS features required
