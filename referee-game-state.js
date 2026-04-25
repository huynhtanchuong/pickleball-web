// ============================================================
//  Referee Scoring System - Game State Management
//  Core data structures and utilities for match state
// ============================================================

/**
 * GameState - Core data structure representing complete match state
 * 
 * This structure maintains all information needed to track a pickleball match,
 * including scores, serving state, set tracking, and match configuration.
 * 
 * @typedef {Object} GameState
 * @property {string} matchId - Unique match identifier
 * @property {string} tournamentId - Associated tournament ID
 * @property {string} teamA - Team A name
 * @property {string} teamB - Team B name
 * @property {number} scoreA - Current score for team A
 * @property {number} scoreB - Current score for team B
 * @property {'A'|'B'} servingTeam - Current serving team
 * @property {1|2} serverNumber - Current server (1 or 2)
 * @property {number} currentSet - Current set number (1-based)
 * @property {CompletedSet[]} completedSets - Array of completed sets
 * @property {MatchConfig} config - Match configuration
 * @property {'not_started'|'playing'|'set_complete'|'match_complete'} status - Match status
 * @property {string} updatedAt - ISO timestamp of last update
 * @property {string} updatedBy - Referee ID who last updated
 */

/**
 * CompletedSet - Record of a completed set
 * 
 * @typedef {Object} CompletedSet
 * @property {number} setNumber - Set number (1-based)
 * @property {number} scoreA - Final score for team A
 * @property {number} scoreB - Final score for team B
 * @property {'A'|'B'} winner - Winning team
 */

/**
 * MatchConfig - Match configuration and rules
 * 
 * @typedef {Object} MatchConfig
 * @property {'BO1'|'BO3'|'BO5'} matchFormat - Best of 1, 3, or 5 sets
 * @property {11|15|21} targetScore - Points needed to win a set
 * @property {number} winByMargin - Minimum winning margin (typically 2)
 * @property {boolean} firstServeSingle - If true, first serving team gets only one server
 * @property {boolean} enableFaultButtons - If true, show fault buttons in UI
 */

/**
 * Create a new GameState with default values
 * 
 * @param {Object} params - Initialization parameters
 * @param {string} params.matchId - Match ID
 * @param {string} params.tournamentId - Tournament ID
 * @param {string} params.teamA - Team A name
 * @param {string} params.teamB - Team B name
 * @param {MatchConfig} [params.config] - Optional match configuration
 * @returns {GameState} New game state
 */
function createGameState({ matchId, tournamentId, teamA, teamB, config }) {
  return {
    matchId,
    tournamentId,
    teamA,
    teamB,
    scoreA: 0,
    scoreB: 0,
    servingTeam: 'A',
    serverNumber: 1,
    currentSet: 1,
    completedSets: [],
    config: config || {
      matchFormat: 'BO3',
      targetScore: 11,
      winByMargin: 2,
      firstServeSingle: true,
      enableFaultButtons: false
    },
    status: 'not_started',
    updatedAt: new Date().toISOString(),
    updatedBy: ''
  };
}

/**
 * Serialize GameState to database format
 * 
 * Converts GameState object to format suitable for database storage.
 * Handles JSONB fields and ensures all fields are properly formatted.
 * 
 * @param {GameState} state - Game state to serialize
 * @returns {Object} Database-compatible object
 */
function serializeGameState(state) {
  return {
    id: state.matchId,
    tournament_id: state.tournamentId,
    team_a: state.teamA,
    team_b: state.teamB,
    score_a: state.scoreA,
    score_b: state.scoreB,
    serving_team: state.servingTeam,
    server_number: state.serverNumber,
    current_set: state.currentSet,
    completed_sets: JSON.stringify(state.completedSets),
    match_config: JSON.stringify(state.config),
    status: state.status,
    updated_at: state.updatedAt,
    updated_by: state.updatedBy
  };
}

/**
 * Deserialize database record to GameState
 * 
 * Converts database record to GameState object.
 * Handles JSONB parsing and field name mapping.
 * 
 * @param {Object} record - Database record
 * @returns {GameState} Game state object
 */
function deserializeGameState(record) {
  // Parse JSONB fields if they're strings
  const completedSets = typeof record.completed_sets === 'string'
    ? JSON.parse(record.completed_sets)
    : (record.completed_sets || []);
  
  const config = typeof record.match_config === 'string'
    ? JSON.parse(record.match_config)
    : (record.match_config || {
        matchFormat: 'BO3',
        targetScore: 11,
        winByMargin: 2,
        firstServeSingle: true,
        enableFaultButtons: false
      });

  return {
    matchId: record.id,
    tournamentId: record.tournament_id,
    teamA: record.teamA || record.team_a || record.teama,
    teamB: record.teamB || record.team_b || record.teamb,
    scoreA: record.scoreA !== undefined ? record.scoreA : (record.score_a !== undefined ? record.score_a : (record.scorea || 0)),
    scoreB: record.scoreB !== undefined ? record.scoreB : (record.score_b !== undefined ? record.score_b : (record.scoreb || 0)),
    servingTeam: record.serving_team || 'A',
    serverNumber: record.server_number || 1,
    currentSet: record.current_set || 1,
    completedSets,
    config,
    status: record.status || 'not_started',
    updatedAt: record.updated_at || new Date().toISOString(),
    updatedBy: record.updated_by || ''
  };
}

/**
 * Validate GameState structure
 * 
 * Checks that all required fields are present and have valid values.
 * Throws error if validation fails.
 * 
 * @param {GameState} state - State to validate
 * @throws {Error} If validation fails
 * @returns {boolean} True if valid
 */
function validateGameState(state) {
  // Check required fields
  if (!state.matchId) throw new Error('matchId is required');
  if (!state.tournamentId) throw new Error('tournamentId is required');
  if (!state.teamA) throw new Error('teamA is required');
  if (!state.teamB) throw new Error('teamB is required');

  // Validate scores
  if (typeof state.scoreA !== 'number' || state.scoreA < 0) {
    throw new Error('scoreA must be a non-negative number');
  }
  if (typeof state.scoreB !== 'number' || state.scoreB < 0) {
    throw new Error('scoreB must be a non-negative number');
  }

  // Validate serving state
  if (state.servingTeam !== 'A' && state.servingTeam !== 'B') {
    throw new Error('servingTeam must be "A" or "B"');
  }
  if (state.serverNumber !== 1 && state.serverNumber !== 2) {
    throw new Error('serverNumber must be 1 or 2');
  }

  // Validate set tracking
  if (typeof state.currentSet !== 'number' || state.currentSet < 1) {
    throw new Error('currentSet must be a positive integer');
  }
  if (!Array.isArray(state.completedSets)) {
    throw new Error('completedSets must be an array');
  }

  // Validate status
  const validStatuses = ['not_started', 'playing', 'set_complete', 'match_complete'];
  if (!validStatuses.includes(state.status)) {
    throw new Error(`status must be one of: ${validStatuses.join(', ')}`);
  }

  // Validate config
  if (!state.config) throw new Error('config is required');
  const validFormats = ['BO1', 'BO3', 'BO5'];
  if (!validFormats.includes(state.config.matchFormat)) {
    throw new Error(`matchFormat must be one of: ${validFormats.join(', ')}`);
  }
  const validTargets = [11, 15, 21];
  if (!validTargets.includes(state.config.targetScore)) {
    throw new Error(`targetScore must be one of: ${validTargets.join(', ')}`);
  }

  return true;
}

/**
 * Deep clone a GameState object
 * 
 * Creates a deep copy of the state to prevent mutation.
 * 
 * @param {GameState} state - State to clone
 * @returns {GameState} Cloned state
 */
function cloneGameState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Generate score call string
 * 
 * Creates the standard score call format: "scoreA-scoreB-serverNumber"
 * 
 * @param {GameState} state - Current game state
 * @returns {string} Score call (e.g., "5-3-1")
 */
function generateScoreCall(state) {
  return `${state.scoreA}-${state.scoreB}-${state.serverNumber}`;
}

/**
 * Validate action before applying to state
 * 
 * Checks if an action is valid given the current game state.
 * Prevents invalid actions like awarding points to non-serving team.
 * 
 * @param {GameState} state - Current game state
 * @param {Object} action - Action to validate
 * @returns {{valid: boolean, error: string|null}} Validation result
 */
function validateAction(state, action) {
  // Validate state first
  try {
    validateGameState(state);
  } catch (error) {
    return { valid: false, error: `Invalid state: ${error.message}` };
  }

  // Validate action type
  if (!action || !action.type) {
    return { valid: false, error: 'Action must have a type' };
  }

  // Validate scoring actions
  if (action.type === ActionTypes.SCORE_TEAM_A || action.type === ActionTypes.SCORE_TEAM_B) {
    const scoringTeam = action.type === ActionTypes.SCORE_TEAM_A ? 'A' : 'B';
    
    // Only serving team can score
    if (state.servingTeam !== scoringTeam) {
      return { 
        valid: false, 
        error: `Cannot award points to Team ${scoringTeam} when Team ${state.servingTeam} is serving` 
      };
    }
  }

  // Validate match is not complete
  if (state.status === 'match_complete') {
    if (action.type === ActionTypes.SCORE_TEAM_A || 
        action.type === ActionTypes.SCORE_TEAM_B ||
        action.type === ActionTypes.FAULT_TEAM_A ||
        action.type === ActionTypes.FAULT_TEAM_B) {
      return { valid: false, error: 'Cannot modify scores after match is complete' };
    }
  }

  // Validate NEXT_SET action
  if (action.type === ActionTypes.NEXT_SET) {
    if (state.status !== 'set_complete') {
      return { valid: false, error: 'Cannot start next set when current set is not complete' };
    }
  }

  // All validations passed
  return { valid: true, error: null };
}

/**
 * Check if a set is complete
 * 
 * Determines if the current set has been won based on target score
 * and win-by margin rules.
 * 
 * @param {GameState} state - Current game state
 * @returns {{complete: boolean, winner: 'A'|'B'|null}} Set completion status
 */
function checkSetComplete(state) {
  const { targetScore, winByMargin } = state.config;
  const { scoreA, scoreB } = state;
  
  const maxScore = Math.max(scoreA, scoreB);
  const scoreDiff = Math.abs(scoreA - scoreB);
  
  if (maxScore >= targetScore && scoreDiff >= winByMargin) {
    return {
      complete: true,
      winner: scoreA > scoreB ? 'A' : 'B'
    };
  }
  
  return { complete: false, winner: null };
}

/**
 * Check if a set is won (alias for checkSetComplete)
 * 
 * This function is used by the reducer logic.
 * 
 * @param {GameState} state - Current game state
 * @returns {{complete: boolean, winner: 'A'|'B'|null}} Set win status
 */
function checkSetWin(state) {
  return checkSetComplete(state);
}

/**
 * Check if the match is complete
 * 
 * Determines if a team has won the required number of sets.
 * 
 * @param {GameState} state - Current game state
 * @returns {{complete: boolean, winner: 'A'|'B'|null}} Match completion status
 */
function checkMatchComplete(state) {
  const setsNeeded = {
    'BO1': 1,
    'BO3': 2,
    'BO5': 3
  }[state.config.matchFormat];
  
  const setsWonA = state.completedSets.filter(s => s.winner === 'A').length;
  const setsWonB = state.completedSets.filter(s => s.winner === 'B').length;
  
  if (setsWonA >= setsNeeded) {
    return { complete: true, winner: 'A' };
  }
  if (setsWonB >= setsNeeded) {
    return { complete: true, winner: 'B' };
  }
  
  return { complete: false, winner: null };
}

/**
 * Check if the match is won (alias for checkMatchComplete)
 * 
 * This function is used by the reducer logic.
 * 
 * @param {GameState} state - Current game state
 * @returns {{complete: boolean, winner: 'A'|'B'|null}} Match win status
 */
function checkMatchWin(state) {
  return checkMatchComplete(state);
}

/**
 * Get sets won by each team
 * 
 * @param {GameState} state - Current game state
 * @returns {{setsWonA: number, setsWonB: number}} Sets won count
 */
function getSetsWon(state) {
  const setsWonA = state.completedSets.filter(s => s.winner === 'A').length;
  const setsWonB = state.completedSets.filter(s => s.winner === 'B').length;
  return { setsWonA, setsWonB };
}

// ============================================================
//  GameStateReducer - State Management
// ============================================================

/**
 * Action types for state transitions
 */
const ActionTypes = {
  SCORE_TEAM_A: 'SCORE_TEAM_A',
  SCORE_TEAM_B: 'SCORE_TEAM_B',
  FAULT_TEAM_A: 'FAULT_TEAM_A',
  FAULT_TEAM_B: 'FAULT_TEAM_B',
  CHANGE_SERVE: 'CHANGE_SERVE',
  UNDO: 'UNDO',
  NEXT_SET: 'NEXT_SET',
  END_MATCH: 'END_MATCH',
  LOAD_STATE: 'LOAD_STATE'
};

/**
 * Handle scoring action
 * 
 * Awards a point to the specified team if they are serving.
 * Does NOT auto-complete set - referee must manually finish.
 * 
 * @param {GameState} state - Current game state
 * @param {'A'|'B'} team - Team that scored
 * @returns {GameState} New game state
 */
function handleScore(state, team) {
  // Validate: Only serving team can score
  if (state.servingTeam !== team) {
    console.warn(`Invalid action: Team ${team} cannot score when Team ${state.servingTeam} is serving`);
    return state;
  }

  // Clone state for immutability
  const newState = cloneGameState(state);
  
  // Increment score for serving team
  const scoreKey = `score${team}`;
  newState[scoreKey] = state[scoreKey] + 1;
  
  // Update timestamp
  newState.updatedAt = new Date().toISOString();
  
  // Update status to playing if not started
  if (newState.status === 'not_started') {
    newState.status = 'playing';
  }
  
  // NOTE: Do NOT auto-complete set - referee will manually finish
  
  return newState;
}

/**
 * Rotate server according to pickleball rules
 * 
 * Server rotation logic:
 * - If server 1, rotate to server 2 (same team)
 * - If server 2, switch to other team's server 1
 * - Special case: First serve single rule (skip server 2 on first serve)
 * 
 * @param {GameState} state - Current game state
 * @returns {GameState} New game state with rotated server
 */
function rotateServer(state) {
  const newState = cloneGameState(state);
  
  // Check for first serve single rule
  const isFirstServe = state.currentSet === 1 && state.scoreA === 0 && state.scoreB === 0;
  const skipServer2 = isFirstServe && state.config.firstServeSingle;
  
  if (state.serverNumber === 1 && !skipServer2) {
    // Rotate to server 2 on same team
    newState.serverNumber = 2;
  } else {
    // Switch to other team's server 1
    newState.servingTeam = state.servingTeam === 'A' ? 'B' : 'A';
    newState.serverNumber = 1;
  }
  
  newState.updatedAt = new Date().toISOString();
  return newState;
}

/**
 * Handle fault action
 * 
 * When a team commits a fault, rotate the server without awarding points.
 * 
 * @param {GameState} state - Current game state
 * @param {'A'|'B'} team - Team that committed the fault
 * @returns {GameState} New game state
 */
function handleFault(state, team) {
  // If serving team faults, rotate server
  if (state.servingTeam === team) {
    return rotateServer(state);
  }
  
  // If receiving team faults, serving team scores
  return handleScore(state, state.servingTeam);
}

/**
 * Start the next set
 * 
 * Resets scores to 0, increments set number, and preserves serving state.
 * 
 * @param {GameState} state - Current game state
 * @returns {GameState} New game state for next set
 */
function startNextSet(state) {
  const newState = cloneGameState(state);
  
  // Reset scores
  newState.scoreA = 0;
  newState.scoreB = 0;
  
  // Increment set number
  newState.currentSet = state.currentSet + 1;
  
  // Change status back to playing
  newState.status = 'playing';
  
  // Update timestamp
  newState.updatedAt = new Date().toISOString();
  
  // Note: Serving team and server number are preserved
  // (can be modified if rules require switching serve between sets)
  
  return newState;
}

/**
 * GameStateReducer - Pure function for state transitions
 * 
 * Handles all state transitions based on action type.
 * Returns a new state object without mutating the input.
 * 
 * @param {GameState} state - Current game state
 * @param {Object} action - Action object with type and optional payload
 * @returns {GameState} New game state
 */
function gameStateReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SCORE_TEAM_A:
      return handleScore(state, 'A');
    case ActionTypes.SCORE_TEAM_B:
      return handleScore(state, 'B');
    case ActionTypes.FAULT_TEAM_A:
      return handleFault(state, 'A');
    case ActionTypes.FAULT_TEAM_B:
      return handleFault(state, 'B');
    case ActionTypes.CHANGE_SERVE:
      return rotateServer(state);
    case ActionTypes.UNDO:
      // Undo is handled by HistoryManager, not reducer
      return state;
    case ActionTypes.NEXT_SET:
      return startNextSet(state);
    case ActionTypes.END_MATCH:
      return { ...state, status: 'match_complete', updatedAt: new Date().toISOString() };
    case ActionTypes.LOAD_STATE:
      return action.payload;
    default:
      return state;
  }
}

// ============================================================
//  HistoryManager - Undo Functionality
// ============================================================

/**
 * HistoryManager - Manages undo functionality with bounded stack
 * 
 * Maintains a stack of previous game states to enable undo operations.
 * The stack is bounded to a maximum size to prevent memory issues.
 * Uses deep cloning to ensure state immutability.
 * 
 * @class HistoryManager
 */
class HistoryManager {
  /**
   * Create a new HistoryManager
   * 
   * @param {number} [maxSize=10] - Maximum number of states to store
   */
  constructor(maxSize = 10) {
    this.stack = [];
    this.maxSize = maxSize;
  }

  /**
   * Push a state onto the history stack
   * 
   * If the stack is at max capacity, removes the oldest state.
   * Deep clones the state to prevent mutation.
   * 
   * @param {GameState} state - Game state to save
   */
  push(state) {
    // Remove oldest state if at max capacity
    if (this.stack.length >= this.maxSize) {
      this.stack.shift();
    }
    
    // Deep clone to prevent mutation
    this.stack.push(cloneGameState(state));
  }

  /**
   * Pop the most recent state from the history stack
   * 
   * @returns {GameState|null} Previous game state, or null if stack is empty
   */
  pop() {
    if (this.stack.length === 0) {
      return null;
    }
    
    return this.stack.pop();
  }

  /**
   * Check if undo is available
   * 
   * @returns {boolean} True if there are states in the history stack
   */
  canUndo() {
    return this.stack.length > 0;
  }

  /**
   * Clear the history stack
   * 
   * Removes all saved states.
   */
  clear() {
    this.stack = [];
  }

  /**
   * Get the current size of the history stack
   * 
   * @returns {number} Number of states in the stack
   */
  size() {
    return this.stack.length;
  }
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createGameState,
    serializeGameState,
    deserializeGameState,
    validateGameState,
    cloneGameState,
    generateScoreCall,
    validateAction,
    checkSetComplete,
    checkMatchComplete,
    getSetsWon,
    gameStateReducer,
    ActionTypes,
    handleScore,
    handleFault,
    rotateServer,
    checkSetWin,
    checkMatchWin,
    startNextSet,
    HistoryManager
  };
}

// Export to window for browser environment
if (typeof window !== 'undefined') {
  window.HistoryManager = HistoryManager;
  window.cloneGameState = cloneGameState;
  window.ActionTypes = ActionTypes;
  window.gameStateReducer = gameStateReducer;
  window.checkSetWin = checkSetWin;
  window.checkMatchWin = checkMatchWin;
}
