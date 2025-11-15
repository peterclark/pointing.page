# Manual QA Checklist - Room Creation & Management

**Feature:** Room Creation & Management
**Date:** 2025-11-13
**Test Environment:** Development (localhost)

## Checklist Status

### Core Functionality

- [ ] **Create room with default generated name**
  - Navigate to landing page (/)
  - Click "Create Room" button
  - Verify room name is auto-generated in "Adjective-Noun" format
  - Enter participant name
  - Select Fibonacci or T-shirt scale
  - Verify navigation to /room/:roomCode
  - **Expected:** Room created successfully, user lands on active room page

- [ ] **Create room with custom edited name**
  - Open Create Room dialog
  - Edit the pre-populated room name to custom text (e.g., "Sprint Planning")
  - Enter participant name
  - Select point scale
  - **Expected:** Room created with custom name

- [ ] **Verify room code displays in correct format**
  - After creating room, check room code display
  - **Expected:** Code shown as "ABCD-1234" format (4 chars, hyphen, 4 chars, all uppercase)

- [ ] **Copy room link to clipboard, paste in browser**
  - Click "Copy Link" button on active room page
  - Paste into browser address bar or new tab
  - **Expected:** Link format is http://localhost:5173/join/ROOMCODE
  - **Expected:** Success toast appears: "Link copied to clipboard!"

- [ ] **Join room via /join/:roomCode URL with valid code**
  - Create a room
  - Copy the join link
  - Open link in new incognito/private browser window
  - **Expected:** Automatically redirects to /room/:roomCode
  - **Expected:** Room code displayed correctly on page

- [ ] **Try joining with invalid room code (verify error toast)**
  - Navigate to /join/INVALID in browser
  - **Expected:** Redirect to home page (/)
  - **Expected:** Error toast: "Invalid room code format" or "Room not found"

- [ ] **Refresh active room page (verify state persists)**
  - While on active room page, press F5 or Cmd+R to refresh
  - **Expected:** Page reloads successfully, room code still displayed

- [ ] **Clear localStorage, create new room (verify new participant_id)**
  - Open browser DevTools > Application > Local Storage
  - Clear all localStorage items
  - Create a new room
  - Check localStorage again
  - **Expected:** New participant_id generated (UUID format)
  - **Expected:** participant_name saved to localStorage

### UI/UX Validation

- [ ] **Test on mobile device or responsive mode**
  - Open browser DevTools, toggle device toolbar
  - Test at 375px width (iPhone SE size)
  - Test at 768px width (iPad size)
  - **Expected:** Dialog fits screen, buttons are tappable, no horizontal scroll

- [ ] **Test dialog keyboard navigation (tab, enter, escape)**
  - Open Create Room dialog
  - Press Tab to move through form fields
  - Press Escape to close dialog
  - Re-open, press Enter on point scale button after entering name
  - **Expected:** Tab order is logical, Escape closes dialog, Enter submits

### Edge Cases & Error Handling

- [ ] **Point scale buttons disabled until name entered**
  - Open Create Room dialog
  - Verify Fibonacci and T-shirt buttons are disabled (grayed out)
  - Type into participant name field
  - **Expected:** Buttons become enabled as soon as at least one character is entered

- [ ] **Form validation: empty participant name**
  - Try to click point scale button with empty participant name
  - **Expected:** Buttons remain disabled, cannot submit

- [ ] **Form validation: too long room name**
  - Edit room name to 101+ characters
  - Attempt to submit
  - **Expected:** Validation error displayed (if applicable)

- [ ] **Network error handling**
  - (Requires simulating network failure - optional)
  - Disconnect from internet or use DevTools Network throttling
  - Attempt to create room
  - **Expected:** Error toast: "Failed to create room. Please try again."

- [ ] **Clipboard API blocked**
  - (May require special browser settings)
  - Click Copy Link button when clipboard access is denied
  - **Expected:** Error toast: "Failed to copy. Please try manually."

### localStorage Persistence

- [ ] **Participant name pre-fills on return visit**
  - Create a room with name "Alice"
  - Close browser tab
  - Navigate back to landing page
  - Open Create Room dialog
  - **Expected:** Participant name field shows "Alice"

- [ ] **Participant ID persists across sessions**
  - Check localStorage for participant_id
  - Note the UUID value
  - Close and reopen browser
  - Check localStorage again
  - **Expected:** Same participant_id present

### Cross-Browser Testing (Optional)

- [ ] **Chrome/Chromium**
  - Test all core functionality
  - **Expected:** All features work correctly

- [ ] **Firefox**
  - Test all core functionality
  - **Expected:** All features work correctly

- [ ] **Safari (if on macOS)**
  - Test all core functionality
  - **Expected:** All features work correctly

## Notes

- Any issues discovered during testing should be documented below
- Screenshots of critical workflows should be saved to `verification/screenshots/` directory
- If a test fails, document the exact steps to reproduce

## Issues Found

(List any bugs or issues discovered during manual testing)

---

**Completed By:** [Name]
**Date Completed:** [Date]
**Build Version:** Development (commit: [hash])
