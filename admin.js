// ============================================================
//  admin.js — Admin panel logic
// ============================================================

// Per-match scoring history shown to the referee. Each entry stores enough
// state to render full team names + the player serving + the receiver +
// the 3-digit score "us-them-N", computed at the time of the action.
// In-memory only — cleared on page reload.
const _matchActionLog = new Map();
function logMatchAction(matchId, entry) {
  if (!matchId || !entry) return;
  const list = _matchActionLog.get(matchId) || [];
  list.push({ time: Date.now(), ...entry });
  if (list.length > 30) list.splice(0, list.length - 30);
  _matchActionLog.set(matchId, list);
}
function _formatLogTime(ms) {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
// Render one log entry into a sentence the referee can read at a glance
function formatLogEntry(e) {
  if (e.type === 'serve_pick') {
    return `Bắt đầu — ${e.servingTeamName} giao trước`;
  }
  if (e.type === 'score') {
    const score = `${e.servingScore}-${e.otherScore}-${e.serverNumber || 1}`;
    const parts = [`${e.servingTeamName}: ${score}`];
    if (e.serverName)   parts.push(`Phát: ${e.serverName}`);
    if (e.receiverName) parts.push(`Đỡ: ${e.receiverName}`);
    return parts.join('  ·  ');
  }
  if (e.type === 'fault_partner') {
    return `Đổi server trong đội ${e.teamName} (Server ${e.fromServer}→${e.toServer})`;
  }
  if (e.type === 'side_out') {
    return `Đổi giao → ${e.newServingTeamName}`;
  }
  if (e.type === 'set_end') {
    return e.matchEnded
      ? `Hết trận (${e.setsA}-${e.setsB} sets)`
      : `Hết Set ${e.set} (${e.sa}-${e.sb}) → Set ${e.set + 1}`;
  }
  if (e.type === 'undo') return 'Hoàn tác';
  return e.label || '';
}

// Render N serving-ball icons for a match (or empty string when not serving).
// Uses the shared pickleballBalls() helper from app.js.
function admServingBadge(m, side) {
  if (m.status !== 'playing' || m.serving_team !== side) return '';
  if (typeof pickleballBalls !== 'function') return '';
  return `<span class="adm-serving-balls">${pickleballBalls(m.server_number || 1)}</span>`;
}

// ── Auth ──────────────────────────────────────────────────────
// Reads password, delegates to auth.js doLogin(), shows panel or error.
function submitLogin() {
  const pw   = document.getElementById("pw-input").value;
  const role = doLogin(pw); // auth.js
  if (role) {
    applyRoleVisibility(); // auth.js — hide/show .admin-only etc.
    showAdminPanel();
  } else {
    showLoginError("Mật khẩu không đúng. Thử lại.");
    document.getElementById("pw-input").value = "";
    document.getElementById("pw-input").focus();
  }
}
// doLogout() is provided by auth.js

// Cached state used by matchHTML & gateScoringByRole
let _activeTournament = null;     // current tournament object (status, config…)
let _allMembersList   = [];       // members list for referee dropdown
let teamById          = new Map();// team_id → team object (for inline scoring)
let memberById        = new Map();// member_id → member object

async function showAdminPanel() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-panel").style.display  = "block";
  applyRoleVisibility(); // auth.js — refresh role badge + hide admin-only elements
  initSupabase();

  // Initialize storage and tournament manager
  if (typeof storage === 'undefined' || !storage) {
    window.storage = new StorageAdapter(db);
  }
  if (typeof tournamentManager === 'undefined' || !tournamentManager) {
    window.tournamentManager = new TournamentManager(window.storage);
  }

  // Run migration check (fire-and-forget)
  checkAndMigrate();
  refreshMembersCache();

  // CRITICAL: await loadTournamentSelector so _activeTournament is cached
  // BEFORE the first fetchMatches → renderMatches → gateScoringByRole runs.
  // Otherwise referees on first login see scoring controls hidden because
  // _activeTournament is still null when the gate evaluates status.
  await loadTournamentSelector();

  fetchMatches();
  subscribeRealtime();

  if (typeof initAutoBackupToggle === 'function') {
    initAutoBackupToggle();
  }
}

async function refreshMembersCache() {
  try {
    if (!storage) return;
    const members = await storage.read('members');
    _allMembersList = (members || []).slice().sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'vi'));
    memberById = new Map((members || []).map(m => [m.id, m]));
  } catch (e) {
    console.error('refreshMembersCache:', e);
  }
}

async function refreshTeamsCache() {
  try {
    if (!storage || !_activeTournament) return;
    const teams = await storage.read('teams', { tournament_id: _activeTournament.id });
    teamById = new Map((teams || []).map(t => [t.id, t]));
  } catch (e) {
    console.error('refreshTeamsCache:', e);
  }
}

// Swap member1 ↔ member2 of a team. Allowed for referee + admin
// (trọng tài cần đổi vị trí ngay tại sân khi vào trận).
// Manual "Kết thúc Set" for BO3 (semi/final). Determines set winner from
// current set scores, bumps that team's set wins, and either advances to
// the next set or finishes the match if a team reaches 2 set wins. Always
// requires referee click (no auto-advance).
async function endSet(matchId) {
  if (typeof canScore !== 'function' || !canScore()) {
    setStatus(t('errOnlyReferee'), 'err');
    return;
  }
  try {
    const matches = db ? await fetchAllMatches() : (localMatches || []);
    const m = matches.find(x => x.id === matchId);
    if (!m) { setStatus(t('errMatchNotFound'), 'err'); return; }

    const cs = m.current_set || 1;
    const setA = m[`s${cs}a`] || 0;
    const setB = m[`s${cs}b`] || 0;
    if (setA === setB) {
      setStatus('Set đang hòa — chưa có người thắng', 'err');
      return;
    }
    const setWinner = setA > setB ? 'A' : 'B';
    const newWinsA = (m.scoreA || 0) + (setWinner === 'A' ? 1 : 0);
    const newWinsB = (m.scoreB || 0) + (setWinner === 'B' ? 1 : 0);

    const payload = {
      score_a: newWinsA,
      score_b: newWinsB,
      updated_at: new Date().toISOString()
    };
    if (newWinsA >= 2 || newWinsB >= 2) {
      payload.status = 'done';
    } else if (cs < 3) {
      payload.current_set = cs + 1;
      // Reset positions for new set: server_slot back to 1
      payload.server_slot = 1;
    } else {
      payload.status = 'done';
    }

    if (db) {
      const { error } = await db.from('matches').update(payload).eq('id', matchId);
      if (error) { showError(error, t('errSaveScore')); return; }
    } else {
      const stored = localStorage.getItem('pb_matches');
      localMatches = stored ? JSON.parse(stored) : [];
      const lm = localMatches.find(x => x.id === matchId);
      if (lm) Object.assign(lm, payload);
      saveLocal(localMatches);
    }

    if (payload.status === 'done') {
      logMatchAction(matchId, { type: 'set_end', matchEnded: true,
                                set: cs, sa: setA, sb: setB,
                                setsA: newWinsA, setsB: newWinsB });
      showOk('🏆 Trận đấu kết thúc');
    } else {
      logMatchAction(matchId, { type: 'set_end', matchEnded: false,
                                set: cs, sa: setA, sb: setB });
      showOk(`✓ Hết Set ${cs} — bắt đầu Set ${cs + 1}`);
    }
    await fetchMatches();
  } catch (e) {
    showError(e);
  }
}

async function swapTeamMembers(teamId) {
  if (typeof isReferee !== 'function' || !isReferee()) {
    setStatus(t('errPermission'), 'err');
    return;
  }
  try {
    // Always re-fetch latest team state from DB so multiple swaps in a row
    // act on the current member1/member2, not on stale cache data.
    let team = teamById.get(teamId);
    if (!team) {
      await refreshTeamsCache();
      team = teamById.get(teamId);
    }
    if (!team) {
      setStatus('Không tìm thấy đội', 'err');
      return;
    }

    // Per-match status guard already lives in the lineup-row visibility
    // (it only renders for matches whose status === 'not_started'). We
    // intentionally do NOT block here on other matches in progress —
    // referee/admin needs the freedom to fix slots before each match starts.

    await storage.update('teams', teamId, {
      member1_id: team.member2_id,
      member2_id: team.member1_id
    });
    await refreshTeamsCache();
    await fetchMatches();
    // Reload teams tab too if it's the open one — keeps the swap UI fresh
    if (typeof loadTeamsTab === 'function') {
      const teamsTab = document.getElementById('tab-teams');
      if (teamsTab && teamsTab.style.display !== 'none') loadTeamsTab();
    }
    showOk('✓ Đã đổi vị trí');
  } catch (e) {
    showError(e);
  }
}

// Render / hide the "Reset giải đấu" link at the very bottom of the admin
// page. Only shown to admin and only when the tournament is past the setup
// phase (status !== 'upcoming'). Pass null to hide.
function renderResetBottomLink(tournament) {
  const el = document.getElementById('tournament-reset-bottom');
  if (!el) return;
  if (!tournament || (typeof isAdmin === 'function' && !isAdmin())) {
    el.innerHTML = '';
    el.style.display = 'none';
    return;
  }
  el.style.display = 'block';
  el.innerHTML = `
    <a href="#" onclick="resetTournament(); return false;" class="adm-reset-bottom-link">
      ${t('ctaResetTournament')}
    </a>`;
}

// Show/hide elements that only make sense before the tournament starts
// (e.g. auto-schedule bar). Once status moves to 'ongoing' admins only
// edit individual matches; once 'completed' nothing else to do.
// Toggle a class instead of inline style so original display:flex is preserved.
function applyTournamentStatusVisibility() {
  const isUpcoming = _activeTournament && _activeTournament.status === 'upcoming';
  document.querySelectorAll('.upcoming-only').forEach(el => {
    el.classList.toggle('is-hidden', !isUpcoming);
  });
}

// ── Migration Check ──────────────────────────────────────────
async function checkAndMigrate() {
  try {
    if (!tournamentManager) return;
    
    const needsMigration = await tournamentManager.needsMigration();
    
    if (needsMigration) {
      setStatus('🔄 Đang di chuyển dữ liệu cũ...', 'ok');
      
      const result = await tournamentManager.migrateExistingMatches();
      
      setStatus(`✓ ${result.message}`, 'ok');
      
      // Set the default tournament as active
      const defaultTournament = await tournamentManager.ensureDefaultTournament();
      await tournamentManager.setActiveTournament(defaultTournament.id);
    }
  } catch (error) {
    console.error('Migration error:', error);
    setStatus('⚠️ Lỗi di chuyển dữ liệu: ' + error.message, 'err');
  }
}

// ── Tournament Selector ──────────────────────────────────────
async function loadTournamentSelector() {
  try {
    // Initialize storage and tournament manager if not already done
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
    
    // Populate dropdown
    select.innerHTML = tournaments
      .filter(t => !t.archived)
      .map(t => `
        <option value="${t.id}" ${t.id == activeId ? 'selected' : ''}>
          ${t.name} (${getStatusText(t.status)})
        </option>
      `).join('');

    // If no active tournament, select first one
    if (!activeId && tournaments.length > 0) {
      await switchTournament(tournaments[0].id);
    } else {
      updateTournamentStatus();
      
      const activeTournament = tournaments.find(t => t.id == activeId);
      if (activeTournament) {
        _activeTournament = activeTournament;
        applyTournamentStatusVisibility();
        await refreshTeamsCache();
        await renderTournamentControls(activeTournament);
      }
    }
  } catch (error) {
    console.error('Error loading tournaments:', error);
  }
}

function getStatusText(status) {
  const map = {
    'upcoming': 'Sắp diễn ra',
    'ongoing': 'Đang diễn ra',
    'completed': 'Đã kết thúc'
  };
  return map[status] || status;
}

async function switchTournament(tournamentId) {
  if (!tournamentId) return;

  try {
    await tournamentManager.setActiveTournament(tournamentId);
    updateTournamentStatus();

    // Cache the active tournament so gateScoringByRole can read .status
    _activeTournament = await tournamentManager.getTournament(tournamentId);
    applyTournamentStatusVisibility();
    await refreshTeamsCache();

    await fetchMatches();
    await renderTournamentControls(_activeTournament);

    setStatus('Đã chuyển giải đấu', 'ok');
  } catch (error) {
    setStatus('Lỗi khi chuyển giải đấu: ' + error.message, 'err');
  }
}

function updateTournamentStatus() {
  const select = document.getElementById('tournament-select');
  const statusEl = document.getElementById('tournament-status');
  
  if (!select || !statusEl) return;
  
  const selectedOption = select.options[select.selectedIndex];
  if (selectedOption && selectedOption.value) {
    const statusText = selectedOption.text.match(/\((.*?)\)/);
    if (statusText) {
      statusEl.textContent = statusText[1];
      statusEl.className = 'status-chip';
    }
  }
}

// ── Tournament Controls Rendering ────────────────────────────
async function renderTournamentControls(tournament) {
  const container = document.getElementById('tournament-controls');
  
  if (!container) return;
  
  // Hide controls for non-admin users
  if (!isAdmin()) {
    container.style.display = 'none';
    return;
  }
  
  container.style.display = 'block';

  // For ongoing/completed: hide the controls section entirely (no setup wizard).
  // The reset link is rendered separately at the very bottom of the page —
  // see #tournament-reset-bottom — so it can't be hit by accident near the
  // active controls.
  if (tournament.status !== 'upcoming') {
    container.innerHTML = '';
    container.style.display = 'none';
    renderResetBottomLink(tournament);
    return;
  }
  renderResetBottomLink(null); // hide bottom link while in upcoming setup

  // Setup wizard: read current state, render progress + single primary CTA.
  let pCount = 0, tCount = 0, mCount = 0, mScheduled = 0;
  try {
    const [participants, teams, matches] = await Promise.all([
      storage.read('tournament_participants', { tournament_id: tournament.id }),
      storage.read('teams',                   { tournament_id: tournament.id }),
      storage.read('matches',                 { tournament_id: tournament.id })
    ]);
    pCount = participants.length;
    tCount = teams.length;
    // Only group-stage matches count toward setup steps (special matches like
    // exhibition / third_place / consolation are added ad-hoc by admin and
    // don't need to be auto-scheduled before the giải bắt đầu).
    const groupMatches = matches.filter(m => !m.stage || m.stage === 'group');
    mCount = groupMatches.length;
    mScheduled = groupMatches.filter(m => m.match_time && m.court).length;
  } catch (e) {
    console.error('renderTournamentControls counts:', e);
  }

  // Determine completion of each step
  const step1Done = pCount >= 4;
  const step2Done = step1Done && tCount > 0;
  const step3Done = step2Done && mCount > 0;
  const step4Done = step3Done && mScheduled === mCount; // all matches scheduled

  // First incomplete step → primary CTA
  const next =
    !step1Done ? { label: t('ctaAddMembers'),     fn: 'openMemberRegistrationModal()', cls: 'btn-add-members' } :
    !step2Done ? { label: t('ctaGenTeams'),       fn: 'generateRandomTeams()',         cls: 'btn-generate-teams' } :
    !step3Done ? { label: t('ctaGenMatches'),     fn: 'generateRandomMatches()',       cls: 'btn-generate-matches' } :
    !step4Done ? { label: t('ctaSchedule'),       fn: 'autoScheduleMatches()',         cls: 'btn-generate-matches' } :
                 { label: t('ctaStartTournament'),fn: 'startTournament()',             cls: 'btn-start-tournament' };

  const stepHtml = (n, label, count, done, active) => `
    <div class="setup-step ${done ? 'done' : ''} ${active ? 'active' : ''}">
      <span class="step-badge">${done ? '✓' : n}</span>
      <span class="step-label">${label}</span>
      ${count !== null ? `<span class="step-count">${count}</span>` : ''}
    </div>`;

  container.innerHTML = `
    <div class="setup-bar">
      ${stepHtml(1, t('setupMembers'), pCount,     step1Done, !step1Done)}
      <span class="step-arrow">›</span>
      ${stepHtml(2, t('setupTeams'),   tCount,     step2Done, step1Done && !step2Done)}
      <span class="step-arrow">›</span>
      ${stepHtml(3, t('setupMatches'), mCount,     step3Done, step2Done && !step3Done)}
      <span class="step-arrow">›</span>
      ${stepHtml(4, t('setupSchedule'),step3Done ? `${mScheduled}/${mCount}` : null, step4Done, step3Done && !step4Done)}
      <span class="step-arrow">›</span>
      ${stepHtml(5, t('setupStart'),   null,       false,     step4Done)}
    </div>
    <div class="setup-cta-row">
      <button class="tournament-control-btn ${next.cls}" onclick="${next.fn}">
        ${next.label}
      </button>
      <details class="setup-other">
        <summary>${t('moreOptions')} ▾</summary>
        <div class="setup-other-actions">
          <button class="setup-btn-sm" onclick="openMemberRegistrationModal()">${t('editMembers')}</button>
          <button class="setup-btn-sm" onclick="generateRandomTeams()">${t('repairTeams')}</button>
          <button class="setup-btn-sm" onclick="generateRandomMatches()">${t('regenMatches')}</button>
        </div>
      </details>
    </div>`;
}

document.addEventListener("DOMContentLoaded", () => {
  // Accept both admin and referee roles (referee can score but not manage)
  if (isReferee()) showAdminPanel();

  // Close any <details class="adm-menu"> when user clicks outside it.
  // Native <details> doesn't auto-close on outside-click.
  document.addEventListener('click', (e) => {
    document.querySelectorAll('details.adm-menu[open]').forEach(d => {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });
});

// ── Override renderMatches for admin ─────────────────────────
function renderMatches(matches) {
  const groupMatches = matches.filter(m => !m.stage || m.stage === "group");
  const semiMatches  = matches.filter(m => m.stage === "semi");
  const finalMatches = matches.filter(m => m.stage === "final");

  renderStageList("match-list-group", groupMatches, "group");
  renderStageList("match-list-semi",  semiMatches,  "semi");
  renderStageList("match-list-final", finalMatches, "final");
  renderSpecialMatches(matches);
  updateBracketUI(matches);

  // Re-apply .admin-only / .scorer-only visibility on the freshly rendered
  // match cards (the .admin-only edit form inside each card otherwise
  // leaks to referee/view because applyRoleVisibility only ran at login).
  if (typeof applyRoleVisibility === 'function') applyRoleVisibility();

  // Disable scoring controls when current role is not 'referee'
  // (admin can manage tournaments but must switch role to score matches)
  gateScoringByRole();

  // Auto-generate bracket stages
  autoGenerateBracket(matches);
}

// Hide / disable score-input UI when:
//   - current role isn't 'referee', OR
//   - active tournament hasn't started yet (status !== 'ongoing')
// Admin must press "▶️ Bắt Đầu Giải Đấu" before referees can score.
function gateScoringByRole() {
  const isOngoing = _activeTournament && _activeTournament.status === 'ongoing';
  const allowed = (typeof canScore === 'function') && canScore() && isOngoing;
  if (allowed) return;

  // Numeric set inputs → read-only
  document.querySelectorAll('.adm-set-input').forEach(el => {
    el.readOnly = true;
    el.tabIndex = -1;
  });
  // All score-mutating buttons → hide
  const hideSelectors = [
    '.adm-set-btn',          // +/− on set inputs
    '.adm-add-set-btn',      // "Add set 3"
    '.adm-set-lock-btn',     // lock/unlock set
    '.adm-inc-btn',          // legacy +/− single-score
    '.btn-serve-select',     // pick first server
    '.btn-undo',             // undo last point
    '.adm-finish-btn',       // finish match
    '.adm-reset-btn'         // reset single match
  ];
  document.querySelectorAll(hideSelectors.join(',')).forEach(el => {
    el.style.display = 'none';
  });
  // Tap-to-score team cards → no click, no hover affordance
  document.querySelectorAll('.inline-scoring .team-card').forEach(el => {
    el.style.pointerEvents = 'none';
    el.style.cursor = 'default';
    el.onclick = null;
    el.removeAttribute('onclick');
  });
}

// ── Auto-generate bracket ─────────────────────────────────────
let _bracketGenerating = false;

async function autoGenerateBracket(matches) {
  if (_bracketGenerating) return;
  // Only auto-generate while a tournament is selected and currently ongoing.
  // Don't fire for upcoming/completed and don't pollute other tournaments.
  if (!_activeTournament || _activeTournament.status !== 'ongoing') return;

  const tid = _activeTournament.id;
  const scoped = matches.filter(m => m.tournament_id == tid);
  const groupMatches = scoped.filter(m => !m.stage || m.stage === "group");
  const semiMatches  = scoped.filter(m => m.stage === "semi");
  const finalMatches = scoped.filter(m => m.stage === "final");

  const allGroupDone = groupMatches.length > 0 && groupMatches.every(m => m.status === "done");

  // Auto-gen semis when all group done and no semis yet
  if (allGroupDone && semiMatches.length === 0) {
    _bracketGenerating = true;
    await generateSemifinals(true);
    _bracketGenerating = false;
    await fetchMatches();
    return;
  }

  // If semis exist but some group matches were reset, clear stale bracket
  if (!allGroupDone && semiMatches.length > 0) {
    const hasNotStartedSemi = semiMatches.some(m => m.status === "not_started");
    if (hasNotStartedSemi) {
      _bracketGenerating = true;
      if (db) {
        await db.from("matches").delete().eq("tournament_id", tid).eq("stage", "semi");
        await db.from("matches").delete().eq("tournament_id", tid).eq("stage", "final");
      } else {
        localMatches = (localMatches||[]).filter(m =>
          m.tournament_id != tid || (m.stage !== "semi" && m.stage !== "final"));
        saveLocal(localMatches);
      }
      _bracketGenerating = false;
      fetchMatches();
      return;
    }
  }

  // Auto-gen final when both semis done and no final yet
  const allSemiDone = semiMatches.length >= 2 && semiMatches.every(m => m.status === "done");
  if (allSemiDone && finalMatches.length === 0) {
    _bracketGenerating = true;
    await generateFinal(true);
    _bracketGenerating = false;
  }
}

// ── Render stage list ─────────────────────────────────────────
function renderStageList(containerId, matches, stage) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!matches || matches.length === 0) {
    const msgs = {
      group: '<p class="empty">No group matches.</p>',
      semi:  '<p class="empty adm-auto-note">⏳ Semifinals will auto-generate when all group matches finish.</p>',
      final: '<p class="empty adm-auto-note">⏳ Final will auto-generate when both semifinals finish.</p>'
    };
    container.innerHTML = msgs[stage] || '<p class="empty">No matches.</p>';
    return;
  }

  // Sort: playing → not_started → done, then by time
  const statusOrder = { playing: 0, not_started: 1, pending: 1, done: 2 };
  const sorted = [...matches].sort((a, b) => {
    // First: sort by status
    const statusDiff = (statusOrder[a.status] ?? 1) - (statusOrder[b.status] ?? 1);
    if (statusDiff !== 0) return statusDiff;
    
    // Second: sort by match_time (parsed numerically)
    // Use parseMatchTime from app.js (available globally)
    const timeA = typeof parseMatchTime === 'function' ? parseMatchTime(a.match_time) : 9999;
    const timeB = typeof parseMatchTime === 'function' ? parseMatchTime(b.match_time) : 9999;
    if (timeA !== timeB) return timeA - timeB;
    
    // Third: keep original order
    return 0;
  });

  if (stage === "group") {
    const groups = {};
    sorted.forEach(m => {
      if (!groups[m.group_name]) groups[m.group_name] = [];
      groups[m.group_name].push(m);
    });
    let html = "";
    Object.keys(groups).sort().forEach(g => {
      const doneCount = groups[g].filter(m => m.status === "done").length;
      const playingCount = groups[g].filter(m => m.status === "playing").length;
      const progressLabel = playingCount > 0
        ? `<span style="color:var(--adm-green)">${playingCount} ${t("playing")}</span> · ${doneCount}/${groups[g].length} ${t("done")}`
        : `${doneCount}/${groups[g].length} ${t("done")}`;
      html += `
        <div class="adm-group-section">
          <div class="adm-group-header" onclick="toggleGroup('${g}')">
            <span class="adm-group-divider">${t("groupLabel")} ${esc(g)}</span>
            <span class="adm-group-progress">${progressLabel}</span>
            <span class="adm-collapse-icon" id="icon-grp-${g}">▼</span>
          </div>
          <div class="adm-group-body" id="grp-${g}">
            ${groups[g].map(m => matchHTML(m, stage)).join("")}
          </div>
        </div>`;
    });
    container.innerHTML = html;
    restoreGroupCollapse(); // keep collapsed state across re-renders
    
    // Auto-collapse groups when all matches are done
    const allGroupsDone = Object.keys(groups).every(g => 
      groups[g].every(m => m.status === "done")
    );
    if (allGroupsDone) {
      setTimeout(() => {
        Object.keys(groups).forEach(g => {
          const body = document.getElementById(`grp-${g}`);
          const icon = document.getElementById(`icon-grp-${g}`);
          if (body && body.style.display !== "none") {
            body.style.display = "none";
            if (icon) icon.textContent = "▶";
            _collapsedGroups.add(g);
          }
        });
      }, 100);
    }
  } else {
    container.innerHTML = sorted.map(m => matchHTML(m, stage)).join("");
  }

  // Restore previously open cards
  restoreOpenCards();
}

// ── Track collapsed groups (survive re-renders) ──────────────
const _collapsedGroups = new Set(); // groups that are collapsed

function toggleGroup(g) {
  const body = document.getElementById(`grp-${g}`);
  const icon = document.getElementById(`icon-grp-${g}`);
  if (!body) return;
  const collapsed = body.style.display === "none";
  if (collapsed) {
    body.style.display = "block";
    if (icon) icon.textContent = "▼";
    _collapsedGroups.delete(g);
  } else {
    body.style.display = "none";
    if (icon) icon.textContent = "▶";
    _collapsedGroups.add(g);
  }
}

function restoreGroupCollapse() {
  _collapsedGroups.forEach(g => {
    const body = document.getElementById(`grp-${g}`);
    const icon = document.getElementById(`icon-grp-${g}`);
    if (body) body.style.display = "none";
    if (icon) icon.textContent = "▶";
  });
}

// ── Match card HTML ───────────────────────────────────────────
function matchHTML(m, stage) {
  const done    = m.status === "done";
  const playing = m.status === "playing";
  const ready   = isMatchReady(m); // Check if match has valid teams
  const dis     = done || !ready ? "disabled" : "";
  const winnerA = done && m.scoreA > m.scoreB;
  const winnerB = done && m.scoreB > m.scoreA;

  let cardCls = done ? "is-done" : playing ? "is-playing is-live" : "is-ns";
  if (stage === "semi")  cardCls += " is-semi";
  if (stage === "final") cardCls += " is-final";
  if (!ready) cardCls += " match-waiting";

  const statusBadge = done
    ? `<span class="adm-status-badge adm-status-done">${t("statusDone")}</span>`
    : playing
    ? `<span class="adm-status-badge adm-status-playing">${t("statusPlaying")}</span>`
    : `<span class="adm-status-badge adm-status-ns">${t("statusNs")}</span>`;

  const stageLabel = stage === "semi" ? t("semifinal") : stage === "final" ? t("final") : "";

  // Score section - Only semi/final use 3-set scoring, group uses single score
  let scoreSection = "";
  if (!ready) {
    scoreSection = `<div class="match-waiting-msg">${t("matchWaiting")}</div>`;
  } else {
    // Unified tap-to-score for ALL stages.
    // Group stage: scoreA/scoreB are the running points.
    // Semi/Final: best-of-3, score_a/score_b are SET WINS; we pull current
    // set's points from m.s${currentSet}a/b and increment those on tap.
    const isBO3 = (stage === "semi" || stage === "final");
    const setsWonA = m.scoreA || 0;
    const setsWonB = m.scoreB || 0;
    const currentSet = isBO3 ? (m.current_set || 1) : 1;
    const liveScoreA = isBO3 ? (m[`s${currentSet}a`] || 0) : (m.scoreA || 0);
    const liveScoreB = isBO3 ? (m[`s${currentSet}b`] || 0) : (m.scoreB || 0);

    // Reuse via local mutation: temporarily replace m.scoreA/m.scoreB so
    // the existing tap-to-score template renders the current set's points.
    m.scoreA = liveScoreA;
    m.scoreB = liveScoreB;

    const servingTeam = m.serving_team || null;
    const serverNumber = m.server_number || 2;
    const isServingA = servingTeam === 'A';
    const isServingB = servingTeam === 'B';
    const canStart = !servingTeam;
    
    // Resolve teams to get member1_id / member2_id (for player slots)
    const teamA = (typeof teamById !== 'undefined' && teamById)
                  ? teamById.get(m.team_a_id) : null;
    const teamB = (typeof teamById !== 'undefined' && teamById)
                  ? teamById.get(m.team_b_id) : null;
    // Pickleball positional model:
    //  - Ô 1 / Ô 2 are COURT POSITIONS. Player names in each Ô swap each
    //    time their team scores (positions rotate in pickleball).
    //  - server_slot is persisted on the match row — it's the source of
    //    truth for which Ô the active server is in. It starts at 1 on
    //    side-out, toggles 1↔2 on each serving-team score and server
    //    1→2 fault transition (per pickleball positions).
    //  - Receiver = diagonal of server = same Ô number on the opposing team.
    const servingScoreNow = servingTeam === 'A' ? (m.scoreA || 0)
                          : servingTeam === 'B' ? (m.scoreB || 0) : 0;
    const baseServerSlot = m.server_slot || 1;
    const receiverSlot = baseServerSlot;
    const teamCardHTML = (side) => {
      const tm        = side === 'A' ? teamA : teamB;
      const teamName  = side === 'A' ? m.teamA : m.teamB;
      const score     = (side === 'A' ? m.scoreA : m.scoreB) || 0;
      const isServing = (servingTeam === side);
      const opponentServing = servingTeam && servingTeam !== side;
      // Original member identities
      const m1 = tm?.member1_id ? (memberById?.get(tm.member1_id)?.name || '') : '';
      const m2 = tm?.member2_id ? (memberById?.get(tm.member2_id)?.name || '') : '';
      // Each team's positions swap every time THAT team scores.
      //   - Visual ORDER of cards changes (left/right swap)
      //   - BADGE label "1/2" tracks the CURRENT court position
      //     (left card always shows "1", right card always shows "2")
      //   - LEFT BORDER color marks the ORIGINAL identity (green = was Ô 1
      //     at start, red = was Ô 2). So admin/referee can still tell who's
      //     who regardless of which court side they're on.
      const teamSwapped = score % 2 === 1;
      // Whoever is in the LEFT position right now + their original slot
      const leftName     = teamSwapped ? m2 : m1;
      const leftOrigCls  = teamSwapped ? 'orig-2' : 'orig-1';
      // Whoever is in the RIGHT position right now + their original slot
      const rightName    = teamSwapped ? m1 : m2;
      const rightOrigCls = teamSwapped ? 'orig-1' : 'orig-2';
      const highlightSlot = (slot) => {
        if (isServing && slot === baseServerSlot) return 'is-serving';
        if (opponentServing && slot === receiverSlot) return 'is-receiving';
        return '';
      };
      return `
        <div class="team-card ${isServing ? 'serving' : ''}"
             onclick="handleTeamTap('${m.id}', '${side}')"
             ${canStart || dis ? 'style="opacity:0.5;cursor:not-allowed;"' : ''}>
          <div class="team-name">${esc(teamName)}</div>
          ${isServing ? `<div class="serving-badge">${pickleballBalls(serverNumber)}</div>` : ''}
          ${(m1 || m2) ? (() => {
            // data-slot = court position (1 = left of A's row / mirrored
            // right of B's row). slot-num shows the CURRENT position
            // badge (1 / 2). Original identity surfaces via the
            // .orig-1 (green) / .orig-2 (red) left border stripe.
            // Highlight (is-serving / is-receiving) frames the rest of
            // the card.
            const renderSlot = (posSlot, origCls, name) => `
              <div class="player-slot ${highlightSlot(posSlot)} ${origCls}" data-slot="${posSlot}">
                <span class="slot-num">${posSlot}</span>
                <span class="slot-name">${esc(name || '—')}</span>
                <span class="slot-role role-serving">PHÁT</span>
                <span class="slot-role role-receiving">ĐỠ</span>
              </div>`;
            const leftSlot  = renderSlot(1, leftOrigCls,  leftName);
            const rightSlot = renderSlot(2, rightOrigCls, rightName);
            return `<div class="team-players">${side === 'A' ? leftSlot + rightSlot : rightSlot + leftSlot}</div>`;
          })() : ''}
          <div class="team-score">${score}</div>
        </div>`;
    };

    scoreSection = `
      <div class="inline-scoring">
        <div class="scoring-hint scorer-only">
          ${t('hintTapWinner')}
          ${canStart ? t('hintPickServe') : t('hintNonServerTap')}
        </div>
        ${isBO3 ? `
          <div class="bo3-context">
            <span class="bo3-set">SET ${currentSet}</span>
            <span class="bo3-wins">Sets thắng: <b>${setsWonA}</b> — <b>${setsWonB}</b></span>
            ${[1,2,3].slice(0, Math.max(currentSet, 1)).map(n => {
              const sa = m[`s${n}a`] || 0, sb = m[`s${n}b`] || 0;
              const isCurrent = n === currentSet;
              const done = !isCurrent && (sa > 0 || sb > 0);
              return `<span class="bo3-set-history ${isCurrent?'current':''} ${done?'done':''}">S${n} ${sa}-${sb}</span>`;
            }).join('')}
          </div>
        ` : ''}
        <div class="scoring-teams">
          ${teamCardHTML('A')}
          <div class="vs-divider">VS</div>
          ${teamCardHTML('B')}
        </div>
        
        <div class="scoring-actions">
          ${canStart ? `
            <button class="btn-serve-select" onclick="openServeDialog('${m.id}')">
              Chọn Giao Bóng
            </button>
          ` : ''}
          ${isBO3 ? (() => {
            const csA = m[`s${currentSet}a`] || 0;
            const csB = m[`s${currentSet}b`] || 0;
            const max = Math.max(csA, csB), diff = Math.abs(csA - csB);
            const setReady = max >= 11 && diff >= 2;
            return setReady ? `
              <button class="btn-end-set" onclick="endSet('${m.id}')">
                ✓ Kết thúc Set ${currentSet}
              </button>` : '';
          })() : ''}
          ${(() => {
            const hasUndo = (matchStates.get(m.id)?.history?.canUndo?.()) || false;
            return `
              <button class="btn-undo"
                      onclick="handleUndo('${m.id}')"
                      ${dis} ${hasUndo ? '' : 'disabled'}>
                ↶ Undo
              </button>`;
          })()}
        </div>
        ${(() => {
          const log = _matchActionLog.get(m.id) || [];
          if (log.length === 0) return '';
          const recent = log.slice(-3).reverse();
          return `
            <div class="action-log scorer-only">
              ${recent.map(e =>
                `<div class="action-log-row">
                   <span class="action-log-time">${_formatLogTime(e.time)}</span>
                   <span class="action-log-label">${esc(formatLogEntry(e))}</span>
                 </div>`).join('')}
            </div>`;
        })()}
      </div>`;
  }

  // Collapsed summary (shown when card is collapsed)
  const scoreInSummary = (done || playing)
    ? `<span class="adm-summary-score ${playing ? "adm-summary-score-live" : ""}">${m.scoreA}:${m.scoreB}</span>`
    : "";

  const summary = `
    <div class="adm-card-summary" onclick="toggleCard('${m.id}')">
      <div class="adm-summary-left">
        ${statusBadge}
        <span class="adm-summary-teams">${esc(m.teamA)}${admServingBadge(m, 'A')} <span style="color:var(--adm-muted)">vs</span> ${esc(m.teamB)}${admServingBadge(m, 'B')}</span>
      </div>
      <div class="adm-summary-right">
        ${scoreInSummary}
        ${m.match_time ? `<span class="adm-summary-time">${esc(m.match_time)}</span>` : ""}
        <span class="adm-collapse-icon" id="icon-${m.id}">▶</span>
      </div>
    </div>`;

  // Check if can finish (for sets: need at least one team with 2 wins)
  let canFinish = true;
  let finishTitle = "";
  
  if (!done && (stage === "semi" || stage === "final")) {
    const { winsA, winsB } = computeSetWins(m);
    canFinish = winsA >= 2 || winsB >= 2;
    if (!canFinish) {
      finishTitle = "Cần ít nhất 1 đội thắng 2 sets";
    }
  } else if (!done) {
    // Group stage: only check if scores are tied (cannot finish if tied)
    const isTied = m.scoreA === m.scoreB;
    
    canFinish = !isTied;
    if (!canFinish) {
      finishTitle = "Không thể kết thúc khi tỉ số đang hòa";
    }
  }
  
  const finishDisabled = dis || !canFinish ? "disabled" : "";

  // Match-info read-only line (rendered as small text at the bottom of the
  // card, visible to ALL roles incl. trọng tài + view). The .admin-only
  // edit form below is only shown to admin.
  const refName = m.referee_name || m.referee || '';
  const infoBottom = (m.match_time || m.court || refName) ? `
    <div class="adm-info-bottom">
      ${m.match_time ? `<span>🕐 ${esc(m.match_time)}</span>` : ''}
      ${m.court      ? `<span>🏟 ${esc(m.court)}</span>`      : ''}
      ${refName      ? `<span>👤 ${esc(refName)}</span>`      : ''}
    </div>` : '';

  // Referee dropdown options (from cached members list)
  const refOpts = (_allMembersList || []).map(mem =>
    `<option value="${esc(mem.name || '')}" ${mem.name === refName ? 'selected' : ''}>${esc(mem.name || '')}</option>`
  ).join('');

  // Edit form — admin-only (visibility-gated by .admin-only class)
  const infoForm = `
    <div class="adm-info-form admin-only">
      <div class="adm-info-row">
        <label>🕐 Giờ
          <input type="text" data-id="${m.id}" data-field="match_time"
                 value="${esc(m.match_time || '')}" placeholder="07:00">
        </label>
        <label>🏟 Sân
          <input type="text" data-id="${m.id}" data-field="court"
                 value="${esc(m.court || '')}" placeholder="Sân 1">
        </label>
        <label>👤 Trọng tài
          <select data-id="${m.id}" data-field="referee">
            <option value="">— Chọn trọng tài —</option>
            ${refOpts}
          </select>
        </label>
        <button class="adm-info-save" onclick="saveMatchInfo('${m.id}')">💾 Lưu</button>
      </div>
    </div>`;

  // Full card body (hidden by default).
  const useInlineScoring = ready && stage !== 'semi' && stage !== 'final';
  const teamsHeader = useInlineScoring ? '' : `
    <div class="adm-teams">
      <span class="adm-team-name ${winnerA?"winner":""}">${esc(m.teamA)}${admServingBadge(m, 'A')}</span>
      <span class="adm-vs">vs</span>
      <span class="adm-team-name right ${winnerB?"winner":""}">${esc(m.teamB)}${admServingBadge(m, 'B')}</span>
    </div>`;

  // Lineup row (admin-only) — shows player slots and lets admin swap them.
  // Visible for any match where teams have member info, including BEFORE
  // serve is picked, so admin can configure positions ahead of play.
  const teamARec = teamById && teamById.get && teamById.get(m.team_a_id);
  const teamBRec = teamById && teamById.get && teamById.get(m.team_b_id);
  const slotInfo = (rec) => {
    if (!rec) return '';
    const m1 = rec.member1_id ? (memberById.get(rec.member1_id)?.name || '—') : '—';
    const m2 = rec.member2_id ? (memberById.get(rec.member2_id)?.name || '—') : '—';
    return `
      <div class="lineup-team">
        <div class="lineup-name">${esc(rec.name || '')}</div>
        <div class="lineup-slots">
          <span class="lineup-slot"><b>1</b> ${esc(m1)}</span>
          <span class="lineup-slot"><b>2</b> ${esc(m2)}</span>
          <button class="lineup-swap" onclick="swapTeamMembers('${rec.id}')"
                  title="Đổi vị trí 1 ↔ 2">⇅ Đổi</button>
        </div>
      </div>`;
  };
  // Lineup is only editable BEFORE the match starts. Once status moves
  // to 'playing' or 'done', positions are locked.
  const canEditLineup = m.status === 'not_started';
  const lineupRow = (canEditLineup && (teamARec || teamBRec)) ? `
    <div class="adm-lineup auth-only">
      <div class="adm-lineup-title">📋 Đội hình (vị trí 1 / 2) — chỉ chỉnh trước khi vào trận</div>
      ${slotInfo(teamARec)}
      ${slotInfo(teamBRec)}
    </div>` : '';

  const body = `
    <div class="adm-card-body" id="body-${m.id}" style="display:none;">
      ${teamsHeader}
      ${lineupRow}
      ${infoForm}
      ${scoreSection}
      <div class="adm-actions">
        <button class="adm-finish-btn ${done?"is-done":""}" ${finishDisabled} onclick="finishMatch('${m.id}')" title="${finishTitle}">
          ${done ? t("finished") : t("finish")}
        </button>
        ${done ? `<button class="adm-reset-btn" onclick="resetMatch('${m.id}')">${t("resetMatch")}</button>` : ""}
      </div>
    </div>`;

  return `<div class="adm-match-card ${cardCls}" data-id="${m.id}" data-updated="${m.updated_at||''}">${summary}${body}${infoBottom}</div>`;
}

// ── Helper: Check if match is ready (has valid teams) ────────
function isMatchReady(match) {
  if (!match.teamA || !match.teamB) return false;
  // Use the same helper from app.js
  if (typeof isTeamPlaceholder === "function") {
    return !isTeamPlaceholder(match.teamA) && !isTeamPlaceholder(match.teamB);
  }
  // Fallback check
  const placeholders = ["Winner", "Thắng", "Nhất", "Nhì", "TBD", "1st", "2nd"];
  return !placeholders.some(p => match.teamA.includes(p) || match.teamB.includes(p));
}

// ── Track which cards are open (survive re-renders) ──────────
const _openCards = new Set();

function toggleCard(id) {
  const body = document.getElementById(`body-${id}`);
  const icon = document.getElementById(`icon-${id}`);
  if (!body) return;
  const open = body.style.display !== "none";

  if (open) {
    // Close this card
    body.style.display = "none";
    if (icon) icon.textContent = "▶";
    _openCards.delete(id);
  } else {
    // Close ALL other open cards first (accordion behaviour)
    _openCards.forEach(otherId => {
      if (otherId === id) return;
      const ob = document.getElementById(`body-${otherId}`);
      const oi = document.getElementById(`icon-${otherId}`);
      if (ob) ob.style.display = "none";
      if (oi) oi.textContent = "▶";
    });
    _openCards.clear();

    // Open this card
    body.style.display = "block";
    if (icon) icon.textContent = "▼";
    _openCards.add(id);

    // Scroll the card to top of viewport so user sees the full content
    // (accounts for sticky header with ~70px offset)
    setTimeout(() => {
      const card = document.querySelector(`.adm-match-card[data-id="${id}"]`);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      window.scrollBy({ top: rect.top - 80, behavior: 'smooth' });
    }, 60);
  }
}

// Restore open state after re-render (at most 1 card open)
function restoreOpenCards() {
  _openCards.forEach(id => {
    const body = document.getElementById(`body-${id}`);
    const icon = document.getElementById(`icon-${id}`);
    if (body) body.style.display = "block";
    if (icon) icon.textContent = "▼";
  });
}

// ── Set row HTML ──────────────────────────────────────────────
function setRowHTML(m, setNum, dis) {
  // Support both lowercase (from DB) and uppercase field names
  const fA = `s${setNum}A`, fB = `s${setNum}B`;
  const fAl = `s${setNum}a`, fBl = `s${setNum}b`;
  const vA = m[fA] || m[fAl] || 0;
  const vB = m[fB] || m[fBl] || 0;
  const wA = vA > vB && (vA > 0 || vB > 0);
  const wB = vB > vA && (vA > 0 || vB > 0);
  
  // Check if this set is locked
  const lockField = `s${setNum}_locked`;
  const isLocked = m[lockField] === true || m[lockField] === 1;
  const lockDis = isLocked || dis ? "disabled" : "";
  const rowClass = isLocked ? "adm-set-row locked" : "adm-set-row";
  const lockBtnClass = isLocked ? "adm-set-lock-btn locked" : "adm-set-lock-btn";
  const lockIcon = isLocked ? "🔒" : "🔓";
  const lockTitle = isLocked ? "Bấm để mở khóa set này" : "Bấm để khóa set này";
  
  return `
    <div class="${rowClass}" data-set="${setNum}">
      <button class="${lockBtnClass}" 
              onclick="toggleSetLock('${m.id}', ${setNum})" 
              title="${lockTitle}"
              ${dis}>${lockIcon}</button>
      <span class="adm-set-num">Set ${setNum}</span>
      <div class="adm-set-inputs">
        <div class="adm-set-ctrl">
          <button class="adm-set-btn minus" ${lockDis} onclick="adjustSetScore('${m.id}','${fA}',-1)">−</button>
          <input class="adm-set-input ${wA?"set-win":""}" type="number" min="0"
            value="${vA}" data-field="${fA}" data-id="${m.id}" ${lockDis}>
          <button class="adm-set-btn plus" ${lockDis} onclick="adjustSetScore('${m.id}','${fA}',1)">+</button>
        </div>
        <span class="adm-set-sep">—</span>
        <div class="adm-set-ctrl">
          <button class="adm-set-btn minus" ${lockDis} onclick="adjustSetScore('${m.id}','${fB}',-1)">−</button>
          <input class="adm-set-input ${wB?"set-win":""}" type="number" min="0"
            value="${vB}" data-field="${fB}" data-id="${m.id}" ${lockDis}>
          <button class="adm-set-btn plus" ${lockDis} onclick="adjustSetScore('${m.id}','${fB}',1)">+</button>
        </div>
      </div>
    </div>`;
}

function showSet3(id) {
  const placeholder = document.getElementById(`set3-${id}`);
  if (!placeholder) return;
  const stored = localStorage.getItem("pb_matches");
  const matches = stored ? JSON.parse(stored) : [];
  const m = matches.find(x => x.id === id) || { s3A:0, s3B:0, s3a:0, s3b:0, teamA:"", teamB:"" };
  placeholder.outerHTML = setRowHTML(m, 3, "");
}

// ── Toggle Set Lock ───────────────────────────────────────────
async function toggleSetLock(id, setNum) {
  const lockField = `s${setNum}_locked`;
  
  // Get current match data
  let m = null;
  if (!db) {
    const stored = localStorage.getItem("pb_matches");
    localMatches = stored ? JSON.parse(stored) : [];
    m = localMatches.find(x => x.id === id);
  } else {
    const { data } = await db.from("matches").select("*").eq("id", id).single();
    m = data;
  }
  
  if (!m) return;
  
  // Toggle lock state
  const currentLock = m[lockField] === true || m[lockField] === 1;
  const newLock = !currentLock;
  
  // Update in database/localStorage
  const payload = { [lockField]: newLock, updated_at: new Date().toISOString() };
  
  if (!db) {
    m[lockField] = newLock;
    m.updated_at = payload.updated_at;
    saveLocal(localMatches);
    fetchMatches();
    setStatus(newLock ? `🔒 Set ${setNum} đã khóa` : `🔓 Set ${setNum} đã mở`, "ok");
    return;
  }
  
  // Supabase path
  const { error } = await db.from("matches").update(payload).eq("id", id);
  if (error) {
    setStatus("❌ Không thể cập nhật khóa", "err");
    return;
  }
  
  setStatus(newLock ? `🔒 Set ${setNum} đã khóa` : `🔓 Set ${setNum} đã mở`, "ok");
  fetchMatches();
}

// ── +1/-1 debounced ───────────────────────────────────────────
// Use global _saveDebounce from app.js if available, otherwise create new
if (typeof _saveDebounce === 'undefined') {
  var _saveDebounce = {};
}

function adjustScore(id, field, delta) {
  const input = document.querySelector(`input[data-id="${id}"][data-field="${field}"]`);
  if (!input) return;
  const oldValue = parseInt(input.value, 10) || 0;
  input.value = Math.max(0, oldValue + delta);

  if (typeof _isEditingScore !== 'undefined') {
    _isEditingScore = true;
  }

  clearTimeout(_saveDebounce[id]);
  _saveDebounce[id] = setTimeout(() => {
    updateScore(id);
    // Clear editing flag after save completes
    setTimeout(() => {
      if (typeof _isEditingScore !== 'undefined') {
        _isEditingScore = false;
      }
    }, 1000);
  }, 800);
}

// ── Save match info (time/court/referee) ──────────────────────
async function saveMatchInfo(id) {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    setStatus(t('onlyAdminMatchInfo'), 'err');
    return;
  }
  const timeVal = document.querySelector(`input[data-id="${id}"][data-field="match_time"]`)?.value || "";
  const courtVal= document.querySelector(`input[data-id="${id}"][data-field="court"]`)?.value || "";
  // Referee is now a <select>; fallback to <input> for back-compat
  const refVal  = document.querySelector(`select[data-id="${id}"][data-field="referee"]`)?.value
              ?? document.querySelector(`input[data-id="${id}"][data-field="referee"]`)?.value
              ?? "";

  if (!db) {
    const stored = localStorage.getItem("pb_matches");
    localMatches = stored ? JSON.parse(stored) : [];
    const m = localMatches.find(x => x.id === id);
    if (m) { m.match_time = timeVal; m.court = courtVal; m.referee = refVal; }
    saveLocal(localMatches);
    setStatus(t("infoSaved"), "ok");
    return;
  }
  const { error } = await db.from("matches")
    .update({ match_time: timeVal, court: courtVal, referee_name: refVal }).eq("id", id);
  if (error) { 
    setStatus("❌ Không thể lưu thông tin trận đấu", "err"); 
    return; 
  }
  setStatus(t("infoSaved"), "ok");
}

// ── Reset single match ────────────────────────────────────────
// After resetting a group match, also wipe semi/final so bracket
// auto-regenerates with fresh standings when all group matches finish.
async function resetMatch(id) {
  const confirmMsg = "Bạn có chắc muốn đặt lại trận này?\n\n" +
    "• Điểm số sẽ về 0-0\n" +
    "• Trạng thái về chưa bắt đầu\n" +
    "• Nếu là trận vòng bảng, bán kết và chung kết sẽ bị xóa để tạo lại\n\n" +
    "Hành động này không thể hoàn tác!";
  
  if (!confirm(confirmMsg)) return;

  const payload = {
    score_a: 0, score_b: 0, status: "not_started",
    s1a: 0, s1b: 0, s2a: 0, s2b: 0, s3a: 0, s3b: 0,
    serving_team: null, server_number: null,
    updated_at: new Date().toISOString()
  };

  if (!db) {
    const stored = localStorage.getItem("pb_matches");
    localMatches = stored ? JSON.parse(stored) : [];
    const m = localMatches.find(x => x.id === id);
    if (!m) return;
    // Only wipe bracket if it's a group match being reset
    if (!m.stage || m.stage === "group") {
      localMatches = localMatches.filter(x => x.stage !== "semi" && x.stage !== "final");
    }
    Object.assign(m, payload);
    saveLocal(localMatches);
    fetchMatches();
    setStatus("✓ Đã đặt lại trận đấu", "ok");
    return;
  }

  // Check for conflict before resetting (multiple admins)
  const conflict = await checkConflict(id);
  if (conflict) {
    handleConflict(id);
    alert("⚠️ Trận đấu đã được cập nhật bởi admin khác!\n\n" +
      "Vui lòng bấm Reload để xem dữ liệu mới nhất trước khi reset.");
    return;
  }

  // 1. Reset the match
  const { error } = await db.from("matches").update(payload).eq("id", id);
  if (error) { 
    setStatus("❌ Không thể đặt lại trận đấu", "err");
    alert(`Không thể đặt lại trận đấu!\n\nVui lòng thử lại hoặc liên hệ quản trị viên.`);
    return; 
  }

  // Update known timestamp after successful reset
  if (typeof _knownUpdatedAt !== 'undefined') {
    _knownUpdatedAt[id] = payload.updated_at;
  }

  // 2. Check stage and wipe appropriate bracket rows
  const { data: m } = await db.from("matches").select("stage").eq("id", id).single();
  if (!m) {
    // fallback: wipe all bracket
    await db.from("matches").delete().eq("stage", "semi");
    await db.from("matches").delete().eq("stage", "final");
  } else if (m.stage === "group" || !m.stage) {
    // Group match reset → wipe semi + final
    await db.from("matches").delete().eq("stage", "semi");
    await db.from("matches").delete().eq("stage", "final");
  } else if (m.stage === "semi") {
    // Semi reset → wipe final only (semi stays, just reset)
    await db.from("matches").delete().eq("stage", "final");
  }

  setStatus(t("bracketCleared"), "ok");
  fetchMatches();
}

// ── Re-generate bracket (delete old + create new) ─────────────
async function regenSemifinals() {
  if (!confirm("Xóa bán kết cũ và gen lại?")) return;

  if (!db) {
    localMatches = (localMatches||[]).filter(m => m.stage !== "semi");
    saveLocal(localMatches);
    // Force re-read so generateSemifinals sees fresh data
    const stored = localStorage.getItem("pb_matches");
    localMatches = stored ? JSON.parse(stored) : [];
    await generateSemifinals(true);
    return;
  }

  // Delete existing semis and wait for confirmation
  const { error: delErr } = await db.from("matches").delete().eq("stage", "semi");
  if (delErr) { 
    setStatus("❌ Không thể xóa bán kết cũ", "err"); 
    return; 
  }

  // Small delay to ensure DB consistency before re-fetching
  await new Promise(r => setTimeout(r, 300));
  await generateSemifinals(true);
}

async function regenFinal() {
  if (!confirm("Xóa chung kết cũ và gen lại?")) return;

  if (!db) {
    localMatches = (localMatches||[]).filter(m => m.stage !== "final");
    saveLocal(localMatches);
    const stored = localStorage.getItem("pb_matches");
    localMatches = stored ? JSON.parse(stored) : [];
    await generateFinal(true);
    return;
  }

  const { error: delErr } = await db.from("matches").delete().eq("stage", "final");
  if (delErr) { 
    setStatus("❌ Không thể xóa chung kết cũ", "err"); 
    return; 
  }

  await new Promise(r => setTimeout(r, 300));
  await generateFinal(true);
}

// ── Bracket generation ────────────────────────────────────────
function getTopTeamsByGroup(matches) {
  const groupDone = matches.filter(m => (!m.stage||m.stage==="group") && m.status==="done");
  const groups = {};
  matches.filter(m => !m.stage||m.stage==="group").forEach(m => {
    if (!groups[m.group_name]) groups[m.group_name] = {};
    [m.teamA,m.teamB].forEach(t => {
      if (!groups[m.group_name][t]) groups[m.group_name][t] = {wins:0,losses:0,diff:0};
    });
  });
  groupDone.forEach(m => {
    const g = m.group_name;
    if (!groups[g]) groups[g] = {};
    [m.teamA,m.teamB].forEach(t => { if(!groups[g][t]) groups[g][t]={wins:0,losses:0,diff:0}; });
    const a=groups[g][m.teamA], b=groups[g][m.teamB];
    if (m.scoreA>m.scoreB){a.wins++;b.losses++;}
    else if(m.scoreB>m.scoreA){b.wins++;a.losses++;}
    a.diff+=(m.scoreA-m.scoreB); b.diff+=(m.scoreB-m.scoreA);
  });
  const result={};
  Object.keys(groups).forEach(g=>{
    result[g]=Object.entries(groups[g])
      .map(([name,s])=>({name,...s}))
      .sort((a,b)=>b.wins-a.wins||b.diff-a.diff);
  });
  return result;
}

async function generateSemifinals(silent=false) {
  const matches = db ? await fetchAllMatches() : (localMatches||[]);
  const existing = matches.filter(m => m.stage === "semi");

  if (existing.length > 0) {
    if (!silent) alert("Bán kết đã tồn tại! Dùng nút Re-gen.");
    return;
  }

  const tops = getTopTeamsByGroup(matches);
  const groupKeys = Object.keys(tops).sort();
  if (groupKeys.length < 2) {
    if (!silent) alert("Cần ít nhất 2 bảng.");
    return;
  }

  // CRITICAL: include tournament_id — matches.tournament_id has NOT NULL
  // constraint so without it the insert is rejected silently and no
  // semifinals appear.
  const tournamentId = tournamentManager?.getActiveTournamentId();
  if (!tournamentId) {
    if (!silent) alert("Chưa chọn giải đấu");
    return;
  }

  const [g1, g2] = groupKeys;
  const A1 = tops[g1][0]?.name || "TBD", A2 = tops[g1][1]?.name || "TBD";
  const B1 = tops[g2][0]?.name || "TBD", B2 = tops[g2][1]?.name || "TBD";

  // Look up team_a_id / team_b_id by team name so the lineup row +
  // tap-to-score player slots show actual member names in the semis.
  // Fallback: also try the reversed "B & A" name in case the standings
  // text was built in a different member order than the team's stored name.
  const idForName = (name) => {
    if (!name || name === 'TBD') return null;
    for (const tm of (teamById?.values() || [])) {
      if (tm.name === name) return tm.id;
    }
    // Reversed-order fallback
    for (const tm of (teamById?.values() || [])) {
      if (!tm.name || !tm.name.includes(' & ')) continue;
      const [a, b] = tm.name.split(' & ');
      if (`${b} & ${a}` === name) return tm.id;
    }
    return null;
  };

  const semis = [
    { tournament_id: tournamentId, team_a:A1, team_b:B2, team_a_id: idForName(A1), team_b_id: idForName(B2),
      score_a:0, score_b:0, group_name:"SF", stage:"semi", status:"not_started", current_set: 1 },
    { tournament_id: tournamentId, team_a:B1, team_b:A2, team_a_id: idForName(B1), team_b_id: idForName(A2),
      score_a:0, score_b:0, group_name:"SF", stage:"semi", status:"not_started", current_set: 1 },
  ];

  if (!db) {
    semis.forEach((s,i) => { s.id = "semi"+(i+1); });
    localMatches = [...(localMatches||[]).filter(m => m.stage !== "semi"), ...semis];
    saveLocal(localMatches);
    fetchMatches();
    return;
  }

  const { error } = await db.from("matches").insert(semis);
  if (error) { 
    setStatus("❌ Không thể tạo bán kết", "err"); 
    return; 
  }
  if (!silent) setStatus(t("semiCreated"), "ok");
  fetchMatches();
}

async function generateFinal(silent=false) {
  // Always fetch fresh from DB
  const matches = db ? await fetchAllMatches() : (localMatches||[]);
  const semis  = matches.filter(m => m.stage === "semi" && m.status === "done");
  const finals = matches.filter(m => m.stage === "final");

  if (finals.length > 0) {
    if (!silent) alert("Chung kết đã tồn tại! Dùng nút Re-gen.");
    return;
  }
  if (semis.length < 2) {
    if (!silent) alert("Cần hoàn thành cả 2 bán kết.");
    return;
  }

  const tournamentId = tournamentManager?.getActiveTournamentId();
  if (!tournamentId) {
    if (!silent) alert("Chưa chọn giải đấu");
    return;
  }
  const getWinner = m => (m.score_a ?? m.scoreA ?? 0) >= (m.score_b ?? m.scoreB ?? 0)
    ? (m.team_a || m.teamA)
    : (m.team_b || m.teamB);
  const finalA = getWinner(semis[0]);
  const finalB = getWinner(semis[1]);
  const idForName = (name) => {
    if (!name) return null;
    for (const tm of (teamById?.values() || [])) {
      if (tm.name === name) return tm.id;
    }
    for (const tm of (teamById?.values() || [])) {
      if (!tm.name || !tm.name.includes(' & ')) continue;
      const [a, b] = tm.name.split(' & ');
      if (`${b} & ${a}` === name) return tm.id;
    }
    return null;
  };
  const finalMatch = {
    tournament_id: tournamentId,
    team_a: finalA, team_b: finalB,
    team_a_id: idForName(finalA), team_b_id: idForName(finalB),
    score_a: 0, score_b: 0, group_name: "F", stage: "final", status: "not_started", current_set: 1
  };

  if (!db) {
    finalMatch.id = "final1";
    localMatches = [...(localMatches||[]).filter(m => m.stage !== "final"), finalMatch];
    saveLocal(localMatches);
    fetchMatches();
    return;
  }

  const { error } = await db.from("matches").insert([finalMatch]);
  if (error) { 
    setStatus("❌ Không thể tạo chung kết", "err"); 
    return; 
  }
  if (!silent) setStatus(t("finalCreated"), "ok");
  fetchMatches();
}

async function fetchAllMatches() {
  if (!db) return localMatches||[];

  let query = db.from("matches").select("*");
  if (typeof tournamentManager !== 'undefined' && tournamentManager) {
    const activeId = tournamentManager.getActiveTournamentId();
    if (activeId) {
      query = query.eq('tournament_id', activeId);
    }
  }

  const {data} = await query;
  // CRITICAL: normalize so callers can read m.scoreA / m.teamA aliases.
  // Without this, handleTeamTap reset scoreA/scoreB to 0 on every tap
  // because match.scoreA was undefined (DB columns are score_a / score_b).
  const norm = typeof normalizeMatch === 'function' ? normalizeMatch : m => m;
  return (data || []).map(norm);
}

// ── Bracket visual ────────────────────────────────────────────
function updateBracketUI(matches) {
  const bc = document.getElementById("bracket-container");
  if (!bc) return;
  renderBracketVisual(bc, matches);
}

function renderBracketVisual(container, matches) {
  const semis  = matches.filter(m=>m.stage==="semi");
  const finals = matches.filter(m=>m.stage==="final");
  const getWinner = m => m.status==="done" ? (m.scoreA>=m.scoreB?m.teamA:m.teamB) : null;
  
  // Always show bracket structure (even before matches are generated)
  let html='<div class="bracket-wrap">';
  
  // ── SEMIFINALS COLUMN ──
  html+=`<div class="bracket-col"><div class="bracket-col-title">${t("bracketSemi")}</div>`;
  
  if (semis.length >= 2) {
    // Show actual semifinal matches
    semis.forEach(m=>{
      const wA=m.status==="done"&&m.scoreA>m.scoreB, wB=m.status==="done"&&m.scoreB>m.scoreA;
      const isPlaceholder = isMatchReady ? !isMatchReady(m) : false;
      html+=`<div class="bracket-match-card ${isPlaceholder?"bracket-placeholder":""}">
        <div class="bracket-team-row ${wA?"winner":""} ${isPlaceholder?"tbd":""}"><span>${esc(m.teamA)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreA:"-"}</span></div>
        <div class="bracket-team-row ${wB?"winner":""} ${isPlaceholder?"tbd":""}"><span>${esc(m.teamB)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreB:"-"}</span></div>
      </div>`;
    });
  } else {
    // Show placeholders before semis are generated
    html+=`
      <div class="bracket-match-card bracket-placeholder">
        <div class="bracket-team-row tbd"><span>${t("bracketPlaceholder1A")}</span></div>
        <div class="bracket-team-row tbd"><span>${t("bracketPlaceholder2B")}</span></div>
      </div>
      <div class="bracket-match-card bracket-placeholder">
        <div class="bracket-team-row tbd"><span>${t("bracketPlaceholder1B")}</span></div>
        <div class="bracket-team-row tbd"><span>${t("bracketPlaceholder2A")}</span></div>
      </div>`;
  }
  html+=`</div><div class="bracket-arrow">→</div>`;
  
  // ── FINAL COLUMN ──
  html+=`<div class="bracket-col"><div class="bracket-col-title">${t("bracketFinal")}</div>`;
  
  if (finals.length) {
    finals.forEach(m=>{
      const wA=m.status==="done"&&m.scoreA>m.scoreB, wB=m.status==="done"&&m.scoreB>m.scoreA;
      const isPlaceholder = isMatchReady ? !isMatchReady(m) : false;
      html+=`<div class="bracket-match-card ${isPlaceholder?"bracket-placeholder":""}">
        <div class="bracket-team-row ${wA?"winner":""} ${isPlaceholder?"tbd":""}"><span>${esc(m.teamA)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreA:"-"}</span></div>
        <div class="bracket-team-row ${wB?"winner":""} ${isPlaceholder?"tbd":""}"><span>${esc(m.teamB)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreB:"-"}</span></div>
      </div>`;
    });
  } else {
    const w1=semis[0]?getWinner(semis[0]):null, w2=semis[1]?getWinner(semis[1]):null;
    html+=`<div class="bracket-match-card bracket-placeholder">
      <div class="bracket-team-row ${w1?"":"tbd"}"><span>${w1||t("bracketWinnerSF1")}</span></div>
      <div class="bracket-team-row ${w2?"":"tbd"}"><span>${w2||t("bracketWinnerSF2")}</span></div>
    </div>`;
  }
  html+='</div>';
  
  // ── CHAMPION (only if final is done) ──
  if (finals.length&&finals[0].status==="done") {
    const champ=finals[0].scoreA>=finals[0].scoreB?finals[0].teamA:finals[0].teamB;
    html+=`<div class="bracket-arrow">→</div>
      <div class="bracket-col"><div class="bracket-col-title">Champion</div>
        <div class="champion-card"><div class="champion-label">${t("bracketChamp")}</div>
          <div class="champion-name">${esc(champ)}</div></div></div>`;
  }
  html+='</div>';
  container.innerHTML=html;
}

// ── Special Match Types ──────────────────────────────────────

/**
 * Create third-place match (auto-detect losers from semifinals)
 */
async function createThirdPlaceMatch() {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    setStatus(t('onlyAdminSpecial'), 'err');
    return;
  }
  try {
    if (!tournamentManager) {
      setStatus('❌ Tournament manager not initialized', 'err');
      return;
    }

    const activeId = tournamentManager.getActiveTournamentId();
    if (!activeId) {
      setStatus('❌ Chưa chọn giải đấu', 'err');
      return;
    }

    // Check if third-place match already exists (use stage; fall back to legacy match_type)
    const matches = await tournamentManager.getMatches(activeId);
    const existingThirdPlace = matches.find(m => m.stage === 'third_place' || m.match_type === 'third_place');
    
    if (existingThirdPlace) {
      setStatus('⚠️ Trận tranh giải ba đã tồn tại', 'err');
      return;
    }

    // Generate third-place match
    const thirdPlaceMatch = await tournamentManager.generateThirdPlaceMatch(activeId);
    
    setStatus('✓ Đã tạo trận tranh giải ba', 'ok');
    await fetchMatches();
  } catch (error) {
    setStatus('❌ Lỗi: ' + error.message, 'err');
  }
}

/**
 * Create consolation match (3rd place teams from groups)
 */
async function createConsolationMatch() {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    setStatus(t('onlyAdminSpecial'), 'err');
    return;
  }
  try {
    if (!tournamentManager) {
      setStatus('❌ Tournament manager not initialized', 'err');
      return;
    }

    const activeId = tournamentManager.getActiveTournamentId();
    if (!activeId) {
      setStatus('❌ Chưa chọn giải đấu', 'err');
      return;
    }

    // Check if consolation match already exists
    const matches = await tournamentManager.getMatches(activeId);
    const existingConsolation = matches.find(m => m.stage === 'consolation' || m.match_type === 'consolation');
    
    if (existingConsolation) {
      setStatus('⚠️ Trận khuyến khích đã tồn tại', 'err');
      return;
    }

    // Generate consolation match
    const consolationMatch = await tournamentManager.generateConsolationMatch(activeId);
    
    setStatus('✓ Đã tạo trận khuyến khích', 'ok');
    await fetchMatches();
  } catch (error) {
    setStatus('❌ Lỗi: ' + error.message, 'err');
  }
}

/**
 * Open show match modal
 */
async function openShowMatchModal() {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    setStatus(t('onlyAdminSpecial'), 'err');
    return;
  }
  try {
    if (!storage) {
      setStatus('❌ Storage not initialized', 'err');
      return;
    }

    // Load all members for selection
    const members = await storage.read('members');
    
    // Populate dropdowns
    const selects = [
      'show-team-a-member1',
      'show-team-a-member2',
      'show-team-b-member1',
      'show-team-b-member2'
    ];

    selects.forEach(selectId => {
      const select = document.getElementById(selectId);
      if (select) {
        select.innerHTML = '<option value="">Chọn thành viên...</option>' +
          members.map(m => `<option value="${m.id}">${m.name} (T${m.tier})</option>`).join('');
      }
    });

    // Show modal
    const modal = document.getElementById('show-match-modal');
    if (modal) {
      modal.style.display = 'flex';
    }
  } catch (error) {
    setStatus('❌ Lỗi: ' + error.message, 'err');
  }
}

/**
 * Close show match modal
 */
function closeShowMatchModal() {
  const modal = document.getElementById('show-match-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  
  // Clear form
  ['show-team-a-member1', 'show-team-a-member2', 'show-team-b-member1', 'show-team-b-member2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['show-team-a-name', 'show-team-b-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/**
 * Create show match (exhibition)
 */
async function createShowMatch() {
  try {
    if (!tournamentManager) {
      setStatus('❌ Tournament manager not initialized', 'err');
      return;
    }

    const activeId = tournamentManager.getActiveTournamentId();
    if (!activeId) {
      setStatus('❌ Chưa chọn giải đấu', 'err');
      return;
    }

    // Get selected members
    const teamAMember1 = document.getElementById('show-team-a-member1').value;
    const teamAMember2 = document.getElementById('show-team-a-member2').value;
    const teamBMember1 = document.getElementById('show-team-b-member1').value;
    const teamBMember2 = document.getElementById('show-team-b-member2').value;

    // Validate
    if (!teamAMember1 || !teamAMember2 || !teamBMember1 || !teamBMember2) {
      setStatus('❌ Vui lòng chọn đủ 4 thành viên', 'err');
      return;
    }

    // Check for duplicates
    const selected = [teamAMember1, teamAMember2, teamBMember1, teamBMember2];
    const unique = new Set(selected);
    if (unique.size !== 4) {
      setStatus('❌ Không được chọn trùng thành viên', 'err');
      return;
    }

    // Get custom names
    const customNames = {
      teamA: document.getElementById('show-team-a-name').value.trim() || null,
      teamB: document.getElementById('show-team-b-name').value.trim() || null
    };

    // Create show match
    const showMatch = await tournamentManager.createShowMatch(
      activeId,
      [teamAMember1, teamAMember2],
      [teamBMember1, teamBMember2],
      customNames
    );

    setStatus('✓ Đã tạo trận biểu diễn', 'ok');
    closeShowMatchModal();
    await fetchMatches();
  } catch (error) {
    setStatus('❌ Lỗi: ' + error.message, 'err');
  }
}

/**
 * Render special matches in the special section
 */
function renderSpecialMatches(matches) {
  const isSpecial = m => {
    const k = m.stage || m.match_type;
    return k === 'third_place' || k === 'consolation' || k === 'exhibition';
  };
  const specialMatches = matches.filter(isSpecial);

  const container = document.getElementById('match-list-special');
  if (!container) return;

  if (specialMatches.length === 0) {
    container.innerHTML = '<p class="empty">Chưa có trận đặc biệt nào.</p>';
    return;
  }

  container.innerHTML = specialMatches.map(m => matchHTML(m, 'special')).join('');
}


// ============================================================
//  INLINE SCORING UI — Tap-to-Score Implementation
// ============================================================

// Match state management
const matchStates = new Map();
const tapDebounce = new Map();

/**
 * Initialize match state for inline scoring
 */
function initMatchState(matchId, teamA, teamB, servingTeam, serverNumber) {
  if (matchStates.has(matchId)) {
    return matchStates.get(matchId);
  }

  const state = {
    matchId,
    teamA,
    teamB,
    scoreA: 0,
    scoreB: 0,
    servingTeam: servingTeam || null,
    serverNumber: serverNumber || 2,
    currentSet: 1,
    completedSets: [],
    status: servingTeam ? 'playing' : 'not_started',
    updatedAt: new Date().toISOString(),
    updatedBy: '',
    config: {
      matchFormat: 'BO1',
      targetScore: 11,
      winByMargin: 2,
      firstServeSingle: true,
      enableFaultButtons: false
    }
  };

  const history = new HistoryManager(10);
  
  matchStates.set(matchId, { current: state, history });
  return matchStates.get(matchId);
}

/**
 * Handle team tap for scoring
 */
async function handleTeamTap(matchId, team) {
  // Debounce to prevent double-tap
  if (tapDebounce.has(matchId)) {
    return;
  }
  tapDebounce.set(matchId, true);
  setTimeout(() => tapDebounce.delete(matchId), 300);

  if (!_activeTournament || _activeTournament.status !== 'ongoing') {
    setStatus(t('errTournamentNotStarted'), 'err');
    return;
  }
  if (typeof canScore === 'function' && !canScore()) {
    setStatus(t('errOnlyReferee'), 'err');
    return;
  }

  try {
    // Always load fresh data from database
    const matches = db ? await fetchAllMatches() : (localMatches || []);
    const match = matches.find(m => m.id === matchId);
    
    if (!match) {
      setStatus('❌ Không tìm thấy trận đấu', 'err');
      return;
    }
    
    // Get or initialize match state
    let matchState = matchStates.get(matchId);
    
    if (!matchState) {
      // Create new match state with history
      matchState = initMatchState(
        matchId,
        match.teamA,
        match.teamB,
        match.serving_team,
        match.server_number
      );
    }
    
    // Ensure history exists (in case of corrupted state)
    if (!matchState.history) {
      matchState.history = new HistoryManager(10);
    }
    
    // Sync scores + status from DB (other clients / tabs may have changed
    // them). DO NOT clobber serving state: it's mutated locally below and
    // a stale read from Supabase under replica lag would lose a side-out
    // and route the next tap as a fault → score eaten until 2nd tap.
    matchState.current.scoreA = match.scoreA || 0;
    matchState.current.scoreB = match.scoreB || 0;
    if (matchState.current.servingTeam == null) {
      matchState.current.servingTeam = match.serving_team;
      matchState.current.serverNumber = match.server_number;
    }
    matchState.current.status = match.status === 'done' ? 'match_complete'
                                                        : (match.status || 'playing');

    const { current, history } = matchState;

    if (!current.servingTeam) {
      setStatus('⚠️ Vui lòng chọn đội giao bóng trước', 'err');
      return;
    }
    if (current.status === 'done' || current.status === 'match_complete') {
      setStatus('⚠️ Trận đấu đã kết thúc', 'err');
      return;
    }

    // Best-of-3 (semi/final): increment current set's points only — DO NOT
    // auto-advance set or auto-end match. Referee uses the dedicated
    // "Kết thúc Set" / "Kết thúc trận" buttons (see endSet / finishMatch).
    const isBO3 = (match.stage === 'semi' || match.stage === 'final');
    if (isBO3 && team === current.servingTeam) {
      const cs = match.current_set || 1;
      const oldSa = match[`s${cs}a`] || 0;
      const oldSb = match[`s${cs}b`] || 0;
      const oldServerSlot = match.server_slot || 1;
      // Push a BO3-shaped undo frame BEFORE mutating, so undo can revert
      // the actual fields we touch (set points + server_slot) instead of
      // the unrelated cumulative-state in matchState.current.
      history.push({
        kind: 'bo3', cs,
        sa: oldSa, sb: oldSb,
        server_slot: oldServerSlot
      });

      const newSetA = oldSa + (team === 'A' ? 1 : 0);
      const newSetB = oldSb + (team === 'B' ? 1 : 0);
      const newServerSlot = oldServerSlot === 1 ? 2 : 1;
      const payload = { [`s${cs}a`]: newSetA, [`s${cs}b`]: newSetB,
                        server_slot: newServerSlot,
                        status: 'playing',
                        updated_at: new Date().toISOString() };

      // Compute server / receiver names based on current Ô positions
      const tA = teamById.get(match.team_a_id);
      const tB = teamById.get(match.team_b_id);
      const teamRec = team === 'A' ? tA : tB;
      const oppRec  = team === 'A' ? tB : tA;
      const teamScore = team === 'A' ? newSetA : newSetB;
      const oppScore  = team === 'A' ? newSetB : newSetA;
      // After scoring: serving team had pre-score parity = (teamScore - 1)
      // The server is whoever is in oldServerSlot before the swap.
      const preTeamSwapped = ((teamScore - 1) % 2 === 1);
      const serverMemberId = oldServerSlot === 1
        ? (preTeamSwapped ? teamRec?.member2_id : teamRec?.member1_id)
        : (preTeamSwapped ? teamRec?.member1_id : teamRec?.member2_id);
      const receiverMemberId = oldServerSlot === 1
        ? (oppScore % 2 === 1 ? oppRec?.member2_id : oppRec?.member1_id)
        : (oppScore % 2 === 1 ? oppRec?.member1_id : oppRec?.member2_id);
      logMatchAction(matchId, {
        type: 'score',
        servingTeamName: team === 'A' ? match.team_a : match.team_b,
        servingScore: teamScore,
        otherScore: oppScore,
        serverNumber: match.server_number || 2,
        serverName: memberById.get(serverMemberId)?.name,
        receiverName: memberById.get(receiverMemberId)?.name
      });

      if (db) {
        const { error } = await db.from('matches').update(payload).eq('id', matchId);
        if (error) { showError(error, t('errSaveScore')); return; }
      } else {
        const stored = localStorage.getItem('pb_matches');
        localMatches = stored ? JSON.parse(stored) : [];
        const lm = localMatches.find(x => x.id === matchId);
        if (lm) Object.assign(lm, payload);
        saveLocal(localMatches);
      }
      // Keep in-memory mirror in sync with what we wrote
      matchState.current.status = 'playing';
      const teamCard = event?.target?.closest('.team-card');
      if (teamCard) {
        teamCard.classList.add('tap-active');
        setTimeout(() => teamCard.classList.remove('tap-active'), 300);
      }
      await fetchMatches();
      return;
    }

    // Group stage (or fault on any stage) — go through gameStateReducer
    // History push happens HERE (after the BO3 branch) so each frame
    // matches what syncMatchState will write — undo restores the right
    // before-state.
    history.push(cloneGameState(current));

    let action;
    if (team === current.servingTeam) {
      action = { type: team === 'A' ? ActionTypes.SCORE_TEAM_A : ActionTypes.SCORE_TEAM_B };
    } else {
      action = { type: team === 'A' ? ActionTypes.FAULT_TEAM_B : ActionTypes.FAULT_TEAM_A };
    }
    const newState = gameStateReducer(current, action);
    matchState.current = newState;

    // Log a human-readable description of what happened for the action strip
    if (newState.servingTeam !== current.servingTeam) {
      logMatchAction(matchId, {
        type: 'side_out',
        newServingTeamName: newState.servingTeam === 'A' ? match.team_a : match.team_b
      });
    } else if (newState.serverNumber !== current.serverNumber) {
      logMatchAction(matchId, {
        type: 'fault_partner',
        teamName: newState.servingTeam === 'A' ? match.team_a : match.team_b,
        fromServer: current.serverNumber,
        toServer:   newState.serverNumber
      });
    } else if (newState.scoreA !== current.scoreA || newState.scoreB !== current.scoreB) {
      // Group-stage score (server team scored)
      const tA = teamById.get(match.team_a_id);
      const tB = teamById.get(match.team_b_id);
      const teamRec = team === 'A' ? tA : tB;
      const oppRec  = team === 'A' ? tB : tA;
      const teamScore = team === 'A' ? newState.scoreA : newState.scoreB;
      const oppScore  = team === 'A' ? newState.scoreB : newState.scoreA;
      const preTeamSwapped = ((teamScore - 1) % 2 === 1);
      const slot = newSlot; // server's slot AFTER the toggle; pre-toggle = oldSlot
      const serverMemberId = oldSlot === 1
        ? (preTeamSwapped ? teamRec?.member2_id : teamRec?.member1_id)
        : (preTeamSwapped ? teamRec?.member1_id : teamRec?.member2_id);
      const receiverMemberId = oldSlot === 1
        ? (oppScore % 2 === 1 ? oppRec?.member2_id : oppRec?.member1_id)
        : (oppScore % 2 === 1 ? oppRec?.member1_id : oppRec?.member2_id);
      logMatchAction(matchId, {
        type: 'score',
        servingTeamName: team === 'A' ? match.team_a : match.team_b,
        servingScore: teamScore,
        otherScore: oppScore,
        serverNumber: newState.serverNumber || 2,
        serverName: memberById.get(serverMemberId)?.name,
        receiverName: memberById.get(receiverMemberId)?.name
      });
    }

    // Derive new server_slot from state transition (gameStateReducer doesn't
    // know about it). Three cases:
    //  - servingTeam changed → side-out → reset to 1 (new team's Ô 1 serves)
    //  - servingTeam same, serverNumber went 1→2 → toggle (partner is on
    //    the opposite court half)
    //  - servingTeam same, score went up → toggle (server keeps serving but
    //    swaps court with partner per pickleball rules)
    const oldSlot = match.server_slot || 1;
    let newSlot = oldSlot;
    if (newState.servingTeam !== current.servingTeam) {
      newSlot = 1;
    } else if (newState.serverNumber !== current.serverNumber) {
      newSlot = oldSlot === 1 ? 2 : 1;
    } else if (newState.scoreA !== current.scoreA || newState.scoreB !== current.scoreB) {
      newSlot = oldSlot === 1 ? 2 : 1;
    }
    newState._serverSlot = newSlot; // pass through to syncMatchState

    const teamCard = event?.target?.closest('.team-card');
    if (teamCard) {
      teamCard.classList.add('tap-active');
      setTimeout(() => teamCard.classList.remove('tap-active'), 300);
    }
    await syncMatchState(matchId, newState);

    // Re-render
    await fetchMatches();
    
    setStatus('✓ Đã cập nhật điểm', 'ok');
  } catch (error) {
    console.error('handleTeamTap error:', error);
    setStatus('❌ Lỗi: ' + error.message, 'err');
  }
}

/**
 * Open serve selection dialog
 */
function openServeDialog(matchId) {
  const matchState = matchStates.get(matchId);
  
  if (!matchState) {
    // Load from database
    fetchAllMatches().then(matches => {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;
      
      const state = initMatchState(matchId, match.teamA, match.teamB);
      showServeDialog(matchId, state.current);
    });
  } else {
    showServeDialog(matchId, matchState.current);
  }
}

/**
 * Show serve selection dialog
 */
function showServeDialog(matchId, state) {
  // Force the page to scroll up so the fixed dialog is in front of the user
  // (some mobile browsers anchor fixed elements to the layout viewport, which
  // can leave the dialog above the visible scroll area)
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.body.style.overflow = 'hidden'; // lock background scroll
  const dialog = `
    <div class="dialog-overlay" id="serve-dialog-${matchId}" onclick="if(event.target===this) closeServeDialog('${matchId}')">
      <div class="dialog">
        <h2>Chọn Đội Giao Bóng Đầu Tiên</h2>
        
        <button class="serve-option" onclick="selectServe('${matchId}', 'A')">
          <div class="team-name">${esc(state.teamA)}</div>
          <div class="serve-label">Giao Bóng Trước</div>
        </button>
        
        <button class="serve-option" onclick="selectServe('${matchId}', 'B')">
          <div class="team-name">${esc(state.teamB)}</div>
          <div class="serve-label">Giao Bóng Trước</div>
        </button>

        <button class="serve-option serve-random" onclick="selectServe('${matchId}', Math.random() < 0.5 ? 'A' : 'B')">
          <div class="team-name">🎲 Random</div>
          <div class="serve-label">Hệ thống chọn ngẫu nhiên</div>
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

/**
 * Select serving team
 */
async function selectServe(matchId, team) {
  try {
    let matchState = matchStates.get(matchId);
    
    if (!matchState) {
      const matches = db ? await fetchAllMatches() : (localMatches || []);
      const match = matches.find(m => m.id === matchId);
      
      if (!match) {
        setStatus('❌ Không tìm thấy trận đấu', 'err');
        return;
      }
      
      matchState = initMatchState(matchId, match.teamA, match.teamB);
      matchState.current.scoreA = match.scoreA || 0;
      matchState.current.scoreB = match.scoreB || 0;
    }

    const { current, history } = matchState;

    // Save to history (clone — leaking a reference would let later mutations
    // contaminate the saved frame and corrupt undo behavior).
    history.push(cloneGameState(current));

    // Update state — first serve of match: server_slot = 1 (Ô 1 starts)
    const newState = {
      ...current,
      servingTeam: team,
      serverNumber: 2,
      status: 'playing',
      _serverSlot: 1
    };

    matchState.current = newState;
    logMatchAction(matchId, {
      type: 'serve_pick',
      servingTeamName: team === 'A' ? matchState.current.teamA : matchState.current.teamB
    });

    await syncMatchState(matchId, newState);

    // Close dialog
    closeServeDialog(matchId);

    // Re-render
    await fetchMatches();
    
    setStatus(`✓ Đã chọn Team ${team} giao bóng`, 'ok');
  } catch (error) {
    console.error('selectServe error:', error);
    setStatus('❌ Lỗi: ' + error.message, 'err');
  }
}

/**
 * Close serve selection dialog
 */
function closeServeDialog(matchId) {
  const dialog = document.getElementById(`serve-dialog-${matchId}`);
  if (dialog) dialog.remove();
  document.body.style.overflow = ''; // restore scroll
}

/**
 * Handle undo action
 */
async function handleUndo(matchId) {
  try {
    const matchState = matchStates.get(matchId);
    if (!matchState) {
      setStatus('❌ Không tìm thấy trạng thái trận đấu', 'err');
      return;
    }
    const { history } = matchState;
    if (!history.canUndo()) {
      setStatus('⚠️ Không có action nào để undo', 'err');
      return;
    }

    const previousState = history.pop();

    logMatchAction(matchId, { type: 'undo' });

    // BO3 custom frame: revert just the set points + server_slot. Status
    // stays 'playing' — never let undo end a match.
    if (previousState && previousState.kind === 'bo3') {
      const { cs, sa, sb, server_slot } = previousState;
      const payload = {
        [`s${cs}a`]: sa, [`s${cs}b`]: sb,
        server_slot,
        status: 'playing',
        updated_at: new Date().toISOString()
      };
      if (db) {
        const { error } = await db.from('matches').update(payload).eq('id', matchId);
        if (error) { showError(error); return; }
      } else {
        const stored = localStorage.getItem('pb_matches');
        localMatches = stored ? JSON.parse(stored) : [];
        const lm = localMatches.find(x => x.id === matchId);
        if (lm) Object.assign(lm, payload);
        saveLocal(localMatches);
      }
      await fetchMatches();
      setStatus('↶ Đã hoàn tác', 'ok');
      return;
    }

    // Regular (group-stage) frame — guard against ending the match
    if (previousState.status === 'match_complete') {
      previousState.status = 'playing';
    }
    previousState._cameFromUndo = true; // tell syncMatchState not to write status='done'
    matchState.current = previousState;
    await syncMatchState(matchId, previousState);
    await fetchMatches();
    setStatus('↶ Đã hoàn tác', 'ok');
  } catch (error) {
    console.error('handleUndo error:', error);
    setStatus('❌ Lỗi: ' + error.message, 'err');
  }
}

/**
 * Sync match state to database
 */
async function syncMatchState(matchId, state) {
  // Map internal status to database status
  let dbStatus = state.status;
  if (state.status === 'set_complete' || state.status === 'match_complete') {
    if (state.config.matchFormat === 'BO1' && state.status === 'set_complete') {
      dbStatus = 'done';
    } else if (state.status === 'match_complete') {
      dbStatus = 'done';
    } else {
      dbStatus = 'playing';
    }
  }
  // Undo never ends a match — even if the popped frame would map to 'done',
  // demote it to 'playing'. Only finishMatch / endSet / resetMatch should
  // change status away from 'playing'.
  if (state._cameFromUndo && dbStatus === 'done') dbStatus = 'playing';

  const payload = {
    score_a: state.scoreA,
    score_b: state.scoreB,
    serving_team: state.servingTeam,
    server_number: state.serverNumber,
    status: dbStatus,
    updated_at: new Date().toISOString()
  };
  if (state._serverSlot !== undefined) payload.server_slot = state._serverSlot;

  if (!db) {
    // localStorage mode
    const stored = localStorage.getItem('pb_matches');
    localMatches = stored ? JSON.parse(stored) : [];
    const match = localMatches.find(m => m.id === matchId);
    
    if (match) {
      Object.assign(match, payload);
      saveLocal(localMatches);
    }
    return;
  }

  // Supabase mode
  const { error } = await db.from('matches').update(payload).eq('id', matchId);
  
  if (error) {
    throw new Error(`Failed to sync state: ${error.message}`);
  }
}

// ============================================================
//  TOURNAMENT LIFECYCLE MANAGEMENT — Placeholder Functions
// ============================================================

/**
 * Open member registration modal
 */
async function openMemberRegistrationModal() {
  try {
    const tournamentId = tournamentManager.getActiveTournamentId();
    if (!tournamentId) {
      setStatus('❌ Vui lòng chọn giải đấu', 'err');
      return;
    }

    // Initialize memberManager if not already done
    if (typeof window.memberManager === 'undefined' || !window.memberManager) {
      window.memberManager = new MemberManager(window.storage);
    }

    // Get all members
    const members = await window.memberManager.getAllMembers();
    
    console.log('Members loaded:', members); // DEBUG
    
    if (members.length === 0) {
      setStatus('❌ Chưa có thành viên nào. Vui lòng thêm thành viên trước.', 'err');
      return;
    }

    // Get already registered participants
    const participants = await tournamentManager.getParticipants(tournamentId);
    const registeredMap = new Map();
    
    participants.forEach(p => {
      registeredMap.set(p.member_id, {
        tier_override: p.tier_override,
        is_seeded: p.is_seeded
      });
    });

    // Render modal with member list
    const modal = document.getElementById('member-registration-modal');
    const memberList = document.getElementById('member-list');

    memberList.innerHTML = members.map(member => {
      const isRegistered = registeredMap.has(member.id);
      const registration = isRegistered ? registeredMap.get(member.id) : null;
      const memberName = member.name || 'Không có tên';
      
      console.log('Rendering member:', member); // DEBUG
      
      return `
        <div class="member-item">
          <input type="checkbox" 
                 id="member-${member.id}" 
                 value="${member.id}"
                 ${isRegistered ? 'checked' : ''} />
          <span class="member-name" style="font-size: 1rem; font-weight: 600; color: #333; cursor: pointer;">${esc(memberName)}</span>
          <span class="tier-badge tier-${member.tier}">Tier ${member.tier}</span>
          <select class="tier-override" data-member-id="${member.id}">
            <option value="">Giữ nguyên</option>
            <option value="1" ${registration && registration.tier_override === 1 ? 'selected' : ''}>Tier 1</option>
            <option value="2" ${registration && registration.tier_override === 2 ? 'selected' : ''}>Tier 2</option>
            <option value="3" ${registration && registration.tier_override === 3 ? 'selected' : ''}>Tier 3</option>
          </select>
          <div class="seeded-checkbox-wrapper">
            <input type="checkbox" 
                   class="is-seeded" 
                   data-member-id="${member.id}"
                   ${registration && registration.is_seeded ? 'checked' : ''} />
            <label>Hạt giống</label>
          </div>
        </div>
      `;
    }).join('');

    modal.style.display = 'flex';
  } catch (error) {
    console.error('openMemberRegistrationModal error:', error);
    setStatus('❌ Lỗi: ' + error.message, 'err');
  }
}

/**
 * Close member registration modal
 */
function closeMemberRegistrationModal() {
  const modal = document.getElementById('member-registration-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Save member registration
 */
async function saveMemberRegistration() {
  try {
    const tournamentId = tournamentManager.getActiveTournamentId();
    
    if (!tournamentId) {
      setStatus('❌ Vui lòng chọn giải đấu', 'err');
      return;
    }

    // Collect selected members
    const checkboxes = document.querySelectorAll('#member-registration-modal input[type="checkbox"]:checked');
    const participants = [];

    checkboxes.forEach(cb => {
      // Skip the seeded checkboxes (they have class 'is-seeded')
      if (cb.classList.contains('is-seeded')) return;
      
      const memberId = cb.value;
      const tierOverrideSelect = document.querySelector(`.tier-override[data-member-id="${memberId}"]`);
      const isSeededCheckbox = document.querySelector(`.is-seeded[data-member-id="${memberId}"]`);
      
      const tierOverride = tierOverrideSelect ? tierOverrideSelect.value : '';
      const isSeeded = isSeededCheckbox ? isSeededCheckbox.checked : false;

      participants.push({
        member_id: memberId,
        tier_override: tierOverride ? parseInt(tierOverride) : null,
        is_seeded: isSeeded
      });
    });

    // Validation: minimum 4 members
    if (participants.length < 4) {
      setStatus('❌ Cần ít nhất 4 thành viên để tạo giải đấu', 'err');
      alert('Cần ít nhất 4 thành viên để tạo giải đấu.\n\nVui lòng chọn thêm thành viên.');
      return;
    }

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
    console.error('saveMemberRegistration error:', error);
    setStatus(`❌ Lỗi: ${error.message}`, 'err');
  }
}

/**
 * Generate random teams using pairing algorithm
 * Task 3: Implement Generate Random Teams Function
 */
async function generateRandomTeams() {
  try {
    // 3.1: Get active tournament
    const tournamentId = tournamentManager.getActiveTournamentId();
    if (!tournamentId) {
      setStatus('❌ Vui lòng chọn giải đấu', 'err');
      return;
    }

    const tournament = await tournamentManager.getTournament(tournamentId);
    
    // Check tournament status
    if (tournament.status !== 'upcoming') {
      setStatus('❌ Chỉ có thể tạo đội khi giải đấu chưa bắt đầu', 'err');
      return;
    }
    
    // Get participants
    const participants = await tournamentManager.getParticipantsWithMembers(tournamentId);
    
    if (participants.length < 4) {
      setStatus('❌ Cần ít nhất 4 thành viên để tạo đội', 'err');
      alert('Cần ít nhất 4 thành viên để tạo đội.\n\nVui lòng thêm thành viên trước.');
      return;
    }
    
    // 3.2: Add confirmation dialog before generating teams
    const existingTeams = await tournamentManager.getTeams(tournamentId);
    const confirmMsg = existingTeams.length > 0
      ? `Tạo đội ngẫu nhiên từ ${participants.length} thành viên?\n\n` +
        `⚠️ CẢNH BÁO: ${existingTeams.length} đội hiện tại sẽ bị xóa!\n\n` +
        `Hành động này không thể hoàn tác.`
      : `Tạo đội ngẫu nhiên từ ${participants.length} thành viên?`;
    
    if (!confirm(confirmMsg)) {
      return;
    }
    
    // 3.3: Delete existing teams before generating new ones
    if (existingTeams.length > 0) {
      for (const team of existingTeams) {
        await storage.delete('teams', team.id);
      }
      console.log(`Deleted ${existingTeams.length} existing teams`);
    }
    
    // 3.4: Call tournamentManager.generateTeams(tournamentId)
    const teams = await tournamentManager.generateTeams(tournamentId);
    
    // 3.5: Display success message with team count
    setStatus(`✓ Đã tạo ${teams.length} đội thành công`, 'ok');
    
    // Log team distribution for debugging
    const groupA = teams.filter(t => t.group_name === 'A');
    const groupB = teams.filter(t => t.group_name === 'B');
    console.log(`Team distribution: Group A = ${groupA.length}, Group B = ${groupB.length}`);
    
    // Reload page to show teams
    setTimeout(() => {
      location.reload();
    }, 1000);
    
  } catch (error) {
    // 3.6: Handle errors and display error messages
    console.error('generateRandomTeams error:', error);
    setStatus(`❌ Lỗi: ${error.message}`, 'err');
    alert(`Không thể tạo đội!\n\nLỗi: ${error.message}\n\nVui lòng kiểm tra:\n` +
          `• Số lượng thành viên mỗi tier\n` +
          `• Tier 2 phải có số chẵn thành viên`);
  }
}

/**
 * Generate random matches using round-robin schedule
 * Task 4: Implement Generate Random Matches Function
 */
async function generateRandomMatches() {
  // 4.1: Implement generateRandomMatches() function in admin.js
  const tournamentId = tournamentManager.getActiveTournamentId();
  
  if (!tournamentId) {
    alert('Vui lòng chọn giải đấu');
    return;
  }
  
  try {
    const tournament = await tournamentManager.getTournament(tournamentId);
    
    // Validate tournament status
    if (tournament.status !== 'upcoming') {
      alert('Chỉ có thể tạo trận đấu khi giải đấu chưa bắt đầu');
      return;
    }
    
    // 4.3: Validate that teams exist before generating
    const teams = await tournamentManager.getTeams(tournamentId);
    
    if (teams.length === 0) {
      alert('Vui lòng tạo đội trước khi tạo trận đấu');
      return;
    }
    
    // 4.2: Add confirmation dialog before generating matches
    if (!confirm(`Tạo lịch thi đấu vòng tròn?\n\n` +
                 `• ${teams.length} đội\n` +
                 `• Mỗi đội sẽ đấu với tất cả đội khác trong bảng\n\n` +
                 `Trận đấu cũ (nếu có) sẽ bị xóa.`)) {
      return;
    }
    
    // 4.4: Delete existing matches before generating new ones
    const existingMatches = await tournamentManager.getMatches(tournamentId);
    for (const match of existingMatches) {
      await storage.delete('matches', match.id);
    }
    
    // 4.5: Call tournamentManager.generateSchedule(tournamentId)
    const matches = await tournamentManager.generateSchedule(tournamentId);
    
    // 4.6: Display success message with match count
    setStatus(`✓ Đã tạo ${matches.length} trận đấu`, 'ok');

    await fetchMatches();
    if (_activeTournament) await renderTournamentControls(_activeTournament);

  } catch (error) {
    // 4.7: Handle errors and display error messages
    console.error('generateRandomMatches error:', error);
    setStatus(`❌ Lỗi: ${error.message}`, 'err');
    alert(`Không thể tạo trận đấu!\n\nLỗi: ${error.message}\n\nVui lòng kiểm tra:\n` +
          `• Đã tạo đội chưa\n` +
          `• Giải đấu đang ở trạng thái "Sắp diễn ra"`);
  }
}

/**
 * Start tournament and change status to ongoing
 * Task 5: Implement Start Tournament Function
 */
async function startTournament() {
  // 5.1: Implement startTournament() function in admin.js
  const tournamentId = tournamentManager.getActiveTournamentId();
  
  if (!tournamentId) {
    alert('Vui lòng chọn giải đấu');
    return;
  }
  
  try {
    const tournament = await tournamentManager.getTournament(tournamentId);
    
    // Validate tournament status
    if (tournament.status !== 'upcoming') {
      alert('Giải đấu đã bắt đầu');
      return;
    }
    
    // 5.2: Add validation for prerequisites (participants, teams, matches)
    const participants = await tournamentManager.getParticipants(tournamentId);
    const teams = await tournamentManager.getTeams(tournamentId);
    const matches = await tournamentManager.getMatches(tournamentId);
    
    // Validate minimum requirements
    if (participants.length < 4) {
      alert('Cần ít nhất 4 thành viên để bắt đầu giải đấu');
      return;
    }
    
    if (teams.length < 1) {
      alert('Vui lòng tạo đội trước khi bắt đầu giải đấu');
      return;
    }
    
    if (matches.length < 1) {
      alert('Vui lòng tạo trận đấu trước khi bắt đầu giải đấu');
      return;
    }
    
    // 5.3: Add confirmation dialog with tournament summary
    if (!confirm(`Bắt đầu giải đấu "${tournament.name}"?\n\n` +
                 `• ${participants.length} thành viên\n` +
                 `• ${teams.length} đội\n` +
                 `• ${matches.length} trận đấu\n\n` +
                 `Sau khi bắt đầu, bạn không thể thêm/xóa thành viên, đội, hoặc trận đấu.`)) {
      return;
    }
    
    // 5.4: Call tournamentManager.updateStatus(tournamentId, 'ongoing')
    await tournamentManager.updateStatus(tournamentId, 'ongoing');

    // Refresh cached tournament so gateScoringByRole unlocks scoring
    _activeTournament = await tournamentManager.getTournament(tournamentId);
    applyTournamentStatusVisibility(); // hide auto-schedule bar etc.

    setStatus('✓ Giải đấu đã bắt đầu!', 'ok');

    // 5.5: Reload tournament selector and UI after status change
    await loadTournamentSelector();
    
    // 5.6: Verify registration buttons are hidden after start
    // This is handled by renderTournamentControls() which is called by loadTournamentSelector()
    
    // Reload matches to display
    await fetchMatches();
    
  } catch (error) {
    // 5.7: Handle errors and display error messages
    console.error('startTournament error:', error);
    setStatus(`❌ Lỗi: ${error.message}`, 'err');
    alert(`Không thể bắt đầu giải đấu!\n\nLỗi: ${error.message}\n\nVui lòng kiểm tra:\n` +
          `• Đã thêm đủ thành viên (tối thiểu 4)\n` +
          `• Đã tạo đội\n` +
          `• Đã tạo trận đấu\n` +
          `• Giải đấu đang ở trạng thái "Sắp diễn ra"`);
  }
}

/**
 * Reset tournament to upcoming state
 * Task 6: Implement Reset Tournament Function
 */
async function resetTournament() {
  // 6.1: Implement resetTournament() function in admin.js
  const tournamentId = tournamentManager.getActiveTournamentId();
  
  if (!tournamentId) {
    alert('Vui lòng chọn giải đấu');
    return;
  }
  
  try {
    const tournament = await tournamentManager.getTournament(tournamentId);
    
    // Validate tournament status - only allow reset for ongoing or completed tournaments
    if (tournament.status === 'upcoming') {
      alert('Giải đấu chưa bắt đầu, không cần reset');
      return;
    }
    
    // 6.2: Add confirmation dialog with warning message
    if (!confirm(`Reset giải đấu "${tournament.name}"?\n\n` +
                 `⚠️ CẢNH BÁO: Hành động này sẽ:\n` +
                 `• Xóa tất cả trận đấu\n` +
                 `• Xóa tất cả đội\n` +
                 `• Giữ nguyên danh sách thành viên\n` +
                 `• Đặt trạng thái về "Sắp diễn ra"\n\n` +
                 `Bạn có chắc chắn muốn tiếp tục?`)) {
      return;
    }
    
    setStatus('🔄 Đang reset giải đấu...', 'ok');
    
    // 6.3: Delete all matches for tournament (batch delete)
    try {
      if (storage.provider.client) {
        // Supabase: Use batch delete
        const { error: matchError } = await storage.provider.client
          .from('matches')
          .delete()
          .eq('tournament_id', tournamentId);
        
        if (matchError) {
          console.error('Error deleting matches:', matchError);
          throw new Error(`Không thể xóa trận đấu: ${matchError.message}`);
        }
        console.log('Deleted all matches for tournament');
      } else {
        // localStorage: Delete one by one
        const matches = await tournamentManager.getMatches(tournamentId);
        for (const match of matches) {
          await storage.delete('matches', match.id);
        }
        console.log(`Deleted ${matches.length} matches`);
      }
    } catch (error) {
      console.error('Error deleting matches:', error);
      throw new Error(`Lỗi khi xóa trận đấu: ${error.message}`);
    }
    
    // 6.4: Delete all teams for tournament (batch delete)
    try {
      if (storage.provider.client) {
        // Supabase: Use batch delete
        const { error: teamError } = await storage.provider.client
          .from('teams')
          .delete()
          .eq('tournament_id', tournamentId);
        
        if (teamError) {
          console.error('Error deleting teams:', teamError);
          throw new Error(`Không thể xóa đội: ${teamError.message}`);
        }
        console.log('Deleted all teams for tournament');
      } else {
        // localStorage: Delete one by one
        const teams = await tournamentManager.getTeams(tournamentId);
        for (const team of teams) {
          await storage.delete('teams', team.id);
        }
        console.log(`Deleted ${teams.length} teams`);
      }
    } catch (error) {
      console.error('Error deleting teams:', error);
      throw new Error(`Lỗi khi xóa đội: ${error.message}`);
    }
    
    // 6.5: Keep participants unchanged (no deletion of participants)
    const participants = await tournamentManager.getParticipants(tournamentId);
    console.log(`Kept ${participants.length} participants unchanged`);
    
    // 6.6: Call tournamentManager.updateStatus(tournamentId, 'upcoming')
    await tournamentManager.updateStatus(tournamentId, 'upcoming');
    
    setStatus('✓ Giải đấu đã được reset', 'ok');
    
    // 6.7: Reload tournament selector and UI after reset
    await loadTournamentSelector();
    
    // 6.8: Verify registration buttons reappear after reset
    // This is handled by renderTournamentControls() which is called by loadTournamentSelector()
    
    // Reload matches to display (should be empty now)
    await fetchMatches();
    
  } catch (error) {
    // Handle errors and display error messages
    console.error('resetTournament error:', error);
    setStatus(`❌ Lỗi: ${error.message}`, 'err');
    alert(`Không thể reset giải đấu!\n\nLỗi: ${error.message}\n\nVui lòng thử lại hoặc liên hệ quản trị viên.`);
  }
}


// ============================================================
//  TAB MANAGEMENT
// ============================================================

/**
 * Switch between admin tabs
 */
function switchAdminTab(tabName) {
  // Hide all tab contents
  const allContents = document.querySelectorAll('.admin-tab-content');
  allContents.forEach(content => {
    content.style.display = 'none';
  });
  
  // Remove active class from all tabs
  const allTabs = document.querySelectorAll('.admin-tab');
  allTabs.forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show selected tab content
  const selectedContent = document.getElementById(`tab-${tabName}`);
  if (selectedContent) {
    selectedContent.style.display = 'block';
  }
  
  // Add active class to selected tab
  const selectedTab = document.querySelector(`.admin-tab[data-tab="${tabName}"]`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Load content for specific tabs
  if (tabName === 'members') {
    loadMembersTab();
  } else if (tabName === 'teams') {
    loadTeamsTab();
  }
}

/**
 * Load members tab content
 */
async function loadMembersTab() {
  const container = document.getElementById('members-list-container');
  
  try {
    const tournamentId = tournamentManager.getActiveTournamentId();
    if (!tournamentId) {
      container.innerHTML = '<p class="empty">Vui lòng chọn giải đấu</p>';
      return;
    }
    
    // Get participants WITH member details for this tournament
    const participants = await tournamentManager.getParticipantsWithMembers(tournamentId);
    
    if (participants.length === 0) {
      container.innerHTML = '<p class="empty">Chưa có thành viên nào. Bấm "Thêm/Xóa Thành viên" để thêm.</p>';
      return;
    }
    
    // Group by tier
    const byTier = { T1: [], T2: [], T3: [] };
    participants.forEach(p => {
      const tier = p.effective_tier || p.tier_override || (p.member ? p.member.tier : null) || 'T2';
      // Normalize tier format
      const tierKey = typeof tier === 'string' ? tier : `T${tier}`;
      if (byTier[tierKey]) {
        byTier[tierKey].push(p);
      }
    });
    
    let html = '';
    ['T1', 'T2', 'T3'].forEach(tier => {
      if (byTier[tier].length > 0) {
        html += `
          <div style="margin-bottom: 30px;">
            <h3 style="color: #3b82f6; margin-bottom: 15px; font-size: 18px;">
              ${tier} (${byTier[tier].length} người)
            </h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
              ${byTier[tier].map(p => {
                const member = p.member;
                const memberName = member?.name || member?.phone || `Thành viên ${p.member_id}`;
                const memberPhone = member?.phone || 'Chưa có SĐT';
                
                return `
                <div style="background: #1a2235; padding: 15px; border-radius: 8px; border-left: 4px solid ${tier === 'T1' ? '#ef4444' : tier === 'T2' ? '#3b82f6' : '#22c55e'};">
                  <div style="font-weight: 600; font-size: 16px; margin-bottom: 5px;">
                    ${memberName}
                    ${p.is_seeded ? ' 🌟' : ''}
                  </div>
                  <div style="font-size: 13px; color: #94a3b8;">
                    ${memberPhone}
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
        `;
      }
    });
    
    container.innerHTML = html;
    
  } catch (error) {
    console.error('Error loading members:', error);
    container.innerHTML = '<p class="empty" style="color: #ef4444;">Lỗi khi tải danh sách thành viên</p>';
  }
}

/**
 * Load teams tab content
 */
async function loadTeamsTab() {
  const container = document.getElementById('teams-list-container');
  
  try {
    const tournamentId = tournamentManager.getActiveTournamentId();
    if (!tournamentId) {
      container.innerHTML = '<p class="empty">Vui lòng chọn giải đấu</p>';
      return;
    }
    
    // Get teams WITH member details for this tournament
    const teams = await tournamentManager.getTeamsWithMembers(tournamentId);
    
    if (teams.length === 0) {
      container.innerHTML = '<p class="empty">Chưa có đội nào. Bấm "Tạo Đội Ngẫu nhiên" để tạo đội.</p>';
      return;
    }
    
    // Group by bảng
    const byGroup = {};
    teams.forEach(team => {
      const group = team.group_name || 'Chưa phân bảng';
      if (!byGroup[group]) {
        byGroup[group] = [];
      }
      byGroup[group].push(team);
    });
    
    let html = '';
    Object.keys(byGroup).sort().forEach(group => {
      html += `
        <div style="margin-bottom: 30px;">
          <h3 style="color: #3b82f6; margin-bottom: 15px; font-size: 18px;">
            Bảng ${group} (${byGroup[group].length} đội)
          </h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
            ${byGroup[group].map(team => {
              // Use helper function if available, otherwise fallback
              const member1Name = typeof getMemberDisplayName === 'function' 
                ? getMemberDisplayName(team.member1)
                : (team.member1?.name || team.member1?.phone || `Thành viên ${team.member1_id}`);
              
              const member2Name = typeof getMemberDisplayName === 'function'
                ? getMemberDisplayName(team.member2)
                : (team.member2?.name || team.member2?.phone || `Thành viên ${team.member2_id}`);
              
              return `
              <div style="background: #1a2235; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px;">
                  ${team.display_name || team.name || 'Đội'}
                  ${team.is_seeded ? ' 🌟' : ''}
                </div>
                <div style="font-size: 13px; color: #94a3b8; line-height: 1.6;">
                  <div>
                    <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#22c55e;color:#052e16;font-size:0.7rem;font-weight:800;text-align:center;line-height:18px;margin-right:6px;">1</span>
                    ${esc(member1Name)}
                  </div>
                  <div>
                    <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:#ef4444;color:#fff;font-size:0.7rem;font-weight:800;text-align:center;line-height:18px;margin-right:6px;">2</span>
                    ${esc(member2Name)}
                  </div>
                  <div style="margin-top: 5px; color: #64748b;">
                    Tier: ${team.tier || 'N/A'}
                  </div>
                </div>
                <button class="lineup-swap auth-only" onclick="swapTeamMembers('${team.id}')"
                        style="margin-top:10px;width:100%;">⇅ Đổi vị trí 1 ↔ 2</button>
              </div>
            `;
            }).join('')}
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    
  } catch (error) {
    console.error('Error loading teams:', error);
    container.innerHTML = '<p class="empty" style="color: #ef4444;">Lỗi khi tải danh sách đội</p>';
  }
}

/**
 * Clear all teams
 */
async function clearTeams() {
  const tournamentId = tournamentManager.getActiveTournamentId();
  
  if (!tournamentId) {
    alert('Vui lòng chọn giải đấu');
    return;
  }
  
  if (!confirm('Bạn có chắc muốn xóa tất cả đội?\n\nHành động này không thể hoàn tác!')) {
    return;
  }
  
  try {
    setStatus('🔄 Đang xóa đội...', 'ok');
    
    // Delete all teams
    if (storage.provider.client) {
      const { error } = await storage.provider.client
        .from('teams')
        .delete()
        .eq('tournament_id', tournamentId);
      
      if (error) throw error;
    } else {
      const teams = await tournamentManager.getTeams(tournamentId);
      for (const team of teams) {
        await storage.delete('teams', team.id);
      }
    }
    
    setStatus('✓ Đã xóa tất cả đội', 'ok');
    loadTeamsTab();

  } catch (error) {
    console.error('Error clearing teams:', error);
    setStatus('❌ Lỗi khi xóa đội', 'err');
  }
}

// ============================================================
//  AUTO-SCHEDULE — assign match_time + court for every group match
//  Rules:
//    - Each group plays on a fixed court (Bảng A → Sân 1, Bảng B → Sân 2)
//    - Both groups start at the same time
//    - 15 minutes between consecutive matches on the same court
//    - Round-robin order avoids any team playing 3 matches in a row
// ============================================================

/**
 * Round-robin schedule via the circle method (works for any team count).
 * Returns an ordered list of [teamA, teamB] pairs — sequential play on
 * one court naturally avoids 3-in-a-row for each team.
 */
function buildRoundRobinOrder(teams) {
  if (!teams || teams.length < 2) return [];
  // Insert phantom for odd counts so the algorithm works uniformly.
  const list = teams.length % 2 === 0 ? [...teams] : [...teams, null];
  const n = list.length;
  const ordered = [];
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const t1 = list[i];
      const t2 = list[n - 1 - i];
      if (t1 && t2) ordered.push([t1, t2]);
    }
    // rotate: keep position 0 fixed, move last → position 1
    const last = list.pop();
    list.splice(1, 0, last);
  }
  return ordered;
}

/** "07:00" → 420 (minutes since midnight) */
function _hhmmToMin(s) {
  const m = (s || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 7 * 60;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
/** 435 → "07:15" */
function _minToHhmm(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function autoScheduleMatches() {
  if (!isAdmin || !isAdmin()) {
    setStatus(t('onlyAdminSchedule'), 'err');
    return;
  }

  const startInput = document.getElementById('auto-schedule-start');
  const startMin = _hhmmToMin(startInput?.value || '07:00');
  const SLOT = 15; // minutes between matches on the same court

  const tournamentId = tournamentManager?.getActiveTournamentId();
  if (!tournamentId) { setStatus(t('noTournamentSelected'), 'err'); return; }

  const allMatches = await fetchAllMatches();
  const groupMatches = allMatches.filter(m =>
    (!m.stage || m.stage === 'group') && m.group_name
  );
  if (groupMatches.length === 0) {
    setStatus(t('scheduleNoMatch'), 'err');
    return;
  }

  if (!confirm(t('scheduleConfirm', { time: _minToHhmm(startMin) }))) return;

  // 2. Build per-group round-robin order
  const courtMap = { A: 'Sân 1', B: 'Sân 2', C: 'Sân 3', D: 'Sân 4' };
  const byGroup = {};
  groupMatches.forEach(m => {
    (byGroup[m.group_name] = byGroup[m.group_name] || []).push(m);
  });

  // 2.5 Pre-load teams + members so we can pick a referee per match.
  // Referee rule: someone in the SAME group who is NOT one of the 4 players
  // on court right now — and we balance load by picking the least-used so far.
  const allTeams   = await storage.read('teams',   { tournament_id: tournamentId });
  const allMembers = await storage.read('members');
  const memberById = new Map(allMembers.map(m => [m.id, m]));
  // Look up by ID first (always unique), fall back to name (may have stale rows)
  const teamById   = new Map();
  const teamByName = new Map();
  const playersByGroup = {};       // group_name → Set of all 10 member ids
  allTeams.forEach(t => {
    if (t.tournament_id !== tournamentId && t.tournament_id != tournamentId) return;
    teamById.set(t.id, t);
    if (t.name) teamByName.set(t.name, t);
    if (!playersByGroup[t.group_name]) playersByGroup[t.group_name] = new Set();
    if (t.member1_id) playersByGroup[t.group_name].add(t.member1_id);
    if (t.member2_id) playersByGroup[t.group_name].add(t.member2_id);
  });
  const refUsage = {}; // member_id → times assigned as referee

  const updates = []; // {id, payload}
  for (const [g, matches] of Object.entries(byGroup)) {
    const teamSet = new Set();
    matches.forEach(m => {
      if (m.team_a) teamSet.add(m.team_a);
      if (m.team_b) teamSet.add(m.team_b);
    });
    const teams = [...teamSet];
    const orderedPairs = buildRoundRobinOrder(teams);

    const matchByPair = new Map();
    matches.forEach(m => {
      if (!m.team_a || !m.team_b) return;
      const k = [m.team_a, m.team_b].sort().join('|');
      matchByPair.set(k, m);
    });

    const court = courtMap[g] || `Sân ${g}`;
    const groupPlayerIds = [...(playersByGroup[g] || new Set())];
    let slot = 0;

    for (const [t1, t2] of orderedPairs) {
      const k = [t1, t2].sort().join('|');
      const m = matchByPair.get(k);
      if (!m) continue;

      // Players currently on the court — look up by team_a_id (most reliable),
      // fall back to name match. Without this fallback the onCourt set was
      // sometimes empty and the algorithm picked a referee from the playing
      // team (e.g. Chương Huỳnh refereeing his own match).
      const teamA = teamById.get(m.team_a_id) || teamByName.get(m.team_a) || teamByName.get(t1);
      const teamB = teamById.get(m.team_b_id) || teamByName.get(m.team_b) || teamByName.get(t2);
      const onCourt = new Set([
        teamA?.member1_id, teamA?.member2_id,
        teamB?.member1_id, teamB?.member2_id
      ].filter(Boolean));

      // Pick least-used candidate from the same group who isn't playing
      const candidates = groupPlayerIds.filter(id => !onCourt.has(id));
      candidates.sort((a, b) =>
        (refUsage[a] || 0) - (refUsage[b] || 0) ||
        String(memberById.get(a)?.name || '').localeCompare(String(memberById.get(b)?.name || ''), 'vi')
      );
      const refId = candidates[0] || null;
      const refName = refId ? (memberById.get(refId)?.name || '') : '';
      if (refId) refUsage[refId] = (refUsage[refId] || 0) + 1;

      updates.push({
        id: m.id,
        payload: {
          match_time: _minToHhmm(startMin + slot * SLOT),
          court,
          match_order: slot + 1,
          referee_name: refName,
          updated_at: new Date().toISOString()
        }
      });
      slot++;
    }
  }

  setStatus(t('scheduling', { n: updates.length }));
  try {
    if (db) {
      // Sequential to keep simple; tournaments rarely have > 30 group matches
      for (const u of updates) {
        const { error } = await db.from('matches').update(u.payload).eq('id', u.id);
        if (error) throw error;
      }
    } else {
      const stored = localStorage.getItem('pb_matches');
      localMatches = stored ? JSON.parse(stored) : [];
      updates.forEach(u => {
        const m = localMatches.find(x => x.id === u.id);
        if (m) Object.assign(m, u.payload);
      });
      saveLocal(localMatches);
    }
    showOk(t('scheduleSaved', { n: updates.length }));
    await fetchMatches();
    if (_activeTournament) await renderTournamentControls(_activeTournament);
  } catch (e) {
    showError(e, t('scheduleFail'));
  }
}
