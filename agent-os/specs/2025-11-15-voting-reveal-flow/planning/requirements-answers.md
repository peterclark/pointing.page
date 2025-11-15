# Requirements Answers for Voting & Reveal Flow

## Question 1 - Story Creation & Management
**Decision:** Ephemeral flow for MVP.

Leader adds story title (required) + optional description through a simple form. After voting and reveal, there's a "Next Story" button that clears everything and shows the form again. No queue/history for MVP - keep it simple for the first iteration.

## Question 2 - Voting Interface Design
**Decision:** Large touch-friendly buttons in horizontal wrap layout.

Similar to the point scale selection in room creation, but showing the actual values. Include a "?" option for "Pass/Don't Know".
- **Fibonacci scale:** 1, 2, 3, 5, 8, 13, 21, ?
- **T-shirt scale:** XS, S, M, L, XL, XXL, ?

## Question 3 - Vote Visibility to Self
**Decision:** Yes, show own vote immediately.

Participants should see their own vote immediately after selecting (visually highlighted button), and they can change it before reveal. This gives confidence that their vote was registered.

## Question 4 - Reveal Mechanism
**Decision:** Manual reveal only.

Single "Reveal Votes" button visible only to leader. No auto-reveal for MVP. Keep it simple and give leader full control. They can reveal even if not everyone has voted.

## Question 5 - Real-time Voting Status
**Decision:** Participant list with status indicators.

Display as a compact list/chips showing: participant name + checkmark icon if voted (or empty circle if not voted). Place this below the story description and above the voting buttons.

Format: "👤 Alice ✓ | 👤 Bob ✓ | 👤 Carol ○"

## Question 6 - Vote Results Display
**Decision:** Simple list with consensus highlighting.

After reveal, show:
- Each participant name with their point value in a card/list format
- The average/consensus at the top (calculate average for Fibonacci, show mode for T-shirt)
- Simple visual highlighting: green border for consensus votes (within 1 step), yellow for outliers
- No distribution chart for MVP - just the list

## Question 7 - Multiple Stories Workflow
**Decision:** No session history.

Results disappear when cleared - no session history for MVP. Leader clicks "Next Story" which resets the voting interface and shows the story creation form again. This keeps the scope tight.

## Question 8 - Vote Changes Before Reveal
**Decision:** Unlimited changes before reveal, locked after.

Yes, participants can change their vote unlimited times before reveal. Once revealed, votes are locked - no re-vote option for MVP. If the team wants to vote again, leader can use "Next Story" to start fresh.

## Question 9 - Leader Controls
**Decision:** Minimal controls for MVP.

Leader should have:
1. Reveal Votes button (works anytime)
2. Next Story button (appears after reveal)

No kick participants or skip story for MVP - keep it minimal.

## Question 10 - Scope Boundaries

### EXCLUDE from this iteration:
- Sentiment emoji indicators (roadmap #8)
- Discussion timers (roadmap #13)
- Session history/export (roadmap #10)
- Leader handoff (roadmap #12)
- Participant limits (roadmap #9)

### INCLUDE only:
- Story creation by leader
- Vote casting by all participants
- Vote reveal by leader
- Results display
- Next story flow

## Existing Code Reuse

Reference these existing patterns:
- `src/components/CreateRoomDialog.tsx` - Form patterns with react-hook-form + zod, button layouts, dialog structure
- `src/pages/ActiveRoomPage.tsx` - Room page layout, loading states, error handling
- `src/lib/supabase/database.ts` - Database interaction patterns with Supabase
- `src/lib/supabase/subscriptions.example.ts` - Real-time subscription examples (though not currently used)
- Point scale button layout from CreateRoomDialog can be reused for voting buttons

## Visual Assets

No design mockups available. Use shadcn/ui components with the existing "new-york" style to match the room creation UI aesthetic. Voting buttons should be similar in style to the point scale selection buttons (large, square, with good touch targets).

## Additional Technical Context

- The database schema already has a `stories` table with `reveal_at` timestamp column - use this to track reveal state (null = not revealed, timestamp = revealed at that time)
- Current participant is tracked via localStorage `participant_id`
- Room leader is identified by `rooms.created_by` column matching `participants.user_id` (or first participant for anonymous rooms)
- Real-time updates will be critical - use Supabase subscriptions to update the UI when votes come in or reveal happens
