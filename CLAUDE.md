# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript + Vite application using shadcn/ui components with Tailwind CSS v4. The project uses Rolldown (a Rust-based bundler) instead of standard Vite for improved performance.

This application implements a real-time story pointing tool where teams can collaboratively estimate work items using Fibonacci or T-shirt sizing scales. The core features include room management, participant joining, story voting with privacy controls, and real-time synchronization via Supabase.

## Development Commands

```bash
# Start development server with HMR
npm run dev

# Build for production (runs TypeScript compiler first, then Vite build)
npm run build

# Lint the codebase
npm run lint

# Preview production build locally
npm run preview

# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

## Architecture

### Build System
- **Vite**: Uses `rolldown-vite@7.1.14` (specified in package.json overrides) - a Rolldown-based Vite implementation
- **Bundler**: Rolldown (Rust-based) with oxc for Fast Refresh instead of Babel
- **TypeScript**: Compilation happens before Vite build (`tsc -b && vite build`)

### Backend & Database
- **Backend**: Supabase (PostgreSQL + Real-time + Authentication)
- **Database Types**: Auto-generated types in `src/lib/supabase/database.types.ts`
- **Query Functions**: Centralized in `src/lib/supabase/queries.ts`
- **Real-time**: Supabase Realtime subscriptions for live updates
- **RLS Policies**: Row-Level Security enforced at database level

### UI Component System
- **Framework**: shadcn/ui components (installable via shadcn CLI or MCP server)
- **Style**: "new-york" variant (see components.json:3)
- **Component Location**: `src/components/ui/` (aliased as `@/components/ui`)
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Icons**: lucide-react, @heroicons/react

### Path Aliases
Configured in both vite.config.ts:10-12 and tsconfig.json:12-14:
- `@/` → `./src/`
- `@/components` → `./src/components`
- `@/lib` → `./src/lib`
- `@/hooks` → `./src/hooks`

### Styling Architecture
- **Tailwind Config**: CSS-based (v4) - no separate tailwind.config.js file
- **CSS Variables**: Enabled for theme customization (components.json:10)
- **Base Color**: slate (components.json:9)
- **Utility Function**: `cn()` in src/lib/utils.ts combines clsx and tailwind-merge for conditional classes
- **Responsive Design**: Mobile-first approach with sm:, md:, lg: breakpoints
- **Grid Layouts**: Used for voting buttons and result cards with responsive column counts

### Component Patterns
shadcn/ui components follow these patterns:
- Use `class-variance-authority` (cva) for variant-based styling
- Support `asChild` prop via `@radix-ui/react-slot` for composition
- Export both component and variants (e.g., `Button` and `buttonVariants`)
- TypeScript props extend native HTML element props + VariantProps

## Application-Specific Patterns

### Navigation Architecture
**IMPORTANT: Do not modify Header component unless explicitly requested**

**Header Component** (`src/components/Header.tsx`):
- Contains ONLY the logo/branding ("Pointing.page")
- Simple, centered text display with responsive sizing
- Does NOT contain navigation buttons
- Keep this component minimal and focused on branding

**Navigation Buttons** (`src/components/RootLayout.tsx`):
- Profile button (top right corner): Navigates to /profile
  - Shows LogIn icon when unauthenticated
  - Shows User icon when authenticated
- Home button (top left corner): Navigates to landing page
- Implemented with absolute positioning in RootLayout
- Uses Avatar component from shadcn/ui for profile button
- Responsive sizing across mobile, tablet, desktop

**Why This Architecture:**
- Keeps Header component simple and focused
- Allows flexible positioning of navigation elements
- Separates concerns: branding vs. navigation
- Easier to maintain and modify navigation independently

### Real-time Subscription Pattern
**Location**: `src/hooks/useRoomSubscription.ts`

Custom React hook that manages Supabase real-time subscriptions:
```typescript
const { participants, stories, votes, activeStory, isLoading, error } = useRoomSubscription(roomId);
```

**Features**:
- Single channel for multiple table subscriptions (participants, stories, votes)
- Automatic cleanup on unmount
- Initial data fetch followed by real-time updates
- Type-safe event handling with INSERT, UPDATE, DELETE support
- Error handling and logging

**Usage**:
- Call hook at page level (e.g., ActiveRoomPage)
- Pass roomId to establish subscription
- Hook returns current state and automatically updates on database changes
- Subscriptions auto-cleanup when component unmounts or roomId changes

### Vote Privacy Pattern
**Location**: `src/lib/utils.ts` - `filterVisibleVotes()`

Enforces vote privacy by filtering votes based on `is_revealed` flag:
```typescript
const visibleVotes = filterVisibleVotes(votes, currentParticipantId);
```

**Rules**:
- Participants always see their own votes (revealed or not)
- Other participants' votes only visible if `is_revealed=true`
- Applied before rendering ParticipantStatus and VoteResults components
- Critical for maintaining vote anonymity until leader reveals

### State-Based Conditional Rendering
**Location**: `src/pages/ActiveRoomPage.tsx`

Page uses state machine pattern with 3 distinct states:
1. **No Active Story**: Leader sees StoryForm, others see waiting message
2. **Active Story (Not Revealed)**: All see voting interface, leader sees Reveal button
3. **Active Story (Revealed)**: All see results, leader sees Next Story button

**State Determination**:
- Active story: `stories.find(s => s.is_active)`
- Is revealed: `votes.some(v => v.story_id === activeStory.id && v.is_revealed)`
- Is leader: `currentParticipant?.is_leader`

### Form Validation Pattern
**Location**: `src/lib/schemas.ts`

Uses Zod for schema validation with react-hook-form integration:
```typescript
const form = useForm<CreateStoryFormData>({
  resolver: zodResolver(createStorySchema)
});
```

**Schemas**:
- `createStorySchema`: Title (required, max 100), description (optional, max 500)
- `fibonacciPointValues`: Enum for Fibonacci scale
- `tshirtPointValues`: Enum for T-shirt scale
- Clear error messages for user feedback

### Consensus Calculation Pattern
**Location**: `src/lib/utils.ts`

Two calculation strategies based on point scale:

**Fibonacci Scale**:
```typescript
calculateFibonacciConsensus(votes): { average, consensus, outlierThreshold }
```
- Calculates numeric average
- Returns rounded consensus value
- Identifies outliers (votes outside 1 step of consensus)

**T-shirt Scale**:
```typescript
calculateTshirtConsensus(votes): { mode, consensus, outlierThreshold }
```
- Calculates mode (most frequent value)
- Returns most common size
- Identifies outliers (votes outside 1 step of mode)

**Outlier Detection**:
```typescript
isConsensusVote(vote, consensus, scale): boolean
```
- Returns true if vote is within 1 step of consensus
- Used for green (consensus) vs yellow (outlier) border highlighting

### Optimistic UI Updates
**Location**: `src/components/VotingButtons.tsx`

Voting buttons implement optimistic updates:
1. Immediately update UI when button clicked
2. Submit mutation to database
3. Keep optimistic update on success (confirmed by subscription)
4. Rollback on error with toast notification

**Benefits**:
- Instant feedback for user actions
- Maintains consistency with real-time updates
- Graceful error handling

### Anonymous Session Identity Pattern
**Location**: `src/components/SessionGate.tsx`, `src/lib/supabase/auth.ts`

Identity comes from a Supabase anonymous session, not from localStorage.
`SessionGate` calls `ensureSession()` before the router renders, so every
visitor holds a JWT and `auth.uid()` is available to every RLS policy. The
session persists and refreshes itself, so a returning visitor keeps the same id
and therefore the same participant rows.

- `participants.user_id`: always set, to `auth.uid()`
- `participant_name`: still in localStorage, but only to pre-fill the join form

**Lookup Pattern**:
```typescript
const { user } = useAuth();
const currentParticipant = participants.find(p => p.user_id === user?.id);
```

Signing in with a provider uses `linkIdentity()` rather than
`signInWithOAuth()`, so the guest identity is upgraded in place and the rooms
they already joined stay attached. This needs **Manual Linking** enabled in the
Supabase dashboard — see OAUTH_SETUP.md.

### Social Authentication Pattern
**Location**: `src/pages/ProfilePage.tsx`, `src/components/login-form.tsx`, `src/components/AppMenu.tsx`

OAuth-based authentication using Google and Github providers via Supabase:

**Authentication Flow**:
1. Unauthenticated users see LoginForm component with Google and Github buttons
2. OAuth redirect to provider for authorization
3. Callback to landing page (/) after successful auth
4. Automatic account linking: anonymous localStorage participant ID → authenticated user_id
5. Profile creation with OAuth metadata (display_name, email, avatar_url)

**Key Components**:
- **LoginForm**: Social auth buttons with Google and Github providers
  - Passes `display_name` from localStorage as OAuth metadata
  - Redirects to landing page (/) on success
  - Handles OAuth errors gracefully with toast notifications

- **ProfilePage**: Conditional rendering based on auth state
  - Unauthenticated: Shows LoginForm with social auth options
  - Authenticated: Shows profile with avatar, email (read-only), and editable display name
  - Auto-links anonymous participants on first auth (via `linkingAttemptedRef`)

- **AppMenu**: Hamburger menu with conditional trigger
  - Unauthenticated: Shows MenuIcon (three bars)
  - Authenticated: Shows user's avatar from OAuth provider
  - Conditional menu items: "Sign In" when unauthenticated, "Log out" when authenticated

**OAuth Metadata Sources**:
- **Google**: `user.user_metadata.avatar_url` or `user.user_metadata.picture`
- **Github**: `user.user_metadata.avatar_url`
- **Display Name**: `user.user_metadata.display_name` or `user.user_metadata.full_name`
- **Email**: `user.email` (always read-only from OAuth provider)

**Account Linking**:
```typescript
// On first authentication, link anonymous participants to user
if (user && isAuthenticated && linkingAttemptedRef.current !== user.id) {
  const localStorageId = getParticipantId();
  if (localStorageId) {
    await linkParticipantsToUser(localStorageId, user.id);
  }
}
```

**Setup Requirements**:
- Configure OAuth providers in Supabase dashboard (see OAUTH_SETUP.md)
- Set site URL and redirect URLs in Supabase Authentication settings
- Google: Requires Google Cloud Project OAuth credentials
- Github: Requires Github OAuth App configuration

**Anonymous User Preservation**:
- Authentication is optional for using the app
- Anonymous users can join rooms, vote, and participate fully
- Authentication only required for features like room history and saved preferences
- localStorage participant ID system unchanged


## Database Schema Key Points

### Tables
- **rooms**: id, room_code (unique 8-char), name, point_scale, leader_id, created_at
- **participants**: id, room_id, user_id (nullable), name, is_leader, is_active, joined_at
- **stories**: id, room_id, title, description, is_active, final_average, created_at
- **votes**: id, story_id, participant_id, point_value, is_revealed, sentiment, created_at
- **profiles**: id, user_id, display_name, created_at

### Key Relationships
- Room has many participants (one marked as leader via `leader_id`)
- Room has many stories (only one `is_active` at a time)
- Story has many votes (one per participant)
- Votes reference both story and participant

### Important Columns
- `is_active`: Boolean on stories and participants (soft delete pattern)
- `is_revealed`: Boolean on votes (controls visibility)
- `is_leader`: Boolean on participants (controls permissions)
- `point_scale`: Enum 'fibonacci' | 't-shirt' on rooms

## Testing Patterns

### Test Organization
- **Unit Tests**: Component-level tests in `src/components/*.test.tsx`
- **Integration Tests**: Workflow tests in `src/integration/*.test.tsx`
- **Database Tests**: Schema and RLS tests in `src/tests/*.test.ts`
- **Hook Tests**: Custom hooks in `src/hooks/*.test.ts`

### Testing Strategy (from agent-os/standards/testing/test-writing.md)
- Write minimal tests during development (2-8 per task group)
- Focus on behavior, not implementation details
- Test critical user workflows end-to-end
- Skip exhaustive edge case testing unless business-critical
- Use React Testing Library with user-centric queries

### Test Utilities
- Mock Supabase client for unit tests
- Mock useRoomSubscription hook for page tests
- Test user interactions (click, type, submit)
- Verify real-time state updates
- Check toast notifications for feedback

## MCP Integration

The project has an MCP server configured (.mcp.json:1-11) for shadcn component management:
```json
{
  "mcpServers": {
    "shadcn": {
      "command": "npx",
      "args": ["shadcn@latest", "mcp"]
    }
  }
}
```

This allows Claude Code to interact with shadcn components through MCP tools (listing and adding components).

## Adding shadcn Components

Components can be added via:
1. MCP tools: `mcp__shadcn__list_items_in_registries` and related tools
2. CLI: `npx shadcn@latest add <component-name>`

All components install to `src/components/ui/` per components.json:17.

## Technology Stack Notes

- **React**: v19.1.1 (latest)
- **TypeScript**: Strict mode enabled
- **Tailwind CSS**: v4.1.16 (using new CSS-based configuration)
- **Vite Plugin**: @tailwindcss/vite handles Tailwind integration
- **ESLint**: v9 with flat config (eslint.config.js pattern expected)
- **Supabase**: Backend, database, real-time, and authentication
- **React Router**: v7 for client-side routing
- **React Hook Form**: Form state management with Zod validation
- **Sonner**: Toast notifications
- **Vitest**: Test runner with React Testing Library

## Key Implementation Notes

### Vote Privacy (CRITICAL)
Vote privacy is enforced at multiple layers:
1. **Database RLS**: enforced. `votes_select` is
   `USING (is_revealed OR owns_participant(participant_id))`, so an unrevealed
   `point_value` is readable only by the participant who cast it — from the REST
   API, from Realtime, from anywhere. This works because `SessionGate` signs
   every visitor in anonymously before the first query, giving RLS an
   `auth.uid()` to key on. Revealing goes through the leader-only
   `reveal_votes()` function, because RLS grants per row and never per column.
2. **Client Filtering**: `filterVisibleVotes()` ensures only visible votes rendered
3. **UI Logic**: ParticipantStatus and VoteResults only show revealed data

Always use `filterVisibleVotes()` before displaying vote data to users.

### Real-time Updates
All room data (participants, stories, votes) updates in real-time via Supabase subscriptions. Components should rely on subscription hook data rather than manual re-fetching.

### Responsive Design
- Voting buttons: 4 columns mobile, 8 columns desktop
- Vote results: 2 columns mobile, 3 tablet, 4 desktop
- Full-width buttons on mobile, inline on desktop
- Flex layouts with wrap for participant status

### Error Handling
- Toast notifications for user-facing errors
- Console logging for debugging (with context)
- Graceful fallbacks (disabled buttons, error messages)
- Network error handling with retry capability

### Accessibility
- Semantic HTML structure
- Keyboard navigation support (Tab, Enter, Space)
- Focus indicators on interactive elements
- Labels on form inputs
- ARIA attributes where needed

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   ├── StoryForm.tsx   # Story creation form (leader only)
│   ├── VotingButtons.tsx  # Point scale voting interface
│   ├── ParticipantStatus.tsx  # Real-time voting status
│   ├── VoteResults.tsx  # Consensus and individual votes
│   └── LeaderControls.tsx  # Reveal and Next Story buttons
├── hooks/              # Custom React hooks
│   └── useRoomSubscription.ts  # Real-time subscription hook
├── lib/
│   ├── supabase/
│   │   ├── client.ts   # Supabase client initialization
│   │   ├── queries.ts  # Database query functions
│   │   └── database.types.ts  # Generated TypeScript types
│   ├── schemas.ts      # Zod validation schemas
│   └── utils.ts        # Utility functions (cn, consensus, etc.)
├── pages/              # Route pages
│   ├── LandingPage.tsx  # Home page with create room
│   ├── ActiveRoomPage.tsx  # Main room interface
│   └── JoinRoomHandler.tsx  # Join via URL redirect
├── integration/        # Integration tests
└── tests/             # Database and RLS tests
```

## Environment Variables

Required in `.env.local`:
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Common Issues and Solutions

### TypeScript Errors After Database Changes
Run `npm run generate-types` to regenerate database types from Supabase schema.

### Real-time Updates Not Working
Check Supabase Realtime settings:
1. Ensure table has replication enabled
2. Verify RLS policies allow SELECT for subscriptions
3. Check subscription channel status in browser console

### Vote Privacy Leaking
The database no longer returns other people's unrevealed votes, so a leak here
means either the session failed to establish (check `SessionGate`) or a
participant row has a NULL `user_id`. `filterVisibleVotes()` is still applied as
defence in depth, but it is no longer the only thing standing between a
spectator and everyone's estimate.

### Build Warnings (Chunk Size)
The 500KB chunk size warning is expected due to React + dependencies. Can be ignored for MVP. Consider code-splitting for production optimization.

## Feature Specifications

Detailed feature specs and task breakdowns are in:
- `/agent-os/specs/2025-11-15-voting-reveal-flow/spec.md`
- `/agent-os/specs/2025-11-15-voting-reveal-flow/implementation/tasks.md`

## Manual QA Checklist

For manual testing of the voting flow:
- `/agent-os/specs/2025-11-15-voting-reveal-flow/verification/manual-qa-checklist.md`

26 comprehensive test scenarios covering:
- Full voting workflow (leader and participant views)
- Vote privacy verification (CRITICAL)
- Real-time synchronization
- Error handling
- Responsive design
- Accessibility
- Edge cases
