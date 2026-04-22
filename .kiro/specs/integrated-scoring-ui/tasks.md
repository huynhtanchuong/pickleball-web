# Integrated Scoring UI - Implementation Tasks

## Task Breakdown

### Phase 1: Setup & Cleanup (1-2 hours)

#### Task 1.1: Remove Unused UI Elements
- [x] Remove +/- icons from match cards in admin.js
- [x] Remove "Start Scoring" button
- [x] Remove "View Live" button
- [x] Keep "Finish Match" and "Reset Match" buttons
- [x] Test: Verify buttons are removed

#### Task 1.2: Add Game State Management
- [x] Import referee-game-state.js into admin.html
- [x] Import referee-sync-engine.js into admin.html
- [x] Create `matchStates` Map in admin.js
- [x] Create `initMatchState()` function
- [x] Test: Verify imports work

### Phase 2: Inline Scoring UI (2-3 hours)

#### Task 2.1: Create Inline Scoring HTML Structure
- [x] Create `renderInlineScoring()` function
- [x] Add team cards with tap targets
- [x] Add VS divider
- [x] Add score display (large numbers)
- [x] Add serving indicator
- [x] Test: Verify HTML renders correctly

#### Task 2.2: Add CSS Styling
- [x] Style team cards (min 150x150px tap targets)
- [x] Add hover effects
- [x] Style serving team (green highlight)
- [x] Style score numbers (72px font)
- [x] Add responsive layout for mobile
- [x] Test: Verify styling on desktop and mobile

#### Task 2.3: Add Score Info Display
- [x] Add score call display (e.g., "5-3-2")
- [x] Add server info display (e.g., "Team A - Server 2")
- [x] Style info section
- [x] Test: Verify info updates correctly

### Phase 3: Tap-to-Score Logic (2-3 hours)

#### Task 3.1: Implement handleTeamTap()
- [x] Create `handleTeamTap(matchId, team)` function
- [x] Check if match started (servingTeam !== null)
- [x] Check if match completed
- [x] Determine action based on serving team
- [x] Apply action using gameStateReducer
- [x] Test: Verify tap logic works

#### Task 3.2: Implement Score Logic
- [x] If team === servingTeam → SCORE action
- [x] If team !== servingTeam → FAULT action (đổi giao)
- [x] Update state via gameStateReducer
- [x] Test: Verify scoring works correctly

#### Task 3.3: Add Debouncing
- [x] Create tapDebounce Map
- [x] Add 300ms debounce to prevent double-tap
- [x] Test: Verify no double-scoring

#### Task 3.4: Add Visual Feedback
- [x] Add tap animation (scale effect)
- [x] Add score change animation
- [x] Add serving indicator animation
- [x] Test: Verify animations smooth

### Phase 4: Serve Selection (1-2 hours)

#### Task 4.1: Create Serve Selection Dialog
- [x] Create `openServeDialog(matchId)` function
- [x] Create dialog HTML structure
- [x] Add Team A button
- [x] Add Team B button
- [x] Add "Mặc định: Server 2" note
- [x] Add Cancel button
- [x] Test: Verify dialog opens

#### Task 4.2: Implement Serve Selection Logic
- [x] Create `selectServe(matchId, team)` function
- [x] Update servingTeam in state
- [x] Set serverNumber = 2
- [x] Set status = 'playing'
- [x] Close dialog
- [x] Test: Verify serve selection works

#### Task 4.3: Add "Chọn Giao Bóng" Button
- [x] Add button to inline scoring UI
- [x] Show only when status === 'not_started'
- [x] Hide after serve selected
- [x] Test: Verify button shows/hides correctly

#### Task 4.4: Style Serve Dialog
- [x] Style dialog overlay
- [x] Style serve option buttons
- [x] Add hover effects
- [x] Make mobile-friendly
- [x] Test: Verify styling on all devices

### Phase 5: Undo Functionality (1 hour)

#### Task 5.1: Implement Undo Logic
- [x] Create `handleUndo(matchId)` function
- [x] Get previous state from history
- [x] Update current state
- [x] Sync to database
- [x] Re-render match card
- [x] Test: Verify undo works

#### Task 5.2: Add Undo Button
- [x] Add "Undo" button to inline scoring UI
- [x] Disable when history is empty
- [x] Style button
- [x] Test: Verify button state

#### Task 5.3: Add Undo Validation
- [x] Check if history.canUndo()
- [x] Show error if no actions to undo
- [x] Test: Verify validation works

### Phase 6: Database Sync (1-2 hours)

#### Task 6.1: Update Database Schema
- [x] Add serving_team column to matches table
- [x] Add server_number column to matches table
- [x] Add game_state JSONB column to matches table
- [x] Test: Verify columns added

#### Task 6.2: Implement syncMatchState()
- [x] Create `syncMatchState(matchId, state)` function
- [x] Update scoreA, scoreB
- [x] Update serving_team, server_number
- [x] Update game_state JSON
- [x] Update updated_at timestamp
- [x] Test: Verify sync works

#### Task 6.3: Add Realtime Broadcast
- [ ] Broadcast state changes to realtime channel
- [ ] Listen for updates from other clients
- [ ] Update UI when receiving updates
- [ ] Test: Verify realtime sync works

### Phase 7: Integration & Testing (1-2 hours)

#### Task 7.1: Integrate with Existing Admin UI
- [ ] Update renderMatchCard() to include inline scoring
- [ ] Ensure compatibility with existing features
- [ ] Test: Verify no conflicts

#### Task 7.2: Add Error Handling
- [ ] Handle invalid actions
- [ ] Show error messages
- [ ] Add try-catch blocks
- [ ] Test: Verify error handling

#### Task 7.3: Manual Testing
- [ ] Test full scoring flow
- [ ] Test serve selection
- [ ] Test undo
- [ ] Test on mobile
- [ ] Test realtime sync
- [ ] Test with multiple matches

#### Task 7.4: Fix Bugs
- [ ] Fix any bugs found during testing
- [ ] Optimize performance
- [ ] Polish UI/UX

### Phase 8: Documentation & Cleanup (30 min)

#### Task 8.1: Update Documentation
- [ ] Document new features
- [ ] Update README if needed
- [ ] Add code comments

#### Task 8.2: Code Cleanup
- [ ] Remove unused code
- [ ] Format code
- [ ] Run linter

#### Task 8.3: Final Testing
- [ ] Full regression test
- [ ] Test on production-like environment

---

## Task Summary

**Total Tasks**: 34  
**Estimated Time**: 10-15 hours  
**Priority**: High  
**Dependencies**: referee-game-state.js, referee-sync-engine.js

## Implementation Order

1. Phase 1: Setup & Cleanup
2. Phase 2: Inline Scoring UI
3. Phase 3: Tap-to-Score Logic
4. Phase 4: Serve Selection
5. Phase 5: Undo Functionality
6. Phase 6: Database Sync
7. Phase 7: Integration & Testing
8. Phase 8: Documentation & Cleanup

---

**Status**: Ready for implementation  
**Next Step**: Start with Phase 1, Task 1.1
