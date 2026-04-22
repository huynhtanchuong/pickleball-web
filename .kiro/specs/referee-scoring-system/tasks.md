# Implementation Plan: Referee Scoring System

## Overview

This implementation plan breaks down the Referee Scoring System into discrete coding tasks. The system uses a reducer-based state management pattern with real-time Supabase synchronization. Implementation follows an incremental approach: core state management → UI components → synchronization → testing.

The system consists of:
- **GameStateReducer**: Pure functions for state transitions
- **HistoryManager**: Undo functionality with bounded stack
- **SyncEngine**: Real-time synchronization via Supabase
- **RefereeUI**: Full-featured scoring interface
- **ViewerDisplay**: Read-only spectator display

## Tasks

- [x] 1. Set up core data structures and database schema
  - Create database migration for matches table extensions (serving_team, server_number, current_set, completed_sets, match_config)
  - Define GameState interface/structure in JavaScript
  - Create utility functions for state serialization/deserialization
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 17.5_

- [ ]* 1.1 Write property test for state serialization
  - **Property 10: State Persistence Round-Trip**
  - **Validates: Requirements 15.4, 17.5**

- [x] 2. Implement GameStateReducer core logic
  - [x] 2.1 Create gameStateReducer function with action dispatcher
    - Implement switch statement for all action types
    - Add state validation before transitions
    - _Requirements: 17.1, 17.2, 17.3_
  
  - [x] 2.2 Implement handleScore function
    - Award point to serving team
    - Check for set win condition (target score + win-by margin)
    - Update completedSets array when set is won
    - _Requirements: 3.1, 3.2, 3.3, 9.1_
  
  - [ ]* 2.3 Write property test for serving team scoring
    - **Property 2: Serving Team Scoring**
    - **Validates: Requirements 3.1, 3.2, 6.4, 6.5**
  
  - [ ]* 2.4 Write property test for set completion detection
    - **Property 4: Set Completion Detection**
    - **Validates: Requirements 9.1**
  
  - [x] 2.5 Implement rotateServer function
    - Handle server rotation logic (1 → 2 → switch team)
    - Support first serve single rule
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.3, 5.4_
  
  - [x] 2.6 Implement handleFault function
    - Rotate server without awarding points
    - Call rotateServer for state transition
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 2.7 Write property test for server rotation on fault
    - **Property 3: Server Rotation on Fault**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3**
  
  - [x] 2.8 Implement checkSetWin function
    - Detect set completion based on target score and win-by margin
    - Return boolean indicating set win
    - _Requirements: 9.1, 15.2_
  
  - [ ]* 2.9 Write property test for win-by rule enforcement
    - **Property 9: Win-By Rule Enforcement**
    - **Validates: Requirements 15.2**
  
  - [x] 2.10 Implement checkMatchWin function
    - Count sets won by each team
    - Determine match completion based on match format (BO1/BO3/BO5)
    - _Requirements: 10.1, 10.4_
  
  - [ ]* 2.11 Write property test for match completion detection
    - **Property 6: Match Completion Detection**
    - **Validates: Requirements 10.1**
  
  - [x] 2.12 Implement startNextSet function
    - Reset scores to 0
    - Increment currentSet
    - Save completed set to completedSets array
    - Optionally switch serving team
    - _Requirements: 9.4, 9.5, 9.6, 9.7_
  
  - [ ]* 2.13 Write property test for set transition
    - **Property 5: Set Transition**
    - **Validates: Requirements 9.4, 9.5, 9.7**

- [x] 3. Checkpoint - Ensure all reducer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement HistoryManager for undo functionality
  - [x] 4.1 Create HistoryManager class
    - Implement push method with max size limit (10 states)
    - Implement pop method to retrieve previous state
    - Implement canUndo method to check if undo is available
    - Implement clear method to reset history
    - Use deep cloning to prevent state mutation
    - _Requirements: 7.1, 7.2_
  
  - [ ]* 4.2 Write property test for undo functionality
    - **Property 7: Undo Restores Previous State**
    - **Validates: Requirements 7.2**
  
  - [ ]* 4.3 Write unit tests for HistoryManager
    - Test max size enforcement (push beyond 10 removes oldest)
    - Test empty stack behavior
    - Test deep cloning prevents mutation
    - _Requirements: 7.1, 7.4_

- [x] 5. Implement utility functions and validation
  - [x] 5.1 Create generateScoreCall function
    - Format score call as "{scoreA}-{scoreB}-{serverNumber}"
    - _Requirements: 1.4, 8.1, 8.2_
  
  - [ ]* 5.2 Write property test for score call format
    - **Property 1: Score Call Format**
    - **Validates: Requirements 1.4, 8.1**
  
  - [x] 5.3 Create validateAction function
    - Reject actions that award points to non-serving team
    - Validate state invariants (scores non-negative, valid serving team, valid server number)
    - _Requirements: 15.1, 17.3_
  
  - [ ]* 5.4 Write property test for invalid action rejection
    - **Property 8: Invalid Actions Rejected**
    - **Validates: Requirements 15.1**
  
  - [ ]* 5.5 Write property test for state validation
    - **Property 11: State Validation**
    - **Validates: Requirements 17.3**

- [x] 6. Checkpoint - Ensure all core logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement SyncEngine for real-time synchronization
  - [x] 7.1 Create SyncEngine class
    - Initialize with Supabase client
    - Store channel reference for cleanup
    - _Requirements: 13.2_
  
  - [x] 7.2 Implement subscribe method
    - Create Supabase realtime channel for match updates
    - Filter by match ID
    - Call callback on postgres_changes events
    - Deserialize state from database format
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [x] 7.3 Implement publish method with debouncing
    - Debounce writes by 300ms to prevent excessive updates
    - Check for conflicts before writing
    - Update match record in Supabase
    - Serialize state to database format
    - _Requirements: 13.1, 13.4, 15.3, 15.5_
  
  - [x] 7.4 Implement conflict detection
    - Compare updated_at timestamps
    - Return boolean indicating conflict
    - _Requirements: 14.2, 14.3_
  
  - [x] 7.5 Implement handleConflict method
    - Display warning message to user
    - Offer reload option
    - _Requirements: 14.3, 14.4_
  
  - [x] 7.6 Add serializeState and deserializeState methods
    - Convert GameState to database format
    - Convert database format to GameState
    - Handle field name mapping (camelCase ↔ snake_case)
    - _Requirements: 17.5_

- [~] 8. Implement RefereeUI component
  - [~] 8.1 Create RefereeUI class structure
    - Initialize with match ID
    - Store references to reducer, history, and sync engine
    - Load initial state from database or create new match
    - _Requirements: 1.1, 2.1_
  
  - [~] 8.2 Implement render method
    - Display team names and current scores
    - Highlight serving team visually
    - Show server indicator (Team + Server 1/2)
    - Display score call prominently
    - Show set scores for completed sets
    - Display match status badge
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.3_
  
  - [~] 8.3 Implement score button handlers
    - Create handleScoreButton method for SCORE_TEAM_A and SCORE_TEAM_B
    - Push current state to history before action
    - Dispatch action to reducer
    - Publish new state via SyncEngine
    - Re-render UI
    - _Requirements: 1.5, 1.8, 3.1, 3.2, 3.3_
  
  - [~] 8.4 Implement fault button handlers (optional feature)
    - Create handleFaultButton method for FAULT_TEAM_A and FAULT_TEAM_B
    - Only show buttons if config.enableFaultButtons is true
    - Push state to history, dispatch action, publish, re-render
    - _Requirements: 1.6, 6.1, 6.2, 6.3, 6.4, 6.5, 11.5_
  
  - [~] 8.5 Implement undo button handler
    - Create handleUndo method
    - Pop previous state from history
    - Publish restored state via SyncEngine
    - Re-render UI
    - Disable button when history is empty
    - _Requirements: 1.5, 7.2, 7.3, 7.4_
  
  - [~] 8.6 Implement set completion UI
    - Display popup when set is complete
    - Show which team won the set
    - Provide [Next Set] and [End Match] buttons
    - _Requirements: 9.2, 9.3_
  
  - [~] 8.7 Implement match completion UI
    - Display final result when match is complete
    - Show sets won by each team
    - Prevent further score changes
    - _Requirements: 10.2, 10.3_
  
  - [~] 8.8 Add button debouncing and input validation
    - Debounce button clicks with 300ms delay
    - Prevent double-clicks
    - Validate actions before dispatching
    - _Requirements: 15.3, 15.5_
  
  - [~] 8.9 Implement error handling and status indicators
    - Display sync status (connected, syncing, error)
    - Show conflict warnings
    - Provide manual sync retry button
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [~] 9. Implement ViewerDisplay component
  - [~] 9.1 Create ViewerDisplay class structure
    - Initialize with match ID
    - Store reference to SyncEngine
    - Subscribe to match updates on initialization
    - _Requirements: 12.3_
  
  - [~] 9.2 Implement render method (read-only)
    - Display team names and scores (no input controls)
    - Show serving team indicator
    - Display score call
    - Show set scores
    - Display match status badge
    - _Requirements: 12.4, 12.5_
  
  - [~] 9.3 Implement real-time update handler
    - Update state when sync callback fires
    - Re-render UI with new state
    - _Requirements: 13.1, 13.3_

- [~] 10. Checkpoint - Ensure all UI components render correctly
  - Ensure all tests pass, ask the user if questions arise.

- [~] 11. Create HTML pages and integrate components
  - [~] 11.1 Create referee.html page
    - Add HTML structure for RefereeUI
    - Include large touch-friendly buttons
    - Add score display, server indicator, score call
    - Include set completion popup
    - Add status bar and error messages
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_
  
  - [x] 11.2 Create viewer.html page
    - Add HTML structure for ViewerDisplay
    - Include read-only score display
    - Add fullscreen mode for TV displays
    - _Requirements: 12.3, 12.4, 16.1_
  
  - [~] 11.3 Add CSS styling
    - Style score buttons (large, touch-friendly, minimum 44x44px)
    - Style serving team highlight
    - Style score call display (prominent, large font)
    - Style set completion popup
    - Style match status badges
    - Add high contrast colors for accessibility
    - Add focus indicators for keyboard navigation
    - _Requirements: 1.7_
  
  - [~] 11.4 Wire up JavaScript modules
    - Import GameStateReducer, HistoryManager, SyncEngine
    - Initialize RefereeUI on referee.html
    - Initialize ViewerDisplay on viewer.html
    - Add event listeners for buttons
    - _Requirements: 17.1_

- [~] 12. Implement match initialization and configuration
  - [~] 12.1 Create initializeMatch function
    - Set initial serving team to Team A
    - Set initial server number to 1
    - Set initial scores to 0
    - Set current set to 1
    - Initialize empty completedSets array
    - Apply match configuration (format, target score, win-by margin, rules)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [~] 12.2 Add configuration UI (admin page integration)
    - Add match format selector (BO1, BO3, BO5)
    - Add target score selector (11, 15, 21)
    - Add win-by margin input
    - Add first serve single checkbox
    - Add fault buttons enable checkbox
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [~] 13. Implement database migration and integration
  - [x] 13.1 Create Supabase migration script
    - Add serving_team column (TEXT, CHECK IN ('A', 'B'))
    - Add server_number column (INTEGER, CHECK IN (1, 2))
    - Add current_set column (INTEGER, DEFAULT 1)
    - Add completed_sets column (JSONB, DEFAULT '[]')
    - Add match_config column (JSONB with default config)
    - Add updated_by column (TEXT)
    - Create indexes for tournament_id + status, updated_at
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [~] 13.2 Update StorageAdapter for new fields
    - Add field mappings for serving state
    - Add field mappings for set tracking
    - Add field mappings for match config
    - Handle serialization/deserialization of JSONB fields
    - _Requirements: 17.5_
  
  - [~] 13.3 Integrate with existing TournamentManager
    - Update match creation to include default match_config
    - Update match listing to display serving state
    - Add referee assignment field to matches
    - _Requirements: 12.1_

- [~] 14. Implement featured match display with rotation
  - [~] 14.1 Create featured match rotation logic
    - Filter matches by status (playing > not_started > done)
    - Prioritize by stage (final > semi > group)
    - Rotate between multiple playing matches every 5 seconds
    - _Requirements: 16.1, 16.2, 16.3_
  
  - [~] 14.2 Add fullscreen mode for viewer display
    - Implement fullscreen toggle button
    - Optimize layout for TV displays
    - Increase font sizes for readability
    - _Requirements: 16.1, 16.4_

- [~] 15. Checkpoint - Ensure all integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [~] 16. Add accessibility features
  - [~] 16.1 Implement keyboard navigation
    - Add keyboard shortcuts for score buttons (A, B keys)
    - Add keyboard shortcut for undo (U or Ctrl+Z)
    - Add tab navigation for all interactive elements
    - _Requirements: Accessibility_
  
  - [~] 16.2 Add ARIA labels and screen reader support
    - Add aria-label to all buttons
    - Add aria-live regions for score updates
    - Add role attributes for semantic structure
    - _Requirements: Accessibility_
  
  - [~] 16.3 Ensure touch target sizes
    - Verify all buttons are minimum 44x44px
    - Add adequate spacing between buttons
    - _Requirements: 1.7, Accessibility_

- [~] 17. Add internationalization support
  - [~] 17.1 Extract all user-facing strings to i18n.js
    - Button labels (Score, Fault, Undo, Next Set, End Match)
    - Status messages (Playing, Set Complete, Match Complete)
    - Error messages (Conflict, Sync Failed, Invalid Action)
    - Score call format (may vary by locale)
    - _Requirements: Internationalization_
  
  - [~] 17.2 Test with Vietnamese locale
    - Verify all strings display correctly
    - Test score call format
    - _Requirements: Internationalization_

- [~] 18. Implement error handling and stability features
  - [~] 18.1 Add network offline detection
    - Detect when network is offline
    - Show offline indicator
    - Continue with local state
    - Queue changes for sync when online
    - _Requirements: 18.2, 18.3_
  
  - [~] 18.2 Add retry logic for failed syncs
    - Implement exponential backoff
    - Queue failed operations
    - Retry automatically when online
    - _Requirements: 18.3, 18.5_
  
  - [~] 18.3 Add rapid clicking protection
    - Debounce all button clicks
    - Prevent duplicate actions
    - _Requirements: 15.3, 18.1_
  
  - [ ]* 18.4 Write integration tests for error scenarios
    - Test rapid clicking behavior
    - Test network failure and recovery
    - Test concurrent edits
    - _Requirements: 18.1, 18.2, 18.3, 19.3_

- [~] 19. Final checkpoint - End-to-end testing
  - [ ]* 19.1 Write E2E test for complete BO1 match
    - Test match from start to finish (11 points, win by 2)
    - Verify all state transitions
    - _Requirements: 19.4_
  
  - [ ]* 19.2 Write E2E test for complete BO3 match
    - Test match with set transitions
    - Verify set completion and next set logic
    - _Requirements: 19.4_
  
  - [ ]* 19.3 Write E2E test for undo operations
    - Test undo at various points in match
    - Verify state restoration
    - _Requirements: 19.5_
  
  - [ ]* 19.4 Write E2E test for fault handling
    - Test fault buttons (if enabled)
    - Verify server rotation without scoring
    - _Requirements: 19.5_
  
  - Ensure all tests pass, ask the user if questions arise.

- [~] 20. Integration and final wiring
  - [~] 20.1 Add navigation links to existing pages
    - Add "Referee Scoring" link to admin.html
    - Add "Live Scores" link to index.html
    - Update navigation menu
    - _Requirements: Integration_
  
  - [x] 20.2 Update existing match cards to link to referee UI
    - Add "Start Scoring" button to match cards on admin page
    - Link to referee.html with match ID parameter
    - _Requirements: Integration_
  
  - [~] 20.3 Update existing match display to show serving state
    - Show serving team indicator on match cards
    - Display score call on match cards
    - _Requirements: Integration_
  
  - [~] 20.4 Test cross-page synchronization
    - Verify updates on referee.html appear on viewer.html
    - Verify updates appear on admin.html match cards
    - Verify updates appear on index.html featured match
    - _Requirements: 13.1, 13.3_

- [~] 21. Final checkpoint - Complete system test
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate real-time synchronization
- E2E tests validate complete match flows
- The system uses vanilla JavaScript (ES6+) with existing Supabase infrastructure
- All state management uses pure functions for predictability and testability
