# Specification: Voting & Reveal Flow

## Goal
Enable real-time collaborative story pointing where participants cast anonymous votes on stories using the room's point scale, with the leader controlling when votes are revealed and the ability to start fresh with the next story.

## User Stories
- As a room leader, I want to create a story with a title and optional description so the team knows what we're estimating
- As a participant, I want to vote on the active story using the room's point scale so I can contribute my estimate
- As a participant, I want to see my own vote immediately and be able to change it before reveal so I have confidence my vote was registered
- As a participant, I want to see who has voted in real-time so I know when the team is ready
- As a room leader, I want to reveal all votes when I choose so the team can discuss the results
- As a participant, I want to see all revealed votes with consensus highlighting so we can identify outliers and discuss
- As a room leader, I want to start the next story with a clean slate so we can estimate multiple stories in one session

## Specific Requirements

**Story Creation Form (Leader Only)**
- Render form with title input (required, max 100 chars) and description textarea (optional, max 500 chars)
- Use react-hook-form with zod validation matching existing patterns from CreateRoomDialog
- Submit creates story record in database with is_active=false initially
- After creation, automatically set story as active and show voting interface
- Form should be visually distinct from voting UI, use Card component

**Voting Button Grid**
- Display point values based on room's point_scale: Fibonacci (1, 2, 3, 5, 8, 13, 21) or T-shirt (XS, S, M, L, XL, XXL)
- Include "?" option for "Pass/Don't Know" on both scales
- Use large touch-friendly Button components in flexbox horizontal wrap layout similar to CreateRoomDialog point scale buttons
- Highlight participant's current vote with distinct visual state (e.g., variant="default" vs "outline")
- Disable all buttons once votes are revealed (is_revealed=true)
- Each button click calls submitVote mutation with upsert behavior

**Real-time Participant Status Indicators**
- Display below story description, above voting buttons
- Show all active participants with name and voting status
- Use Badge components with checkmark icon (lucide-react CheckCircle2) if voted, empty circle (Circle) if not
- Format: compact horizontal list with wrap behavior on mobile
- Subscribe to votes table filtered by story_id to detect when participant has submitted vote
- Update in real-time as votes come in using Supabase subscriptions

**Leader Reveal Control**
- Show "Reveal Votes" Button only to leader (check participant.is_leader flag)
- Button enabled anytime, even if not all participants have voted
- Button click updates all votes for story: set is_revealed=true
- Use mutation pattern from existing queries.ts revealVotes function
- After reveal, hide Reveal button and show "Next Story" button

**Vote Results Display**
- Only render after is_revealed=true for the story
- Show consensus/average calculation at top in prominent Card
- For Fibonacci: calculate numeric average, display rounded value
- For T-shirt: calculate mode (most common value), display that value
- List all participant votes below consensus using smaller Card components
- Each vote shows: participant name + point value
- Apply visual highlighting: green border for consensus (within 1 step of average/mode), yellow border for outliers
- Sort by point value ascending for easy comparison

**Next Story Flow (Leader Only)**
- Show "Next Story" button after votes revealed
- Button click clears active story (set is_active=false) and shows story creation form again
- No session history maintained - previous story and votes remain in database but not displayed
- Transition should be smooth with loading state during database updates

**Anonymous User Pattern**
- Get participant_id from localStorage using existing getParticipantId utility
- Lookup participant record by localStorage participant_id + room_id combination
- Store participant record ID in component state for submitting votes
- Handle case where localStorage participant_id doesn't match any participant (redirect to join flow)

**Form Validation Schemas**
- Create storySchema in src/lib/schemas.ts following existing patterns
- Title: z.string().trim().min(1).max(100)
- Description: z.string().trim().max(500).optional()
- Point value: z.string() (validated against room's point scale on backend)

**Real-time Subscription Strategy**
- Use single channel pattern for efficiency (Pattern 5 from subscriptions.example.ts)
- Subscribe to: stories (for is_active changes), votes (for vote updates and reveals), participants (for join/leave)
- Filter votes subscription by story_id on server side
- Throttle rapid updates using throttleRealtimeHandler pattern if performance issues arise
- Clean up subscriptions on component unmount

**Database Queries Needed**
- createStory: already exists in queries.ts
- setActiveStory: already exists in queries.ts
- getActiveStory: already exists in queries.ts
- submitVote: already exists in queries.ts
- revealVotes: already exists in queries.ts
- getStoryVotes: already exists in queries.ts
- getActiveParticipants: already exists in queries.ts

## Visual Design

No mockups provided. Follow existing patterns:

**Story Creation Form**
- Use Card component with p-6 padding
- Label + Input for title matching CreateRoomDialog style
- Label + Textarea for description (new component, similar styling to Input)
- Submit Button: large, full-width on mobile, variant="default"

**Voting Buttons**
- Grid layout: grid grid-cols-4 sm:grid-cols-8 gap-3
- Each Button: size="lg", square aspect ratio, text-xl font-bold
- Active vote: variant="default" with ring-2 ring-primary
- Inactive votes: variant="outline"
- Disabled state after reveal: opacity-50 cursor-not-allowed

**Participant Status List**
- Flex layout: flex flex-wrap gap-2 items-center
- Each participant: Badge with gap-1.5 for icon + name
- Voted: Badge variant="default" with CheckCircle2 icon
- Not voted: Badge variant="outline" with Circle icon

**Results Display**
- Consensus Card: border-2 border-primary, p-6, text-center
- Consensus value: text-4xl font-bold
- Consensus label: text-sm text-muted-foreground
- Vote Cards: grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4
- Consensus votes: border-2 border-green-500
- Outlier votes: border-2 border-yellow-500

## Existing Code to Leverage

**CreateRoomDialog Component (src/components/CreateRoomDialog.tsx)**
- Form structure with react-hook-form + zod validation pattern
- Point scale button grid layout and styling
- Button state management and disabled states
- Error message display patterns

**ActiveRoomPage Component (src/pages/ActiveRoomPage.tsx)**
- Room validation and loading states
- Card-based layout patterns
- Room header with copy functionality structure
- Error handling and navigation patterns

**Database Queries (src/lib/supabase/queries.ts)**
- All necessary query functions already implemented: createStory, setActiveStory, getActiveStory, submitVote, revealVotes, getStoryVotes, getActiveParticipants
- Error handling patterns with DatabaseError class
- TypeScript typing with Tables<> helper

**Subscription Patterns (src/lib/supabase/subscriptions.example.ts)**
- Pattern 5 (Combined Room Data) for efficient multi-table subscriptions
- Subscription cleanup patterns for useEffect
- Throttling patterns for high-frequency updates
- Type-safe payload handling

**Schemas (src/lib/schemas.ts)**
- Validation patterns with zod for forms
- Trimming and length constraints
- Error message standards

**Utility Functions (src/lib/utils.ts)**
- cn() for conditional className merging
- localStorage helpers: getParticipantId(), getParticipantName()
- Existing patterns for local state management

**shadcn/ui Components Available**
- Button: /src/components/ui/button.tsx
- Card: /src/components/ui/card.tsx
- Input: /src/components/ui/input.tsx
- Label: /src/components/ui/label.tsx
- Badge: /src/components/ui/badge.tsx
- Dialog: /src/components/ui/dialog.tsx (if needed for confirmations)

## Out of Scope
- Session history or story list - results disappear when cleared
- Vote export functionality - no download or copy of results
- Auto-reveal when all participants vote - manual reveal only
- Re-voting after reveal - locked after reveal, use "Next Story" instead
- Vote timers or countdown - no time pressure features
- Sentiment emoji indicators - future roadmap item #8
- Discussion chat or comments - not in this iteration
- Leader handoff during active story - leader is fixed for story lifecycle
- Participant kick/remove controls - not in MVP
- Story editing after creation - title/description locked once created
- Vote anonymization option - votes always show participant names after reveal
