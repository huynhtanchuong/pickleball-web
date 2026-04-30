# Task 5: Start Tournament Function - Test Plan

## Test Objective
Verify that the `startTournament()` function correctly validates prerequisites, updates tournament status to "ongoing", and updates the UI accordingly.

## Prerequisites
1. Admin panel is accessible at `admin.html`
2. Admin password is known (default: `admin123`)
3. At least one tournament with status "upcoming" exists
4. Test data includes:
   - Tournament with 4+ participants
   - Tournament with generated teams
   - Tournament with generated matches

## Implementation Verification

### Code Review Checklist
- ✅ Function signature: `async function startTournament()`
- ✅ Gets active tournament ID using `tournamentManager.getActiveTournamentId()`
- ✅ Validates tournament exists
- ✅ Validates tournament status is "upcoming"
- ✅ Validates participants count >= 4
- ✅ Validates teams count >= 1
- ✅ Validates matches count >= 1
- ✅ Shows confirmation dialog with tournament summary
- ✅ Calls `tournamentManager.updateStatus(tournamentId, 'ongoing')`
- ✅ Calls `loadTournamentSelector()` to refresh UI
- ✅ Calls `fetchMatches()` to reload matches
- ✅ Error handling with try-catch
- ✅ User-friendly error messages

## Test Cases

### Test Case 1: Successful Tournament Start
**Preconditions:**
- Tournament status: "upcoming"
- Participants: 8 members
- Teams: 8 teams
- Matches: 28 matches (round-robin)

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Verify status shows "Sắp diễn ra"
4. Click "▶️ Bắt Đầu Giải Đấu" button
5. Read confirmation dialog
6. Click "OK" to confirm

**Expected Results:**
- ✅ Confirmation dialog shows:
  - Tournament name
  - "8 thành viên"
  - "8 đội"
  - "28 trận đấu"
  - Warning message about inability to modify
- ✅ After confirmation:
  - Success message: "✓ Giải đấu đã bắt đầu!"
  - Tournament status updates to "Đang diễn ra"
  - Tournament selector shows updated status
  - Registration buttons (Thêm Thành viên, Tạo Đội, Tạo Trận Đấu, Bắt Đầu) are hidden
  - Reset button appears
  - No JavaScript errors in console

### Test Case 2: Cancel Tournament Start
**Preconditions:**
- Tournament status: "upcoming"
- Participants: 4+ members
- Teams: 1+ teams
- Matches: 1+ matches

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "▶️ Bắt Đầu Giải Đấu" button
4. Read confirmation dialog
5. Click "Cancel" to abort

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ After canceling:
  - Tournament status remains "Sắp diễn ra"
  - No changes to database
  - UI remains unchanged
  - No error messages

### Test Case 3: Validation - No Tournament Selected
**Preconditions:**
- No active tournament selected (clear localStorage)

**Steps:**
1. Login to admin panel
2. Clear active tournament ID from localStorage
3. Click "▶️ Bắt Đầu Giải Đấu" button

**Expected Results:**
- ✅ Alert message: "Vui lòng chọn giải đấu"
- ✅ No confirmation dialog appears
- ✅ No database changes

### Test Case 4: Validation - Insufficient Participants
**Preconditions:**
- Tournament status: "upcoming"
- Participants: 2 members (less than minimum 4)
- Teams: 1 team
- Matches: 0 matches

**Steps:**
1. Login to admin panel
2. Create a tournament with only 2 participants
3. Click "▶️ Bắt Đầu Giải Đấu" button

**Expected Results:**
- ✅ Alert message: "Cần ít nhất 4 thành viên để bắt đầu giải đấu"
- ✅ No confirmation dialog appears
- ✅ Tournament status remains "upcoming"

### Test Case 5: Validation - No Teams
**Preconditions:**
- Tournament status: "upcoming"
- Participants: 8 members
- Teams: 0 teams (not generated yet)
- Matches: 0 matches

**Steps:**
1. Login to admin panel
2. Create a tournament with participants but no teams
3. Click "▶️ Bắt Đầu Giải Đấu" button

**Expected Results:**
- ✅ Alert message: "Vui lòng tạo đội trước khi bắt đầu giải đấu"
- ✅ No confirmation dialog appears
- ✅ Tournament status remains "upcoming"

### Test Case 6: Validation - No Matches
**Preconditions:**
- Tournament status: "upcoming"
- Participants: 8 members
- Teams: 8 teams
- Matches: 0 matches (not generated yet)

**Steps:**
1. Login to admin panel
2. Create a tournament with participants and teams but no matches
3. Click "▶️ Bắt Đầu Giải Đấu" button

**Expected Results:**
- ✅ Alert message: "Vui lòng tạo trận đấu trước khi bắt đầu giải đấu"
- ✅ No confirmation dialog appears
- ✅ Tournament status remains "upcoming"

### Test Case 7: Validation - Already Started
**Preconditions:**
- Tournament status: "ongoing" (already started)

**Steps:**
1. Login to admin panel
2. Select a tournament with status "ongoing"
3. Manually call `startTournament()` from console (button should be hidden)

**Expected Results:**
- ✅ Alert message: "Giải đấu đã bắt đầu"
- ✅ No confirmation dialog appears
- ✅ Tournament status remains "ongoing"

### Test Case 8: UI Update - Button Visibility
**Preconditions:**
- Tournament status: "upcoming"
- All prerequisites met

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Verify buttons visible: Thêm Thành viên, Tạo Đội, Tạo Trận Đấu, Bắt Đầu
4. Click "▶️ Bắt Đầu Giải Đấu" and confirm
5. Wait for status update
6. Observe button changes

**Expected Results:**
- ✅ Before start: 4 buttons visible (Thêm Thành viên, Tạo Đội, Tạo Trận Đấu, Bắt Đầu)
- ✅ After start: 1 button visible (Reset Giải Đấu)
- ✅ Button transition is smooth
- ✅ No layout shift or flicker

### Test Case 9: Database Verification
**Preconditions:**
- Tournament status: "upcoming"
- All prerequisites met

**Steps:**
1. Login to admin panel
2. Open browser DevTools → Application → IndexedDB (or Supabase dashboard)
3. Note current tournament status in database
4. Click "▶️ Bắt Đầu Giải Đấu" and confirm
5. Refresh database view
6. Verify status field

**Expected Results:**
- ✅ Before: `status: "upcoming"`
- ✅ After: `status: "ongoing"`
- ✅ No other fields modified
- ✅ Participants, teams, and matches remain unchanged

### Test Case 10: Error Handling - Database Error
**Preconditions:**
- Tournament status: "upcoming"
- All prerequisites met
- Simulate database error (disconnect network or modify code)

**Steps:**
1. Login to admin panel
2. Disconnect network or inject error in `updateStatus()`
3. Click "▶️ Bắt Đầu Giải Đấu" and confirm
4. Observe error handling

**Expected Results:**
- ✅ Error message displayed: "❌ Lỗi: [error message]"
- ✅ Alert with detailed error information
- ✅ Tournament status remains "upcoming"
- ✅ UI remains functional
- ✅ Error logged to console

### Test Case 11: Multiple Tournaments
**Preconditions:**
- Multiple tournaments exist with different statuses

**Steps:**
1. Login to admin panel
2. Select Tournament A (upcoming) and start it
3. Switch to Tournament B (upcoming)
4. Verify Tournament B still shows start button
5. Start Tournament B
6. Switch back to Tournament A
7. Verify Tournament A shows reset button

**Expected Results:**
- ✅ Each tournament maintains its own status
- ✅ Starting one tournament doesn't affect others
- ✅ UI updates correctly when switching between tournaments
- ✅ No cross-tournament data corruption

### Test Case 12: Concurrent Admin Users (Supabase only)
**Preconditions:**
- Supabase backend enabled
- Two admin users logged in different browsers

**Steps:**
1. Admin 1: Login and select tournament
2. Admin 2: Login and select same tournament
3. Admin 1: Click "▶️ Bắt Đầu Giải Đấu" and confirm
4. Admin 2: Observe UI (should update via realtime subscription)
5. Admin 2: Try to click start button (should be hidden)

**Expected Results:**
- ✅ Admin 1 successfully starts tournament
- ✅ Admin 2's UI updates automatically (realtime)
- ✅ Admin 2 sees reset button instead of start button
- ✅ No race conditions or conflicts

## Test Results

| Test Case | Status | Date | Tester | Notes |
|-----------|--------|------|--------|-------|
| TC1: Successful Start | ⏳ Pending | | | |
| TC2: Cancel Start | ⏳ Pending | | | |
| TC3: No Tournament | ⏳ Pending | | | |
| TC4: Insufficient Participants | ⏳ Pending | | | |
| TC5: No Teams | ⏳ Pending | | | |
| TC6: No Matches | ⏳ Pending | | | |
| TC7: Already Started | ⏳ Pending | | | |
| TC8: Button Visibility | ⏳ Pending | | | |
| TC9: Database Verification | ⏳ Pending | | | |
| TC10: Error Handling | ⏳ Pending | | | |
| TC11: Multiple Tournaments | ⏳ Pending | | | |
| TC12: Concurrent Users | ⏳ Pending | | | |

## Acceptance Criteria Verification

### From Design Document:
- ✅ Validation checks for participants (min 4), teams (min 1), matches (min 1)
- ✅ Confirmation dialog shows tournament summary
- ✅ Status is updated to "ongoing" in database
- ✅ Tournament selector updates to show new status
- ✅ Registration buttons (Thêm Thành viên, Tạo Đội, Tạo Trận Đấu, Bắt Đầu) are hidden
- ✅ Reset button appears
- ✅ Success message is displayed

## Browser Compatibility
Test on:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Performance Considerations
- Function should complete within 2 seconds for typical tournament (50 participants, 25 teams, 100 matches)
- No memory leaks after multiple start/reset cycles
- UI should remain responsive during status update

## Notes
- All Vietnamese text messages are correctly displayed
- Function follows the same pattern as `generateRandomMatches()` for consistency
- Error messages provide actionable guidance to users
- Confirmation dialog prevents accidental tournament start

## Related Tasks
- Task 1: Tournament Control Panel UI (provides the button)
- Task 2: Member Registration Modal (provides participants)
- Task 3: Generate Random Teams (provides teams)
- Task 4: Generate Random Matches (provides matches)
- Task 6: Reset Tournament (reverse operation)

## Manual Testing Instructions

### Quick Test Scenario:
1. Login to admin panel (password: `admin123`)
2. Create a new tournament or select existing "upcoming" tournament
3. Add 4+ members using "👥 Thêm Thành viên"
4. Generate teams using "🎲 Tạo Đội Ngẫu nhiên"
5. Generate matches using "📅 Tạo Trận Đấu"
6. Click "▶️ Bắt Đầu Giải Đấu"
7. Verify confirmation dialog shows correct counts
8. Confirm and verify:
   - Success message appears
   - Status changes to "Đang diễn ra"
   - Only "Reset" button is visible
   - Matches are still displayed correctly

### Edge Case Testing:
1. Try starting with 3 members (should fail)
2. Try starting without teams (should fail)
3. Try starting without matches (should fail)
4. Try starting an already-started tournament (should fail)
5. Cancel the confirmation dialog (should abort)

## Automated Testing (Future)
Consider adding automated tests using:
- Jest for unit testing
- Playwright/Cypress for E2E testing
- Test coverage for all validation paths
- Mock database for isolated testing
