# Design Document

## Architecture Overview

Hệ thống quản lý vòng đời giải đấu được thiết kế theo kiến trúc phân lớp với các thành phần chính:

1. **UI Layer**: Giao diện admin panel và public view
2. **Business Logic Layer**: TournamentManager, PairingAlgorithm
3. **Data Access Layer**: StorageAdapter (Supabase/localStorage)
4. **State Management**: Tournament status-based UI control

## System Components

### 1. Tournament Control Panel (Admin UI)

**Location**: `admin.html` - Tournament Selector section

**Components**:
- Tournament dropdown selector (existing)
- Status indicator badge
- Dynamic button panel based on tournament status
- Member registration modal
- Confirmation dialogs

**Status-Based Button Visibility**:

```javascript
// When status = "upcoming"
- [Thêm Thành viên] → openMemberRegistrationModal()
- [Tạo Đội Ngẫu nhiên] → generateRandomTeams()
- [Tạo Trận Đấu] → generateRandomMatches()
- [Bắt Đầu Giải Đấu] → startTournament()

// When status = "ongoing"
- [Reset Giải Đấu] → resetTournament()

// When status = "completed"
- [Reset Giải Đấu] → resetTournament()
```

### 2. Member Registration Modal

**UI Structure**:
```html
<div id="member-registration-modal">
  <h2>Đăng ký Thành viên</h2>
  <div class="member-list">
    <!-- For each member -->
    <div class="member-item">
      <input type="checkbox" id="member-{id}" />
      <label>{name}</label>
      <span class="tier-badge">Tier {tier}</span>
      <select class="tier-override">
        <option value="">Giữ nguyên</option>
        <option value="1">Tier 1</option>
        <option value="2">Tier 2</option>
        <option value="3">Tier 3</option>
      </select>
      <input type="checkbox" class="is-seeded" />
      <label>Hạt giống</label>
    </div>
  </div>
  <button onclick="saveMemberRegistration()">Lưu</button>
  <button onclick="closeMemberRegistrationModal()">Hủy</button>
</div>
```

### 3. Tournament Status Indicator

**Visual Design**:
```css
.status-chip {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-upcoming { background: #fff3cd; color: #856404; }
.status-ongoing { background: #d4edda; color: #155724; }
.status-completed { background: #e2e3e5; color: #383d41; }
```

## Data Models

### Tournament Status Flow

```
[upcoming] → [ongoing] → [completed]
     ↑           ↓
     └─── reset ─┘
```

### Tournament Configuration

```javascript
{
  id: uuid,
  name: string,
  start_date: date,
  status: 'upcoming' | 'ongoing' | 'completed',
  config: {
    numGroups: 2,           // Fixed: 2 groups
    teamsPerGroup: number,  // Variable
    enableConsolation: boolean,
    enableThirdPlace: boolean
  },
  archived: boolean
}
```

### Tournament Participants

```javascript
{
  id: uuid,
  tournament_id: uuid,
  member_id: uuid,
  tier_override: number | null,  // Override member's default tier
  is_seeded: boolean             // Mark as seeded player
}
```

### Teams

```javascript
{
  id: uuid,
  tournament_id: uuid,
  name: string,              // Auto-generated: "Member1 & Member2"
  member1_id: uuid,
  member2_id: uuid,
  group_name: 'A' | 'B',     // Fixed: 2 groups
  is_seeded: boolean         // Derived from seeded participants
}
```

## Core Functions

### 1. Tournament Control Functions

#### `renderTournamentControls(tournament)`

**Purpose**: Render status-based button panel

**Logic**:
```javascript
async function renderTournamentControls(tournament) {
  const container = document.getElementById('tournament-controls');
  
  if (!isAdmin()) {
    container.style.display = 'none';
    return;
  }
  
  let html = '';
  
  if (tournament.status === 'upcoming') {
    html = `
      <button onclick="openMemberRegistrationModal()">
        👥 Thêm Thành viên
      </button>
      <button onclick="generateRandomTeams()">
        🎲 Tạo Đội Ngẫu nhiên
      </button>
      <button onclick="generateRandomMatches()">
        📅 Tạo Trận Đấu
      </button>
      <button onclick="startTournament()" class="btn-primary">
        ▶️ Bắt Đầu Giải Đấu
      </button>
    `;
  } else if (tournament.status === 'ongoing' || tournament.status === 'completed') {
    html = `
      <button onclick="resetTournament()" class="btn-warning">
        ↺ Reset Giải Đấu
      </button>
    `;
  }
  
  container.innerHTML = html;
}
```

#### `openMemberRegistrationModal()`

**Purpose**: Show member selection dialog

**Logic**:
```javascript
async function openMemberRegistrationModal() {
  const tournamentId = tournamentManager.getActiveTournamentId();
  if (!tournamentId) {
    alert('Vui lòng chọn giải đấu');
    return;
  }
  
  // Get all members
  const members = await storage.read('members');
  
  // Get already registered participants
  const participants = await tournamentManager.getParticipants(tournamentId);
  const registeredIds = new Set(participants.map(p => p.member_id));
  
  // Render modal with member list
  const modal = document.getElementById('member-registration-modal');
  const memberList = modal.querySelector('.member-list');
  
  memberList.innerHTML = members.map(member => `
    <div class="member-item">
      <input type="checkbox" 
             id="member-${member.id}" 
             value="${member.id}"
             ${registeredIds.has(member.id) ? 'checked' : ''} />
      <label for="member-${member.id}">${member.name}</label>
      <span class="tier-badge tier-${member.tier}">Tier ${member.tier}</span>
      <select class="tier-override" data-member-id="${member.id}">
        <option value="">Giữ nguyên</option>
        <option value="1">Tier 1</option>
        <option value="2">Tier 2</option>
        <option value="3">Tier 3</option>
      </select>
      <label>
        <input type="checkbox" class="is-seeded" data-member-id="${member.id}" />
        Hạt giống
      </label>
    </div>
  `).join('');
  
  modal.style.display = 'flex';
}
```

#### `saveMemberRegistration()`

**Purpose**: Save selected members to tournament

**Logic**:
```javascript
async function saveMemberRegistration() {
  const tournamentId = tournamentManager.getActiveTournamentId();
  
  // Collect selected members
  const checkboxes = document.querySelectorAll('#member-registration-modal input[type="checkbox"]:checked');
  const participants = [];
  
  checkboxes.forEach(cb => {
    if (cb.classList.contains('is-seeded')) return; // Skip seeded checkboxes
    
    const memberId = cb.value;
    const tierOverride = document.querySelector(`.tier-override[data-member-id="${memberId}"]`).value;
    const isSeeded = document.querySelector(`.is-seeded[data-member-id="${memberId}"]`).checked;
    
    participants.push({
      member_id: memberId,
      tier_override: tierOverride ? parseInt(tierOverride) : null,
      is_seeded: isSeeded
    });
  });
  
  if (participants.length < 4) {
    alert('Cần ít nhất 4 thành viên để tạo giải đấu');
    return;
  }
  
  try {
    // Clear existing participants
    const existing = await tournamentManager.getParticipants(tournamentId);
    for (const p of existing) {
      await storage.delete('tournament_participants', p.id);
    }
    
    // Add new participants
    await tournamentManager.addParticipants(tournamentId, participants);
    
    setStatus(`✓ Đã thêm ${participants.length} thành viên`, 'ok');
    closeMemberRegistrationModal();
  } catch (error) {
    setStatus(`❌ Lỗi: ${error.message}`, 'err');
  }
}
```

#### `generateRandomTeams()`

**Purpose**: Generate teams using pairing algorithm

**Logic**:
```javascript
async function generateRandomTeams() {
  const tournamentId = tournamentManager.getActiveTournamentId();
  const tournament = await tournamentManager.getTournament(tournamentId);
  
  if (tournament.status !== 'upcoming') {
    alert('Chỉ có thể tạo đội khi giải đấu chưa bắt đầu');
    return;
  }
  
  const participants = await tournamentManager.getParticipantsWithMembers(tournamentId);
  
  if (participants.length < 4) {
    alert('Cần ít nhất 4 thành viên để tạo đội');
    return;
  }
  
  if (!confirm(`Tạo đội ngẫu nhiên từ ${participants.length} thành viên?\n\nĐội cũ (nếu có) sẽ bị xóa.`)) {
    return;
  }
  
  try {
    // Delete existing teams
    const existingTeams = await tournamentManager.getTeams(tournamentId);
    for (const team of existingTeams) {
      await storage.delete('teams', team.id);
    }
    
    // Generate new teams
    const teams = await tournamentManager.generateTeams(tournamentId);
    
    setStatus(`✓ Đã tạo ${teams.length} đội`, 'ok');
  } catch (error) {
    setStatus(`❌ Lỗi: ${error.message}`, 'err');
  }
}
```

#### `generateRandomMatches()`

**Purpose**: Generate round-robin schedule

**Logic**:
```javascript
async function generateRandomMatches() {
  const tournamentId = tournamentManager.getActiveTournamentId();
  const tournament = await tournamentManager.getTournament(tournamentId);
  
  if (tournament.status !== 'upcoming') {
    alert('Chỉ có thể tạo trận đấu khi giải đấu chưa bắt đầu');
    return;
  }
  
  const teams = await tournamentManager.getTeams(tournamentId);
  
  if (teams.length === 0) {
    alert('Vui lòng tạo đội trước khi tạo trận đấu');
    return;
  }
  
  if (!confirm(`Tạo lịch thi đấu vòng tròn?\n\nTrận đấu cũ (nếu có) sẽ bị xóa.`)) {
    return;
  }
  
  try {
    // Delete existing matches
    const existingMatches = await tournamentManager.getMatches(tournamentId);
    for (const match of existingMatches) {
      await storage.delete('matches', match.id);
    }
    
    // Generate new matches
    const matches = await tournamentManager.generateSchedule(tournamentId);
    
    setStatus(`✓ Đã tạo ${matches.length} trận đấu`, 'ok');
  } catch (error) {
    setStatus(`❌ Lỗi: ${error.message}`, 'err');
  }
}
```

#### `startTournament()`

**Purpose**: Change status to ongoing and lock registration

**Logic**:
```javascript
async function startTournament() {
  const tournamentId = tournamentManager.getActiveTournamentId();
  const tournament = await tournamentManager.getTournament(tournamentId);
  
  if (tournament.status !== 'upcoming') {
    alert('Giải đấu đã bắt đầu');
    return;
  }
  
  // Validate prerequisites
  const participants = await tournamentManager.getParticipants(tournamentId);
  const teams = await tournamentManager.getTeams(tournamentId);
  const matches = await tournamentManager.getMatches(tournamentId);
  
  if (participants.length < 4) {
    alert('Cần ít nhất 4 thành viên để bắt đầu giải đấu');
    return;
  }
  
  if (teams.length === 0) {
    alert('Vui lòng tạo đội trước khi bắt đầu giải đấu');
    return;
  }
  
  if (matches.length === 0) {
    alert('Vui lòng tạo trận đấu trước khi bắt đầu giải đấu');
    return;
  }
  
  if (!confirm(`Bắt đầu giải đấu "${tournament.name}"?\n\n` +
               `• ${participants.length} thành viên\n` +
               `• ${teams.length} đội\n` +
               `• ${matches.length} trận đấu\n\n` +
               `Sau khi bắt đầu, bạn không thể thêm/xóa thành viên, đội, hoặc trận đấu.`)) {
    return;
  }
  
  try {
    await tournamentManager.updateStatus(tournamentId, 'ongoing');
    
    setStatus('✓ Giải đấu đã bắt đầu!', 'ok');
    
    // Reload UI
    await loadTournamentSelector();
    await fetchMatches();
  } catch (error) {
    setStatus(`❌ Lỗi: ${error.message}`, 'err');
  }
}
```

#### `resetTournament()`

**Purpose**: Reset tournament to upcoming state

**Logic**:
```javascript
async function resetTournament() {
  const tournamentId = tournamentManager.getActiveTournamentId();
  const tournament = await tournamentManager.getTournament(tournamentId);
  
  if (tournament.status === 'upcoming') {
    alert('Giải đấu chưa bắt đầu, không cần reset');
    return;
  }
  
  if (!confirm(`Reset giải đấu "${tournament.name}"?\n\n` +
               `CẢNH BÁO: Hành động này sẽ:\n` +
               `• Xóa tất cả trận đấu\n` +
               `• Xóa tất cả đội\n` +
               `• Giữ nguyên danh sách thành viên\n` +
               `• Đặt trạng thái về "Sắp diễn ra"\n\n` +
               `Bạn có chắc chắn muốn tiếp tục?`)) {
    return;
  }
  
  try {
    // Delete all matches
    const matches = await tournamentManager.getMatches(tournamentId);
    for (const match of matches) {
      await storage.delete('matches', match.id);
    }
    
    // Delete all teams
    const teams = await tournamentManager.getTeams(tournamentId);
    for (const team of teams) {
      await storage.delete('teams', team.id);
    }
    
    // Update status to upcoming
    await tournamentManager.updateStatus(tournamentId, 'upcoming');
    
    setStatus('✓ Giải đấu đã được reset', 'ok');
    
    // Reload UI
    await loadTournamentSelector();
    await fetchMatches();
  } catch (error) {
    setStatus(`❌ Lỗi: ${error.message}`, 'err');
  }
}
```

### 2. Tournament Selector Enhancement

#### `loadTournamentSelector()` - Enhanced

**Purpose**: Load tournaments sorted by status

**Logic**:
```javascript
async function loadTournamentSelector() {
  try {
    if (typeof storage === 'undefined' || !storage) {
      window.storage = new StorageAdapter(db);
    }
    if (typeof tournamentManager === 'undefined' || !tournamentManager) {
      window.tournamentManager = new TournamentManager(window.storage);
    }

    const tournaments = await tournamentManager.getAllTournaments();
    const select = document.getElementById('tournament-select');
    
    if (tournaments.length === 0) {
      select.innerHTML = '<option value="">Chưa có giải đấu nào</option>';
      return;
    }

    // Get active tournament ID
    const activeId = tournamentManager.getActiveTournamentId();
    
    // Sort tournaments: ongoing → upcoming → completed
    const statusOrder = { ongoing: 0, upcoming: 1, completed: 2 };
    const sorted = tournaments
      .filter(t => !t.archived)
      .sort((a, b) => {
        const orderDiff = statusOrder[a.status] - statusOrder[b.status];
        if (orderDiff !== 0) return orderDiff;
        // Secondary sort by start_date descending
        return new Date(b.start_date) - new Date(a.start_date);
      });
    
    // Populate dropdown
    select.innerHTML = sorted.map(t => `
      <option value="${t.id}" ${t.id == activeId ? 'selected' : ''}>
        ${t.name} (${getStatusText(t.status)})
      </option>
    `).join('');

    // If no active tournament, select first one
    if (!activeId && sorted.length > 0) {
      await switchTournament(sorted[0].id);
    } else {
      updateTournamentStatus();
      
      // Render tournament controls
      const activeTournament = sorted.find(t => t.id == activeId);
      if (activeTournament) {
        await renderTournamentControls(activeTournament);
      }
    }
  } catch (error) {
    console.error('Error loading tournaments:', error);
  }
}
```

#### `switchTournament()` - Enhanced

**Purpose**: Switch active tournament and update controls

**Logic**:
```javascript
async function switchTournament(tournamentId) {
  if (!tournamentId) return;
  
  try {
    await tournamentManager.setActiveTournament(tournamentId);
    updateTournamentStatus();
    
    // Reload matches for selected tournament
    await fetchMatches();
    
    // Render tournament controls
    const tournament = await tournamentManager.getTournament(tournamentId);
    await renderTournamentControls(tournament);
    
    setStatus('Đã chuyển giải đấu', 'ok');
  } catch (error) {
    setStatus('Lỗi khi chuyển giải đấu: ' + error.message, 'err');
  }
}
```

## UI/UX Design

### Admin Panel Layout

```
┌─────────────────────────────────────────────────────────┐
│ 🏓 Quản Trị - Giải Pickleball                          │
├─────────────────────────────────────────────────────────┤
│ 🏆 Giải đấu: [Dropdown ▼] [Sắp diễn ra]               │
│                                                         │
│ [👥 Thêm Thành viên] [🎲 Tạo Đội] [📅 Tạo Trận Đấu]  │
│ [▶️ Bắt Đầu Giải Đấu]                                  │
│                                                         │
│ [Quản lý giải đấu] [Quản lý thành viên]               │
├─────────────────────────────────────────────────────────┤
│ 📋 Vòng Bảng                                           │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

### Member Registration Modal

```
┌─────────────────────────────────────────────────────────┐
│ Đăng ký Thành viên                                [X]   │
├─────────────────────────────────────────────────────────┤
│ ☑ An          [Tier 1] [Giữ nguyên ▼] ☐ Hạt giống    │
│ ☑ Bình        [Tier 1] [Giữ nguyên ▼] ☑ Hạt giống    │
│ ☐ Cường       [Tier 1] [Giữ nguyên ▼] ☐ Hạt giống    │
│ ☑ Dung        [Tier 2] [Tier 1 ▼]     ☐ Hạt giống    │
│ ...                                                     │
├─────────────────────────────────────────────────────────┤
│                              [Hủy]  [Lưu]              │
└─────────────────────────────────────────────────────────┘
```

## Integration with Existing Code

### 1. TournamentManager Integration

**Existing methods to use**:
- `createTournament(basicInfo)` - Create new tournament
- `addParticipants(tournamentId, participants)` - Add members
- `generateTeams(tournamentId)` - Generate teams using PairingAlgorithm
- `generateSchedule(tournamentId)` - Generate round-robin matches
- `updateStatus(tournamentId, status)` - Change tournament status
- `getParticipants(tournamentId)` - Get registered members
- `getTeams(tournamentId)` - Get teams
- `getMatches(tournamentId)` - Get matches

### 2. PairingAlgorithm Integration

**Expected behavior**:
- Input: Array of participants with effective_tier
- Output: Array of teams with proper tier pairing (T1+T3, T2+T2)
- Distribute seeded players evenly across groups

### 3. Inline Scoring UI Integration

**No changes needed** - existing scoring UI works with tournament_id filter

### 4. StorageAdapter Integration

**Existing methods to use**:
- `create(table, data)` - Insert records
- `read(table, filter)` - Query records
- `update(table, id, data)` - Update records
- `delete(table, id)` - Delete records

## Error Handling

### Validation Rules

1. **Add Members**: Minimum 4 members required
2. **Generate Teams**: Participants must exist
3. **Generate Matches**: Teams must exist
4. **Start Tournament**: Participants, teams, and matches must exist
5. **Reset Tournament**: Only allowed when status is ongoing or completed

### Error Messages

```javascript
const ERROR_MESSAGES = {
  NO_TOURNAMENT: 'Vui lòng chọn giải đấu',
  MIN_MEMBERS: 'Cần ít nhất 4 thành viên để tạo giải đấu',
  NO_TEAMS: 'Vui lòng tạo đội trước khi tạo trận đấu',
  NO_MATCHES: 'Vui lòng tạo trận đấu trước khi bắt đầu giải đấu',
  ALREADY_STARTED: 'Giải đấu đã bắt đầu',
  NOT_STARTED: 'Giải đấu chưa bắt đầu, không cần reset'
};
```

## Performance Considerations

1. **Lazy Loading**: Only load tournament data when selected
2. **Caching**: Cache active tournament in memory
3. **Debouncing**: Debounce status updates to avoid race conditions
4. **Batch Operations**: Delete teams/matches in batches during reset

## Security Considerations

1. **Admin Check**: Always verify `isAdmin()` before showing admin UI
2. **Status Validation**: Server-side validation of status transitions
3. **Data Integrity**: Cascade delete teams/matches when resetting
4. **Confirmation Dialogs**: Require confirmation for destructive actions

## Testing Strategy

### Unit Tests

1. Test `renderTournamentControls()` with different statuses
2. Test `saveMemberRegistration()` with various inputs
3. Test `generateRandomTeams()` with different participant counts
4. Test `resetTournament()` data cleanup

### Integration Tests

1. Test full workflow: create → add members → generate teams → generate matches → start
2. Test reset workflow: start → reset → verify cleanup
3. Test tournament switching with different statuses

### Manual Testing Checklist

- [ ] Create tournament and verify status = "upcoming"
- [ ] Add members and verify saved to tournament_participants
- [ ] Generate teams and verify tier pairing rules
- [ ] Generate matches and verify round-robin schedule
- [ ] Start tournament and verify buttons hidden
- [ ] Reset tournament and verify data cleanup
- [ ] Switch between tournaments and verify UI updates
- [ ] Test as public user and verify admin buttons hidden
