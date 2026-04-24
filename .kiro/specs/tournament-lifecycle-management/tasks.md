# Implementation Tasks

## Task 1: Add Tournament Control Panel UI to Admin Panel

**Description**: Add status-based button panel to admin.html for tournament lifecycle management

**Subtasks**:
- [x] 1.1: Add tournament controls container div after tournament selector in admin.html
- [x] 1.2: Add CSS styles for tournament control buttons in admin-mobile.css
- [x] 1.3: Implement `renderTournamentControls(tournament)` function in admin.js
- [x] 1.4: Call `renderTournamentControls()` after tournament is loaded/switched
- [x] 1.5: Test button visibility for different tournament statuses (upcoming/ongoing/completed)

**Acceptance Criteria**:
- When tournament status is "upcoming", show 4 buttons: Thêm Thành viên, Tạo Đội Ngẫu nhiên, Tạo Trận Đấu, Bắt Đầu Giải Đấu
- When tournament status is "ongoing" or "completed", show 1 button: Reset Giải Đấu
- Buttons are hidden for non-admin users
- Buttons have proper styling and icons

---

## Task 2: Implement Member Registration Modal

**Description**: Create modal dialog for selecting and registering members to tournament

**Subtasks**:
- [x] 2.1: Add member registration modal HTML structure to admin.html
- [x] 2.2: Add CSS styles for modal and member list in admin-mobile.css
- [x] 2.3: Implement `openMemberRegistrationModal()` function in admin.js
- [x] 2.4: Implement `closeMemberRegistrationModal()` function in admin.js
- [x] 2.5: Implement `saveMemberRegistration()` function in admin.js
- [x] 2.6: Add validation for minimum 4 members
- [x] 2.7: Test member selection, tier override, and seeded marking

**Acceptance Criteria**:
- Modal displays all members with checkboxes
- Each member shows tier badge
- Tier override dropdown works correctly
- Seeded checkbox works correctly
- Validation prevents saving with less than 4 members
- Successfully saves participants to tournament_participants table
- Modal closes after successful save

---

## Task 3: Implement Generate Random Teams Function

**Description**: Implement function to generate teams using PairingAlgorithm

**Subtasks**:
- [x] 3.1: Implement `generateRandomTeams()` function in admin.js
- [x] 3.2: Add confirmation dialog before generating teams
- [x] 3.3: Delete existing teams before generating new ones
- [x] 3.4: Call `tournamentManager.generateTeams(tournamentId)`
- [x] 3.5: Display success message with team count
- [x] 3.6: Handle errors and display error messages
- [x] 3.7: Test with different participant counts and tier distributions

**Acceptance Criteria**:
- Confirmation dialog appears before generating
- Existing teams are deleted
- New teams are generated using PairingAlgorithm
- Teams follow tier pairing rules (T1+T3, T2+T2)
- Seeded players are distributed evenly across groups
- Success message shows number of teams created
- Error handling works for edge cases

---

## Task 4: Implement Generate Random Matches Function

**Description**: Implement function to generate round-robin schedule

**Subtasks**:
- [x] 4.1: Implement `generateRandomMatches()` function in admin.js
- [x] 4.2: Add confirmation dialog before generating matches
- [x] 4.3: Validate that teams exist before generating
- [x] 4.4: Delete existing matches before generating new ones
- [x] 4.5: Call `tournamentManager.generateSchedule(tournamentId)`
- [x] 4.6: Display success message with match count
- [x] 4.7: Handle errors and display error messages
- [x] 4.8: Test round-robin schedule generation for 2 groups

**Acceptance Criteria**:
- Confirmation dialog appears before generating
- Validation prevents generating without teams
- Existing matches are deleted
- New matches are generated in round-robin format
- Each group has N*(N-1)/2 matches where N is teams per group
- Success message shows number of matches created
- Error handling works for edge cases

---

## Task 5: Implement Start Tournament Function

**Description**: Implement function to change tournament status to ongoing

**Subtasks**:
- [x] 5.1: Implement `startTournament()` function in admin.js
- [x] 5.2: Add validation for prerequisites (participants, teams, matches)
- [x] 5.3: Add confirmation dialog with tournament summary
- [x] 5.4: Call `tournamentManager.updateStatus(tournamentId, 'ongoing')`
- [x] 5.5: Reload tournament selector and UI after status change
- [x] 5.6: Verify registration buttons are hidden after start
- [x] 5.7: Test status change and UI updates

**Acceptance Criteria**:
- Validation checks for participants (min 4), teams (min 1), matches (min 1)
- Confirmation dialog shows tournament summary
- Status is updated to "ongoing" in database
- Tournament selector updates to show new status
- Registration buttons (Thêm Thành viên, Tạo Đội, Tạo Trận Đấu, Bắt Đầu) are hidden
- Reset button appears
- Success message is displayed

---

## Task 6: Implement Reset Tournament Function

**Description**: Implement function to reset tournament to upcoming state

**Subtasks**:
- [ ] 6.1: Implement `resetTournament()` function in admin.js
- [ ] 6.2: Add confirmation dialog with warning message
- [ ] 6.3: Delete all matches for tournament
- [ ] 6.4: Delete all teams for tournament
- [ ] 6.5: Keep participants unchanged
- [ ] 6.6: Call `tournamentManager.updateStatus(tournamentId, 'upcoming')`
- [ ] 6.7: Reload tournament selector and UI after reset
- [ ] 6.8: Verify registration buttons reappear after reset
- [ ] 6.9: Test reset functionality and data cleanup

**Acceptance Criteria**:
- Confirmation dialog warns about data deletion
- All matches are deleted from database
- All teams are deleted from database
- Participants remain in database
- Status is updated to "upcoming" in database
- Tournament selector updates to show new status
- Registration buttons reappear
- Reset button remains visible
- Success message is displayed

---

## Task 7: Enhance Tournament Selector with Status Sorting

**Description**: Update tournament selector to sort by status (ongoing → upcoming → completed)

**Subtasks**:
- [ ] 7.1: Update `loadTournamentSelector()` function in admin.js
- [ ] 7.2: Implement status-based sorting logic
- [ ] 7.3: Add secondary sort by start_date descending
- [ ] 7.4: Update `switchTournament()` to call `renderTournamentControls()`
- [ ] 7.5: Test tournament selector with multiple tournaments of different statuses

**Acceptance Criteria**:
- Tournaments are sorted: ongoing first, then upcoming, then completed
- Within same status, tournaments are sorted by start_date (newest first)
- Switching tournament updates control buttons correctly
- Active tournament is pre-selected in dropdown

---

## Task 8: Add Admin-Only Visibility Controls

**Description**: Ensure all tournament management features are hidden from public users

**Subtasks**:
- [ ] 8.1: Add `isAdmin()` check in `renderTournamentControls()`
- [ ] 8.2: Hide tournament controls container for non-admin users
- [ ] 8.3: Verify member registration modal is not accessible to public users
- [ ] 8.4: Test as public user (without ADMIN_KEY) to verify all admin features hidden
- [ ] 8.5: Test as admin user to verify all features visible

**Acceptance Criteria**:
- Tournament control buttons are hidden for public users
- Member registration modal cannot be opened by public users
- All admin-only functions check `isAdmin()` before executing
- Public users can still view tournament selector (read-only)
- Admin users see all tournament management features

---

## Task 9: Add Member Registration Modal HTML and CSS

**Description**: Create HTML structure and CSS styles for member registration modal

**Subtasks**:
- [ ] 9.1: Add modal HTML structure to admin.html (before closing body tag)
- [ ] 9.2: Add modal overlay and container styles in admin-mobile.css
- [ ] 9.3: Add member list item styles with checkbox, tier badge, and controls
- [ ] 9.4: Add responsive styles for mobile devices
- [ ] 9.5: Test modal appearance and responsiveness

**Acceptance Criteria**:
- Modal appears centered on screen with overlay
- Member list is scrollable if content exceeds viewport
- Tier badges have color coding (Tier 1: gold, Tier 2: silver, Tier 3: bronze)
- Checkboxes and dropdowns are touch-friendly (min 44x44px)
- Modal is responsive on mobile devices
- Close button (X) works correctly

---

## Task 10: Add Tournament Control Button Styles

**Description**: Create CSS styles for tournament control buttons

**Subtasks**:
- [ ] 10.1: Add button container styles in admin-mobile.css
- [ ] 10.2: Add individual button styles with icons
- [ ] 10.3: Add hover and active states
- [ ] 10.4: Add disabled state styles
- [ ] 10.5: Add responsive styles for mobile devices
- [ ] 10.6: Test button appearance and interactions

**Acceptance Criteria**:
- Buttons have consistent styling with existing admin buttons
- Icons are visible and properly aligned
- Hover states provide visual feedback
- Disabled buttons are visually distinct
- Buttons are touch-friendly on mobile (min 44x44px)
- Button layout is responsive and wraps on small screens

---

## Task 11: Add Error Handling and Validation

**Description**: Implement comprehensive error handling and validation for all functions

**Subtasks**:
- [ ] 11.1: Add validation for minimum member count (4) in `saveMemberRegistration()`
- [ ] 11.2: Add validation for teams existence in `generateRandomMatches()`
- [ ] 11.3: Add validation for prerequisites in `startTournament()`
- [ ] 11.4: Add try-catch blocks for all async functions
- [ ] 11.5: Display user-friendly error messages using `setStatus()`
- [ ] 11.6: Test error scenarios and verify error messages

**Acceptance Criteria**:
- All validation rules are enforced
- User-friendly error messages are displayed
- Errors are logged to console for debugging
- UI remains functional after errors
- No uncaught exceptions in console

---

## Task 12: Add Confirmation Dialogs

**Description**: Add confirmation dialogs for destructive actions

**Subtasks**:
- [ ] 12.1: Add confirmation dialog for `generateRandomTeams()` with warning about deleting old teams
- [ ] 12.2: Add confirmation dialog for `generateRandomMatches()` with warning about deleting old matches
- [ ] 12.3: Add confirmation dialog for `startTournament()` with tournament summary
- [ ] 12.4: Add confirmation dialog for `resetTournament()` with detailed warning
- [ ] 12.5: Test all confirmation dialogs and verify cancel functionality

**Acceptance Criteria**:
- Confirmation dialogs appear before destructive actions
- Dialogs show clear warnings about what will be deleted/changed
- Cancel button prevents action from executing
- OK/Confirm button proceeds with action
- Dialog messages are in Vietnamese

---

## Task 13: Integration Testing

**Description**: Test complete tournament lifecycle workflow

**Subtasks**:
- [ ] 13.1: Test full workflow: create tournament → add members → generate teams → generate matches → start
- [ ] 13.2: Test reset workflow: start tournament → reset → verify cleanup
- [ ] 13.3: Test tournament switching with different statuses
- [ ] 13.4: Test as admin user and verify all features work
- [ ] 13.5: Test as public user and verify admin features hidden
- [ ] 13.6: Test with both Supabase and localStorage (demo mode)
- [ ] 13.7: Test error scenarios and edge cases

**Acceptance Criteria**:
- Full workflow completes successfully
- Reset workflow cleans up data correctly
- Tournament switching updates UI correctly
- Admin features work for admin users
- Admin features hidden for public users
- Both Supabase and localStorage modes work
- All error scenarios handled gracefully

---

## Task 14: Update Documentation

**Description**: Update documentation with new tournament management features

**Subtasks**:
- [ ] 14.1: Update README with tournament lifecycle workflow
- [ ] 14.2: Document new functions in code comments
- [ ] 14.3: Create user guide for tournament management
- [ ] 14.4: Document error messages and troubleshooting

**Acceptance Criteria**:
- README includes tournament lifecycle section
- All new functions have JSDoc comments
- User guide explains each step of tournament management
- Error messages are documented with solutions

---

## Task 15: Performance Optimization

**Description**: Optimize performance for tournament management operations

**Subtasks**:
- [ ] 15.1: Implement batch delete for teams and matches in reset function
- [ ] 15.2: Add loading indicators for long-running operations
- [ ] 15.3: Cache active tournament data to reduce database queries
- [ ] 15.4: Debounce status updates to avoid race conditions
- [ ] 15.5: Test performance with large datasets (100+ members, 50+ teams)

**Acceptance Criteria**:
- Batch operations complete faster than individual deletes
- Loading indicators appear during long operations
- Cached data reduces database queries
- No race conditions during status updates
- Performance is acceptable with large datasets
