# Manual Testing Guide: Account Page Feature

## Overview
This guide covers manual testing requirements for the account page feature, including cross-device magic link verification, responsive design validation, and account linking verification.

## Test Summary
- **Automated Tests**: 27 passing tests
  - 4 useAuth hook tests
  - 7 profile query tests
  - 5 Header component tests
  - 5 ProfilePage component tests
  - 6 integration tests
- **Manual Tests**: 3 test scenarios (documented below)

---

## Manual Test 1: Cross-Device Magic Link Verification

**Purpose**: Verify that magic links work correctly across different browsers/devices, and that authentication is device-specific.

**Prerequisites**:
- Access to two different browsers (e.g., Chrome and Firefox) or devices
- Valid email address

**Steps**:
1. **Send Magic Link (Browser/Device 1)**:
   - Open the application in Browser 1
   - Click the account button in the header (log-in icon)
   - Enter name: "Test User"
   - Enter valid email address
   - Click "Send Verification Link"
   - Verify "Check your email" message appears

2. **Open Magic Link (Browser/Device 2)**:
   - Check email inbox for magic link
   - Copy the magic link URL
   - Open Browser 2 (or different device)
   - Paste and navigate to the magic link URL
   - Verify browser 2 redirects to /profile
   - Verify "Email verified successfully!" toast appears
   - Verify profile page shows authenticated view with email displayed

3. **Verify Device Isolation**:
   - Return to Browser 1 (where magic link was sent)
   - Refresh the page
   - Verify Browser 1 is still unauthenticated (shows log-in icon)
   - Click account button -> verify shows account creation form
   - Return to Browser 2
   - Verify Browser 2 remains authenticated

**Expected Results**:
- Magic link authenticates user ONLY on the device/browser where link is clicked
- Browser 1 remains unauthenticated
- Browser 2 shows authenticated profile view
- Email displayed correctly in read-only field
- No localStorage conflicts between devices

---

## Manual Test 2: Responsive Design Validation

**Purpose**: Verify that the header and profile page are responsive across mobile, tablet, and desktop breakpoints.

**Prerequisites**:
- Browser with responsive design tools (Chrome DevTools, Firefox Responsive Design Mode)

**Steps**:

### Mobile View (320px - 640px)
1. Set viewport to 320px width
2. **Header Validation**:
   - Account button visible and centered-right
   - Avatar size: small (h-8 w-8)
   - Icon size: 16px
   - Click area: minimum 44x44px (touch-friendly)
   - No overflow or horizontal scroll

3. **Profile Page Validation**:
   - Card full-width with margins
   - Form inputs stack vertically
   - Button full-width
   - Text readable without zooming
   - No horizontal scroll

### Tablet View (641px - 1024px)
1. Set viewport to 768px width
2. **Header Validation**:
   - Account button size: medium (h-9 w-9)
   - Icon size: 18px
   - Spacing appropriate

3. **Profile Page Validation**:
   - Card centered with max-width
   - Form maintains readable width
   - Button remains full-width or centered

### Desktop View (1025px+)
1. Set viewport to 1440px width
2. **Header Validation**:
   - Account button size: default (h-10 w-10)
   - Icon size: 20px
   - Hover state visible (background transition)

3. **Profile Page Validation**:
   - Card centered with max-width-md
   - Form elements properly spaced
   - Button appropriately sized

**Expected Results**:
- All breakpoints display correctly without layout issues
- Touch targets meet 44x44px minimum on mobile
- Text remains readable at all sizes
- No horizontal overflow or scroll
- Transitions smooth on hover (desktop)

---

## Manual Test 3: Account Linking with Existing Participation

**Purpose**: Verify that anonymous participation history is correctly linked to authenticated accounts.

**Prerequisites**:
- Clean browser with no existing localStorage
- Access to Supabase database to verify participant records

**Steps**:

1. **Create Anonymous Participation**:
   - Open application in incognito/private browsing mode
   - Navigate to home page
   - Click "Create Room" button
   - Enter room name: "Test Room"
   - Select point scale: Fibonacci
   - Enter participant name: "Anonymous User"
   - Note the participant_id from localStorage:
     - Open DevTools -> Application -> Local Storage
     - Find key: `participant_id`
     - Copy the UUID value (e.g., "abc-123-def-456")
   - Participate in the room (create stories, vote, etc.)

2. **Create Account and Link**:
   - While still in the same browser session
   - Click account button (log-in icon) in header
   - Verify name field pre-filled with "Anonymous User"
   - Enter valid email address
   - Click "Send Verification Link"
   - Check email and click magic link
   - Verify redirects to /profile
   - Verify "Email verified successfully!" toast appears

3. **Verify Account Linking in Database**:
   - Open Supabase dashboard
   - Navigate to Table Editor -> participants table
   - Filter by the participant_id noted in step 1
   - Verify `user_id` column now contains the authenticated user's ID
   - Verify all participation records linked (multiple rows if participated in multiple rooms)

4. **Verify Future Participation Uses Authenticated Name**:
   - Return to application (still authenticated)
   - Join a NEW room or create a NEW room
   - Verify participant name automatically uses profile display_name
   - Check participants table in Supabase
   - Verify new participant record has:
     - `user_id`: authenticated user's ID
     - `name`: profile display_name from profiles table

5. **Update Profile Name and Test Propagation**:
   - Navigate to /profile page
   - Change name from "Anonymous User" to "Updated Name"
   - Click "Save Changes"
   - Verify success toast appears
   - Join another NEW room
   - Verify new participant records use "Updated Name"
   - Verify OLD participant records still show "Anonymous User" (no retroactive update)

**Expected Results**:
- Anonymous participant records correctly linked to user_id after authentication
- Profile created with correct name from account creation form
- Future participation uses authenticated profile name
- Past participation preserves original name (no retroactive updates)
- localStorage `participant_name` updates when profile name changes
- All linking happens silently without user prompts

---

## Test Environment Notes

**Browser Compatibility**:
- Test in Chrome/Edge (primary)
- Test in Firefox (cross-browser validation)
- Test in Safari if available (WebKit validation)

**Database Access**:
- Supabase Dashboard: https://app.supabase.com
- Table Editor -> participants table for verification
- Table Editor -> profiles table for profile verification

**Debugging Tips**:
- Use browser DevTools -> Application -> Local Storage to inspect:
  - `participant_id`: UUID for anonymous identification
  - `participant_name`: Current participant name
  - `pending_profile_name`: Temporary storage during magic link flow
- Use browser DevTools -> Console to view debug logs (prefixed with component name)
- Check Network tab for Supabase API calls and responses

---

## Verification Checklist

After completing all manual tests, verify:

- [ ] Cross-device magic link works correctly
- [ ] Authentication is device-specific (not shared across browsers)
- [ ] Header responsive on mobile (320px), tablet (768px), desktop (1024px+)
- [ ] Profile page responsive across all breakpoints
- [ ] Touch targets meet 44x44px minimum on mobile
- [ ] Account linking updates participant records with user_id
- [ ] Profile created with correct name after magic link verification
- [ ] Future participation uses authenticated profile name
- [ ] Past participation preserves original names
- [ ] Profile name updates propagate to localStorage
- [ ] All workflows complete without errors

---

## Issues Found

Document any issues discovered during manual testing:

| Issue | Severity | Steps to Reproduce | Expected | Actual | Status |
|-------|----------|-------------------|----------|--------|--------|
| (none yet) | - | - | - | - | - |

---

## Sign-Off

- [ ] All manual tests completed
- [ ] All automated tests passing (27/27)
- [ ] No critical issues found
- [ ] Ready for deployment

**Tester**: ________________
**Date**: ________________
**Version**: feature/account-page
