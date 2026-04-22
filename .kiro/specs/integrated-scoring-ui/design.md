# Integrated Scoring UI - Design Document

## Architecture Overview

### Component Structure
```
admin.html
├── admin.js (existing)
│   ├── Match Card Rendering
│   ├── Inline Scoring UI (NEW)
│   └── Tap-to-Score Logic (NEW)
├── referee-game-state.js (reuse)
│   ├── GameState management
│   ├── Score logic
│   └── Server rotation
└── referee-sync-engine.js (reuse)
    └── Realtime sync
```

## UI Design

### Match Card Layout (Expanded)
```
┌─────────────────────────────────────────────────┐
│ Match #1 - Group A                    [Status]  │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐         ┌──────────────┐     │
│  │   Team A     │    VS   │   Team B     │     │
│  │   [SERVING]  │         │              │     │
│  │              │         │              │     │
│  │      5       │    :    │      3       │     │
│  │              │         │              │     │
│  └──────────────┘         └──────────────┘     │
│                                                  │
│  Score Call: 5-3-2                              │
│  Server: Team A - Server 2                      │
│                                                  │
│  ┌──────────────────┐  ┌──────────────────┐   │
│  │ Chọn Giao Bóng   │  │      Undo        │   │
│  └──────────────────┘  └──────────────────┘   │
│                                                  │
│  [Finish Match]  [Reset Match]                  │
└─────────────────────────────────────────────────┘
```

### Serve Selection Dialog
```
┌─────────────────────────────────────┐
│  Chọn Đội Giao Bóng Đầu Tiên       │
├─────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐ │
│  │        Team A                  │ │
│  │        Giao Bóng Trước         │ │
│  └────────────────────────────────┘ │
│                                      │
│  ┌────────────────────────────────┐ │
│  │        Team B                  │ │
│  │        Giao Bóng Trước         │ │
│  └────────────────────────────────┘ │
│                                      │
│  Mặc định: Server 2                 │
│                                      │
│  [Hủy]                               │
└─────────────────────────────────────┘
```

## Data Flow

### 1. Initial State
```javascript
{
  matchId: 'match-1',
  teamA: 'Team A',
  teamB: 'Team B',
  scoreA: 0,
  scoreB: 0,
  servingTeam: null,  // null = chưa chọn
  serverNumber: 2,     // default
  status: 'not_started'
}
```

### 2. After Serve Selection
```javascript
{
  servingTeam: 'A',    // User chọn Team A
  serverNumber: 2,
  status: 'playing'
}
```

### 3. Tap-to-Score Flow
```
User taps Team A
    ↓
Check: Team A đang giao?
    ↓
YES → Check server number
    ↓
Server 1 → Chuyển Server 2, +1 điểm
Server 2 → Đổi giao, +1 điểm
    ↓
NO → Team A fault → Đổi giao cho Team B
    ↓
Update state → Sync → Re-render
```

## State Management

### GameState Integration
Sử dụng `referee-game-state.js` hiện có:

```javascript
// Import existing logic
import { 
  createGameState,
  gameStateReducer,
  ActionTypes,
  HistoryManager
} from './referee-game-state.js';

// Create state for each match
const matchStates = new Map();

function initMatchState(matchId, teamA, teamB) {
  const state = createGameState({
    matchId,
    teamA,
    teamB,
    servingTeam: null,  // Chưa chọn
    serverNumber: 2
  });
  
  matchStates.set(matchId, {
    current: state,
    history: new HistoryManager()
  });
}
```

### Tap-to-Score Logic
```javascript
function handleTeamTap(matchId, team) {
  const { current, history } = matchStates.get(matchId);
  
  // Save to history
  history.push(current);
  
  // Determine action
  let action;
  
  if (team === current.servingTeam) {
    // Team đang giao → Score
    action = {
      type: team === 'A' ? ActionTypes.SCORE_TEAM_A : ActionTypes.SCORE_TEAM_B
    };
  } else {
    // Team không giao → Fault (đổi giao)
    action = {
      type: team === 'A' ? ActionTypes.FAULT_TEAM_B : ActionTypes.FAULT_TEAM_A
    };
  }
  
  // Apply action
  const newState = gameStateReducer(current, action);
  
  // Update state
  matchStates.get(matchId).current = newState;
  
  // Sync to database
  syncMatchState(matchId, newState);
  
  // Re-render
  renderMatchCard(matchId);
}
```

## UI Components

### 1. Inline Scoring Area
```javascript
function renderInlineScoring(match, state) {
  const isServingA = state.servingTeam === 'A';
  const isServingB = state.servingTeam === 'B';
  const canStart = state.status === 'not_started';
  
  return `
    <div class="inline-scoring">
      <!-- Team Cards -->
      <div class="scoring-teams">
        <div class="team-card ${isServingA ? 'serving' : ''}" 
             onclick="handleTeamTap('${match.id}', 'A')"
             ${canStart ? 'disabled' : ''}>
          <div class="team-name">${state.teamA}</div>
          ${isServingA ? '<div class="serving-badge">SERVING</div>' : ''}
          <div class="team-score">${state.scoreA}</div>
        </div>
        
        <div class="vs-divider">VS</div>
        
        <div class="team-card ${isServingB ? 'serving' : ''}" 
             onclick="handleTeamTap('${match.id}', 'B')"
             ${canStart ? 'disabled' : ''}>
          <div class="team-name">${state.teamB}</div>
          ${isServingB ? '<div class="serving-badge">SERVING</div>' : ''}
          <div class="team-score">${state.scoreB}</div>
        </div>
      </div>
      
      <!-- Score Info -->
      <div class="score-info">
        <div class="score-call">
          Score Call: ${state.scoreA}-${state.scoreB}-${state.serverNumber}
        </div>
        <div class="server-info">
          Server: ${state.servingTeam ? 
            `Team ${state.servingTeam} - Server ${state.serverNumber}` : 
            'Chưa chọn giao bóng'}
        </div>
      </div>
      
      <!-- Actions -->
      <div class="scoring-actions">
        ${canStart ? `
          <button class="btn-serve-select" onclick="openServeDialog('${match.id}')">
            Chọn Giao Bóng
          </button>
        ` : ''}
        <button class="btn-undo" 
                onclick="handleUndo('${match.id}')"
                ${!history.canUndo() ? 'disabled' : ''}>
          ↶ Undo
        </button>
      </div>
    </div>
  `;
}
```

### 2. Serve Selection Dialog
```javascript
function openServeDialog(matchId) {
  const state = matchStates.get(matchId).current;
  
  const dialog = `
    <div class="dialog-overlay" id="serve-dialog-${matchId}">
      <div class="dialog">
        <h2>Chọn Đội Giao Bóng Đầu Tiên</h2>
        
        <button class="serve-option" onclick="selectServe('${matchId}', 'A')">
          <div class="team-name">${state.teamA}</div>
          <div class="serve-label">Giao Bóng Trước</div>
        </button>
        
        <button class="serve-option" onclick="selectServe('${matchId}', 'B')">
          <div class="team-name">${state.teamB}</div>
          <div class="serve-label">Giao Bóng Trước</div>
        </button>
        
        <p class="serve-note">Mặc định: Server 2</p>
        
        <button class="btn-secondary" onclick="closeServeDialog('${matchId}')">
          Hủy
        </button>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', dialog);
}

function selectServe(matchId, team) {
  const { current, history } = matchStates.get(matchId);
  
  // Save to history
  history.push(current);
  
  // Update state
  const newState = {
    ...current,
    servingTeam: team,
    serverNumber: 2,
    status: 'playing'
  };
  
  matchStates.get(matchId).current = newState;
  
  // Sync & render
  syncMatchState(matchId, newState);
  renderMatchCard(matchId);
  closeServeDialog(matchId);
}
```

## CSS Styling

### Team Cards (Tap Targets)
```css
.team-card {
  min-width: 150px;
  min-height: 150px;
  padding: 20px;
  border: 3px solid #ddd;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.team-card:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.team-card.serving {
  border-color: #4CAF50;
  background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  color: white;
}

.team-card[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}

.team-score {
  font-size: 72px;
  font-weight: bold;
  line-height: 1;
}

.serving-badge {
  background: rgba(255,255,255,0.3);
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}
```

## Database Schema

### Matches Table (Existing)
```sql
-- Add new columns for game state
ALTER TABLE matches ADD COLUMN IF NOT EXISTS serving_team TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS server_number INTEGER DEFAULT 2;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS game_state JSONB;
```

### Sync Strategy
```javascript
async function syncMatchState(matchId, state) {
  // Update database
  await db.from('matches').update({
    scoreA: state.scoreA,
    scoreB: state.scoreB,
    serving_team: state.servingTeam,
    server_number: state.serverNumber,
    status: state.status,
    game_state: state,  // Full state as JSON
    updated_at: new Date().toISOString()
  }).eq('id', matchId);
  
  // Broadcast to realtime channel
  if (realtimeChannel) {
    realtimeChannel.send({
      type: 'broadcast',
      event: 'match_update',
      payload: { matchId, state }
    });
  }
}
```

## Error Handling

### Invalid Actions
```javascript
function handleTeamTap(matchId, team) {
  const { current } = matchStates.get(matchId);
  
  // Check if match started
  if (!current.servingTeam) {
    showError('Vui lòng chọn đội giao bóng trước');
    return;
  }
  
  // Check if match completed
  if (current.status === 'match_complete') {
    showError('Trận đấu đã kết thúc');
    return;
  }
  
  // Proceed with action...
}
```

### Undo Validation
```javascript
function handleUndo(matchId) {
  const { history } = matchStates.get(matchId);
  
  if (!history.canUndo()) {
    showError('Không có action nào để undo');
    return;
  }
  
  const previousState = history.pop();
  matchStates.get(matchId).current = previousState;
  
  syncMatchState(matchId, previousState);
  renderMatchCard(matchId);
}
```

## Performance Optimization

### Debouncing
```javascript
const tapDebounce = new Map();

function handleTeamTap(matchId, team) {
  // Debounce to prevent double-tap
  if (tapDebounce.has(matchId)) {
    return;
  }
  
  tapDebounce.set(matchId, true);
  setTimeout(() => tapDebounce.delete(matchId), 300);
  
  // Process tap...
}
```

### Lazy Rendering
```javascript
// Only render expanded scoring UI for active matches
function renderMatchCard(match) {
  const isActive = match.status === 'playing' || match.status === 'not_started';
  
  if (isActive) {
    return renderExpandedCard(match);
  } else {
    return renderCompactCard(match);
  }
}
```

## Testing Strategy

### Unit Tests
- `handleTeamTap()` logic
- Server rotation logic
- Score calculation
- Undo functionality

### Integration Tests
- Full scoring flow
- Serve selection
- Database sync
- Realtime updates

### Manual Testing Checklist
- [ ] Tap Team A khi Team A đang giao → +1 điểm
- [ ] Tap Team A khi Team A server 1 → chuyển server 2
- [ ] Tap Team A khi Team A server 2 → đổi giao
- [ ] Tap Team B khi Team A đang giao → đổi giao
- [ ] Undo hoạt động đúng
- [ ] Serve selection hoạt động
- [ ] Realtime sync hoạt động

---

**Design Status**: ✅ Complete  
**Ready for Implementation**: Yes
