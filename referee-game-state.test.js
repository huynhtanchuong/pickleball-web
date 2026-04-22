// ============================================================
//  Referee Scoring System - Game State Tests
//  Unit tests for game state utilities
// ============================================================

// Import functions (for Node.js environment)
// In browser, these will be available globally
const {
  createGameState,
  serializeGameState,
  deserializeGameState,
  validateGameState,
  cloneGameState,
  generateScoreCall,
  checkSetComplete,
  checkMatchComplete,
  getSetsWon
} = typeof require !== 'undefined' 
  ? require('./referee-game-state.js')
  : window;

// Test results tracking
const testResults = [];
let passCount = 0;
let failCount = 0;

// Simple test runner
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testResults.push({ name, passed: true });
    passCount++;
    
    // Update UI if in browser
    if (typeof document !== 'undefined') {
      const resultsDiv = document.getElementById('results');
      if (resultsDiv) {
        const div = document.createElement('div');
        div.className = 'test-result test-pass';
        div.textContent = `✓ ${name}`;
        resultsDiv.appendChild(div);
      }
    }
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    testResults.push({ name, passed: false, error: error.message });
    failCount++;
    
    // Update UI if in browser
    if (typeof document !== 'undefined') {
      const resultsDiv = document.getElementById('results');
      if (resultsDiv) {
        const div = document.createElement('div');
        div.className = 'test-result test-fail';
        div.innerHTML = `✗ ${name}<br><small>${error.message}</small>`;
        resultsDiv.appendChild(div);
      }
    }
  }
}

function assertEquals(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || `Expected true, got ${value}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    throw new Error(message || 'Expected function to throw');
  } catch (error) {
    if (error.message === message || error.message.includes('Expected function to throw')) {
      throw error;
    }
    // Expected error, test passes
  }
}

// Run tests
console.log('Running GameState utility tests...\n');

test('createGameState creates valid initial state', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team Alpha',
    teamB: 'Team Beta'
  });

  assertEquals(state.matchId, 'match1');
  assertEquals(state.tournamentId, 'tournament1');
  assertEquals(state.teamA, 'Team Alpha');
  assertEquals(state.teamB, 'Team Beta');
  assertEquals(state.scoreA, 0);
  assertEquals(state.scoreB, 0);
  assertEquals(state.servingTeam, 'A');
  assertEquals(state.serverNumber, 1);
  assertEquals(state.currentSet, 1);
  assertEquals(state.completedSets, []);
  assertEquals(state.status, 'not_started');
});

test('createGameState accepts custom config', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B',
    config: {
      matchFormat: 'BO5',
      targetScore: 21,
      winByMargin: 3,
      firstServeSingle: false,
      enableFaultButtons: true
    }
  });

  assertEquals(state.config.matchFormat, 'BO5');
  assertEquals(state.config.targetScore, 21);
  assertEquals(state.config.winByMargin, 3);
  assertEquals(state.config.firstServeSingle, false);
  assertEquals(state.config.enableFaultButtons, true);
});

test('serializeGameState converts to database format', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });

  const serialized = serializeGameState(state);

  assertEquals(serialized.id, 'match1');
  assertEquals(serialized.tournament_id, 'tournament1');
  assertEquals(serialized.serving_team, 'A');
  assertEquals(serialized.server_number, 1);
  assertEquals(serialized.current_set, 1);
  assertTrue(typeof serialized.completed_sets === 'string');
  assertTrue(typeof serialized.match_config === 'string');
});

test('deserializeGameState converts from database format', () => {
  const dbRecord = {
    id: 'match1',
    tournament_id: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B',
    scoreA: 5,
    scoreB: 3,
    serving_team: 'A',
    server_number: 1,
    current_set: 1,
    completed_sets: '[]',
    match_config: '{"matchFormat":"BO3","targetScore":11,"winByMargin":2,"firstServeSingle":true,"enableFaultButtons":false}',
    status: 'playing',
    updated_at: '2026-01-15T10:00:00Z',
    updated_by: 'referee1'
  };

  const state = deserializeGameState(dbRecord);

  assertEquals(state.matchId, 'match1');
  assertEquals(state.scoreA, 5);
  assertEquals(state.scoreB, 3);
  assertEquals(state.servingTeam, 'A');
  assertEquals(state.config.matchFormat, 'BO3');
  assertTrue(Array.isArray(state.completedSets));
});

test('validateGameState accepts valid state', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });

  assertTrue(validateGameState(state));
});

test('validateGameState rejects invalid servingTeam', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'C';

  assertThrows(() => validateGameState(state));
});

test('validateGameState rejects invalid serverNumber', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.serverNumber = 3;

  assertThrows(() => validateGameState(state));
});

test('validateGameState rejects negative scores', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = -1;

  assertThrows(() => validateGameState(state));
});

test('cloneGameState creates independent copy', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });

  const cloned = cloneGameState(state);
  cloned.scoreA = 10;

  assertEquals(state.scoreA, 0);
  assertEquals(cloned.scoreA, 10);
});

test('generateScoreCall formats correctly', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 5;
  state.scoreB = 3;
  state.serverNumber = 1;

  const scoreCall = generateScoreCall(state);
  assertEquals(scoreCall, '5-3-1');
});

test('checkSetComplete detects set win', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 11;
  state.scoreB = 9;

  const result = checkSetComplete(state);
  assertTrue(result.complete);
  assertEquals(result.winner, 'A');
});

test('checkSetComplete enforces win-by rule', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 11;
  state.scoreB = 10;

  const result = checkSetComplete(state);
  assertEquals(result.complete, false);
  assertEquals(result.winner, null);
});

test('checkSetComplete allows deuce wins', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 13;
  state.scoreB = 11;

  const result = checkSetComplete(state);
  assertTrue(result.complete);
  assertEquals(result.winner, 'A');
});

test('checkMatchComplete detects BO1 win', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B',
    config: { matchFormat: 'BO1', targetScore: 11, winByMargin: 2, firstServeSingle: true, enableFaultButtons: false }
  });
  state.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 9, winner: 'A' }
  ];

  const result = checkMatchComplete(state);
  assertTrue(result.complete);
  assertEquals(result.winner, 'A');
});

test('checkMatchComplete detects BO3 win', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 9, winner: 'A' },
    { setNumber: 2, scoreA: 9, scoreB: 11, winner: 'B' },
    { setNumber: 3, scoreA: 11, scoreB: 7, winner: 'A' }
  ];

  const result = checkMatchComplete(state);
  assertTrue(result.complete);
  assertEquals(result.winner, 'A');
});

test('checkMatchComplete returns false for incomplete match', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 9, winner: 'A' }
  ];

  const result = checkMatchComplete(state);
  assertEquals(result.complete, false);
  assertEquals(result.winner, null);
});

test('getSetsWon counts correctly', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 9, winner: 'A' },
    { setNumber: 2, scoreA: 9, scoreB: 11, winner: 'B' },
    { setNumber: 3, scoreA: 11, scoreB: 7, winner: 'A' }
  ];

  const { setsWonA, setsWonB } = getSetsWon(state);
  assertEquals(setsWonA, 2);
  assertEquals(setsWonB, 1);
});

test('Round-trip serialization preserves state', () => {
  const original = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  original.scoreA = 5;
  original.scoreB = 3;
  original.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 9, winner: 'A' }
  ];

  const serialized = serializeGameState(original);
  const deserialized = deserializeGameState(serialized);

  assertEquals(deserialized.matchId, original.matchId);
  assertEquals(deserialized.scoreA, original.scoreA);
  assertEquals(deserialized.scoreB, original.scoreB);
  assertEquals(deserialized.completedSets.length, original.completedSets.length);
  assertEquals(deserialized.config.matchFormat, original.config.matchFormat);
});

// Display summary
console.log(`\n${passCount} passed, ${failCount} failed`);

if (typeof document !== 'undefined') {
  const summaryDiv = document.getElementById('summary');
  if (summaryDiv) {
    summaryDiv.className = failCount === 0 ? 'summary success' : 'summary failure';
    summaryDiv.innerHTML = `
      <h2>${failCount === 0 ? '✓ All tests passed!' : '✗ Some tests failed'}</h2>
      <p><strong>${passCount}</strong> passed, <strong>${failCount}</strong> failed</p>
    `;
  }
}

// ============================================================
//  GameStateReducer Tests
// ============================================================

const {
  gameStateReducer,
  ActionTypes,
  handleScore,
  handleFault,
  rotateServer,
  checkSetWin,
  checkMatchWin,
  startNextSet
} = typeof require !== 'undefined' 
  ? require('./referee-game-state.js')
  : window;

console.log('\n=== GameStateReducer Tests ===\n');

// Test 2.1: gameStateReducer function with action dispatcher
test('gameStateReducer handles SCORE_TEAM_A action', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.scoreA = 5;
  state.scoreB = 3;

  const newState = gameStateReducer(state, { type: ActionTypes.SCORE_TEAM_A });

  assertEquals(newState.scoreA, 6);
  assertEquals(newState.scoreB, 3);
  assertEquals(newState.servingTeam, 'A');
});

test('gameStateReducer handles SCORE_TEAM_B action', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'B';
  state.scoreA = 5;
  state.scoreB = 3;

  const newState = gameStateReducer(state, { type: ActionTypes.SCORE_TEAM_B });

  assertEquals(newState.scoreA, 5);
  assertEquals(newState.scoreB, 4);
  assertEquals(newState.servingTeam, 'B');
});

test('gameStateReducer handles FAULT_TEAM_A action', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.serverNumber = 1;

  const newState = gameStateReducer(state, { type: ActionTypes.FAULT_TEAM_A });

  assertEquals(newState.scoreA, 0);
  assertEquals(newState.scoreB, 0);
  assertEquals(newState.serverNumber, 2);
  assertEquals(newState.servingTeam, 'A');
});

test('gameStateReducer handles NEXT_SET action', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.currentSet = 1;
  state.scoreA = 11;
  state.scoreB = 9;
  state.status = 'set_complete';

  const newState = gameStateReducer(state, { type: ActionTypes.NEXT_SET });

  assertEquals(newState.currentSet, 2);
  assertEquals(newState.scoreA, 0);
  assertEquals(newState.scoreB, 0);
  assertEquals(newState.status, 'playing');
});

test('gameStateReducer handles END_MATCH action', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });

  const newState = gameStateReducer(state, { type: ActionTypes.END_MATCH });

  assertEquals(newState.status, 'match_complete');
});

test('gameStateReducer returns state for unknown action', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });

  const newState = gameStateReducer(state, { type: 'UNKNOWN_ACTION' });

  assertEquals(newState, state);
});

// Test 2.2: handleScore function
test('handleScore increments serving team score', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.scoreA = 5;
  state.scoreB = 3;

  const newState = handleScore(state, 'A');

  assertEquals(newState.scoreA, 6);
  assertEquals(newState.scoreB, 3);
  assertEquals(newState.servingTeam, 'A');
});

test('handleScore does not award points to non-serving team', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.scoreA = 5;
  state.scoreB = 3;

  const newState = handleScore(state, 'B');

  assertEquals(newState.scoreA, 5);
  assertEquals(newState.scoreB, 3);
  assertEquals(newState, state);
});

test('handleScore changes status from not_started to playing', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.status = 'not_started';

  const newState = handleScore(state, 'A');

  assertEquals(newState.status, 'playing');
});

test('handleScore detects set completion', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.scoreA = 10;
  state.scoreB = 8;
  state.status = 'playing';

  const newState = handleScore(state, 'A');

  assertEquals(newState.scoreA, 11);
  assertEquals(newState.status, 'set_complete');
  assertEquals(newState.completedSets.length, 1);
  assertEquals(newState.completedSets[0].winner, 'A');
});

test('handleScore detects match completion', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B',
    config: { matchFormat: 'BO1', targetScore: 11, winByMargin: 2, firstServeSingle: true, enableFaultButtons: false }
  });
  state.servingTeam = 'A';
  state.scoreA = 10;
  state.scoreB = 8;
  state.status = 'playing';

  const newState = handleScore(state, 'A');

  assertEquals(newState.status, 'match_complete');
});

// Test 2.5: rotateServer function
test('rotateServer rotates from server 1 to server 2', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.serverNumber = 1;
  state.scoreA = 5;
  state.scoreB = 3;

  const newState = rotateServer(state);

  assertEquals(newState.servingTeam, 'A');
  assertEquals(newState.serverNumber, 2);
});

test('rotateServer switches team from server 2', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.serverNumber = 2;
  state.scoreA = 5;
  state.scoreB = 3;

  const newState = rotateServer(state);

  assertEquals(newState.servingTeam, 'B');
  assertEquals(newState.serverNumber, 1);
});

test('rotateServer handles first serve single rule', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B',
    config: { matchFormat: 'BO3', targetScore: 11, winByMargin: 2, firstServeSingle: true, enableFaultButtons: false }
  });
  state.servingTeam = 'A';
  state.serverNumber = 1;
  state.currentSet = 1;
  state.scoreA = 0;
  state.scoreB = 0;

  const newState = rotateServer(state);

  assertEquals(newState.servingTeam, 'B');
  assertEquals(newState.serverNumber, 1);
});

// Test 2.6: handleFault function
test('handleFault rotates server when serving team faults', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.serverNumber = 1;
  state.scoreA = 5;
  state.scoreB = 3;

  const newState = handleFault(state, 'A');

  assertEquals(newState.scoreA, 5);
  assertEquals(newState.scoreB, 3);
  assertEquals(newState.serverNumber, 2);
  assertEquals(newState.servingTeam, 'A');
});

test('handleFault awards point when receiving team faults', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.scoreA = 5;
  state.scoreB = 3;

  const newState = handleFault(state, 'B');

  assertEquals(newState.scoreA, 6);
  assertEquals(newState.scoreB, 3);
  assertEquals(newState.servingTeam, 'A');
});

// Test 2.8: checkSetWin function
test('checkSetWin detects set win at target score', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 11;
  state.scoreB = 9;

  const result = checkSetWin(state);

  assertTrue(result.complete);
  assertEquals(result.winner, 'A');
});

test('checkSetWin enforces win-by margin', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 11;
  state.scoreB = 10;

  const result = checkSetWin(state);

  assertEquals(result.complete, false);
  assertEquals(result.winner, null);
});

test('checkSetWin allows deuce wins', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 15;
  state.scoreB = 13;

  const result = checkSetWin(state);

  assertTrue(result.complete);
  assertEquals(result.winner, 'A');
});

// Test 2.10: checkMatchWin function
test('checkMatchWin detects BO1 match win', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B',
    config: { matchFormat: 'BO1', targetScore: 11, winByMargin: 2, firstServeSingle: true, enableFaultButtons: false }
  });
  state.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 9, winner: 'A' }
  ];

  const result = checkMatchWin(state);

  assertTrue(result.complete);
  assertEquals(result.winner, 'A');
});

test('checkMatchWin detects BO3 match win', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 9, winner: 'A' },
    { setNumber: 2, scoreA: 9, scoreB: 11, winner: 'B' },
    { setNumber: 3, scoreA: 11, scoreB: 7, winner: 'A' }
  ];

  const result = checkMatchWin(state);

  assertTrue(result.complete);
  assertEquals(result.winner, 'A');
});

test('checkMatchWin returns false for incomplete BO3 match', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 9, winner: 'A' }
  ];

  const result = checkMatchWin(state);

  assertEquals(result.complete, false);
  assertEquals(result.winner, null);
});

test('checkMatchWin detects BO5 match win', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B',
    config: { matchFormat: 'BO5', targetScore: 11, winByMargin: 2, firstServeSingle: true, enableFaultButtons: false }
  });
  state.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 9, winner: 'A' },
    { setNumber: 2, scoreA: 9, scoreB: 11, winner: 'B' },
    { setNumber: 3, scoreA: 11, scoreB: 7, winner: 'A' },
    { setNumber: 4, scoreA: 8, scoreB: 11, winner: 'B' },
    { setNumber: 5, scoreA: 11, scoreB: 9, winner: 'A' }
  ];

  const result = checkMatchWin(state);

  assertTrue(result.complete);
  assertEquals(result.winner, 'A');
});

// Test 2.12: startNextSet function
test('startNextSet resets scores to 0', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 11;
  state.scoreB = 9;
  state.currentSet = 1;
  state.status = 'set_complete';

  const newState = startNextSet(state);

  assertEquals(newState.scoreA, 0);
  assertEquals(newState.scoreB, 0);
});

test('startNextSet increments set number', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.currentSet = 1;
  state.status = 'set_complete';

  const newState = startNextSet(state);

  assertEquals(newState.currentSet, 2);
});

test('startNextSet changes status to playing', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.status = 'set_complete';

  const newState = startNextSet(state);

  assertEquals(newState.status, 'playing');
});

test('startNextSet preserves serving team and server number', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'B';
  state.serverNumber = 2;
  state.status = 'set_complete';

  const newState = startNextSet(state);

  assertEquals(newState.servingTeam, 'B');
  assertEquals(newState.serverNumber, 2);
});

// Integration tests
test('Complete game flow: Team A wins 11-9', () => {
  let state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });

  // Team A serves and scores 11 points
  for (let i = 0; i < 11; i++) {
    state = gameStateReducer(state, { type: ActionTypes.SCORE_TEAM_A });
  }

  // Team B gets 9 points (requires switching serve)
  state.servingTeam = 'B';
  for (let i = 0; i < 9; i++) {
    state = gameStateReducer(state, { type: ActionTypes.SCORE_TEAM_B });
  }

  // Team A serves again and wins
  state.servingTeam = 'A';
  state.scoreA = 10;
  state.scoreB = 9;
  state = gameStateReducer(state, { type: ActionTypes.SCORE_TEAM_A });

  assertEquals(state.status, 'set_complete');
  assertEquals(state.completedSets.length, 1);
  assertEquals(state.completedSets[0].winner, 'A');
});

test('Server rotation through multiple faults', () => {
  let state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  state.serverNumber = 1;
  state.scoreA = 5;
  state.scoreB = 3;

  // First fault: A server 1 -> A server 2
  state = gameStateReducer(state, { type: ActionTypes.FAULT_TEAM_A });
  assertEquals(state.servingTeam, 'A');
  assertEquals(state.serverNumber, 2);

  // Second fault: A server 2 -> B server 1
  state = gameStateReducer(state, { type: ActionTypes.FAULT_TEAM_A });
  assertEquals(state.servingTeam, 'B');
  assertEquals(state.serverNumber, 1);

  // Third fault: B server 1 -> B server 2
  state = gameStateReducer(state, { type: ActionTypes.FAULT_TEAM_B });
  assertEquals(state.servingTeam, 'B');
  assertEquals(state.serverNumber, 2);

  // Fourth fault: B server 2 -> A server 1
  state = gameStateReducer(state, { type: ActionTypes.FAULT_TEAM_B });
  assertEquals(state.servingTeam, 'A');
  assertEquals(state.serverNumber, 1);
});

// ============================================================
//  validateAction Tests
// ============================================================

const { validateAction } = typeof require !== 'undefined' 
  ? require('./referee-game-state.js')
  : window;

console.log('\n=== validateAction Tests ===\n');

// Test 5.3: validateAction function
test('validateAction accepts valid SCORE_TEAM_A action for serving team', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';

  const result = validateAction(state, { type: ActionTypes.SCORE_TEAM_A });

  assertTrue(result.valid);
  assertEquals(result.error, null);
});

test('validateAction accepts valid SCORE_TEAM_B action for serving team', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'B';

  const result = validateAction(state, { type: ActionTypes.SCORE_TEAM_B });

  assertTrue(result.valid);
  assertEquals(result.error, null);
});

test('validateAction rejects SCORE_TEAM_A when Team B is serving', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'B';

  const result = validateAction(state, { type: ActionTypes.SCORE_TEAM_A });

  assertEquals(result.valid, false);
  assertTrue(result.error.includes('Team A'));
  assertTrue(result.error.includes('Team B is serving'));
});

test('validateAction rejects SCORE_TEAM_B when Team A is serving', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';

  const result = validateAction(state, { type: ActionTypes.SCORE_TEAM_B });

  assertEquals(result.valid, false);
  assertTrue(result.error.includes('Team B'));
  assertTrue(result.error.includes('Team A is serving'));
});

test('validateAction accepts FAULT actions regardless of serving team', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';

  const resultA = validateAction(state, { type: ActionTypes.FAULT_TEAM_A });
  const resultB = validateAction(state, { type: ActionTypes.FAULT_TEAM_B });

  assertTrue(resultA.valid);
  assertTrue(resultB.valid);
});

test('validateAction rejects actions when match is complete', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.status = 'match_complete';
  state.servingTeam = 'A';

  const resultScore = validateAction(state, { type: ActionTypes.SCORE_TEAM_A });
  const resultFault = validateAction(state, { type: ActionTypes.FAULT_TEAM_A });

  assertEquals(resultScore.valid, false);
  assertTrue(resultScore.error.includes('match is complete'));
  assertEquals(resultFault.valid, false);
  assertTrue(resultFault.error.includes('match is complete'));
});

test('validateAction rejects NEXT_SET when set is not complete', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.status = 'playing';

  const result = validateAction(state, { type: ActionTypes.NEXT_SET });

  assertEquals(result.valid, false);
  assertTrue(result.error.includes('set is not complete'));
});

test('validateAction accepts NEXT_SET when set is complete', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.status = 'set_complete';

  const result = validateAction(state, { type: ActionTypes.NEXT_SET });

  assertTrue(result.valid);
  assertEquals(result.error, null);
});

test('validateAction rejects action with no type', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });

  const result = validateAction(state, {});

  assertEquals(result.valid, false);
  assertTrue(result.error.includes('type'));
});

test('validateAction rejects action with invalid state', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'INVALID';

  const result = validateAction(state, { type: ActionTypes.SCORE_TEAM_A });

  assertEquals(result.valid, false);
  assertTrue(result.error.includes('Invalid state'));
});

test('validateAction accepts END_MATCH action', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });

  const result = validateAction(state, { type: ActionTypes.END_MATCH });

  assertTrue(result.valid);
  assertEquals(result.error, null);
});

test('validateAction accepts LOAD_STATE action', () => {
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });

  const result = validateAction(state, { type: ActionTypes.LOAD_STATE, payload: state });

  assertTrue(result.valid);
  assertEquals(result.error, null);
});

// ============================================================
//  HistoryManager Tests
// ============================================================

const { HistoryManager } = typeof require !== 'undefined' 
  ? require('./referee-game-state.js')
  : window;

console.log('\n=== HistoryManager Tests ===\n');

// Test 4.1: HistoryManager class
test('HistoryManager initializes with empty stack', () => {
  const history = new HistoryManager();
  
  assertEquals(history.size(), 0);
  assertEquals(history.canUndo(), false);
});

test('HistoryManager push adds state to stack', () => {
  const history = new HistoryManager();
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  
  history.push(state);
  
  assertEquals(history.size(), 1);
  assertEquals(history.canUndo(), true);
});

test('HistoryManager pop retrieves previous state', () => {
  const history = new HistoryManager();
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 5;
  state.scoreB = 3;
  
  history.push(state);
  const retrieved = history.pop();
  
  assertEquals(retrieved.scoreA, 5);
  assertEquals(retrieved.scoreB, 3);
  assertEquals(history.size(), 0);
});

test('HistoryManager pop returns null when stack is empty', () => {
  const history = new HistoryManager();
  
  const retrieved = history.pop();
  
  assertEquals(retrieved, null);
});

test('HistoryManager enforces max size limit', () => {
  const history = new HistoryManager(3);
  
  // Push 5 states
  for (let i = 0; i < 5; i++) {
    const state = createGameState({
      matchId: 'match1',
      tournamentId: 'tournament1',
      teamA: 'Team A',
      teamB: 'Team B'
    });
    state.scoreA = i;
    history.push(state);
  }
  
  // Should only have 3 states (max size)
  assertEquals(history.size(), 3);
  
  // Should have the most recent 3 states (2, 3, 4)
  const state1 = history.pop();
  assertEquals(state1.scoreA, 4);
  
  const state2 = history.pop();
  assertEquals(state2.scoreA, 3);
  
  const state3 = history.pop();
  assertEquals(state3.scoreA, 2);
  
  assertEquals(history.size(), 0);
});

test('HistoryManager default max size is 10', () => {
  const history = new HistoryManager();
  
  // Push 15 states
  for (let i = 0; i < 15; i++) {
    const state = createGameState({
      matchId: 'match1',
      tournamentId: 'tournament1',
      teamA: 'Team A',
      teamB: 'Team B'
    });
    state.scoreA = i;
    history.push(state);
  }
  
  // Should only have 10 states (default max size)
  assertEquals(history.size(), 10);
  
  // Should have the most recent 10 states (5-14)
  const state1 = history.pop();
  assertEquals(state1.scoreA, 14);
});

test('HistoryManager clear removes all states', () => {
  const history = new HistoryManager();
  
  // Push 3 states
  for (let i = 0; i < 3; i++) {
    const state = createGameState({
      matchId: 'match1',
      tournamentId: 'tournament1',
      teamA: 'Team A',
      teamB: 'Team B'
    });
    history.push(state);
  }
  
  assertEquals(history.size(), 3);
  
  history.clear();
  
  assertEquals(history.size(), 0);
  assertEquals(history.canUndo(), false);
});

test('HistoryManager deep clones state to prevent mutation', () => {
  const history = new HistoryManager();
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 5;
  state.scoreB = 3;
  
  history.push(state);
  
  // Mutate original state
  state.scoreA = 10;
  state.scoreB = 8;
  
  // Retrieved state should not be affected
  const retrieved = history.pop();
  assertEquals(retrieved.scoreA, 5);
  assertEquals(retrieved.scoreB, 3);
});

test('HistoryManager canUndo returns correct value', () => {
  const history = new HistoryManager();
  
  assertEquals(history.canUndo(), false);
  
  const state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  history.push(state);
  
  assertEquals(history.canUndo(), true);
  
  history.pop();
  
  assertEquals(history.canUndo(), false);
});

test('HistoryManager handles multiple push/pop operations', () => {
  const history = new HistoryManager();
  
  // Push state 1
  const state1 = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state1.scoreA = 1;
  history.push(state1);
  
  // Push state 2
  const state2 = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state2.scoreA = 2;
  history.push(state2);
  
  // Push state 3
  const state3 = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state3.scoreA = 3;
  history.push(state3);
  
  assertEquals(history.size(), 3);
  
  // Pop in reverse order
  const retrieved3 = history.pop();
  assertEquals(retrieved3.scoreA, 3);
  
  const retrieved2 = history.pop();
  assertEquals(retrieved2.scoreA, 2);
  
  const retrieved1 = history.pop();
  assertEquals(retrieved1.scoreA, 1);
  
  assertEquals(history.size(), 0);
});

test('HistoryManager integration with gameStateReducer', () => {
  const history = new HistoryManager();
  
  // Create initial state
  let state = createGameState({
    matchId: 'match1',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.servingTeam = 'A';
  
  // Save initial state
  history.push(state);
  
  // Apply action
  state = gameStateReducer(state, { type: ActionTypes.SCORE_TEAM_A });
  assertEquals(state.scoreA, 1);
  
  // Save new state
  history.push(state);
  
  // Apply another action
  state = gameStateReducer(state, { type: ActionTypes.SCORE_TEAM_A });
  assertEquals(state.scoreA, 2);
  
  // Undo to previous state
  const previousState = history.pop();
  assertEquals(previousState.scoreA, 1);
  
  // Undo to initial state
  const initialState = history.pop();
  assertEquals(initialState.scoreA, 0);
});

// Display final summary
console.log(`\n=== Final Summary ===`);
console.log(`${passCount} passed, ${failCount} failed`);

if (typeof document !== 'undefined') {
  const summaryDiv = document.getElementById('summary');
  if (summaryDiv) {
    summaryDiv.className = failCount === 0 ? 'summary success' : 'summary failure';
    summaryDiv.innerHTML = `
      <h2>${failCount === 0 ? '✓ All tests passed!' : '✗ Some tests failed'}</h2>
      <p><strong>${passCount}</strong> passed, <strong>${failCount}</strong> failed</p>
    `;
  }
}
