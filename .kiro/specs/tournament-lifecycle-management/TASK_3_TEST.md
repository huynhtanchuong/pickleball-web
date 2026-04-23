# Task 3: Generate Random Teams - Test Plan

## Test Objective
Verify that the `generateRandomTeams()` function correctly generates teams using the PairingAlgorithm with proper tier pairing and seeded player distribution.

## Prerequisites
1. Admin panel is accessible at `admin.html`
2. At least one tournament with status "upcoming" exists
3. Admin password is known (default: `admin123`)
4. At least 4 members exist in the system with various tiers
5. PairingAlgorithm is loaded (pairing.js)
6. TournamentManager is initialized

## Test Cases

### Test Case 1: Basic Team Generation (4 participants)
**Setup:**
- Create tournament with status "upcoming"
- Add 4 participants: 2 Tier 1, 2 Tier 3
- No seeded players

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "🎲 Tạo Đội Ngẫu nhiên" button
4. Confirm the dialog

**Expected Results:**
- ✅ Confirmation dialog appears with participant count
- ✅ 2 teams are created (T1+T3 pairing)
- ✅ Teams are distributed to groups A and B (1 team each)
- ✅ Success message: "✓ Đã tạo 2 đội thành công"
- ✅ No errors in console

### Test Case 2: Team Generation with Tier 2 (6 participants)
**Setup:**
- Create tournament with status "upcoming"
- Add 6 participants: 1 Tier 1, 4 Tier 2, 1 Tier 3
- No seeded players

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "🎲 Tạo Đội Ngẫu nhiên" button
4. Confirm the dialog

**Expected Results:**
- ✅ Confirmation dialog appears
- ✅ 3 teams are created:
  - 1 team: T1+T3
  - 2 teams: T2+T2
- ✅ Teams are distributed evenly across groups (2 in A, 1 in B or vice versa)
- ✅ Success message: "✓ Đã tạo 3 đội thành công"

### Test Case 3: Team Generation with Seeded Players
**Setup:**
- Create tournament with status "upcoming"
- Add 8 participants: 2 Tier 1, 4 Tier 2, 2 Tier 3
- Mark 4 participants as seeded (2 T1, 2 T2)

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "🎲 Tạo Đội Ngẫu nhiên" button
4. Confirm the dialog

**Expected Results:**
- ✅ 4 teams are created
- ✅ Seeded teams are distributed evenly (2 per group)
- ✅ Each group has 2 teams
- ✅ Success message: "✓ Đã tạo 4 đội thành công"
- ✅ Console log shows: "Team distribution: Group A = 2, Group B = 2"

### Test Case 4: Delete Existing Teams Before Generating
**Setup:**
- Create tournament with status "upcoming"
- Add 6 participants
- Generate teams once (3 teams exist)

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "🎲 Tạo Đội Ngẫu nhiên" button
4. Observe confirmation dialog
5. Confirm

**Expected Results:**
- ✅ Confirmation dialog shows warning: "⚠️ CẢNH BÁO: 3 đội hiện tại sẽ bị xóa!"
- ✅ Old teams are deleted
- ✅ New teams are generated
- ✅ Success message appears
- ✅ Console log shows: "Deleted 3 existing teams"

### Test Case 5: Insufficient Participants (< 4)
**Setup:**
- Create tournament with status "upcoming"
- Add only 2 participants

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "🎲 Tạo Đội Ngẫu nhiên" button

**Expected Results:**
- ✅ Error message: "❌ Cần ít nhất 4 thành viên để tạo đội"
- ✅ Alert dialog: "Cần ít nhất 4 thành viên để tạo đội.\n\nVui lòng thêm thành viên trước."
- ✅ No teams are created
- ✅ No confirmation dialog appears

### Test Case 6: Tournament Status Not "Upcoming"
**Setup:**
- Create tournament with status "ongoing"
- Add 6 participants

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "🎲 Tạo Đội Ngẫu nhiên" button

**Expected Results:**
- ✅ Error message: "❌ Chỉ có thể tạo đội khi giải đấu chưa bắt đầu"
- ✅ No confirmation dialog appears
- ✅ No teams are created

### Test Case 7: No Active Tournament Selected
**Setup:**
- Clear active tournament ID from localStorage

**Steps:**
1. Login to admin panel
2. Click "🎲 Tạo Đội Ngẫu nhiên" button

**Expected Results:**
- ✅ Error message: "❌ Vui lòng chọn giải đấu"
- ✅ No confirmation dialog appears
- ✅ No teams are created

### Test Case 8: Odd Number of Tier 2 Participants
**Setup:**
- Create tournament with status "upcoming"
- Add 5 participants: 1 Tier 1, 3 Tier 2, 1 Tier 3

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "🎲 Tạo Đội Ngẫu nhiên" button
4. Confirm the dialog

**Expected Results:**
- ✅ Error message appears: "❌ Lỗi: Số thành viên Tier 2 phải là số chẵn"
- ✅ Alert dialog with error details
- ✅ No teams are created
- ✅ Console shows error from PairingAlgorithm validation

### Test Case 9: User Cancels Confirmation Dialog
**Setup:**
- Create tournament with status "upcoming"
- Add 6 participants

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "🎲 Tạo Đội Ngẫu nhiên" button
4. Click "Cancel" on confirmation dialog

**Expected Results:**
- ✅ No teams are created
- ✅ No status message appears
- ✅ Function returns without error

### Test Case 10: Large Tournament (20 participants)
**Setup:**
- Create tournament with status "upcoming"
- Add 20 participants: 6 Tier 1, 8 Tier 2, 6 Tier 3
- Mark 4 as seeded

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "🎲 Tạo Đội Ngẫu nhiên" button
4. Confirm the dialog

**Expected Results:**
- ✅ 10 teams are created:
  - 6 teams: T1+T3
  - 4 teams: T2+T2
- ✅ Teams are distributed evenly (5 per group)
- ✅ Seeded teams are distributed evenly (2 per group)
- ✅ Success message: "✓ Đã tạo 10 đội thành công"
- ✅ Console log shows: "Team distribution: Group A = 5, Group B = 5"

### Test Case 11: Tier Override Handling
**Setup:**
- Create tournament with status "upcoming"
- Add 4 participants: all Tier 2
- Override 2 participants to Tier 1 and 2 to Tier 3

**Steps:**
1. Login to admin panel
2. Select the test tournament
3. Click "🎲 Tạo Đội Ngẫu nhiên" button
4. Confirm the dialog

**Expected Results:**
- ✅ 2 teams are created (T1+T3 pairing using overridden tiers)
- ✅ Teams use effective_tier from tier_override
- ✅ Success message appears

## Integration Tests

### Integration Test 1: Full Workflow
**Steps:**
1. Create new tournament
2. Add 8 participants with mixed tiers
3. Generate teams
4. Verify teams in database
5. Generate teams again (delete old ones)
6. Verify old teams deleted and new teams created

**Expected Results:**
- ✅ All steps complete without errors
- ✅ Teams are properly stored in database
- ✅ Old teams are deleted before new generation

### Integration Test 2: PairingAlgorithm Integration
**Steps:**
1. Create tournament with 10 participants
2. Generate teams
3. Verify PairingAlgorithm is called correctly
4. Verify tier pairing rules are followed

**Expected Results:**
- ✅ PairingAlgorithm.generateTeams() is called
- ✅ Tier pairing follows rules: T1+T3, T2+T2
- ✅ Seeded players are distributed evenly

## Performance Tests

### Performance Test 1: Large Tournament
**Setup:**
- Create tournament with 100 participants

**Steps:**
1. Generate teams
2. Measure execution time

**Expected Results:**
- ✅ Execution completes in < 2 seconds
- ✅ No browser freeze
- ✅ All teams generated correctly

## Error Handling Tests

### Error Test 1: PairingAlgorithm Not Loaded
**Setup:**
- Remove pairing.js from page

**Steps:**
1. Try to generate teams

**Expected Results:**
- ✅ Error message: "❌ Lỗi: PairingAlgorithm not loaded"
- ✅ Alert dialog with error details

### Error Test 2: Database Error
**Setup:**
- Simulate database connection failure

**Steps:**
1. Try to generate teams

**Expected Results:**
- ✅ Error message with database error details
- ✅ Alert dialog appears
- ✅ No partial data is saved

## Test Results

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC1: Basic Generation | ⏳ Pending | |
| TC2: With Tier 2 | ⏳ Pending | |
| TC3: Seeded Players | ⏳ Pending | |
| TC4: Delete Existing | ⏳ Pending | |
| TC5: Insufficient Participants | ⏳ Pending | |
| TC6: Wrong Status | ⏳ Pending | |
| TC7: No Tournament | ⏳ Pending | |
| TC8: Odd Tier 2 | ⏳ Pending | |
| TC9: Cancel Dialog | ⏳ Pending | |
| TC10: Large Tournament | ⏳ Pending | |
| TC11: Tier Override | ⏳ Pending | |
| IT1: Full Workflow | ⏳ Pending | |
| IT2: Algorithm Integration | ⏳ Pending | |
| PT1: Performance | ⏳ Pending | |
| ET1: Algorithm Not Loaded | ⏳ Pending | |
| ET2: Database Error | ⏳ Pending | |

## Manual Testing Checklist

- [ ] Test with different participant counts (4, 6, 8, 10, 20)
- [ ] Test with different tier distributions
- [ ] Test with seeded players (0, 2, 4, 6)
- [ ] Test confirmation dialog (confirm and cancel)
- [ ] Test delete existing teams warning
- [ ] Test error messages for all edge cases
- [ ] Test console logs for debugging info
- [ ] Verify teams in database after generation
- [ ] Verify group distribution is balanced
- [ ] Verify seeded player distribution is even

## Browser Compatibility
Test on:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Notes
- All tests assume PairingAlgorithm is correctly implemented
- Database operations use StorageAdapter (Supabase or localStorage)
- Error messages are in Vietnamese as per design requirements
- Console logs are for debugging and should show team distribution
