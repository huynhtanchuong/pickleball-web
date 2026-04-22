# Design Document: Referee Scoring System

## Overview

The Referee Scoring System is a real-time match scoring interface for Pickleball tournaments. It provides referees with a one-tap scoring interface that automatically enforces all game rules, eliminating the need to remember complex serving rotation and scoring logic. The system uses a reducer-based state management pattern for predictable state transitions, Supabase for real-time synchronization, and supports configurable match formats (BO1/BO3/BO5) with target scores of 11, 15, or 21 points.

The system consists of two primary interfaces:
- **Referee UI**: Full-featured scoring interface with score input, undo, and match control
- **Viewer Display**: Read-only display for spectators with real-time updates

Key features include automatic server rotation, fault handling, set/match completion detection, undo functionality with history stack, and conflict resolution for concurrent edits.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
├──────────────────────────┬──────────────────────────────────┤
│    Referee UI            │    Viewer Display                │
│  - Score buttons         │  - Read-only scores              │
│  - Undo button           │  - Server indicator              │
│  - Match controls        │  - Set scores                    │
│  - Status indicators     │  - Match status                  │
└──────────────┬───────────┴──────────────┬───────────────────┘
               │                          │
               └──────────┬───────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────┐
│                  State Management Layer                    │
│  ┌──────────────────────────────────────────────────────┐ │
│  │         GameStateReducer (Pure Functions)            │ │
│  │  - SCORE_TEAM_A / SCORE_TEAM_B                       │ │
│  │  - FAULT_TEAM_A / FAULT_TEAM_B                       │ │
│  │  - UNDO / NEXT_SET / END_MATCH                       │ │
│  │  - State validation & transitions                    │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │         HistoryManager (Undo Stack)                  │ │
│  │  - Push state snapshots (max 10)                     │ │
│  │  - Pop for undo operations                           │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────┬──────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────┐
│              Synchronization Layer                         │
│  ┌──────────────────────────────────────────────────────┐ │
│  │         SyncEngine (Supabase Realtime)               │ │
│  │  - Subscribe to match updates                        │ │
│  │  - Publish state changes                             │ │
│  │  - Conflict detection (updated_at timestamps)        │ │
│  │  - Debounced writes (300ms)                          │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────┬──────────────────────────────┘
                             │
┌────────────────────────────▼──────────────────────────────┐
│                   Data Layer                               │
│  ┌──────────────────────────────────────────────────────┐ │
│  │         Supabase / LocalStorage                      │ │
│  │  - matches table (persistent state)                  │ │
│  │  - Real-time subscriptions                           │ │
│  │  - Optimistic updates with rollback                  │ │
│  └──────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

```
User Action (Score Button)
    │
    ▼
UI Layer (debounce 300ms)
    │
    ▼
Dispatch Action → GameStateReducer
    │                    │
    │                    ▼
    │            Validate Transition
    │                    │
    │                    ▼
    │            Compute New State
    │                    │
    │                    ▼
    │            Update History Stack
    │                    │
    ▼                    ▼
SyncEngine ◄─────── New State
    │
    ▼
Supabase (persist + broadcast)
    │
    ▼
All Connected Clients (realtime update)
```

## Components and Interfaces

### 1. GameState (Core Data Structure)

```javascript
interface GameState {
  // Match identification
  matchId: string;
  tournamentId: string;
  
  // Teams
  teamA: string;
  teamB: string;
  
  // Current scores
  scoreA: number;
  scoreB: number;
  
  // Serving state
  servingTeam: 'A' | 'B';
  serverNumber: 1 | 2;
  
  // Set tracking
  currentSet: number;
  completedSets: Array<{
    setNumber: number;
    scoreA: number;
    scoreB: number;
    winner: 'A' | 'B';
  }>;
  
  // Match configuration
  config: {
    matchFormat: 'BO1' | 'BO3' | 'BO5';
    targetScore: 11 | 15 | 21;
    winByMargin: number;  // typically 2
    firstServeSingle: boolean;
    enableFaultButtons: boolean;
  };
  
  // Match status
  status: 'not_started' | 'playing' | 'set_complete' | 'match_complete';
  
  // Metadata
  updatedAt: string;  // ISO timestamp for conflict detection
  updatedBy: string;  // referee ID
}
```

### 2. GameStateReducer

Pure function that handles all state transitions:

```javascript
function gameStateReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SCORE_TEAM_A':
      return handleScore(state, 'A');
    case 'SCORE_TEAM_B':
      return handleScore(state, 'B');
    case 'FAULT_TEAM_A':
      return handleFault(state, 'A');
    case 'FAULT_TEAM_B':
      return handleFault(state, 'B');
    case 'UNDO':
      return historyManager.pop();
    case 'NEXT_SET':
      return startNextSet(state);
    case 'END_MATCH':
      return { ...state, status: 'match_complete' };
    case 'LOAD_STATE':
      return action.payload;
    default:
      return state;
  }
}
```

**Key Functions:**

- `handleScore(state, team)`: Awards point to serving team, checks for set/match win
- `handleFault(state, team)`: Rotates server without awarding points
- `rotateServer(state)`: Implements server rotation logic
- `checkSetWin(state)`: Detects set completion based on target score and win-by rule
- `checkMatchWin(state)`: Determines if match is complete based on sets won

### 3. HistoryManager

Manages undo functionality with a bounded stack:

```javascript
class HistoryManager {
  private stack: GameState[] = [];
  private maxSize: number = 10;
  
  push(state: GameState): void {
    if (this.stack.length >= this.maxSize) {
      this.stack.shift();  // Remove oldest
    }
    this.stack.push(deepClone(state));
  }
  
  pop(): GameState | null {
    return this.stack.pop() || null;
  }
  
  canUndo(): boolean {
    return this.stack.length > 0;
  }
  
  clear(): void {
    this.stack = [];
  }
}
```

### 4. SyncEngine

Handles real-time synchronization with Supabase:

```javascript
class SyncEngine {
  private supabase: SupabaseClient;
  private channel: RealtimeChannel;
  private debounceTimer: number | null = null;
  
  // Subscribe to match updates
  subscribe(matchId: string, callback: (state: GameState) => void): void {
    this.channel = this.supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
          (payload) => callback(this.deserializeState(payload.new)))
      .subscribe();
  }
  
  // Publish state changes (debounced)
  async publish(state: GameState): Promise<void> {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    
    this.debounceTimer = setTimeout(async () => {
      const conflict = await this.checkConflict(state.matchId, state.updatedAt);
      if (conflict) {
        this.handleConflict(state.matchId);
        return;
      }
      
      await this.supabase
        .from('matches')
        .update(this.serializeState(state))
        .eq('id', state.matchId);
    }, 300);
  }
  
  // Conflict detection
  async checkConflict(matchId: string, knownTimestamp: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('matches')
      .select('updated_at')
      .eq('id', matchId)
      .single();
    
    return data && data.updated_at !== knownTimestamp;
  }
}
```

### 5. RefereeUI Component

```javascript
class RefereeUI {
  private state: GameState;
  private reducer: typeof gameStateReducer;
  private history: HistoryManager;
  private sync: SyncEngine;
  
  render(): void {
    // Display team names and scores
    // Highlight serving team
    // Show score call (e.g., "5-3-1")
    // Render action buttons
    // Show set scores
    // Display match status
  }
  
  handleScoreButton(team: 'A' | 'B'): void {
    this.history.push(this.state);
    this.state = this.reducer(this.state, { type: `SCORE_TEAM_${team}` });
    this.sync.publish(this.state);
    this.render();
  }
  
  handleFaultButton(team: 'A' | 'B'): void {
    this.history.push(this.state);
    this.state = this.reducer(this.state, { type: `FAULT_TEAM_${team}` });
    this.sync.publish(this.state);
    this.render();
  }
  
  handleUndo(): void {
    const previousState = this.history.pop();
    if (previousState) {
      this.state = previousState;
      this.sync.publish(this.state);
      this.render();
    }
  }
}
```

### 6. ViewerDisplay Component

```javascript
class ViewerDisplay {
  private state: GameState;
  private sync: SyncEngine;
  
  initialize(matchId: string): void {
    this.sync.subscribe(matchId, (newState) => {
      this.state = newState;
      this.render();
    });
  }
  
  render(): void {
    // Display team names and scores (read-only)
    // Show serving team indicator
    // Display score call
    // Show set scores
    // Display match status badge
  }
}
```

## Data Models

### Database Schema (Supabase)

#### matches table (extended)

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_id UUID REFERENCES tournaments(id),
  
  -- Teams
  teamA TEXT NOT NULL,
  teamB TEXT NOT NULL,
  
  -- Current scores
  scoreA INTEGER DEFAULT 0,
  scoreB INTEGER DEFAULT 0,
  
  -- Serving state
  serving_team TEXT CHECK (serving_team IN ('A', 'B')),
  server_number INTEGER CHECK (server_number IN (1, 2)),
  
  -- Set tracking
  current_set INTEGER DEFAULT 1,
  completed_sets JSONB DEFAULT '[]',
  
  -- Match configuration
  match_config JSONB DEFAULT '{
    "matchFormat": "BO3",
    "targetScore": 11,
    "winByMargin": 2,
    "firstServeSingle": true,
    "enableFaultButtons": false
  }',
  
  -- Match status
  status TEXT CHECK (status IN ('not_started', 'playing', 'set_complete', 'match_complete')),
  
  -- Existing fields
  stage TEXT,
  group_name TEXT,
  match_time TEXT,
  court TEXT,
  referee TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by TEXT
);

-- Index for real-time queries
CREATE INDEX idx_matches_tournament_status ON matches(tournament_id, status);
CREATE INDEX idx_matches_updated_at ON matches(updated_at);
```

### LocalStorage Schema (Demo Mode)

```javascript
{
  "pb_matches": [
    {
      "id": "match_1",
      "tournamentId": "tournament_1",
      "teamA": "Team A",
      "teamB": "Team B",
      "scoreA": 5,
      "scoreB": 3,
      "servingTeam": "A",
      "serverNumber": 1,
      "currentSet": 1,
      "completedSets": [],
      "config": {
        "matchFormat": "BO3",
        "targetScore": 11,
        "winByMargin": 2,
        "firstServeSingle": true,
        "enableFaultButtons": false
      },
      "status": "playing",
      "updatedAt": "2026-01-15T10:30:00Z"
    }
  ],
  "pb_match_history": {
    "match_1": [
      // Array of previous GameState snapshots (max 10)
    ]
  }
}
```

## Error Handling

### Error Categories

1. **Validation Errors**: Invalid state transitions (e.g., awarding points to non-serving team)
2. **Sync Errors**: Network failures, conflict detection, timeout
3. **UI Errors**: Rapid clicking, double-tap prevention
4. **Data Errors**: Corrupted state, missing fields

### Error Handling Strategy

```javascript
class ErrorHandler {
  handleValidationError(error: ValidationError): void {
    // Log error
    console.error('Validation error:', error);
    
    // Show user-friendly message
    this.showToast('Invalid action: ' + error.message, 'warning');
    
    // Do not update state
  }
  
  handleSyncError(error: SyncError): void {
    // Log error
    console.error('Sync error:', error);
    
    // Show retry option
    this.showToast('Failed to sync. Retrying...', 'error');
    
    // Queue for retry
    this.retryQueue.push(error.operation);
    
    // Continue with local state
  }
  
  handleConflict(matchId: string): void {
    // Show conflict banner
    this.showConflictBanner(matchId);
    
    // Offer to reload
    this.showReloadButton();
  }
  
  handleNetworkOffline(): void {
    // Show offline indicator
    this.showOfflineIndicator();
    
    // Continue with local state
    // Queue all changes for sync when online
  }
}
```

### Retry Logic

```javascript
class RetryQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing: boolean = false;
  
  async add(operation: () => Promise<void>): Promise<void> {
    this.queue.push(operation);
    if (!this.isProcessing) {
      await this.process();
    }
  }
  
  private async process(): Promise<void> {
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const operation = this.queue[0];
      try {
        await operation();
        this.queue.shift();  // Remove on success
      } catch (error) {
        // Exponential backoff
        await this.delay(Math.min(1000 * Math.pow(2, this.queue.length), 30000));
      }
    }
    
    this.isProcessing = false;
  }
}
```

## Testing Strategy

The Referee Scoring System requires comprehensive testing across multiple layers to ensure reliability in production. The testing strategy combines unit tests for state management logic, property-based tests for scoring invariants, integration tests for real-time synchronization, and end-to-end tests for complete match flows.

### Unit Tests

**Scope**: Pure functions in GameStateReducer, HistoryManager, utility functions

**Test Cases**:
- State transitions for all action types (SCORE_TEAM_A, SCORE_TEAM_B, FAULT_TEAM_A, FAULT_TEAM_B, UNDO, NEXT_SET)
- Server rotation logic (server 1 → server 2 → switch team)
- Set win detection (target score + win-by margin)
- Match win detection (BO1, BO3, BO5 formats)
- First serve single rule enforcement
- History stack operations (push, pop, max size)
- Score call generation (format: "scoreA-scoreB-serverNumber")

**Example Tests**:
```javascript
describe('GameStateReducer', () => {
  test('SCORE_TEAM_A increments serving team score', () => {
    const state = { servingTeam: 'A', scoreA: 5, scoreB: 3, ... };
    const newState = gameStateReducer(state, { type: 'SCORE_TEAM_A' });
    expect(newState.scoreA).toBe(6);
    expect(newState.servingTeam).toBe('A');
    expect(newState.serverNumber).toBe(state.serverNumber);
  });
  
  test('FAULT_TEAM_A rotates server without scoring', () => {
    const state = { servingTeam: 'A', serverNumber: 1, scoreA: 5, scoreB: 3, ... };
    const newState = gameStateReducer(state, { type: 'FAULT_TEAM_A' });
    expect(newState.scoreA).toBe(5);  // No score change
    expect(newState.serverNumber).toBe(2);  // Server rotates
  });
  
  test('Set win detected at target score with win-by margin', () => {
    const state = { scoreA: 10, scoreB: 8, config: { targetScore: 11, winByMargin: 2 }, ... };
    const newState = gameStateReducer(state, { type: 'SCORE_TEAM_A' });
    expect(newState.status).toBe('set_complete');
    expect(newState.completedSets).toHaveLength(1);
  });
});
```

### Property-Based Tests

Property-based testing is appropriate for this feature because the scoring logic contains universal invariants that must hold across all possible game states and action sequences. The system implements pure functions with clear input/output behavior, making it ideal for PBT.

**Why PBT Applies**:
- The GameStateReducer is a pure function with deterministic behavior
- Scoring rules are universal properties that hold for all valid inputs
- The input space is large (many possible game states and action sequences)
- We're testing core business logic, not infrastructure or UI rendering

**Property Test Configuration**:
- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: **Feature: referee-scoring-system, Property {number}: {property_text}**


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following properties and performed reflection to eliminate redundancy:

**Redundancies Identified:**
- Properties 3.1 and 3.2 (serving team scores and keeps server) can be combined into a single comprehensive property about serving team scoring behavior
- Properties 4.2, 4.3, and 4.4 (server rotation logic) can be combined into a single comprehensive property about server rotation
- Properties 6.1, 6.2, and 6.3 (fault handling for serving team) are redundant with property 4.1 (receiving team wins rally)
- Properties 6.4 and 6.5 (fault by receiving team) are redundant with property 3.1 (serving team scores)
- Property 8.1 is redundant with property 1.4 (score call format)
- Property 8.2 (score call updates) is implied by the score call format property
- Properties 9.4, 9.5, and 9.7 (set transition behavior) can be combined into a single comprehensive property

**Final Property Set:**
After eliminating redundancies, the following properties provide comprehensive coverage without overlap:

### Property 1: Score Call Format

*For any* game state, the score call SHALL be formatted as "{scoreA}-{scoreB}-{serverNumber}" where scoreA and scoreB are non-negative integers and serverNumber is 1 or 2.

**Validates: Requirements 1.4, 8.1**

### Property 2: Serving Team Scoring

*For any* game state where team X is the serving team, when team X scores a point, the system SHALL increment team X's score by 1 AND maintain the same serving team AND maintain the same server number.

**Validates: Requirements 3.1, 3.2, 6.4, 6.5**

### Property 3: Server Rotation on Fault

*For any* game state, when the serving team commits a fault:
- IF serverNumber is 1, THEN serverNumber SHALL become 2 and servingTeam SHALL remain unchanged
- IF serverNumber is 2, THEN servingTeam SHALL switch to the other team and serverNumber SHALL become 1
- Scores SHALL remain unchanged

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3**

### Property 4: Set Completion Detection

*For any* game state with target score T and win-by margin M, when a team's score reaches or exceeds T AND the score difference is at least M, the system SHALL mark the set as complete and add the set to completedSets array.

**Validates: Requirements 9.1**

### Property 5: Set Transition

*For any* game state where a set is complete, when the NEXT_SET action is applied, the system SHALL:
- Reset scoreA and scoreB to 0
- Increment currentSet by 1
- Add the completed set scores to the completedSets array
- Preserve all other state (serving team, server number, match config)

**Validates: Requirements 9.4, 9.5, 9.7**

### Property 6: Match Completion Detection

*For any* game state with match format F (BO1/BO3/BO5), when a team wins the required number of sets (1 for BO1, 2 for BO3, 3 for BO5), the system SHALL mark the match status as 'match_complete'.

**Validates: Requirements 10.1**

### Property 7: Undo Restores Previous State

*For any* sequence of valid actions applied to a game state, when the UNDO action is applied, the system SHALL restore the game state to exactly the state before the last action was applied (excluding the history stack itself).

**Validates: Requirements 7.2**

### Property 8: Invalid Actions Rejected

*For any* game state, when an action attempts to award points to the non-serving team, the system SHALL reject the action and leave the state unchanged.

**Validates: Requirements 15.1**

### Property 9: Win-By Rule Enforcement

*For any* game state with target score T and win-by margin M, when a team reaches score T but the score difference is less than M, the system SHALL NOT mark the set as complete and SHALL allow play to continue.

**Validates: Requirements 15.2**

### Property 10: State Persistence Round-Trip

*For any* valid game state, when serialized to JSON and then deserialized, the resulting state SHALL be equivalent to the original state (all fields equal).

**Validates: Requirements 15.4, 17.5**

### Property 11: State Validation

*For any* state transition, the system SHALL validate that the resulting state satisfies all invariants:
- Scores are non-negative integers
- servingTeam is 'A' or 'B'
- serverNumber is 1 or 2
- currentSet is a positive integer
- status is one of the valid status values
- completedSets array contains valid set records

**Validates: Requirements 17.3**


## Testing Strategy (Continued)

### Property-Based Test Implementation

**Library Selection**: Use `fast-check` for JavaScript property-based testing

**Test Structure**:
```javascript
import fc from 'fast-check';

describe('Correctness Properties', () => {
  test('Property 1: Score Call Format', () => {
    fc.assert(
      fc.property(
        gameStateArbitrary(),
        (state) => {
          const scoreCall = generateScoreCall(state);
          const pattern = /^\d+-\d+-[12]$/;
          expect(scoreCall).toMatch(pattern);
          
          const [scoreA, scoreB, serverNum] = scoreCall.split('-').map(Number);
          expect(scoreA).toBe(state.scoreA);
          expect(scoreB).toBe(state.scoreB);
          expect(serverNum).toBe(state.serverNumber);
        }
      ),
      { numRuns: 100 }
    );
  }, { tag: 'Feature: referee-scoring-system, Property 1: Score call format' });
  
  test('Property 2: Serving Team Scoring', () => {
    fc.assert(
      fc.property(
        gameStateArbitrary(),
        (state) => {
          const servingTeam = state.servingTeam;
          const action = { type: `SCORE_TEAM_${servingTeam}` };
          const newState = gameStateReducer(state, action);
          
          // Score increments by 1
          const scoreKey = `score${servingTeam}`;
          expect(newState[scoreKey]).toBe(state[scoreKey] + 1);
          
          // Serving team unchanged
          expect(newState.servingTeam).toBe(state.servingTeam);
          
          // Server number unchanged
          expect(newState.serverNumber).toBe(state.serverNumber);
        }
      ),
      { numRuns: 100 }
    );
  }, { tag: 'Feature: referee-scoring-system, Property 2: Serving team scoring' });
  
  test('Property 3: Server Rotation on Fault', () => {
    fc.assert(
      fc.property(
        gameStateArbitrary(),
        (state) => {
          const servingTeam = state.servingTeam;
          const action = { type: `FAULT_TEAM_${servingTeam}` };
          const newState = gameStateReducer(state, action);
          
          // Scores unchanged
          expect(newState.scoreA).toBe(state.scoreA);
          expect(newState.scoreB).toBe(state.scoreB);
          
          // Server rotation logic
          if (state.serverNumber === 1) {
            expect(newState.serverNumber).toBe(2);
            expect(newState.servingTeam).toBe(state.servingTeam);
          } else {
            expect(newState.serverNumber).toBe(1);
            expect(newState.servingTeam).toBe(state.servingTeam === 'A' ? 'B' : 'A');
          }
        }
      ),
      { numRuns: 100 }
    );
  }, { tag: 'Feature: referee-scoring-system, Property 3: Server rotation on fault' });
  
  test('Property 4: Set Completion Detection', () => {
    fc.assert(
      fc.property(
        gameStateNearTargetArbitrary(),
        (state) => {
          const { targetScore, winByMargin } = state.config;
          const scoreDiff = Math.abs(state.scoreA - state.scoreB);
          const maxScore = Math.max(state.scoreA, state.scoreB);
          
          if (maxScore >= targetScore && scoreDiff >= winByMargin) {
            expect(state.status).toBe('set_complete');
            expect(state.completedSets.length).toBeGreaterThan(0);
          } else {
            expect(state.status).not.toBe('set_complete');
          }
        }
      ),
      { numRuns: 100 }
    );
  }, { tag: 'Feature: referee-scoring-system, Property 4: Set completion detection' });
  
  test('Property 7: Undo Restores Previous State', () => {
    fc.assert(
      fc.property(
        gameStateArbitrary(),
        validActionArbitrary(),
        (initialState, action) => {
          // Apply action
          const history = new HistoryManager();
          history.push(initialState);
          const newState = gameStateReducer(initialState, action);
          
          // Undo
          const restoredState = history.pop();
          
          // Verify restoration (excluding history stack)
          expect(restoredState.scoreA).toBe(initialState.scoreA);
          expect(restoredState.scoreB).toBe(initialState.scoreB);
          expect(restoredState.servingTeam).toBe(initialState.servingTeam);
          expect(restoredState.serverNumber).toBe(initialState.serverNumber);
          expect(restoredState.currentSet).toBe(initialState.currentSet);
        }
      ),
      { numRuns: 100 }
    );
  }, { tag: 'Feature: referee-scoring-system, Property 7: Undo restores previous state' });
  
  test('Property 10: State Persistence Round-Trip', () => {
    fc.assert(
      fc.property(
        gameStateArbitrary(),
        (state) => {
          const serialized = JSON.stringify(state);
          const deserialized = JSON.parse(serialized);
          
          expect(deserialized).toEqual(state);
        }
      ),
      { numRuns: 100 }
    );
  }, { tag: 'Feature: referee-scoring-system, Property 10: State persistence round-trip' });
});
```

**Arbitrary Generators**:
```javascript
// Generate random valid game states
function gameStateArbitrary() {
  return fc.record({
    matchId: fc.uuid(),
    tournamentId: fc.uuid(),
    teamA: fc.string({ minLength: 1, maxLength: 50 }),
    teamB: fc.string({ minLength: 1, maxLength: 50 }),
    scoreA: fc.nat({ max: 30 }),
    scoreB: fc.nat({ max: 30 }),
    servingTeam: fc.constantFrom('A', 'B'),
    serverNumber: fc.constantFrom(1, 2),
    currentSet: fc.integer({ min: 1, max: 5 }),
    completedSets: fc.array(completedSetArbitrary(), { maxLength: 4 }),
    config: configArbitrary(),
    status: fc.constantFrom('not_started', 'playing', 'set_complete', 'match_complete'),
    updatedAt: fc.date().map(d => d.toISOString()),
    updatedBy: fc.uuid()
  });
}

// Generate game states near target score for set completion testing
function gameStateNearTargetArbitrary() {
  return fc.record({
    // ... same as gameStateArbitrary but with scores near target
    scoreA: fc.integer({ min: 8, max: 25 }),
    scoreB: fc.integer({ min: 8, max: 25 }),
    config: configArbitrary()
  });
}

function configArbitrary() {
  return fc.record({
    matchFormat: fc.constantFrom('BO1', 'BO3', 'BO5'),
    targetScore: fc.constantFrom(11, 15, 21),
    winByMargin: fc.integer({ min: 1, max: 3 }),
    firstServeSingle: fc.boolean(),
    enableFaultButtons: fc.boolean()
  });
}

function completedSetArbitrary() {
  return fc.record({
    setNumber: fc.integer({ min: 1, max: 5 }),
    scoreA: fc.nat({ max: 30 }),
    scoreB: fc.nat({ max: 30 }),
    winner: fc.constantFrom('A', 'B')
  });
}

function validActionArbitrary() {
  return fc.constantFrom(
    { type: 'SCORE_TEAM_A' },
    { type: 'SCORE_TEAM_B' },
    { type: 'FAULT_TEAM_A' },
    { type: 'FAULT_TEAM_B' },
    { type: 'NEXT_SET' }
  );
}
```

### Integration Tests

**Scope**: Real-time synchronization, conflict resolution, network resilience

**Test Cases**:
- Multi-client synchronization (referee + multiple viewers)
- Conflict detection and resolution (concurrent edits)
- Network disconnection and reconnection
- Latency handling and update queuing
- Match locking (if implemented)

**Example Integration Test**:
```javascript
describe('Real-Time Synchronization', () => {
  test('Score updates propagate to all viewers within 1 second', async () => {
    // Setup: Create referee client and 3 viewer clients
    const referee = new RefereeUI(matchId);
    const viewers = [
      new ViewerDisplay(matchId),
      new ViewerDisplay(matchId),
      new ViewerDisplay(matchId)
    ];
    
    // Action: Referee scores a point
    const startTime = Date.now();
    await referee.handleScoreButton('A');
    
    // Assert: All viewers receive update within 1 second
    await Promise.all(viewers.map(viewer => 
      waitForUpdate(viewer, (state) => state.scoreA === 1, 1000)
    ));
    
    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(1000);
  });
  
  test('Conflict detection prevents data loss', async () => {
    // Setup: Two referee clients editing same match
    const referee1 = new RefereeUI(matchId);
    const referee2 = new RefereeUI(matchId);
    
    // Action: Both referees score simultaneously
    await Promise.all([
      referee1.handleScoreButton('A'),
      referee2.handleScoreButton('B')
    ]);
    
    // Assert: Conflict detected and one referee sees warning
    // (Implementation depends on conflict resolution strategy)
  });
});
```

### End-to-End Tests

**Scope**: Complete match flows from start to finish

**Test Cases**:
- Complete BO1 match (11 points, win by 2)
- Complete BO3 match with set transitions
- Complete BO5 match with all sets played
- Match with undo operations
- Match with fault handling
- Match with first serve single rule
- Match completion and result display

**Example E2E Test**:
```javascript
describe('Complete Match Flow', () => {
  test('BO3 match from start to finish', async () => {
    // Setup: Create new match
    const match = await createMatch({
      teamA: 'Team Alpha',
      teamB: 'Team Beta',
      config: {
        matchFormat: 'BO3',
        targetScore: 11,
        winByMargin: 2,
        firstServeSingle: true,
        enableFaultButtons: false
      }
    });
    
    const referee = new RefereeUI(match.id);
    
    // Set 1: Team A wins 11-5
    await playSet(referee, [
      { team: 'A', points: 11 },
      { team: 'B', points: 5 }
    ]);
    
    expect(referee.state.status).toBe('set_complete');
    expect(referee.state.completedSets).toHaveLength(1);
    
    // Start Set 2
    await referee.handleNextSet();
    expect(referee.state.scoreA).toBe(0);
    expect(referee.state.scoreB).toBe(0);
    expect(referee.state.currentSet).toBe(2);
    
    // Set 2: Team B wins 11-9
    await playSet(referee, [
      { team: 'A', points: 9 },
      { team: 'B', points: 11 }
    ]);
    
    // Set 3: Team A wins 11-7
    await referee.handleNextSet();
    await playSet(referee, [
      { team: 'A', points: 11 },
      { team: 'B', points: 7 }
    ]);
    
    // Assert: Match complete, Team A wins 2-1
    expect(referee.state.status).toBe('match_complete');
    expect(referee.state.completedSets).toHaveLength(3);
    
    const setsWonA = referee.state.completedSets.filter(s => s.winner === 'A').length;
    const setsWonB = referee.state.completedSets.filter(s => s.winner === 'B').length;
    expect(setsWonA).toBe(2);
    expect(setsWonB).toBe(1);
  });
});
```

### Test Coverage Goals

- **Unit Tests**: 100% coverage of GameStateReducer, HistoryManager, utility functions
- **Property Tests**: All 11 correctness properties with 100 iterations each
- **Integration Tests**: All real-time sync scenarios, conflict resolution, network resilience
- **E2E Tests**: All match formats (BO1, BO3, BO5), all configuration combinations
- **Edge Cases**: First serve single rule, win-by rule edge cases, rapid clicking, undo at boundaries

## Implementation Notes

### Technology Stack

- **Frontend**: Vanilla JavaScript (ES6+)
- **State Management**: Custom reducer pattern (inspired by Redux)
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Testing**: Jest + fast-check (property-based testing)
- **Deployment**: Vercel (existing deployment)

### Integration with Existing System

The Referee Scoring System integrates with the existing Pickleball tournament management application:

1. **Match Data**: Extends the existing `matches` table with new fields for serving state, set tracking, and match configuration
2. **Tournament Context**: Uses the existing `TournamentManager` to associate matches with tournaments
3. **Storage Adapter**: Uses the existing `StorageAdapter` for unified localStorage/Supabase access
4. **UI Consistency**: Follows the existing design patterns and styling from `styles.css`

### Migration Strategy

For existing matches in the database:

1. Add new columns to `matches` table with default values
2. Migrate existing matches to set `serving_team = 'A'`, `server_number = 1`, `current_set = 1`
3. Initialize `match_config` with default values (BO3, target 11, win by 2)
4. Set `status` based on existing `status` field mapping

### Performance Considerations

1. **Debouncing**: All score updates are debounced by 300ms to prevent excessive database writes
2. **Optimistic Updates**: UI updates immediately, then syncs to database
3. **Realtime Subscriptions**: Use Supabase channels with filters to minimize bandwidth
4. **History Stack**: Limited to 10 states to prevent memory issues
5. **Conflict Detection**: Lightweight timestamp comparison, no heavy locking

### Security Considerations

1. **Role-Based Access**: Referee UI requires authentication and referee role
2. **Input Validation**: All actions validated before state transitions
3. **SQL Injection**: Supabase client handles parameterization
4. **XSS Prevention**: All user input escaped before rendering
5. **Rate Limiting**: Debouncing prevents rapid-fire abuse

### Accessibility

1. **Keyboard Navigation**: All buttons accessible via keyboard
2. **Screen Reader Support**: ARIA labels on all interactive elements
3. **High Contrast**: Score displays use high contrast colors
4. **Touch Targets**: Buttons sized for easy touch (minimum 44x44px)
5. **Focus Indicators**: Clear focus states for keyboard navigation

### Internationalization

The system uses the existing i18n system (`i18n.js`) for all user-facing text:

- Score call format (may vary by locale)
- Button labels (Score, Fault, Undo, Next Set, End Match)
- Status messages (Playing, Set Complete, Match Complete)
- Error messages (Conflict, Sync Failed, Invalid Action)

### Future Enhancements

1. **Match Statistics**: Track rally duration, longest rally, service percentage
2. **Video Integration**: Sync scores with video timestamps for replay
3. **Voice Commands**: Voice-activated scoring for hands-free operation
4. **Offline Mode**: Full offline support with sync queue
5. **Match Analytics**: Post-match analysis and insights
6. **Multi-Court Management**: Referee dashboard for managing multiple courts
7. **Automated Scoring**: Integration with electronic sensors for automatic scoring

## Appendix

### State Transition Diagram

```
┌─────────────┐
│ not_started │
└──────┬──────┘
       │ First score
       ▼
┌─────────────┐
│   playing   │◄──────┐
└──────┬──────┘       │
       │              │
       │ Score/Fault  │
       │ actions      │
       └──────────────┘
       │
       │ Set win detected
       ▼
┌──────────────┐
│ set_complete │
└──────┬───────┘
       │
       ├─────► NEXT_SET ──────┐
       │                      │
       │                      ▼
       │              ┌─────────────┐
       │              │   playing   │
       │              │ (next set)  │
       │              └──────┬──────┘
       │                     │
       │                     │ Set win
       │                     ▼
       │              ┌──────────────┐
       │              │ set_complete │
       │              └──────┬───────┘
       │                     │
       │ END_MATCH           │ Match win
       │ or Match win        │ detected
       ▼                     ▼
┌─────────────────┐
│ match_complete  │
└─────────────────┘
```

### Server Rotation Logic

```
Initial State: Team A, Server 1

Team A scores → Team A, Server 1 (no change)
Team A fault  → Team A, Server 2 (rotate server)
Team A fault  → Team B, Server 1 (switch team, reset server)
Team B scores → Team B, Server 1 (no change)
Team B fault  → Team B, Server 2 (rotate server)
Team B fault  → Team A, Server 1 (switch team, reset server)

Special Case: First Serve Single Rule
If firstServeSingle = true:
  Initial State: Team A, Server 1
  Team A fault → Team B, Server 1 (skip Server 2, switch team immediately)
```

### Score Call Examples

```
State: Team A: 5, Team B: 3, Serving: Team A, Server: 1
Score Call: "5-3-1"

State: Team A: 10, Team B: 8, Serving: Team B, Server: 2
Score Call: "10-8-2"

State: Team A: 11, Team B: 9, Serving: Team A, Server: 1
Score Call: "11-9-1" (Set complete)
```

### Configuration Examples

**Standard Tournament Match (BO3, 11 points)**:
```json
{
  "matchFormat": "BO3",
  "targetScore": 11,
  "winByMargin": 2,
  "firstServeSingle": true,
  "enableFaultButtons": false
}
```

**Recreational Match (BO1, 15 points)**:
```json
{
  "matchFormat": "BO1",
  "targetScore": 15,
  "winByMargin": 2,
  "firstServeSingle": false,
  "enableFaultButtons": true
}
```

**Championship Match (BO5, 21 points)**:
```json
{
  "matchFormat": "BO5",
  "targetScore": 21,
  "winByMargin": 2,
  "firstServeSingle": true,
  "enableFaultButtons": false
}
```

