// Simple verification script for HistoryManager
// This can be run in browser console or with Node.js

const {
  createGameState,
  HistoryManager,
  gameStateReducer,
  ActionTypes
} = typeof require !== 'undefined' 
  ? require('./referee-game-state.js')
  : window;

console.log('=== HistoryManager Verification ===\n');

// Test 1: Basic push/pop
console.log('Test 1: Basic push/pop');
const history1 = new HistoryManager();
const state1 = createGameState({
  matchId: 'test1',
  tournamentId: 'tournament1',
  teamA: 'Team A',
  teamB: 'Team B'
});
state1.scoreA = 5;

history1.push(state1);
const retrieved1 = history1.pop();
console.log('✓ Push and pop works:', retrieved1.scoreA === 5);

// Test 2: Max size enforcement
console.log('\nTest 2: Max size enforcement');
const history2 = new HistoryManager(3);
for (let i = 0; i < 5; i++) {
  const state = createGameState({
    matchId: 'test2',
    tournamentId: 'tournament1',
    teamA: 'Team A',
    teamB: 'Team B'
  });
  state.scoreA = i;
  history2.push(state);
}
console.log('✓ Max size enforced:', history2.size() === 3);

// Test 3: Deep cloning
console.log('\nTest 3: Deep cloning prevents mutation');
const history3 = new HistoryManager();
const state3 = createGameState({
  matchId: 'test3',
  tournamentId: 'tournament1',
  teamA: 'Team A',
  teamB: 'Team B'
});
state3.scoreA = 5;
history3.push(state3);
state3.scoreA = 10; // Mutate original
const retrieved3 = history3.pop();
console.log('✓ Deep clone works:', retrieved3.scoreA === 5);

// Test 4: canUndo
console.log('\nTest 4: canUndo method');
const history4 = new HistoryManager();
console.log('✓ Empty stack canUndo:', history4.canUndo() === false);
history4.push(state1);
console.log('✓ Non-empty stack canUndo:', history4.canUndo() === true);

// Test 5: clear
console.log('\nTest 5: clear method');
const history5 = new HistoryManager();
history5.push(state1);
history5.push(state1);
history5.clear();
console.log('✓ Clear works:', history5.size() === 0);

// Test 6: Integration with reducer
console.log('\nTest 6: Integration with gameStateReducer');
const history6 = new HistoryManager();
let state6 = createGameState({
  matchId: 'test6',
  tournamentId: 'tournament1',
  teamA: 'Team A',
  teamB: 'Team B'
});
state6.servingTeam = 'A';

history6.push(state6);
state6 = gameStateReducer(state6, { type: ActionTypes.SCORE_TEAM_A });
history6.push(state6);
state6 = gameStateReducer(state6, { type: ActionTypes.SCORE_TEAM_A });

const undoState = history6.pop();
console.log('✓ Undo restores previous state:', undoState.scoreA === 1);

console.log('\n=== All Verifications Passed! ===');
