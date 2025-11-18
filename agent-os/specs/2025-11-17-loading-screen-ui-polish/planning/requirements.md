# Spec Requirements: Loading Screen UI Polish

## Initial Description
Polish the UI of the loading screen after the user submits the room form and before the room is displayed.

This is about improving the user experience during the transition period when creating/joining a room. Currently there may be a delay or abrupt transition, and we want to create a polished loading experience.

### Context
This feature focuses on the user experience during room creation/joining:
- After user submits the room form
- Before the room is fully loaded and displayed
- Handling the transition period smoothly

### Goals
Create a polished loading experience that:
- Provides visual feedback during the loading state
- Reduces perceived wait time
- Creates a smooth transition to the room interface
- Maintains consistent branding and UX quality

## Requirements Discussion

### First Round Questions

**Q1:** Should the progress bar reach 100% on a timer (e.g., 5 seconds), or should it progress based on actual API/database operation completion?
**Answer:** YES - reach 100% in 5 seconds with smooth progression (1% every 0.05 seconds)

**Q2:** When the CreateRoomDialog form is submitted, should the dialog close and display the loading screen as a full-page overlay, or should the loading screen appear within the dialog itself?
**Answer:** Close the dialog and show full-page loader

**Q3:** Should the loading screen also appear when joining a room (via join flow), or is this only for room creation?
**Answer:** Also show loading screen for room joining. Show "Joining your room..." in this case (vs "Creating your room..." for creation)

**Q4:** When should the progress bar pulse - when it reaches 100%, or after the room is confirmed created in the database?
**Answer:** Pulse the progress bar when it reaches 100% AND after the room is confirmed created in the database. The pulse should last for 1 second.

**Q5:** After the loading completes and the user returns to the form (if they need to fix an error), should we preserve the form data they entered, or start fresh?
**Answer:** Preserve just the room name (not point scale selection)

**Q6:** For the layout - should the progress bar be left-aligned, centered, or full-width? Where should the percentage indicator appear (above, below, or to the right of the bar)?
**Answer:**
- Progress bar should be centered
- Message ("Creating your room..." or "Joining your room...") should be just above the far LEFT side of the progress bar
- Percentage indicator should be just above the far RIGHT side of the progress bar

### Existing Code to Reference

**Similar Features Identified:**
No similar existing features identified for reference. This is a new loading/transition pattern for the application.

### Follow-up Questions
No follow-up questions were required. All requirements were clarified in the initial discussion.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
No visual design files were provided. Implementation should follow the application's existing design system (shadcn/ui with "new-york" variant, Tailwind CSS v4, slate color palette).

## Requirements Summary

### Functional Requirements

**Progress Bar Behavior:**
- Progress bar should fill from 0% to 100% over exactly 5 seconds
- Smooth progression: 1% increment every 0.05 seconds (50ms intervals)
- Progress is timer-based, not tied to actual API completion time

**Completion Animation:**
- When progress reaches 100% AND room is confirmed created in database, pulse the progress bar
- Pulse animation should last exactly 1 second
- After pulse completes, navigate to the room interface

**Display Context:**
- Loading screen should appear for BOTH room creation and room joining flows
- Message text should be context-aware:
  - Room creation: "Creating your room..."
  - Room joining: "Joining your room..."

**Dialog Interaction:**
- When CreateRoomDialog form is submitted, immediately close the dialog
- Display loading screen as a full-page component (not within the dialog)

**Form Data Preservation:**
- If user returns to form after error, preserve room name only
- Do NOT preserve point scale selection (reset to default)

**Layout Specifications:**
- Progress bar: horizontally centered on page
- Message text ("Creating your room..." / "Joining your room..."): positioned just above the far LEFT edge of the progress bar
- Percentage indicator (e.g., "85%"): positioned just above the far RIGHT edge of the progress bar

### Technical Considerations

**Component Structure:**
- Create new `LoadingScreen` component for full-page loader
- Component should accept props:
  - `isCreating: boolean` - determines message text
  - `onComplete: () => void` - callback when animation finishes

**Timer Implementation:**
- Use `setInterval` or `requestAnimationFrame` for smooth 50ms updates
- Clean up timer on component unmount to prevent memory leaks
- Progress state should be React state variable (0-100)

**Database Synchronization:**
- Continue existing room creation/joining logic
- Only trigger pulse animation when BOTH conditions met:
  - Progress bar reaches 100%
  - Database operation confirms success (room created/joined)
- If database operation fails before 100%, show error and stop progress

**Animation Requirements:**
- Use shadcn/ui Progress component from UI library
- Apply pulse animation via Tailwind CSS classes or framer-motion
- Ensure pulse is visible and noticeable (scale or glow effect)
- Maintain smooth 60fps animation performance

**Navigation Flow:**
1. User submits CreateRoomDialog form
2. Dialog closes immediately
3. LoadingScreen component renders full-page
4. Progress bar animates 0% → 100% over 5 seconds
5. Simultaneously, database operation executes
6. When both complete: pulse animation (1 second)
7. Navigate to room page with room ID in URL

**Error Handling:**
- If database operation fails during progress, stop animation
- Display error message on loading screen or return to form
- Preserve room name in form on error return
- Reset point scale selection to default on error return

**Styling Consistency:**
- Use existing Tailwind CSS classes and color scheme (slate)
- Follow shadcn/ui "new-york" variant styling
- Ensure loading screen background matches app theme
- Use consistent typography and spacing

### Integration Points

**CreateRoomDialog (`src/components/CreateRoomDialog.tsx`):**
- Trigger LoadingScreen on form submission
- Close dialog when showing loader
- Preserve room name if returning to form

**Join Room Flow:**
- Apply same LoadingScreen to join room page/handler
- Use "Joining your room..." message variant
- Follow same 5-second progress pattern

**Room Creation Query (`src/lib/supabase/queries.ts`):**
- Existing `createRoom()` function should continue as-is
- Return success/error state to LoadingScreen component
- LoadingScreen waits for both timer AND query completion

**Navigation:**
- Use React Router navigation after pulse completes
- Navigate to `/room/[room-code]` or similar route
- Ensure URL parameter matches created/joined room

### Scope Boundaries

**In Scope:**
- Full-page LoadingScreen component with progress bar
- 5-second timer-based progress animation (0-100%)
- Context-aware messaging (creating vs joining)
- Centered progress bar with left-aligned message and right-aligned percentage
- 1-second pulse animation on completion
- Form data preservation (room name only) on error
- Integration with both create and join flows

**Out of Scope:**
- Loading screen for other parts of the application (only room creation/joining)
- Progress bar tied to actual API operation stages (remains timer-based)
- Cancellation/back button during loading (user must wait for completion or error)
- Skeleton loaders for the room page itself (only covers transition period)
- Custom animations beyond pulse (e.g., confetti, particle effects)
- Sound effects or haptic feedback
- Multiple loading messages or tips during wait time

### Reusability Opportunities
No existing similar features identified. This LoadingScreen component establishes a new pattern that could potentially be reused for future loading states, but currently only targets room creation/joining flows.

### Future Enhancements Mentioned
None. This is a focused UI polish task for the specific transition between form submission and room display.
