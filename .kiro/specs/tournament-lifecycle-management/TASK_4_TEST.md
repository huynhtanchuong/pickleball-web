# Task 4: Generate Random Matches - Test Plan

## Test Objective
Verify that the `generateRandomMatches()` function correctly generates round-robin schedule for all groups with proper match creation and validation.

## Prerequisites
1. Admin panel is accessible at `admin.html`
2. At least one tournament with status "upcoming" exists
3. Admin password is known (default: `admin123`)
4. Teams have been generated (at least 4 teams in 2 groups)
5. TournamentManager is initialized
6. StorageAdapter is working (Supabase or localStorage)

## Test Cases

### Test Case 1: Basic Match Generation (2 groups, 2 teams each)
**Setup:**
- Create tournament with status "upcoming"
- Generate 4 teams: 2 in Group A, 2 in Group B

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "📅 Tạo Trận Đấu" button
4. Confirm the dialog

**Expected Results:**
- ✅ Confirmation dialog appears with team count
- ✅ 2 matches are created (1 per group: N*(N-1)/2 = 2*(2-1)/2 = 1 per group)
- ✅ Each match has:
  - tournament_id set correctly
  - teamA and teamB from same group
  - scoreA = 0, scoreB = 0
  - group_name = 'A' or 'B'
  - stage = 'group'
  - status = 'not_started'
- ✅ Success message: "✓ Đã tạo 2 trận đấu"
- ✅ Matches are displayed in admin panel
- ✅ No errors in console

### Test Case 2: Match Generation with 3 Teams per Group
**Setup:**
- Create tournament with status "upcoming"
- Generate 6 teams: 3 in Group A, 3 in Group B

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "📅 Tạo Trận Đấu" button
4. Confirm the dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ 6 matches are created (3 per group: 3*(3-1)/2 = 3 per group)
- ✅ Group A matches:
  - Team1 vs Team2
  - Team1 vs Team3
  - Team2 vs Team3
- ✅ Group B matches:
  - Team4 vs Team5
  - Team4 vs Team6
  - Team5 vs Team6
- ✅ Success message: "✓ Đã tạo 6 trận đấu"
- ✅ All matches have correct group_name

### Test Case 3: Match Generation with 5 Teams per Group
**Setup:**
- Create tournament with status "upcoming"
- Generate 10 teams: 5 in Group A, 5 in Group B

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "📅 Tạo Trận Đấu" button
4. Confirm the dialog

**Expected Results:**
- ✅ 20 matches are created (10 per group: 5*(5-1)/2 = 10 per group)
- ✅ Each team plays exactly 4 matches (N-1 = 4)
- ✅ No duplicate matches (same pair of teams)
- ✅ Success message: "✓ Đã tạo 20 trận đấu"

### Test Case 4: Delete Existing Matches Before Generating
**Setup:**
- Create tournament with status "upcoming"
- Generate 6 teams
- Generate matches once (6 matches exist)

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "📅 Tạo Trận Đấu" button
4. Observe confirmation dialog
5. Confirm

**Expected Results:**
- ✅ Confirmation dialog shows warning: "Trận đấu cũ (nếu có) sẽ bị xóa."
- ✅ Old matches are deleted
- ✅ New matches are generated
- ✅ Success message appears
- ✅ Console log shows deletion of old matches

### Test Case 5: No Teams Exist
**Setup:**
- Create tournament with status "upcoming"
- No teams generated

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "📅 Tạo Trận Đấu" button

**Expected Results:**
- ✅ Error message: "Vui lòng tạo đội trước khi tạo trận đấu"
- ✅ Alert dialog appears
- ✅ No confirmation dialog appears
- ✅ No matches are created

### Test Case 6: Tournament Status Not "Upcoming"
**Setup:**
- Create tournament with status "ongoing"
- Generate 6 teams

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "📅 Tạo Trận Đấu" button

**Expected Results:**
- ✅ Error message: "Chỉ có thể tạo trận đấu khi giải đấu chưa bắt đầu"
- ✅ Alert dialog appears
- ✅ No confirmation dialog appears
- ✅ No matches are created

### Test Case 7: No Active Tournament Selected
**Setup:**
- Clear active tournament ID from localStorage

**Steps:**
1. Login to admin panel
2. Click "📅 Tạo Trận Đấu" button

**Expected Results:**
- ✅ Error message: "Vui lòng chọn giải đấu"
- ✅ Alert dialog appears
- ✅ No confirmation dialog appears
- ✅ No matches are created

### Test Case 8: User Cancels Confirmation Dialog
**Setup:**
- Create tournament with status "upcoming"
- Generate 6 teams

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "📅 Tạo Trận Đấu" button
4. Click "Cancel" on confirmation dialog

**Expected Results:**
- ✅ No matches are created
- ✅ No status message appears
- ✅ Function returns without error

### Test Case 9: Round-Robin Correctness (4 teams per group)
**Setup:**
- Create tournament with status "upcoming"
- Generate 8 teams: 4 in Group A, 4 in Group B

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "📅 Tạo Trận Đấu" button
4. Confirm the dialog
5. Verify match list

**Expected Results:**
- ✅ 12 matches are created (6 per group: 4*(4-1)/2 = 6 per group)
- ✅ Each team appears in exactly 3 matches (N-1 = 3)
- ✅ No team plays itself
- ✅ No duplicate pairings
- ✅ All matches in Group A have group_name = 'A'
- ✅ All matches in Group B have group_name = 'B'

### Test Case 10: Match Field Initialization
**Setup:**
- Create tournament with status "upcoming"
- Generate 4 teams

**Steps:**
1. Generate matches
2. Inspect match records in database

**Expected Results:**
- ✅ Each match has:
  - tournament_id: correct ID
  - teamA: valid team name
  - teamB: valid team name
  - scoreA: 0
  - scoreB: 0
  - group_name: 'A' or 'B'
  - stage: 'group'
  - match_type: 'group'
  - status: 'not_started'
  - s1a, s1b, s2a, s2b, s3a, s3b: 0
  - s1_locked, s2_locked, s3_locked: false
  - match_time: null
  - court: null
  - referee: null
  - updated_at: null

### Test Case 11: Unbalanced Groups
**Setup:**
- Create tournament with status "upcoming"
- Generate 7 teams: 4 in Group A, 3 in Group B

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "📅 Tạo Trận Đấu" button
4. Confirm the dialog

**Expected Results:**
- ✅ 9 matches are created:
  - Group A: 6 matches (4*(4-1)/2 = 6)
  - Group B: 3 matches (3*(3-1)/2 = 3)
- ✅ Success message: "✓ Đã tạo 9 trận đấu"
- ✅ Each group has correct number of matches

## Integration Tests

### Integration Test 1: Full Workflow
**Steps:**
1. Create new tournament
2. Add 8 participants
3. Generate teams (4 teams)
4. Generate matches
5. Verify matches in database
6. Generate matches again (delete old ones)
7. Verify old matches deleted and new matches created

**Expected Results:**
- ✅ All steps complete without errors
- ✅ Matches are properly stored in database
- ✅ Old matches are deleted before new generation
- ✅ Match count is correct

### Integration Test 2: TournamentManager Integration
**Steps:**
1. Create tournament with 10 teams
2. Generate matches
3. Verify TournamentManager.generateSchedule() is called
4. Verify round-robin algorithm is correct

**Expected Results:**
- ✅ TournamentManager.generateSchedule() is called with correct tournamentId
- ✅ Round-robin schedule is generated correctly
- ✅ All teams play all other teams in their group once

### Integration Test 3: Match Display Integration
**Steps:**
1. Generate matches
2. Verify matches appear in admin panel
3. Verify matches are grouped by group_name
4. Verify match cards show correct information

**Expected Results:**
- ✅ Matches are displayed in admin panel
- ✅ Matches are grouped by "Bảng A" and "Bảng B"
- ✅ Each match card shows team names, scores (0-0), and status

## Performance Tests

### Performance Test 1: Large Tournament
**Setup:**
- Create tournament with 20 teams (10 per group)

**Steps:**
1. Generate matches
2. Measure execution time

**Expected Results:**
- ✅ Execution completes in < 3 seconds
- ✅ No browser freeze
- ✅ 90 matches generated correctly (45 per group: 10*(10-1)/2 = 45)

### Performance Test 2: Match Deletion Performance
**Setup:**
- Create tournament with 100 existing matches

**Steps:**
1. Generate matches again
2. Measure deletion time

**Expected Results:**
- ✅ Deletion completes in < 2 seconds
- ✅ All old matches are deleted
- ✅ New matches are created

## Error Handling Tests

### Error Test 1: TournamentManager Not Initialized
**Setup:**
- Set tournamentManager to undefined

**Steps:**
1. Try to generate matches

**Expected Results:**
- ✅ Error message with details
- ✅ Alert dialog appears
- ✅ No matches are created

### Error Test 2: Database Error
**Setup:**
- Simulate database connection failure

**Steps:**
1. Try to generate matches

**Expected Results:**
- ✅ Error message: "❌ Lỗi: [database error]"
- ✅ Alert dialog with error details
- ✅ No partial data is saved

### Error Test 3: Invalid Team Data
**Setup:**
- Create teams with missing group_name

**Steps:**
1. Try to generate matches

**Expected Results:**
- ✅ Error is caught and displayed
- ✅ Alert dialog appears
- ✅ No matches are created

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC1: Basic Generation (2 teams/group) | ⏳ Pending | |
| TC2: 3 Teams per Group | ⏳ Pending | |
| TC3: 5 Teams per Group | ⏳ Pending | |
| TC4: Delete Existing | ⏳ Pending | |
| TC5: No Teams | ⏳ Pending | |
| TC6: Wrong Status | ⏳ Pending | |
| TC7: No Tournament | ⏳ Pending | |
| TC8: Cancel Dialog | ⏳ Pending | |
| TC9: Round-Robin Correctness | ⏳ Pending | |
| TC10: Field Initialization | ⏳ Pending | |
| TC11: Unbalanced Groups | ⏳ Pending | |
| IT1: Full Workflow | ⏳ Pending | |
| IT2: TournamentManager Integration | ⏳ Pending | |
| IT3: Match Display Integration | ⏳ Pending | |
| PT1: Large Tournament | ⏳ Pending | |
| PT2: Deletion Performance | ⏳ Pending | |
| ET1: Manager Not Initialized | ⏳ Pending | |
| ET2: Database Error | ⏳ Pending | |
| ET3: Invalid Team Data | ⏳ Pending | |

## Manual Testing Checklist

- [ ] Test with different team counts (2, 3, 4, 5, 10 per group)
- [ ] Test with balanced groups (same number of teams)
- [ ] Test with unbalanced groups (different number of teams)
- [ ] Test confirmation dialog (confirm and cancel)
- [ ] Test delete existing matches warning
- [ ] Test error messages for all edge cases
- [ ] Test console logs for debugging info
- [ ] Verify matches in database after generation
- [ ] Verify round-robin correctness (each team plays all others once)
- [ ] Verify match fields are initialized correctly
- [ ] Verify matches are displayed in admin panel
- [ ] Verify matches are grouped by group_name

## Browser Compatibility
Test on:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Round-Robin Verification Formula
For N teams in a group:
- Total matches = N * (N-1) / 2
- Each team plays = N - 1 matches

Examples:
- 2 teams: 2*(2-1)/2 = 1 match
- 3 teams: 3*(3-1)/2 = 3 matches
- 4 teams: 4*(4-1)/2 = 6 matches
- 5 teams: 5*(5-1)/2 = 10 matches
- 10 teams: 10*(10-1)/2 = 45 matches

## Notes
- All tests assume TournamentManager.generateSchedule() is correctly implemented
- Database operations use StorageAdapter (Supabase or localStorage)
- Error messages are in Vietnamese as per design requirements
- Console logs are for debugging and should show match generation details
- Matches should be displayed immediately after generation via fetchMatches()
