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
  fetchMatches();
  subscribeRealtime();
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
    
    // Second: sort by match_time (if available)
    const timeA = a.match_time || "";
    const timeB = b.match_time || "";
    if (timeA && timeB) {
      return timeA.localeCompare(timeB);
    }
    if (timeA) return -1; // Has time comes first
    if (timeB) return 1;
    
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
  const dis     = done ? "disabled" : "";
  const winnerA = done && m.scoreA > m.scoreB;
  const winnerB = done && m.scoreB > m.scoreA;

  let cardCls = done ? "is-done" : playing ? "is-playing is-live" : "is-ns";
  if (stage === "semi")  cardCls += " is-semi";
  if (stage === "final") cardCls += " is-final";

  const statusBadge = done
    ? `<span class="adm-status-badge adm-status-done">${t("statusDone")}</span>`
    : playing
    ? `<span class="adm-status-badge adm-status-playing">${t("statusPlaying")}</span>`
    : `<span class="adm-status-badge adm-status-ns">${t("statusNs")}</span>`;

  const stageLabel = stage === "semi" ? t("semifinal") : stage === "final" ? t("final") : "";

  // Meta info: time, court, referee
  const metaHtml = (m.match_time || m.court || m.referee) ? `
    <div class="adm-match-info">
      ${m.match_time ? `<span>🕐 ${esc(m.match_time)}</span>` : ""}
      ${m.court      ? `<span>🏟 ${esc(m.court)}</span>`      : ""}
      ${m.referee    ? `<span>👤 ${esc(m.referee)}</span>`    : ""}
    </div>` : "";

  // Score section
  const useSets = (stage === "semi" || stage === "final");
  let scoreSection = "";
  if (useSets) {
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
    scoreSection = `
      <div class="adm-score-row">
        <div class="adm-score-ctrl">
          <button class="adm-inc-btn plus" ${dis} onclick="adjustScore('${m.id}','scoreA',1)">+</button>
          <input class="adm-score-input" type="number" min="0"
            value="${m.scoreA}" data-field="scoreA" data-id="${m.id}" ${dis}>
          <button class="adm-inc-btn minus" ${dis} onclick="adjustScore('${m.id}','scoreA',-1)">−</button>
        </div>
        <span class="adm-score-sep">:</span>
        <div class="adm-score-ctrl">
          <button class="adm-inc-btn plus" ${dis} onclick="adjustScore('${m.id}','scoreB',1)">+</button>
          <input class="adm-score-input" type="number" min="0"
            value="${m.scoreB}" data-field="scoreB" data-id="${m.id}" ${dis}>
          <button class="adm-inc-btn minus" ${dis} onclick="adjustScore('${m.id}','scoreB',-1)">−</button>
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

  // Full card body (hidden by default)
  const body = `
    <div class="adm-card-body" id="body-${m.id}" style="display:none;">
      ${metaHtml}
      <div class="adm-teams">
        <span class="adm-team-name ${winnerA?"winner":""}">${esc(m.teamA)}</span>
        <span class="adm-vs">vs</span>
        <span class="adm-team-name right ${winnerB?"winner":""}">${esc(m.teamB)}</span>
      </div>
      ${scoreSection}
      <div class="adm-actions">
        <button class="adm-save-btn" ${dis} onclick="updateScore('${m.id}')">${t("save")}</button>
        <button class="adm-finish-btn ${done?"is-done":""}" ${dis} onclick="finishMatch('${m.id}')">
          ${done ? t("finished") : t("finish")}
        </button>
        ${done ? `<button class="adm-reset-btn" onclick="resetMatch('${m.id}')">${t("resetMatch")}</button>` : ""}
      </div>
      <div class="adm-info-edit">
        <input class="adm-info-input" placeholder="${t("timePlaceholder")}" data-field="match_time" data-id="${m.id}" value="${esc(m.match_time||'')}">
        <input class="adm-info-input" placeholder="${t("courtPlaceholder")}" data-field="court" data-id="${m.id}" value="${esc(m.court||'')}">
        <input class="adm-info-input" placeholder="${t("refPlaceholder")}" data-field="referee" data-id="${m.id}" value="${esc(m.referee||'')}">
        <button class="adm-info-save-btn" onclick="saveMatchInfo('${m.id}')">${t("saveInfo")}</button>
      </div>
    </div>`;

  return `<div class="adm-match-card ${cardCls}" data-id="${m.id}" data-updated="${m.updated_at||''}">${summary}${body}</div>`;
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
  return `
    <div class="adm-set-row">
      <span class="adm-set-num">Set ${setNum}</span>
      <div class="adm-set-inputs">
        <button class="adm-set-btn minus" ${dis} onclick="adjustSetScore('${m.id}','${fA}',-1)">−</button>
        <input class="adm-set-input ${wA?"set-win":""}" type="number" min="0"
          value="${vA}" data-field="${fA}" data-id="${m.id}" ${dis}>
        <span class="adm-set-sep">—</span>
        <input class="adm-set-input ${wB?"set-win":""}" type="number" min="0"
          value="${vB}" data-field="${fB}" data-id="${m.id}" ${dis}>
        <button class="adm-set-btn plus" ${dis} onclick="adjustSetScore('${m.id}','${fB}',1)">+</button>
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

// ── +1/-1 debounced ───────────────────────────────────────────
const _saveDebounce = {};

function adjustScore(id, field, delta) {
  const input = document.querySelector(`input[data-id="${id}"][data-field="${field}"]`);
  if (!input) return;
  input.value = Math.max(0, (parseInt(input.value,10)||0) + delta);
  clearTimeout(_saveDebounce[id]);
  _saveDebounce[id] = setTimeout(() => updateScore(id), 800);
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
  if (error) { setStatus("Info error: " + error.message, "err"); return; }
  setStatus(t("infoSaved"), "ok");
}

// ── Reset single match ────────────────────────────────────────
// After resetting a group match, also wipe semi/final so bracket
// auto-regenerates with fresh standings when all group matches finish.
async function resetMatch(id) {
  if (!confirm(t("confirmResetMatch"))) return;

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
    setStatus(t("matchReset"), "ok");
    return;
  }

  // 1. Reset the match
  const { error } = await db.from("matches").update(payload).eq("id", id);
  if (error) { setStatus("Reset error: " + error.message, "err"); return; }

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
  if (delErr) { setStatus("Delete error: " + delErr.message, "err"); return; }

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
  if (delErr) { setStatus("Delete error: " + delErr.message, "err"); return; }

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
  if (error) { setStatus("Semi error: " + error.message, "err"); return; }
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
  if (error) { setStatus("Final error: " + error.message, "err"); return; }
  if (!silent) setStatus(t("finalCreated"), "ok");
  fetchMatches();
}

async function fetchAllMatches() {
  if (!db) return localMatches||[];
  const {data}=await db.from("matches").select("*");
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
  if (!semis.length&&!finals.length) {
    container.innerHTML=`<p class="empty-state">${t("bracketNone")}</p>`; return;
  }
  const getWinner = m => m.status==="done" ? (m.scoreA>=m.scoreB?m.teamA:m.teamB) : null;
  let html='<div class="bracket-wrap">';
  html+=`<div class="bracket-col"><div class="bracket-col-title">${t("bracketSemi")}</div>`;
  semis.forEach(m=>{
    const wA=m.status==="done"&&m.scoreA>m.scoreB, wB=m.status==="done"&&m.scoreB>m.scoreA;
    html+=`<div class="bracket-match-card">
      <div class="bracket-team-row ${wA?"winner":""}"><span>${esc(m.teamA)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreA:"-"}</span></div>
      <div class="bracket-team-row ${wB?"winner":""}"><span>${esc(m.teamB)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreB:"-"}</span></div>
    </div>`;
  });
  html+=`</div><div class="bracket-arrow">→</div>`;
  html+=`<div class="bracket-col"><div class="bracket-col-title">${t("bracketFinal")}</div>`;
  if (finals.length) {
    finals.forEach(m=>{
      const wA=m.status==="done"&&m.scoreA>m.scoreB, wB=m.status==="done"&&m.scoreB>m.scoreA;
      html+=`<div class="bracket-match-card">
        <div class="bracket-team-row ${wA?"winner":""}"><span>${esc(m.teamA)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreA:"-"}</span></div>
        <div class="bracket-team-row ${wB?"winner":""}"><span>${esc(m.teamB)}</span><span class="bracket-score-val">${m.status==="done"?m.scoreB:"-"}</span></div>
      </div>`;
    });
  } else {
    const w1=semis[0]?getWinner(semis[0]):null, w2=semis[1]?getWinner(semis[1]):null;
    html+=`<div class="bracket-match-card">
      <div class="bracket-team-row ${w1?"":"tbd"}"><span>${w1||"Winner SF1"}</span></div>
      <div class="bracket-team-row ${w2?"":"tbd"}"><span>${w2||"Winner SF2"}</span></div>
    </div>`;
  }
  html+='</div>';
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
