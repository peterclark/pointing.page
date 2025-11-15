# Spec Requirements: Room Creation & Management

## Initial Description

**Project**: Story pointing web application for software development teams
**Database Infrastructure**: Complete (all 8 phases done)
**Tech Stack**: React 19.1.1 + TypeScript + Vite, Supabase backend, shadcn/ui components
**Status**: This is the first UI feature to be built

The Room Creation & Management feature allows users to create new story pointing rooms and join existing rooms via room codes. This includes:

- Creating a new room (with room name and point scale selection)
- Joining an existing room via 8-character room code
- Anonymous participation (no login required)
- Automatic room code generation by backend
- Leader assignment on room creation

This feature establishes the foundational user flow for the story pointing application, enabling:
1. Room creation with configuration options
2. Room joining mechanism via unique codes
3. User identity management (anonymous)
4. Basic room access control and leadership

## Requirements Discussion

### First Round Questions

**Q1:** When a user lands on the home page without being in a room, should we display both "Create Room" and "Join Room" options, or only "Create Room" with joining handled exclusively through shared links/URLs?
**Answer:** Only display "Create Room" button on landing page. Join flow is exclusively via direct URL navigation when users paste shared link.

**Q2:** For the Create Room dialog/modal, I'm assuming we should show: Room name input (with auto-generated suggestion), Participant name input, and Point scale selection (Fibonacci/T-shirt as radio buttons or large selection cards). Should we use react-hook-form + zod for validation since they're already installed?
**Answer:** Yes to react-hook-form + zod. Room name should be pre-populated with randomized funny name (editable). Participant name is required. Point scales should be 2 large square buttons that are only enabled after entering participant name. Clicking a point scale button should immediately create the room.

**Q3:** When displaying the room code in an active room, I assume we should show it prominently at the top with a copy-to-clipboard button. Should we use sonner (already installed) for the "Copied!" toast notification, and should we format the code with a hyphen like "ABCD-1234" for better readability?
**Answer:** Yes, display prominently with copy button (use heroicons which is installed). Yes to sonner for toasts. Room code format should be "ABC1-2345" style (9 chars total including hyphen, all caps).

**Q4:** For anonymous user participant names, should we enforce any character limits or restrictions (e.g., max 50 chars, no special characters, trim whitespace)?
**Answer:** Max 50 characters, trim whitespace, no special characters restriction needed. If name is too long for display, truncate with ellipsis.

**Q5:** If a user tries to join a room with a duplicate participant name, should we automatically append a number like "Alex (2)" or show a validation error requiring them to choose a different name?
**Answer:** Automatically append numbers: "Alex", "Alex (2)", "Alex (3)", etc.

**Q6:** When a user successfully joins via `/join/:roomCode`, should we immediately navigate them to `/room/:roomCode`, or stay on a join confirmation page first?
**Answer:** Immediately navigate to `/room/:roomCode`. No confirmation page.

**Q7:** For the localStorage participant_id (stored when a user enters their name for the first time), should this persist indefinitely, or should we clear it when the user leaves a room?
**Answer:** Persist indefinitely. Only clear if user explicitly clears browser data.

**Q8:** Are there any features we should explicitly exclude from this initial implementation? For example: Room settings/configuration after creation, ability to delete/close a room, transfer room leadership, or room history/past rooms list?
**Answer:** Yes, exclude all of those: no room settings changes after creation, no delete/close room, no transfer leadership, no room history.

### Existing Code to Reference

No similar existing features identified for reference. This is the first UI feature being built.

### Follow-up Questions

**Follow-up 1:** For the room name generator providing the pre-populated funny names, what format/style should these use? Should they be adjective-noun combinations (e.g., "Purple-Elephant", "Jazzy-Giraffe") or another pattern?
**Answer:** Adjective-noun combination format (e.g., "Purple-Elephant", "Jazzy-Giraffe")

**Follow-up 2:** When the user clicks a point scale button in the Create Room dialog, should the dialog show a loading state while the room is being created, or close immediately and show loading on the next page?
**Answer:** Close immediately and navigate to room. No loading state in the dialog itself.

**Follow-up 3:** For the join flow error handling - if someone navigates to `/join/:roomCode` with an invalid/expired code, should we redirect them back to home with an error toast, or show an error page with a button to go home?
**Answer:** Redirect to home with toast notification showing the error.

**Follow-up 4:** Should the room code display format "ABC1-2345" be enforced in the UI rendering (always uppercase, always with hyphen), even if the backend stores it differently?
**Answer:** Yes, always display as all caps with formatting like "ABC1-2345" regardless of backend storage format.

**Follow-up 5:** For participant name constraints, should we allow spaces in names (e.g., "John Smith") or restrict to single words only?
**Answer:** Allow spaces (e.g., "John Smith"). Max 50 characters applies to the full name including spaces. Truncate with ellipsis when too long for display.

**Follow-up 6:** You mentioned persisting participant_id in localStorage indefinitely - should we also pre-fill the participant name field in the Create Room dialog if the user has joined/created rooms before?
**Answer:** Yes, pre-fill the participant name field if localStorage has a saved name from previous sessions.

## Visual Assets

### Files Provided:
No visual assets provided.

### Visual Insights:
N/A - No visual files found in planning/visuals/ directory.

## Requirements Summary

### Functional Requirements

#### Room Creation Flow
- Landing page displays single "Create Room" button when user is not in a room
- Clicking "Create Room" opens a dialog/modal with:
  - Pre-populated room name field (randomized adjective-noun combination like "Purple-Elephant")
  - Room name is editable
  - Participant name input field (required)
  - Pre-filled from localStorage if user has previously entered a name
  - Two large square buttons for point scale selection: "Fibonacci" and "T-shirt"
  - Point scale buttons are disabled until participant name is entered
  - Clicking a point scale button immediately creates the room and closes dialog
  - Form validation using react-hook-form + zod
- After room creation:
  - Dialog closes immediately (no loading state in dialog)
  - User is navigated to `/room/:roomCode`
  - User is automatically assigned as room leader
  - Backend generates unique 8-character room code

#### Room Joining Flow
- No "Join Room" button on landing page
- Users join exclusively via direct URL navigation: `/join/:roomCode`
- Join flow behavior:
  - Parse room code from URL parameter
  - Validate room code exists and room is active
  - If valid: immediately navigate to `/room/:roomCode`
  - If invalid/expired: redirect to home (`/`) with toast notification "Room not found" or similar error
  - No intermediate confirmation page
- No time limit for joining rooms (rooms persist indefinitely unless explicitly closed)

#### Room Code Display & Sharing
- Room code displayed prominently in active room view (top of page)
- Format: "ABC1-2345" (9 characters including hyphen, all uppercase)
- Copy-to-clipboard button adjacent to room code (using heroicons)
- Toast notification on successful copy (using sonner): "Copied to clipboard!" or similar
- Format is UI-only rendering (backend may store differently)

#### Anonymous User Identity Management
- No user authentication required
- Participant name input required for room creation/joining
- Participant names stored in localStorage for convenience
- Unique participant_id generated and stored in localStorage on first use
- participant_id persists indefinitely (only cleared if user clears browser data)
- Pre-fill participant name field if localStorage contains saved name

#### Point Scale Options
- Fibonacci Scale: 1, 2, 3, 5, 8, 13, 21, 34, 55, 89
- T-shirt Scale: XS, S, M, L, XL, XXL
- Point scale is selected during room creation only (cannot be changed after)

### UI/UX Requirements

#### Landing Page
- Display: Single large "Create Room" button
- No "Join Room" option visible
- Clean, minimal interface

#### Create Room Dialog
- Modal/dialog component (use shadcn/ui Dialog)
- Fields:
  1. Room name input (text field, pre-populated with random name, editable)
  2. Participant name input (text field, required, pre-filled if available)
  3. Point scale selection (2 large square buttons side-by-side)
- Validation:
  - Point scale buttons disabled until participant name entered
  - Visual feedback on validation errors
- Interaction:
  - Clicking point scale button submits form and creates room
  - Dialog closes immediately on submission
  - No loading spinner in dialog itself

#### Active Room View
- Room code display:
  - Prominent position (top of page)
  - Large, readable text
  - Format: "ABC1-2345" (all caps with hyphen)
  - Copy button with heroicon (clipboard or similar)
- Toast notifications (using sonner):
  - "Copied to clipboard!" on successful copy
  - Error messages for failed operations

#### Participant Name Display
- Maximum 50 characters
- If longer than display area, truncate with ellipsis (...)
- Full name shown in tooltip on hover (if truncated)

#### Button States
- Loading state: Spinner icon (for any async operations)
- Disabled state: Grayed out, not clickable
- Active state: Full color, interactive

### Technical Requirements

#### Routing Structure
- `/` - Landing page (Create Room button only)
- `/room/:roomCode` - Active room view (main room interface)
- `/join/:roomCode` - Join flow handler (validates and redirects)

#### Form Validation (react-hook-form + zod)
- Room name schema:
  - Type: string
  - Min length: 1 character
  - Max length: 100 characters (or reasonable limit)
  - Trim whitespace
- Participant name schema:
  - Type: string
  - Required
  - Min length: 1 character
  - Max length: 50 characters
  - Trim whitespace
  - Allow spaces, letters, numbers
- Point scale schema:
  - Type: enum
  - Values: "fibonacci" | "tshirt"
  - Required

#### localStorage Schema
```typescript
// Stored keys
{
  "participant_id": "uuid-v4-string",      // Generated once, persists indefinitely
  "participant_name": "User's last name"   // Updated each time user enters name
}
```

#### API Interactions (Supabase)
- Create Room:
  - Endpoint: Insert into `rooms` table
  - Payload: `{ name: string, point_scale: string, leader_id: uuid }`
  - Response: `{ room_code: string, id: uuid }`
- Join Room:
  - Endpoint: Query `rooms` table by room_code
  - Check: `is_active = true`
  - Response: Room details or 404
- Duplicate Name Check:
  - Endpoint: Query `room_participants` by room_id and name
  - Logic: Count existing names matching pattern (Alex, Alex (2), etc.)
  - Generate: Next available number if duplicates exist

### Validation Rules

#### Room Code Validation
- Length: Exactly 8 characters (excluding hyphen)
- Format: Alphanumeric (A-Z, 0-9)
- Case-insensitive input (convert to uppercase)
- Must match existing active room in database

#### Participant Name Validation
- Required field
- Minimum: 1 character (after trimming)
- Maximum: 50 characters
- Allowed characters: Letters, numbers, spaces, basic punctuation
- Trim leading/trailing whitespace before submission
- Empty/whitespace-only names rejected

#### Room Name Validation
- Minimum: 1 character (after trimming)
- Maximum: 100 characters (reasonable UI limit)
- Trim leading/trailing whitespace
- Pre-populated value always valid
- User can edit to custom name

### Error Handling

#### Room Creation Errors
- Network failure: Toast notification "Failed to create room. Please try again."
- Validation errors: Inline field-level error messages
- Unexpected errors: Generic toast "Something went wrong. Please try again."

#### Room Join Errors
- Invalid room code: Redirect to `/` with toast "Room not found"
- Inactive/closed room: Redirect to `/` with toast "This room is no longer active"
- Network failure: Redirect to `/` with toast "Failed to join room. Please try again."
- Room full (if implemented): Redirect to `/` with toast "This room is full"

#### Duplicate Name Handling
- Automatic resolution: Append number in parentheses
- Format: "Name", "Name (2)", "Name (3)", etc.
- No error shown to user (silent handling)
- Check performed on join/create before room entry

#### Copy to Clipboard Errors
- Success: Toast "Copied to clipboard!"
- Failure: Toast "Failed to copy. Please try manually."
- Fallback: Select text for manual copy if clipboard API unavailable

### Routing Behavior

#### Navigation Flow
```
Landing (/)
  → Click "Create Room"
  → Dialog opens
  → Enter name + select point scale
  → Navigate to /room/:roomCode

Pasted Link (/join/:roomCode)
  → Validate room code
  → If valid: Navigate to /room/:roomCode
  → If invalid: Navigate to / with error toast

Active Room (/room/:roomCode)
  → Display room interface
  → Show room code with copy button
  → (Future: voting interface, participant list, etc.)
```

#### URL Parameter Handling
- Room code extracted from `:roomCode` parameter
- Case-insensitive matching (normalize to uppercase)
- Invalid characters: Show error, redirect to home
- Missing room code: Redirect to home

### Scope Boundaries

#### In Scope
- Room creation with name and point scale selection
- Adjective-noun room name generator
- Anonymous participant name entry
- Room code generation (backend)
- Room code display with copy-to-clipboard
- Join room via URL (`/join/:roomCode`)
- localStorage persistence for participant identity
- Duplicate name handling (auto-append numbers)
- Basic error handling and validation
- Toast notifications (sonner)
- Room leader assignment on creation

#### Out of Scope (Explicitly Excluded)
- Room settings/configuration changes after creation
- Ability to change point scale after room creation
- Room deletion or closing functionality
- Transfer room leadership
- Room history or past rooms list
- User authentication or login system
- Room time limits or expiration
- Maximum participant limits
- Kicking/removing participants
- Room passwords or access control beyond room code
- Edit participant name after joining
- Voting interface (separate feature)
- Story/task management (separate feature)
- Results display and export (separate feature)

### Dependencies

#### Installed Packages (Already Available)
- `react-hook-form` - Form state management and validation
- `zod` - Schema validation
- `sonner` - Toast notifications
- `heroicons` - Icon set (for copy button)
- `shadcn/ui` - UI component library
- `@supabase/supabase-js` - Backend API client

#### shadcn/ui Components Required
- Dialog (for Create Room modal)
- Button (for Create Room trigger, point scale selection, copy button)
- Input (for room name and participant name fields)
- Label (for form field labels)
- Toast/Sonner (for notifications)
- Form components (form wrappers for react-hook-form integration)

#### Backend Requirements
- Room code generation API endpoint
- Rooms table with columns: id, room_code, name, point_scale, leader_id, is_active, created_at
- Room participants table for tracking users in rooms
- Duplicate name checking logic
- Room validation endpoint (check if room exists and is active)

#### Utility Functions to Implement
- `generateRoomName()` - Returns random adjective-noun combination
- `formatRoomCode(code: string)` - Formats as "ABC1-2345"
- `getParticipantId()` - Gets or creates participant_id from localStorage
- `saveParticipantName(name: string)` - Saves name to localStorage
- `copyToClipboard(text: string)` - Wrapper for clipboard API with fallback

#### Room Name Generator
- List of adjectives (50-100 options): Purple, Jazzy, Happy, Bouncy, Clever, etc.
- List of nouns (50-100 options): Elephant, Giraffe, Penguin, Rocket, Dragon, etc.
- Random selection algorithm
- Format: "Adjective-Noun" with hyphen separator
- Capitalized first letters

### Technical Constraints

#### Browser Compatibility
- Modern browsers only (React 19.1.1 requirement)
- localStorage must be available
- Clipboard API with fallback for older browsers

#### Performance Considerations
- Instant dialog open/close (no perceptible lag)
- Room code copy should be immediate
- Toast notifications should not block UI interaction
- Optimistic UI updates where possible

#### Data Persistence
- Room codes stored in backend database
- Participant IDs stored in localStorage only (not in database)
- Participant names linked to room_participants records
- Room state managed by backend (Supabase real-time subscriptions)

#### Security Considerations
- Room codes must be unique and unpredictable
- No PII stored beyond participant name (which is user-provided)
- XSS prevention in participant name display
- Rate limiting on room creation (backend responsibility)

---

## Summary

This specification covers the complete Room Creation & Management feature for the story pointing application. It establishes:

1. **User Flow**: Simple, intuitive flow from landing page to active room
2. **Anonymous Access**: No authentication required, localStorage-based identity
3. **Room Codes**: 8-character codes for easy sharing and joining
4. **Validation**: Comprehensive form validation with react-hook-form + zod
5. **Error Handling**: User-friendly error messages and graceful failure handling
6. **UI/UX**: Clean interface using shadcn/ui components with clear feedback
7. **Scope**: Well-defined boundaries with explicit exclusions for future features

The feature is ready for specification writing and implementation.
