// ============================================================
//  admin.js — Admin panel logic
// ============================================================

const ADMIN_PASSWORD = "admin123";
const ADMIN_KEY      = "pb_admin_auth";

// ── Auth ──────────────────────────────────────────────────────
function doLogin() {
  const pw  = document.getElementById("pw-input").value;
  const err = document.getElementById("login-error");
  if (pw === ADMIN_PASSWORD) {
    localStorage.setItem(ADMIN_KEY, "true");
    showAdminPanel();
  } else {
    err.textContent = "Incorrect password. Try again.";
    document.getElementById("pw-input").value = "";
    document.getElementById("pw-input").focus();
  }
}

function doLogout() {
  localStorage.removeItem(ADMIN_KEY);
  location.reload();
}

function showAdminPanel() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-panel").style.display  = "block";
  initSupabase();
  
  // Initialize storage and tournament manager
  if (typeof storage === 'undefined' || !storage) {
    window.storage = new StorageAdapter(db);
  }
  if (typeof tournamentManager === 'undefined' || !tournamentManager) {
    window.tournamentManager = new TournamentManager(storage);
  }
  
  // Run migration check
  checkAndMigrate();
  
  // Load tournament selector
  loadTournamentSelector();
  
  fetchMatches();
  subscribeRealtime();
  
  // Initialize auto-backup toggle (loads saved preference)
  if (typeof initAutoBackupToggle === 'function') {
    initAutoBackupToggle();
  }
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
      window.tournamentManager = new TournamentManager(storage);
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
    
    // Reload matches for selected tournament
    await fetchMatches();
    
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

document.addEventListener("DOMContentLoaded", () => {
  if (isAdmin()) showAdminPanel();
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

  // Auto-generate bracket stages
  autoGenerateBracket(matches);
}

// ── Auto-generate bracket ─────────────────────────────────────
let _bracketGenerating = false;

async function autoGenerateBracket(matches) {
  if (_bracketGenerating) return;

  const groupMatches = matches.filter(m => !m.stage || m.stage === "group");
  const semiMatches  = matches.filter(m => m.stage === "semi");
  const finalMatches = matches.filter(m => m.stage === "final");

  const allGroupDone = groupMatches.length > 0 && groupMatches.every(m => m.status === "done");

  // Auto-gen semis when all group done and no semis yet
  if (allGroupDone && semiMatches.length === 0) {
    _bracketGenerating = true;
    await generateSemifinals(true);
    _bracketGenerating = false;
    return;
  }

  // If semis exist but some group matches were reset (not all done anymore),
  // delete stale semis+final so they regen correctly when group finishes again
  if (!allGroupDone && semiMatches.length > 0) {
    const hasNotStartedSemi = semiMatches.some(m => m.status === "not_started");
    if (hasNotStartedSemi) {
      // Semis haven't started yet — safe to delete and wait for correct standings
      _bracketGenerating = true;
      if (db) {
        await db.from("matches").delete().eq("stage", "semi");
        await db.from("matches").delete().eq("stage", "final");
      } else {
        localMatches = (localMatches||[]).filter(m => m.stage !== "semi" && m.stage !== "final");
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
    // Show waiting message for matches with placeholder teams
    scoreSection = `<div class="match-waiting-msg">${t("matchWaiting")}</div>`;
  } else if (stage === "semi" || stage === "final") {
    // 3-set scoring for semi/final
    const { winsA, winsB } = computeSetWins(m);
    const showSet3 = winsA >= 1 && winsB >= 1;
    scoreSection = `
      <div class="adm-set-wins" data-id="${m.id}">${t("sets")} ${winsA} — ${winsB}</div>
      ${setRowHTML(m, 1, dis)}
      ${setRowHTML(m, 2, dis)}
      ${showSet3 || m.s3a || m.s3b || m.s3A || m.s3B
        ? setRowHTML(m, 3, dis)
        : `<div id="set3-${m.id}">
             <button class="adm-add-set-btn" onclick="showSet3('${m.id}')" ${dis}>${t("addSet3")}</button>
           </div>`}`;
  } else {
    // Single score for group stage - with +/- buttons for BOTH teams
    scoreSection = `
      <div class="adm-score-row">
        <div class="adm-score-inputs">
          <div class="adm-score-ctrl">
            <button class="adm-score-btn minus" ${dis} onclick="adjustScore('${m.id}','scoreA',-1)">−</button>
            <input class="adm-score-input ${winnerA?"score-win":""}" type="number" min="0"
              value="${m.scoreA||0}" data-field="scoreA" data-id="${m.id}" ${dis}>
            <button class="adm-score-btn plus" ${dis} onclick="adjustScore('${m.id}','scoreA',1)">+</button>
          </div>
          <span class="adm-score-sep">—</span>
          <div class="adm-score-ctrl">
            <button class="adm-score-btn minus" ${dis} onclick="adjustScore('${m.id}','scoreB',-1)">−</button>
            <input class="adm-score-input ${winnerB?"score-win":""}" type="number" min="0"
              value="${m.scoreB||0}" data-field="scoreB" data-id="${m.id}" ${dis}>
            <button class="adm-score-btn plus" ${dis} onclick="adjustScore('${m.id}','scoreB',1)">+</button>
          </div>
        </div>
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
        <span class="adm-summary-teams">${esc(m.teamA)} <span style="color:var(--adm-muted)">vs</span> ${esc(m.teamB)}</span>
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
  
  if (!done && stage === "semi" || stage === "final") {
    const { winsA, winsB } = computeSetWins(m);
    canFinish = winsA >= 2 || winsB >= 2;
    if (!canFinish) {
      finishTitle = "Cần ít nhất 1 đội thắng 2 sets";
    }
  } else if (!done) {
    // Group stage: cannot finish with tie
    canFinish = m.scoreA !== m.scoreB;
    if (!canFinish) {
      finishTitle = "Không thể kết thúc khi điểm hòa";
    }
  }
  
  const finishDisabled = dis || !canFinish ? "disabled" : "";

  // Full card body (hidden by default)
  const body = `
    <div class="adm-card-body" id="body-${m.id}" style="display:none;">
      <div class="adm-teams">
        <span class="adm-team-name ${winnerA?"winner":""}">${esc(m.teamA)}</span>
        <span class="adm-vs">vs</span>
        <span class="adm-team-name right ${winnerB?"winner":""}">${esc(m.teamB)}</span>
      </div>
      ${scoreSection}
      <div class="adm-actions">
        <button class="adm-save-btn" ${dis} onclick="updateScore('${m.id}')">${t("save")}</button>
        <button class="adm-finish-btn ${done?"is-done":""}" ${finishDisabled} onclick="finishMatch('${m.id}')" title="${finishTitle}">
          ${done ? t("finished") : t("finish")}
        </button>
        ${done ? `<button class="adm-reset-btn" onclick="resetMatch('${m.id}')">${t("resetMatch")}</button>` : ""}
      </div>
    </div>`;

  return `<div class="adm-match-card ${cardCls}" data-id="${m.id}" data-updated="${m.updated_at||''}">${summary}${body}</div>`;
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
  console.log('adjustScore called:', { id, field, delta });
  const input = document.querySelector(`input[data-id="${id}"][data-field="${field}"]`);
  if (!input) {
    console.error('adjustScore: input not found', { id, field });
    return;
  }
  const oldValue = parseInt(input.value, 10) || 0;
  const newValue = Math.max(0, oldValue + delta);
  console.log('adjustScore: updating', { oldValue, newValue });
  input.value = newValue;
  
  // Set editing flag to prevent realtime fetch from interrupting
  if (typeof _isEditingScore !== 'undefined') {
    _isEditingScore = true;
  }
  
  clearTimeout(_saveDebounce[id]);
  _saveDebounce[id] = setTimeout(() => {
    console.log('adjustScore: calling updateScore after debounce');
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
  const timeVal = document.querySelector(`input[data-id="${id}"][data-field="match_time"]`)?.value || "";
  const courtVal= document.querySelector(`input[data-id="${id}"][data-field="court"]`)?.value || "";
  const refVal  = document.querySelector(`input[data-id="${id}"][data-field="referee"]`)?.value || "";

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
    .update({ match_time: timeVal, court: courtVal, referee: refVal }).eq("id", id);
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
    scoreA: 0, scoreB: 0, status: "not_started",
    s1a: 0, s1b: 0, s2a: 0, s2b: 0, s3a: 0, s3b: 0,
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
  // Always fetch fresh from DB to get accurate state after any deletes
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

  const [g1, g2] = groupKeys;
  const A1 = tops[g1][0]?.name || "TBD", A2 = tops[g1][1]?.name || "TBD";
  const B1 = tops[g2][0]?.name || "TBD", B2 = tops[g2][1]?.name || "TBD";

  const semis = [
    { teamA:A1, teamB:B2, scoreA:0, scoreB:0, group_name:"SF", stage:"semi", status:"not_started" },
    { teamA:B1, teamB:A2, scoreA:0, scoreB:0, group_name:"SF", stage:"semi", status:"not_started" },
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

  const getWinner = m => m.scoreA >= m.scoreB ? m.teamA : m.teamB;
  const finalMatch = {
    teamA: getWinner(semis[0]), teamB: getWinner(semis[1]),
    scoreA: 0, scoreB: 0, group_name: "F", stage: "final", status: "not_started"
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
  
  // Filter by active tournament if available
  let query = db.from("matches").select("*");
  
  if (typeof tournamentManager !== 'undefined' && tournamentManager) {
    const activeId = tournamentManager.getActiveTournamentId();
    if (activeId) {
      query = query.eq('tournament_id', activeId);
    }
  }
  
  const {data} = await query;
  return data||[];
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

    // Check if third-place match already exists
    const matches = await tournamentManager.getMatches(activeId);
    const existingThirdPlace = matches.find(m => m.match_type === 'third_place');
    
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
    const existingConsolation = matches.find(m => m.match_type === 'consolation');
    
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
  const specialMatches = matches.filter(m => 
    m.match_type === 'third_place' || 
    m.match_type === 'consolation' || 
    m.match_type === 'exhibition'
  );

  const container = document.getElementById('match-list-special');
  if (!container) return;

  if (specialMatches.length === 0) {
    container.innerHTML = '<p class="empty">Chưa có trận đặc biệt nào.</p>';
    return;
  }

  container.innerHTML = specialMatches.map(m => matchHTML(m, 'special')).join('');
}
