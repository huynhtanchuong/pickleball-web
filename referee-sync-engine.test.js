// ============================================================
//  Referee Scoring System - SyncEngine Tests
//  Unit tests for real-time synchronization
// ============================================================

// Import functions (for Node.js environment)
// In browser, these will be available globally
const { SyncEngine } = typeof require !== 'undefined' 
  ? require('./referee-sync-engine.js')
  : window;

const { createGameState } = typeof require !== 'undefined' 
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

function assertFalse(value, message) {
  if (value) {
    throw new Error(message || `Expected false, got ${value}`);
  }
}

function assertNotNull(value, message) {
  if (value === null || value === undefined) {
    throw new Error(message || `Expected non-null value, got ${value}`);
  }
}

// Run tests
console.log('Running SyncEngine tests...\n');

// ============================================================
//  Constructor Tests
// ============================================================

test('SyncEngine initializes with Supabase client', () => {
  const mockClient = { channel: () => {}, from: () => {} };
  const syncEngine = new SyncEngine(mockClient);
  
  assertEquals(syncEngine.supabase, mockClient);
  assertFalse(syncEngine.isDemo);
  assertEquals(syncEngine.channel, null);
  assertEquals(syncEngine.debounceTimer, null);
  assertEquals(syncEngine.debounceDelay, 300);
});

test('SyncEngine initializes in demo mode when no client provided', () => {
  const syncEngine = new SyncEngine(null);
  
  assertTrue(syncEngine.isDemo);
  assertEquals(syncEngine.supabase, null);
});

// ============================================================
//  Serialization Tests
// ============================================================

test('serializeState converts GameState to database format', () => {
  const syncEngine = new SyncEngine(null);
  const state = createGameState({
    matchId: 'match_123',
    tournamentId: 'tournament_1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = 5;
  state.scoreB = 3;
  state.servingTeam = 'A';
  state.serverNumber = 1;
  state.updatedBy = 'referee_1';

  const serialized = syncEngine.serializeState(state);

  assertEquals(serialized.id, 'match_123');
  assertEquals(serialized.tournament_id, 'tournament_1');
  assertEquals(serialized.teamA, 'Team A');
  assertEquals(serialized.teamB, 'Team B');
  assertEquals(serialized.scoreA, 5);
  assertEquals(serialized.scoreB, 3);
  assertEquals(serialized.serving_team, 'A');
  assertEquals(serialized.server_number, 1);
  assertEquals(serialized.current_set, 1);
  assertTrue(typeof serialized.completed_sets === 'string');
  assertTrue(typeof serialized.match_config === 'string');
  assertEquals(serialized.status, 'not_started');
  assertEquals(serialized.updated_by, 'referee_1');
});

test('serializeState handles completed sets correctly', () => {
  const syncEngine = new SyncEngine(null);
  const state = createGameState({
    matchId: 'match_123',
    tournamentId: 'tournament_1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 5, winner: 'A' }
  ];

  const serialized = syncEngine.serializeState(state);
  const parsedSets = JSON.parse(serialized.completed_sets);

  assertEquals(parsedSets.length, 1);
  assertEquals(parsedSets[0].setNumber, 1);
  assertEquals(parsedSets[0].scoreA, 11);
  assertEquals(parsedSets[0].scoreB, 5);
  assertEquals(parsedSets[0].winner, 'A');
});

test('deserializeState converts database record to GameState', () => {
  const syncEngine = new SyncEngine(null);
  const record = {
    id: 'match_123',
    tournament_id: 'tournament_1',
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
    updated_at: '2026-01-15T10:30:00Z',
    updated_by: 'referee_1'
  };

  const state = syncEngine.deserializeState(record);

  assertEquals(state.matchId, 'match_123');
  assertEquals(state.tournamentId, 'tournament_1');
  assertEquals(state.teamA, 'Team A');
  assertEquals(state.teamB, 'Team B');
  assertEquals(state.scoreA, 5);
  assertEquals(state.scoreB, 3);
  assertEquals(state.servingTeam, 'A');
  assertEquals(state.serverNumber, 1);
  assertEquals(state.currentSet, 1);
  assertEquals(state.completedSets.length, 0);
  assertEquals(state.config.matchFormat, 'BO3');
  assertEquals(state.status, 'playing');
  assertEquals(state.updatedAt, '2026-01-15T10:30:00Z');
  assertEquals(state.updatedBy, 'referee_1');
});

test('deserializeState parses JSONB fields from strings', () => {
  const syncEngine = new SyncEngine(null);
  const record = {
    id: 'match_123',
    tournament_id: 'tournament_1',
    teamA: 'Team A',
    teamB: 'Team B',
    scoreA: 0,
    scoreB: 0,
    serving_team: 'A',
    server_number: 1,
    current_set: 2,
    completed_sets: '[{"setNumber":1,"scoreA":11,"scoreB":5,"winner":"A"}]',
    match_config: '{"matchFormat":"BO3","targetScore":11,"winByMargin":2,"firstServeSingle":true,"enableFaultButtons":false}',
    status: 'playing',
    updated_at: '2026-01-15T10:30:00Z',
    updated_by: 'referee_1'
  };

  const state = syncEngine.deserializeState(record);

  assertEquals(state.completedSets.length, 1);
  assertEquals(state.completedSets[0].setNumber, 1);
  assertEquals(state.completedSets[0].scoreA, 11);
  assertEquals(state.completedSets[0].scoreB, 5);
  assertEquals(state.completedSets[0].winner, 'A');
  assertEquals(state.config.matchFormat, 'BO3');
});

test('deserializeState handles lowercase field names from database', () => {
  const syncEngine = new SyncEngine(null);
  const record = {
    id: 'match_123',
    tournament_id: 'tournament_1',
    teama: 'Team A',
    teamb: 'Team B',
    scorea: 5,
    scoreb: 3,
    serving_team: 'A',
    server_number: 1,
    current_set: 1,
    completed_sets: '[]',
    match_config: '{"matchFormat":"BO3","targetScore":11,"winByMargin":2,"firstServeSingle":true,"enableFaultButtons":false}',
    status: 'playing',
    updated_at: '2026-01-15T10:30:00Z',
    updated_by: 'referee_1'
  };

  const state = syncEngine.deserializeState(record);

  assertEquals(state.teamA, 'Team A');
  assertEquals(state.teamB, 'Team B');
  assertEquals(state.scoreA, 5);
  assertEquals(state.scoreB, 3);
});

test('deserializeState provides default values for missing fields', () => {
  const syncEngine = new SyncEngine(null);
  const record = {
    id: 'match_123',
    tournament_id: 'tournament_1',
    teamA: 'Team A',
    teamB: 'Team B'
  };

  const state = syncEngine.deserializeState(record);

  assertEquals(state.scoreA, 0);
  assertEquals(state.scoreB, 0);
  assertEquals(state.servingTeam, 'A');
  assertEquals(state.serverNumber, 1);
  assertEquals(state.currentSet, 1);
  assertEquals(state.completedSets.length, 0);
  assertNotNull(state.config);
  assertEquals(state.status, 'not_started');
});

test('Round-trip serialization preserves state', () => {
  const syncEngine = new SyncEngine(null);
  const original = createGameState({
    matchId: 'match_123',
    tournamentId: 'tournament_1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  original.scoreA = 5;
  original.scoreB = 3;
  original.completedSets = [
    { setNumber: 1, scoreA: 11, scoreB: 9, winner: 'A' }
  ];

  const serialized = syncEngine.serializeState(original);
  const deserialized = syncEngine.deserializeState(serialized);

  assertEquals(deserialized.matchId, original.matchId);
  assertEquals(deserialized.scoreA, original.scoreA);
  assertEquals(deserialized.scoreB, original.scoreB);
  assertEquals(deserialized.completedSets.length, original.completedSets.length);
  assertEquals(deserialized.config.matchFormat, original.config.matchFormat);
});

// ============================================================
//  Demo Mode Tests (localStorage)
// ============================================================

test('Demo mode: checkConflict always returns false', async () => {
  const syncEngine = new SyncEngine(null);
  
  const conflict = await syncEngine.checkConflict('match_123', '2026-01-15T10:30:00Z');
  
  assertFalse(conflict);
});

test('Demo mode: loadState reads from localStorage', async () => {
  const syncEngine = new SyncEngine(null);
  const matchId = 'match_123';

  // Setup localStorage
  localStorage.setItem('pb_matches', JSON.stringify([
    {
      id: matchId,
      tournament_id: 'tournament_1',
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
      updated_at: '2026-01-15T10:30:00Z',
      updated_by: 'referee_1'
    }
  ]));

  const state = await syncEngine.loadState(matchId);

  assertNotNull(state);
  assertEquals(state.matchId, matchId);
  assertEquals(state.scoreA, 5);
  assertEquals(state.scoreB, 3);

  // Cleanup
  localStorage.removeItem('pb_matches');
});

test('Demo mode: loadState returns null when match not found', async () => {
  const syncEngine = new SyncEngine(null);
  
  localStorage.setItem('pb_matches', JSON.stringify([]));
  
  const state = await syncEngine.loadState('nonexistent');
  
  assertEquals(state, null);
  
  localStorage.removeItem('pb_matches');
});

// ============================================================
//  Cleanup Tests
// ============================================================

test('cleanup clears debounce timer', () => {
  const syncEngine = new SyncEngine(null);
  syncEngine.debounceTimer = setTimeout(() => {}, 1000);
  
  syncEngine.cleanup();
  
  assertEquals(syncEngine.debounceTimer, null);
});

test('cleanup unsubscribes from channel', () => {
  const syncEngine = new SyncEngine(null);
  syncEngine.channel = { unsubscribe: () => {} };
  
  syncEngine.cleanup();
  
  assertEquals(syncEngine.channel, null);
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
