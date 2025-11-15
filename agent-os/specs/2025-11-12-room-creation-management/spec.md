# Specification: Room Creation & Management

## Goal
Enable users to create and join story pointing rooms anonymously through a simple, intuitive interface. Users can create rooms with custom names and point scales, join rooms via unique codes, and participate without authentication.

## User Stories
- As a team facilitator, I want to create a new room with a custom name and point scale so that my team can start estimating stories together
- As a team member, I want to join an existing room via a shared link so that I can participate in the pointing session

## Specific Requirements

**Landing Page UI**
- Display single "Create Room" button when user is not in an active room
- Clean, minimal interface with centered button
- No "Join Room" UI element (joining happens exclusively via URL navigation)
- Use shadcn/ui Button component with appropriate size and variant

**Create Room Dialog**
- Modal dialog opens when "Create Room" button is clicked
- Pre-populated room name field with randomized adjective-noun combination (e.g., "Purple-Elephant", "Jazzy-Giraffe")
- Room name is editable, validated for 1-100 characters after trimming whitespace
- Participant name input field, required, max 50 characters, allows spaces and alphanumeric characters
- Pre-fill participant name from localStorage if user has previously entered a name
- Two large square buttons for point scale selection: "Fibonacci" and "T-shirt"
- Point scale buttons remain disabled until participant name is entered (visual feedback)
- Clicking a point scale button immediately submits the form and creates the room
- Dialog closes immediately on submission without loading state in dialog itself

**Form Validation with react-hook-form + zod**
- Room name schema: string, min 1 char, max 100 chars, trim whitespace
- Participant name schema: string, required, min 1 char, max 50 chars, trim whitespace, allow spaces and alphanumeric
- Point scale schema: enum type "fibonacci" | "tshirt", required
- Inline field-level error messages for validation failures
- Use @hookform/resolvers for zod integration

**Room Code Generation and Display**
- Backend generates unique 8-character alphanumeric room code via generate_room_code RPC
- Display format: "ABC1-2345" (9 chars total including hyphen, all uppercase)
- Format is UI-only rendering - normalize any backend format to this display format
- Room code displayed prominently at top of active room view
- Copy-to-clipboard button adjacent to room code using heroicons (ClipboardDocumentIcon)
- Toast notification on successful copy using sonner: "Copied to clipboard!"
- Fallback toast on copy failure: "Failed to copy. Please try manually."

**Join Room Flow**
- No UI for joining - users navigate directly to /join/:roomCode URL
- Parse and normalize room code from URL parameter (convert to uppercase, validate alphanumeric)
- Query rooms table via getRoomByCode() to validate room exists
- If valid room: immediately navigate to /room/:roomCode without intermediate page
- If invalid/not found: redirect to / with sonner toast "Room not found"
- If room is inactive: redirect to / with toast "This room is no longer active"
- Network error: redirect to / with toast "Failed to join room. Please try again."

**Anonymous User Identity Management**
- Generate UUID v4 for participant_id on first use, store in localStorage with key "participant_id"
- Store participant name in localStorage with key "participant_name", update each time user enters name
- participant_id persists indefinitely (only cleared if user clears browser data)
- Pre-fill participant name field in Create Room dialog if localStorage contains saved name
- User assigned as room leader (is_leader: true) when creating a room
- First participant in any room automatically becomes leader via joinRoom() logic

**Duplicate Name Handling**
- Query room_participants table to check for existing names matching pattern
- Automatically append numbers in parentheses for duplicates: "Alex", "Alex (2)", "Alex (3)", etc.
- Count existing matches and generate next available number
- Silent handling - no error shown to user
- Perform check before inserting participant record into database

**Routing Architecture**
- / (Landing Page): Shows "Create Room" button, renders landing page component
- /room/:roomCode (Active Room View): Main room interface showing room code, copy button, placeholder for future voting UI
- /join/:roomCode (Join Handler): Validates room code and redirects to /room/:roomCode or / with error

**Room Name Generator Utility**
- Create utility function generateRoomName() in src/lib/utils.ts
- List of 50-100 adjectives: ["Purple", "Jazzy", "Happy", "Bouncy", "Clever", "Swift", "Bright", "Cosmic", "Electric", "Funky", etc.]
- List of 50-100 nouns: ["Elephant", "Giraffe", "Penguin", "Rocket", "Dragon", "Phoenix", "Tiger", "Dolphin", "Eagle", "Wolf", etc.]
- Random selection algorithm using Math.random()
- Format: "Adjective-Noun" with hyphen separator and capitalized first letters

**Participant Name Display**
- Truncate names longer than display area with ellipsis (CSS: text-overflow: ellipsis)
- Show full name in tooltip on hover if truncated
- Max 50 characters enforced at validation level
- Display participant names in participant list (future feature) with leader indicator (crown icon)

## Visual Design

No visual assets provided.

**Landing Page Design Approach**
- Full-height centered layout with single prominent "Create Room" button
- Large button size (lg or xl) with primary variant
- Application title or logo above button (optional, minimal branding)
- Use Tailwind CSS classes: flex, justify-center, items-center, min-h-screen

**Create Room Dialog Design**
- shadcn/ui Dialog component with DialogContent wrapper
- Dialog title: "Create a Room"
- Form fields stacked vertically with consistent spacing (space-y-4)
- Room name input with label "Room Name"
- Participant name input with label "Your Name" and asterisk for required field
- Point scale selection section with label "Point Scale"
- Two equal-width square buttons side-by-side (grid grid-cols-2 gap-4)
- Disabled state: grayed out with reduced opacity and cursor-not-allowed
- No explicit submit button - point scale buttons trigger submission

**Active Room View Design**
- Room code displayed in large text at top center with border or card background
- Format: "ABC1-2345" in monospace font or badge-style component
- Copy button immediately adjacent with ClipboardDocumentIcon from heroicons
- Button hover state shows tooltip "Copy room code"
- Placeholder text below: "Room interface coming soon..." or similar

**Toast Notifications**
- Use sonner Toaster component, add to root layout/App.tsx
- Success toasts: green indicator, auto-dismiss after 3 seconds
- Error toasts: red indicator, auto-dismiss after 5 seconds
- Position: bottom-center or top-right based on shadcn/ui sonner configuration

## Existing Code to Leverage

**Supabase Client Configuration (/src/lib/supabase/client.ts)**
- Typed Supabase client singleton with Database types
- Helper types: Tables, TablesInsert, TablesUpdate, Enums for type-safe queries
- Environment variable validation for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- Auth and realtime configuration already set up
- Reuse supabase instance for all database operations

**Database Query Utilities (/src/lib/supabase/queries.ts)**
- getRoomByCode(roomCode: string): validates room exists, returns room data or null
- createRoom(name: string, pointScale: Enums<'point_scale_enum'>): creates room and generates code via RPC
- joinRoom(roomId: string, userId: string | null, name: string): creates participant record, handles duplicate names, assigns leader if first participant
- DatabaseError class for consistent error handling with code and details properties
- All functions include comprehensive error handling and TypeScript safety

**Database Types (/src/lib/supabase/database.types.ts)**
- Complete type definitions for rooms, participants, stories, votes tables
- Enum type point_scale_enum with values "fibonacci" | "t-shirt"
- Row, Insert, Update types for each table
- RPC function types including generate_room_code returning string

**React Hooks for Real-time (/src/hooks/useRealtimeSubscription.ts)**
- useRoomParticipants(roomId): subscribes to participant changes, returns array of participants
- useRoomData(roomId): subscribes to both participants and stories on single channel for efficiency
- Automatic cleanup on unmount, handles INSERT/UPDATE/DELETE events
- Use for future real-time participant list updates in active room view

**Utility Functions (/src/lib/utils.ts)**
- cn() function combining clsx and tailwind-merge for conditional className composition
- Use for dynamic styling based on component state (disabled, active, etc.)
- Extend this file with formatRoomCode(), generateRoomName(), and localStorage helpers

**Existing shadcn/ui Components**
- Button component at /src/components/ui/button.tsx with variants and sizes
- dropdown-menu component (not needed for this spec but available)
- Will need to add: Dialog, Input, Label, Form components via shadcn CLI or MCP

**Theme Provider (/src/components/theme-provider.tsx)**
- Dark/light mode support already configured
- Ensure dialog and form components respect theme

## Out of Scope
- Room settings or configuration changes after creation (cannot change point scale or room name post-creation)
- Ability to delete, close, or archive rooms
- Transfer room leadership to another participant
- Room history or list of past rooms user has joined
- User authentication or login system (anonymous only for this spec)
- Room time limits or automatic expiration
- Maximum participant limits or room capacity restrictions
- Kicking or removing participants from room
- Room passwords or additional access control beyond room code
- Edit participant name after joining room
- Voting interface for story estimation (separate future spec)
- Story/task creation and management (separate future spec)
- Results display, consensus calculation, or export features (separate future spec)
- Real-time participant presence indicators beyond basic list (separate future spec)
