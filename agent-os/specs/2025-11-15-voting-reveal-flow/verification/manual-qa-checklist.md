# Manual QA Checklist - Voting & Reveal Flow

## Test Environment Setup
- [ ] Start local development server: `npm run dev`
- [ ] Open browser (Chrome recommended for testing)
- [ ] Ensure Supabase connection is working
- [ ] Clear localStorage before each test run for clean state

## Test 1: Room Creation and Leader View
**Scenario:** Leader creates a room and sees the story creation form

### Steps:
1. [ ] Navigate to landing page
2. [ ] Click "Create Room" button
3. [ ] Enter participant name
4. [ ] Select "Fibonacci" point scale
5. [ ] Submit form
6. [ ] Verify redirected to active room page

### Expected Results:
- [ ] Room header displays with room name and code
- [ ] "Create a Story" heading visible
- [ ] Story form visible with title and description fields
- [ ] No voting buttons visible (no active story yet)

---

## Test 2: Participant Joins Room (Non-Leader)
**Scenario:** Second participant joins the same room

### Steps:
1. [ ] Copy room link from leader's view (click "Copy Link" button)
2. [ ] Open new incognito/private browser window
3. [ ] Paste room URL
4. [ ] Enter different participant name
5. [ ] Click "Join Room"

### Expected Results:
- [ ] Room header displays same room name and code
- [ ] Message "Waiting for leader to start voting" visible
- [ ] NO story form visible (participant is not leader)
- [ ] NO voting buttons visible yet

---

## Test 3: Leader Creates Story
**Scenario:** Leader creates a story to start voting

### Steps (in leader's window):
1. [ ] Enter story title: "Add login feature"
2. [ ] Enter description (optional): "Users need authentication"
3. [ ] Click "Start Voting" button

### Expected Results (Leader):
- [ ] Story form disappears
- [ ] Story details card appears with title and description
- [ ] Participant status shows 2 participants (leader + participant)
- [ ] Both participants show as "not voted" (empty circle icon)
- [ ] Voting buttons grid visible (1, 2, 3, 5, 8, 13, 21, ?)
- [ ] "Reveal Votes" button visible (leader only)

### Expected Results (Participant):
- [ ] Waiting message disappears
- [ ] Story details card appears with same title and description
- [ ] Participant status shows 2 participants
- [ ] Voting buttons grid visible
- [ ] NO "Reveal Votes" button visible (not leader)

---

## Test 4: Participants Submit Votes
**Scenario:** Both leader and participant vote on the story

### Steps (Leader window):
1. [ ] Click voting button "5"
2. [ ] Verify button highlights immediately

### Expected Results (Leader):
- [ ] Button "5" shows selected state (default variant, ring)
- [ ] Leader's name in participant status shows checkmark icon
- [ ] Participant still shows empty circle (hasn't voted yet)

### Steps (Participant window):
1. [ ] Click voting button "8"
2. [ ] Verify button highlights immediately

### Expected Results (Participant):
- [ ] Button "8" shows selected state
- [ ] Participant's name shows checkmark icon
- [ ] Leader's name also shows checkmark icon (real-time update)

### Expected Results (Leader window - real-time):
- [ ] Participant's status updates to show checkmark icon
- [ ] BOTH participants now show as "voted"

---

## Test 5: Vote Privacy Verification (CRITICAL)
**Scenario:** Verify votes are hidden until revealed

### Verification (Before Reveal):
**Leader's view:**
- [ ] Can see own vote value (5) in voting buttons
- [ ] CANNOT see participant's vote value anywhere
- [ ] Participant status shows checkmark but NO point value

**Participant's view:**
- [ ] Can see own vote value (8) in voting buttons
- [ ] CANNOT see leader's vote value anywhere
- [ ] Leader status shows checkmark but NO point value

### Critical Security Check:
- [ ] Open browser DevTools > Network tab
- [ ] Check WebSocket/real-time messages
- [ ] Verify unrevealed votes from other participants are NOT in client data
- [ ] Only own unrevealed vote should be visible in client state

---

## Test 6: Change Vote Before Reveal
**Scenario:** Participant changes their vote before reveal

### Steps (Participant window):
1. [ ] Click voting button "13" (change from "8")
2. [ ] Verify button updates immediately

### Expected Results (Participant):
- [ ] Button "13" now selected
- [ ] Button "8" no longer selected
- [ ] Still shows checkmark (has voted)

### Expected Results (Leader):
- [ ] Participant still shows checkmark
- [ ] NO indication that vote changed (still hidden)

---

## Test 7: Leader Reveals Votes
**Scenario:** Leader reveals all votes to show results

### Steps (Leader window):
1. [ ] Click "Reveal Votes" button
2. [ ] Wait for reveal to complete

### Expected Results (Leader):
- [ ] "Reveal Votes" button disappears
- [ ] Results section appears with heading "Results"
- [ ] Consensus card displays prominently (likely "9" as average of 5 and 13)
- [ ] Individual vote cards show:
   - Leader: 5 points (with green or yellow border)
   - Participant: 13 points (with green or yellow border)
- [ ] Votes sorted by value (5 first, then 13)
- [ ] Consensus highlighting applied (within 1 step = green, outlier = yellow)
- [ ] "Next Story" button visible
- [ ] Voting buttons disabled (can't change vote)

### Expected Results (Participant - real-time):
- [ ] Results appear automatically (no button press needed)
- [ ] Same consensus and vote cards visible
- [ ] Can see leader's vote value (5) in results
- [ ] Own vote (13) visible in results
- [ ] NO "Next Story" button visible (not leader)
- [ ] Voting buttons disabled

---

## Test 8: Participant Status After Reveal
**Scenario:** Verify participant status shows vote values after reveal

### Expected Results (Both windows):
- [ ] Leader name shows with vote value: "Leader Name (5)"
- [ ] Participant name shows with vote value: "Participant Name (13)"
- [ ] Both still show checkmark icons

---

## Test 9: Leader Starts Next Story
**Scenario:** Leader clears current story to start a new one

### Steps (Leader window):
1. [ ] Click "Next Story" button
2. [ ] Wait for transition

### Expected Results (Leader):
- [ ] Results disappear
- [ ] Story creation form reappears
- [ ] Previous story and votes no longer visible
- [ ] Participant status clears (no votes)
- [ ] Ready to create new story

### Expected Results (Participant - real-time):
- [ ] Results disappear
- [ ] "Waiting for leader to start voting" message reappears
- [ ] Previous story and votes no longer visible

---

## Test 10: Second Story Full Cycle
**Scenario:** Complete another voting cycle with different votes

### Steps:
1. [ ] Leader creates story: "Refactor user service"
2. [ ] Leader votes: "2"
3. [ ] Participant votes: "3"
4. [ ] Verify real-time status updates
5. [ ] Leader reveals votes
6. [ ] Verify consensus calculation (should be "2" or "3" average)
7. [ ] Verify both votes visible in results
8. [ ] Leader clicks "Next Story"

### Expected Results:
- [ ] All steps complete successfully
- [ ] Real-time updates work throughout
- [ ] Consensus calculated correctly for new votes
- [ ] Form reappears after "Next Story"

---

## Test 11: T-shirt Point Scale
**Scenario:** Test with T-shirt sizing instead of Fibonacci

### Steps:
1. [ ] Create new room with "T-shirt" point scale
2. [ ] Join as second participant
3. [ ] Leader creates story
4. [ ] Verify voting buttons show: XS, S, M, L, XL, XXL, ?

### Expected Results:
- [ ] Voting buttons display T-shirt sizes
- [ ] Voting works same as Fibonacci
- [ ] After reveal, consensus shows mode (most common value)
- [ ] If votes are S and M, consensus should pick one based on frequency

---

## Test 12: Question Mark Vote (Pass/Unknown)
**Scenario:** Participant votes "?" to pass

### Steps:
1. [ ] Create story
2. [ ] Leader votes: "5"
3. [ ] Participant votes: "?"
4. [ ] Leader reveals votes

### Expected Results:
- [ ] Both votes visible after reveal
- [ ] "?" vote displays correctly
- [ ] Consensus calculation excludes "?" vote
- [ ] Consensus shows based only on valid numeric votes

---

## Test 13: All Participants Vote "?"
**Scenario:** Edge case where everyone passes

### Steps:
1. [ ] Create story
2. [ ] All participants vote: "?"
3. [ ] Leader reveals votes

### Expected Results:
- [ ] Results display
- [ ] Message shows "No valid votes" or similar
- [ ] No consensus calculated (or displays "—")
- [ ] Individual "?" votes still shown

---

## Test 14: Real-time Update Verification
**Scenario:** Verify real-time sync across multiple participants

### Setup:
1. [ ] Open 3 browser windows (1 leader + 2 participants)
2. [ ] All join same room

### Test Sequence:
1. [ ] Leader creates story
   - [ ] Verify story appears in ALL windows immediately
2. [ ] Participant 1 votes
   - [ ] Verify checkmark appears in ALL windows
3. [ ] Participant 2 votes
   - [ ] Verify checkmark appears in ALL windows
4. [ ] Leader votes
   - [ ] Verify all 3 participants show voted status
5. [ ] Leader reveals
   - [ ] Verify results appear in ALL windows simultaneously

---

## Test 15: Mobile Responsive Design
**Scenario:** Verify UI works on mobile viewport

### Steps:
1. [ ] Open browser DevTools (F12)
2. [ ] Toggle device emulation
3. [ ] Set to iPhone SE (375px width)
4. [ ] Complete full voting flow

### Expected Results:
- [ ] Story form full-width on mobile
- [ ] Voting buttons grid wraps properly (4 columns on mobile)
- [ ] Participant status badges wrap on small screen
- [ ] Results cards stack vertically
- [ ] "Copy Link" button full-width on mobile
- [ ] No horizontal scrolling
- [ ] All text readable without zooming

---

## Test 16: Tablet Responsive Design
**Scenario:** Verify UI works on tablet viewport

### Steps:
1. [ ] Set DevTools to iPad (768px width)
2. [ ] Complete full voting flow

### Expected Results:
- [ ] Voting buttons show 8 columns (sm:grid-cols-8)
- [ ] Vote result cards show 3 columns (sm:grid-cols-3)
- [ ] Layout comfortable and readable
- [ ] Buttons appropriately sized

---

## Test 17: Error Handling - Network Failure During Vote
**Scenario:** Simulate network error when submitting vote

### Steps:
1. [ ] Open browser DevTools > Network tab
2. [ ] Set network throttling to "Offline"
3. [ ] Try to submit vote
4. [ ] Re-enable network

### Expected Results:
- [ ] Toast error message appears: "Failed to submit vote"
- [ ] Vote button not selected (rollback)
- [ ] Can retry vote after network restored
- [ ] No crash or broken state

---

## Test 18: Error Handling - Network Failure During Reveal
**Scenario:** Simulate network error when revealing votes

### Steps:
1. [ ] Submit votes
2. [ ] Open DevTools > Network tab
3. [ ] Set throttling to "Offline"
4. [ ] Leader clicks "Reveal Votes"
5. [ ] Re-enable network

### Expected Results:
- [ ] Toast error message appears
- [ ] Button stops loading state
- [ ] Can retry reveal after network restored
- [ ] Votes remain unrevealed until successful

---

## Test 19: Accessibility - Keyboard Navigation
**Scenario:** Verify keyboard-only navigation works

### Steps:
1. [ ] Navigate to active room page
2. [ ] Use Tab key to navigate
3. [ ] Use Enter/Space to activate buttons
4. [ ] Test voting buttons
5. [ ] Test "Reveal Votes" button
6. [ ] Test "Next Story" button

### Expected Results:
- [ ] All interactive elements focusable with Tab
- [ ] Focus indicators visible (outline/ring)
- [ ] All buttons activatable with Enter/Space
- [ ] No keyboard traps
- [ ] Logical tab order

---

## Test 20: Accessibility - Screen Reader Labels
**Scenario:** Verify elements have proper ARIA labels

### Steps:
1. [ ] Open browser DevTools > Elements
2. [ ] Inspect voting buttons
3. [ ] Inspect participant status badges
4. [ ] Check button labels

### Expected Results:
- [ ] Buttons have descriptive text or aria-label
- [ ] Icons have appropriate aria-hidden or aria-label
- [ ] Form inputs have associated labels
- [ ] Error messages associated with inputs (aria-describedby)

---

## Test 21: Edge Case - Participant Not in Room
**Scenario:** localStorage participant_id doesn't match any participant

### Steps:
1. [ ] Create room
2. [ ] Note room code
3. [ ] Clear localStorage
4. [ ] Navigate directly to /room/[ROOMCODE] without joining

### Expected Results:
- [ ] Redirects to home page
- [ ] Error toast: "You are not a member of this room. Please join first."
- [ ] No crash or broken state

---

## Test 22: Edge Case - Invalid Room Code
**Scenario:** Navigate to room with invalid code format

### Steps:
1. [ ] Navigate to /room/ABC123 (too short)
2. [ ] Navigate to /room/ABCD1234EXTRA (too long)
3. [ ] Navigate to /room/ABCD@#$% (special characters)

### Expected Results:
- [ ] Redirects to home page
- [ ] Error message: "Invalid room code format"
- [ ] No crash

---

## Test 23: Edge Case - Room Not Found
**Scenario:** Navigate to room with valid format but doesn't exist

### Steps:
1. [ ] Navigate to /room/AAAAAAAA (8 valid chars, but room doesn't exist)

### Expected Results:
- [ ] Redirects to home page
- [ ] Error message: "Room not found"
- [ ] No crash

---

## Test 24: Subscription Reconnection
**Scenario:** Verify subscription recovers after temporary disconnect

### Steps:
1. [ ] Join room in 2 windows
2. [ ] Create story and submit votes
3. [ ] Disable network in one window for 10 seconds
4. [ ] Re-enable network
5. [ ] Leader reveals votes

### Expected Results:
- [ ] Reconnected window catches up
- [ ] Results appear in both windows
- [ ] No data loss
- [ ] Real-time sync resumes

---

## Test 25: Performance - Many Participants
**Scenario:** Test with maximum expected participants

### Setup:
1. [ ] Open 10+ browser windows
2. [ ] All join same room
3. [ ] Create story
4. [ ] All participants vote

### Expected Results:
- [ ] Participant status renders all participants
- [ ] No lag when updating status
- [ ] All votes appear in results
- [ ] Vote cards render in reasonable time
- [ ] No browser performance issues

---

## Test 26: Copy Room Link Functionality
**Scenario:** Verify copy link button works

### Steps:
1. [ ] Create room
2. [ ] Click "Copy Link" button
3. [ ] Paste into new browser tab

### Expected Results:
- [ ] Success toast: "Link copied to clipboard!"
- [ ] Pasted URL format: http://localhost:5173/join/[ROOMCODE]
- [ ] Clicking pasted link navigates to join flow
- [ ] Room code pre-filled

---

## Test Coverage Summary

### Critical Paths (Must Pass):
- Test 1-10: Core voting workflow
- Test 5: Vote privacy (CRITICAL SECURITY)
- Test 13-14: Real-time updates
- Test 17-18: Error handling

### Important Paths (Should Pass):
- Test 11-12: Alternative point scales and edge cases
- Test 15-16: Responsive design
- Test 19-20: Accessibility
- Test 21-23: Edge cases and error scenarios

### Nice to Have (Can defer):
- Test 24-25: Subscription reconnection and performance
- Test 26: Copy functionality (UI enhancement)

---

## Test Execution Notes

**Date Tested:** _______________

**Tester Name:** _______________

**Browser/Version:** _______________

**Test Results:**
- [ ] All Critical tests passed
- [ ] All Important tests passed
- [ ] Bugs found: _______________

**Bugs/Issues Discovered:**
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Sign-off:**
- [ ] Feature ready for production
- [ ] Feature needs bug fixes before production
