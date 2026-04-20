# Requirements Document: Enhanced Serve Management

## Introduction

This feature enhances the Pickleball tournament scoring system with detailed serve management capabilities. The system will track serve rotation (serve 1 and serve 2), allow referees to designate which team serves first, and provide intuitive controls for score tracking, serve changes, and undo operations. This upgrade applies to the admin panel (admin.html) where referees manage matches.

## Glossary

- **Serve_Manager**: The component responsible for tracking and managing serve state during a match
- **Referee**: The admin user who operates the scoring system via admin.html
- **Serve_Turn**: Indicates which team currently has the serve (Team A or Team B)
- **Serve_Number**: Indicates whether it's serve 1 or serve 2 for the current serving team
- **Score_Button**: UI button that awards a point to the currently serving team
- **Serve_2_Button**: UI button that transitions from serve 1 to serve 2
- **Change_Serve_Button**: UI button that transfers serve to the opposing team
- **Redo_Serve_Button**: UI button that undoes the most recent serve change
- **Undo_Button**: UI button that reverses the most recent scoring action
- **Serve_History**: Stack data structure storing previous serve states for undo functionality
- **Action_History**: Stack data structure storing previous scoring actions for undo functionality
- **Random_Selector**: UI component that randomly selects which team serves first
- **Team_Selector**: UI component that allows manual selection of the first serving team
- **Match_State**: The complete state of a match including scores, serve turn, and serve number

## Requirements

### Requirement 1: Serve State Tracking

**User Story:** As a Referee, I want the system to track which team is serving and whether it's serve 1 or serve 2, so that I can enforce proper Pickleball serve rotation rules.

#### Acceptance Criteria

1. THE Serve_Manager SHALL maintain the current Serve_Turn (Team A or Team B)
2. THE Serve_Manager SHALL maintain the current Serve_Number (1 or 2)
3. WHEN a match begins, THE Serve_Manager SHALL initialize with the designated team having Serve_Number 2
4. WHEN a match begins, THE Serve_Manager SHALL initialize the opposing team with Serve_Number 1
5. THE Serve_Manager SHALL persist serve state to database or localStorage
6. WHEN the page reloads, THE Serve_Manager SHALL restore the previous serve state from storage

### Requirement 2: First Serve Selection

**User Story:** As a Referee, I want to choose which team serves first either randomly or manually, so that I can follow tournament protocols for serve selection.

#### Acceptance Criteria

1. WHEN a match starts or a new set begins, THE System SHALL display a serve selection dialog
2. THE serve selection dialog SHALL offer two options: random selection or manual selection
3. WHEN the Referee selects random, THE Random_Selector SHALL display a popup showing which team was randomly chosen
4. WHEN the Referee selects manual, THE Team_Selector SHALL display both team names for selection
5. THE Random_Selector SHALL use a fair random algorithm with equal probability for each team
6. WHEN a team is selected, THE Serve_Manager SHALL set that team as the serving team with Serve_Number 2
7. THE serve selection dialog SHALL close after a team is selected

### Requirement 3: Score Button Functionality

**User Story:** As a Referee, I want to award points to the serving team with a single button press, so that I can quickly update scores during fast-paced matches.

#### Acceptance Criteria

1. THE System SHALL display a Score_Button in the match scoring interface
2. WHEN the Score_Button is pressed, THE System SHALL increment the score for the currently serving team by 1
3. WHEN the Score_Button is pressed, THE System SHALL record the action in Action_History
4. THE Score_Button SHALL be enabled only when a team is currently serving
5. THE Score_Button SHALL display clear visual indication of which team will receive the point
6. WHEN the score is updated, THE System SHALL persist the new score to storage within 800ms

### Requirement 4: Serve Transition Controls

**User Story:** As a Referee, I want dedicated buttons to manage serve transitions, so that I can accurately track serve rotation according to Pickleball rules.

#### Acceptance Criteria

1. THE System SHALL display a Serve_2_Button in the match scoring interface
2. WHEN the Serve_2_Button is pressed AND Serve_Number is 1, THE Serve_Manager SHALL change Serve_Number to 2
3. WHEN the Serve_2_Button is pressed AND Serve_Number is 1, THE Serve_Manager SHALL maintain the current Serve_Turn
4. WHEN the Serve_2_Button is pressed AND Serve_Number is 1, THE Serve_Manager SHALL record the change in Serve_History
5. THE Serve_2_Button SHALL be disabled when Serve_Number is already 2
6. THE System SHALL display a Change_Serve_Button in the match scoring interface
7. WHEN the Change_Serve_Button is pressed, THE Serve_Manager SHALL transfer Serve_Turn to the opposing team
8. WHEN the Change_Serve_Button is pressed, THE Serve_Manager SHALL set Serve_Number to 1 for the new serving team
9. WHEN the Change_Serve_Button is pressed, THE Serve_Manager SHALL record the change in Serve_History
10. THE System SHALL persist serve state changes to storage within 800ms

### Requirement 5: Redo Serve Functionality

**User Story:** As a Referee, I want to undo the most recent serve change, so that I can correct mistakes in serve rotation tracking.

#### Acceptance Criteria

1. THE System SHALL display a Redo_Serve_Button in the match scoring interface
2. WHEN the Redo_Serve_Button is pressed, THE Serve_Manager SHALL restore the previous serve state from Serve_History
3. WHEN the Redo_Serve_Button is pressed, THE Serve_Manager SHALL remove the most recent entry from Serve_History
4. THE Redo_Serve_Button SHALL be disabled when Serve_History is empty
5. WHEN serve state is restored, THE System SHALL update the UI to reflect the previous Serve_Turn and Serve_Number
6. WHEN serve state is restored, THE System SHALL persist the restored state to storage within 800ms

### Requirement 6: Undo Score Functionality

**User Story:** As a Referee, I want to undo the most recent scoring action, so that I can correct scoring mistakes immediately.

#### Acceptance Criteria

1. THE System SHALL display an Undo_Button in the match scoring interface
2. WHEN the Undo_Button is pressed, THE System SHALL restore the previous Match_State from Action_History
3. WHEN the Undo_Button is pressed, THE System SHALL remove the most recent entry from Action_History
4. THE Undo_Button SHALL be disabled when Action_History is empty
5. WHEN Match_State is restored, THE System SHALL update scores, Serve_Turn, and Serve_Number to previous values
6. WHEN Match_State is restored, THE System SHALL persist the restored state to storage within 800ms
7. THE Undo_Button SHALL reverse score increments, serve transitions, and serve changes

### Requirement 7: Visual Serve Indicators

**User Story:** As a Referee, I want clear visual indicators showing which team is serving and the current serve number, so that I can quickly verify the serve state at a glance.

#### Acceptance Criteria

1. THE System SHALL display a visual indicator showing the current Serve_Turn
2. THE System SHALL display a visual indicator showing the current Serve_Number
3. THE serve indicators SHALL be prominently positioned in the match scoring interface
4. WHEN Serve_Turn changes, THE visual indicator SHALL update within 200ms
5. WHEN Serve_Number changes, THE visual indicator SHALL update within 200ms
6. THE serve indicators SHALL use distinct colors or icons to differentiate between Team A and Team B
7. THE serve indicators SHALL clearly distinguish between Serve_Number 1 and Serve_Number 2

### Requirement 8: Storage Integration

**User Story:** As a Referee, I want serve state to be saved automatically, so that I don't lose tracking information if the page refreshes or multiple admins are viewing.

#### Acceptance Criteria

1. WHEN serve state changes, THE System SHALL save Serve_Turn to the match record in storage
2. WHEN serve state changes, THE System SHALL save Serve_Number to the match record in storage
3. THE System SHALL support both localStorage (demo mode) and Supabase (production mode) storage
4. WHEN using Supabase, THE System SHALL update the matches table with new serve state fields
5. WHEN using localStorage, THE System SHALL update the pb_matches object with new serve state fields
6. WHEN a match is loaded, THE System SHALL restore Serve_Turn and Serve_Number from storage
7. IF serve state fields are missing from storage, THE System SHALL initialize with default values (no team serving)

### Requirement 9: Admin Panel Integration

**User Story:** As a Referee, I want serve management controls integrated into the existing admin panel, so that I have all scoring tools in one interface.

#### Acceptance Criteria

1. THE System SHALL add serve management controls to the admin.html match card interface
2. THE serve management controls SHALL appear alongside existing score controls (+/- buttons)
3. THE serve management controls SHALL maintain the existing admin panel visual design
4. THE serve management controls SHALL be responsive and work on mobile devices
5. WHEN a match is in "not_started" status, THE serve selection dialog SHALL appear when scoring begins
6. WHEN a match is in "playing" status, THE serve management controls SHALL be fully enabled
7. WHEN a match is in "done" status, THE serve management controls SHALL be disabled

### Requirement 10: Compatibility with Existing Scoring

**User Story:** As a Referee, I want the new serve management to work seamlessly with existing scoring features, so that I can use both systems together without conflicts.

#### Acceptance Criteria

1. THE System SHALL maintain compatibility with existing single-score (group stage) scoring
2. THE System SHALL maintain compatibility with existing 3-set (semi/final) scoring
3. THE System SHALL maintain compatibility with existing +/- score adjustment buttons
4. THE System SHALL maintain compatibility with existing "Finish" match functionality
5. THE System SHALL maintain compatibility with existing "Reset" match functionality
6. WHEN using +/- buttons, THE System SHALL NOT automatically change serve state
7. WHEN using the Score_Button, THE System SHALL update scores using the same persistence mechanism as +/- buttons
8. THE System SHALL maintain compatibility with existing realtime synchronization
9. THE System SHALL maintain compatibility with existing conflict detection for multiple admins

### Requirement 11: History Management

**User Story:** As a Referee, I want the system to maintain limited history for undo operations, so that I can correct recent mistakes without consuming excessive memory.

#### Acceptance Criteria

1. THE Serve_History SHALL store a maximum of 10 previous serve states
2. WHEN Serve_History exceeds 10 entries, THE System SHALL remove the oldest entry
3. THE Action_History SHALL store a maximum of 20 previous match states
4. WHEN Action_History exceeds 20 entries, THE System SHALL remove the oldest entry
5. WHEN a match finishes, THE System SHALL clear both Serve_History and Action_History
6. WHEN a match is reset, THE System SHALL clear both Serve_History and Action_History

### Requirement 12: Error Handling

**User Story:** As a Referee, I want clear error messages when operations fail, so that I understand what went wrong and can take corrective action.

#### Acceptance Criteria

1. WHEN storage persistence fails, THE System SHALL display an error message to the Referee
2. WHEN serve state restoration fails, THE System SHALL initialize with default serve state
3. WHEN serve state restoration fails, THE System SHALL log the error to the browser console
4. IF Serve_History becomes corrupted, THE System SHALL clear the history and continue operation
5. IF Action_History becomes corrupted, THE System SHALL clear the history and continue operation
6. THE error messages SHALL be displayed in the same language as the current UI (Vietnamese or English)
7. THE error messages SHALL provide actionable guidance (e.g., "Please reload the page")

