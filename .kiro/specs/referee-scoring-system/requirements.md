# Requirements Document

## Introduction

The Pickleball Referee Scoring System provides a fast, intuitive interface for referees to input match scores in real-time during Pickleball tournaments. The system enforces all game rules automatically, eliminating the need for referees to remember complex scoring logic. It supports doubles matches with configurable rules, real-time synchronization for multiple viewers, and generates score calls automatically.

## Glossary

- **Referee_UI**: The scoring interface used by referees to input match scores
- **Viewer_Display**: The read-only display shown to spectators and users
- **Game_State**: The complete state of a match including scores, server, and status
- **Serving_Team**: The team currently serving in the match
- **Server_Number**: Indicates which player (1 or 2) is serving on the serving team
- **Score_Call**: The verbal announcement format (e.g., "5-3-1" for doubles)
- **Rally**: A single point of play ending when one team scores or commits a fault
- **Fault**: A rule violation that ends the rally without awarding a point
- **Set**: A game played to a target score (typically 11, 15, or 21 points)
- **Match**: A complete contest consisting of one or more sets
- **Win_By_Rule**: The requirement to win by a minimum margin (typically 2 points)
- **History_Stack**: A record of previous game states enabling undo functionality
- **Sync_Engine**: The real-time synchronization system using Supabase
- **Match_Lock**: A mechanism to prevent concurrent editing conflicts

## Requirements

### Requirement 1: Core Scoring Interface

**User Story:** As a referee, I want a simple scoring interface with large buttons, so that I can input scores quickly with one tap per action.

#### Acceptance Criteria

1. THE Referee_UI SHALL display both teams with their current scores
2. THE Referee_UI SHALL highlight the serving team visually
3. THE Referee_UI SHALL display the current server (Team + Player: Server 1 or Server 2)
4. THE Referee_UI SHALL display the score call in standard format
5. THE Referee_UI SHALL provide buttons for [TEAM A SCORES], [TEAM B SCORES], [UNDO]
6. WHERE fault buttons are enabled, THE Referee_UI SHALL provide [FAULT TEAM A] and [FAULT TEAM B] buttons
7. THE Referee_UI SHALL use large, touch-friendly buttons optimized for mobile devices
8. WHEN any button is pressed, THE Referee_UI SHALL execute the action with a single tap

### Requirement 2: Game State Management

**User Story:** As a system, I want to maintain complete game state, so that all match information is tracked accurately.

#### Acceptance Criteria

1. THE Game_State SHALL store team A score and team B score
2. THE Game_State SHALL store the serving team identifier
3. THE Game_State SHALL store the server number (1 or 2)
4. THE Game_State SHALL store the current set number
5. THE Game_State SHALL store completed sets with their final scores
6. THE Game_State SHALL store match format configuration (BO1, BO3, or BO5)
7. THE Game_State SHALL store target score (11, 15, or 21)
8. THE Game_State SHALL store win-by margin requirement
9. THE Game_State SHALL store match status (playing, completed, or paused)

### Requirement 3: Serving Team Scores

**User Story:** As a referee, I want the system to handle scoring when the serving team wins a rally, so that points are awarded correctly.

#### Acceptance Criteria

1. WHEN the serving team wins a rally, THE Game_State SHALL increment the serving team score by 1
2. WHEN the serving team wins a rally, THE Game_State SHALL keep the same server
3. WHEN the serving team wins a rally, THE Score_Call SHALL update to reflect the new score

### Requirement 4: Receiving Team Wins Rally

**User Story:** As a referee, I want the system to handle server changes when the receiving team wins, so that serving rotates correctly.

#### Acceptance Criteria

1. WHEN the receiving team wins a rally, THE Game_State SHALL not add points to either team
2. WHEN the receiving team wins a rally AND server number is 1, THE Game_State SHALL change server number to 2
3. WHEN the receiving team wins a rally AND server number is 2, THE Game_State SHALL switch the serving team
4. WHEN the receiving team wins a rally AND server number is 2, THE Game_State SHALL set server number to 1

### Requirement 5: Match Initialization

**User Story:** As a referee, I want matches to start with correct initial state, so that the first serve follows tournament rules.

#### Acceptance Criteria

1. WHEN a match starts, THE Game_State SHALL set Team A as the serving team
2. WHEN a match starts, THE Game_State SHALL set server number to 1
3. WHERE first serve single rule is enabled, THE Game_State SHALL allow only one serve for the first serving team
4. WHERE first serve single rule is disabled, THE Game_State SHALL allow both servers for the first serving team

### Requirement 6: Fault Handling

**User Story:** As a referee, I want to record faults, so that rule violations are handled correctly without awarding points.

#### Acceptance Criteria

1. WHEN a fault button is pressed for the serving team, THE Game_State SHALL treat it as a lost rally
2. WHEN a fault button is pressed for the serving team, THE Game_State SHALL not add points
3. WHEN a fault button is pressed for the serving team, THE Game_State SHALL trigger server change logic
4. WHEN a fault button is pressed for the receiving team, THE Game_State SHALL treat it as a won rally for the serving team
5. WHEN a fault button is pressed for the receiving team, THE Game_State SHALL add 1 point to the serving team

### Requirement 7: Undo Functionality

**User Story:** As a referee, I want to undo the most recent action, so that I can correct mistakes immediately.

#### Acceptance Criteria

1. THE History_Stack SHALL store at least 10 previous game states
2. WHEN the undo button is pressed, THE Game_State SHALL restore the previous state from the history stack
3. WHEN the undo button is pressed, THE Referee_UI SHALL update to reflect the restored state
4. WHEN the history stack is empty, THE Referee_UI SHALL disable the undo button

### Requirement 8: Score Call Generation

**User Story:** As a referee, I want the system to generate score calls automatically, so that I can announce scores correctly.

#### Acceptance Criteria

1. THE Score_Call SHALL display in the format "{teamA_score} - {teamB_score} - {server_number}" for doubles matches
2. WHEN any score or server changes, THE Score_Call SHALL update in real-time
3. THE Score_Call SHALL be prominently displayed on the Referee_UI

### Requirement 9: Set Win Detection

**User Story:** As a referee, I want the system to detect when a set is won, so that matches progress correctly.

#### Acceptance Criteria

1. WHEN a team score reaches the target score AND the lead is at least the win-by margin, THE Game_State SHALL mark the set as won
2. WHEN a set is won, THE Referee_UI SHALL display a popup showing which team won the set
3. WHEN a set is won, THE Referee_UI SHALL provide [Next Set] and [End Match] buttons
4. WHEN the Next Set button is pressed, THE Game_State SHALL reset both team scores to 0
5. WHEN the Next Set button is pressed, THE Game_State SHALL increment the current set number
6. WHERE serve switching is enabled, WHEN the Next Set button is pressed, THE Game_State SHALL switch the serving team
7. WHEN the Next Set button is pressed, THE Game_State SHALL save the completed set scores

### Requirement 10: Match Completion

**User Story:** As a referee, I want the system to determine when a match is complete, so that winners are declared correctly.

#### Acceptance Criteria

1. WHEN a team wins the required number of sets for the match format, THE Game_State SHALL mark the match as completed
2. WHEN a match is completed, THE Referee_UI SHALL display the final result
3. WHEN a match is completed, THE Referee_UI SHALL prevent further score changes
4. THE Game_State SHALL support BO1 (best of 1), BO3 (best of 3), and BO5 (best of 5) match formats

### Requirement 11: Configurable Rules

**User Story:** As a tournament organizer, I want to configure match rules, so that different tournament formats are supported.

#### Acceptance Criteria

1. THE Game_State SHALL support configurable target scores of 11, 15, or 21 points
2. THE Game_State SHALL support configurable win-by margins (typically 2 points)
3. THE Game_State SHALL support configurable match formats (BO1, BO3, BO5)
4. THE Game_State SHALL support configurable first serve single rule (true or false)
5. THE Game_State SHALL support configurable fault button visibility (true or false)

### Requirement 12: Role-Based Access

**User Story:** As a system administrator, I want to control who can edit scores, so that only referees can input scores.

#### Acceptance Criteria

1. THE Referee_UI SHALL be accessible only to users with referee role
2. THE Referee_UI SHALL allow score input, undo, and match control actions
3. THE Viewer_Display SHALL be accessible to all users
4. THE Viewer_Display SHALL display scores, server, and set information in read-only mode
5. THE Viewer_Display SHALL not display connection status or administrative controls

### Requirement 13: Real-Time Synchronization

**User Story:** As a spectator, I want to see score updates in real-time, so that I can follow the match as it happens.

#### Acceptance Criteria

1. WHEN a score changes on the Referee_UI, THE Sync_Engine SHALL propagate the change to all connected Viewer_Displays within 1 second
2. THE Sync_Engine SHALL use Supabase real-time subscriptions for synchronization
3. WHEN multiple viewers are connected, THE Sync_Engine SHALL update all viewers simultaneously
4. WHEN network latency occurs, THE Sync_Engine SHALL queue updates and apply them in order

### Requirement 14: Conflict Resolution

**User Story:** As a system, I want to handle concurrent edits, so that score integrity is maintained when multiple referees are present.

#### Acceptance Criteria

1. WHEN a match is being edited by a referee, THE Match_Lock SHALL prevent other referees from editing simultaneously
2. WHERE match locking is not implemented, THE Sync_Engine SHALL use last-write-wins conflict resolution
3. WHEN a conflict occurs, THE Referee_UI SHALL display a warning message
4. WHEN a conflict occurs, THE Referee_UI SHALL offer to reload the current match state

### Requirement 15: Input Validation

**User Story:** As a system, I want to validate all score inputs, so that invalid game states are prevented.

#### Acceptance Criteria

1. THE Referee_UI SHALL prevent points from being awarded to the non-serving team
2. THE Referee_UI SHALL prevent scores that violate the win-by rule
3. THE Referee_UI SHALL debounce button clicks with a 300ms delay to prevent double-clicks
4. WHEN the page is reloaded, THE Game_State SHALL persist and restore the current match state
5. WHEN network lag occurs, THE Referee_UI SHALL prevent duplicate actions from being applied

### Requirement 16: Featured Match Display

**User Story:** As a spectator, I want to see featured matches on a large display, so that I can follow important matches easily.

#### Acceptance Criteria

1. THE Viewer_Display SHALL provide a fullscreen mode optimized for TV displays
2. WHERE multiple matches are live, THE Viewer_Display SHALL rotate between matches every 5 seconds
3. THE Viewer_Display SHALL prioritize live matches over completed matches
4. THE Viewer_Display SHALL display match status, scores, and server information prominently

### Requirement 17: State Management Architecture

**User Story:** As a developer, I want a robust state management system, so that game state changes are predictable and testable.

#### Acceptance Criteria

1. THE Game_State SHALL use a reducer pattern for state updates
2. THE Game_State SHALL support actions: SCORE_TEAM_A, SCORE_TEAM_B, FAULT_TEAM_A, FAULT_TEAM_B, UNDO, NEXT_SET
3. THE Game_State SHALL validate all state transitions before applying them
4. THE Game_State SHALL emit events when state changes occur
5. THE Game_State SHALL be serializable to JSON for persistence

### Requirement 18: Error Handling and Stability

**User Story:** As a referee, I want the system to remain stable under all conditions, so that matches are never interrupted.

#### Acceptance Criteria

1. WHEN buttons are clicked rapidly, THE Referee_UI SHALL process actions correctly without crashing
2. WHEN network connectivity is lost, THE Referee_UI SHALL continue to function using local state
3. WHEN network connectivity is restored, THE Sync_Engine SHALL synchronize the local state with the server
4. THE Referee_UI SHALL display error messages when synchronization fails
5. THE Referee_UI SHALL provide a manual sync button to retry failed synchronizations

### Requirement 19: Testing Requirements

**User Story:** As a quality assurance engineer, I want comprehensive tests, so that the system is reliable in production.

#### Acceptance Criteria

1. THE Game_State SHALL have unit tests covering all state transitions
2. THE Game_State SHALL have property-based tests for scoring logic invariants
3. THE Sync_Engine SHALL have integration tests for real-time synchronization
4. THE Referee_UI SHALL have end-to-end tests for complete match flows
5. THE Game_State SHALL have tests for edge cases including rapid clicking, network failures, and concurrent edits
